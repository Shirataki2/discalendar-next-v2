/**
 * resolveServerAuth 3-Tier 権限解決のテスト
 *
 * 権限解決順序: メモリキャッシュ → user_guilds DB → Discord API
 *
 * Requirements: 7.1, 7.2, 7.3, 7.4, 8.4
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ──────────────────────────────────────────────
// モック設定
// ──────────────────────────────────────────────

const mockGetUser = vi.fn();
const mockGetSession = vi.fn();
const mockSupabase = {
  auth: {
    getUser: mockGetUser,
    getSession: mockGetSession,
  },
};

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabase)),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

// getCachedGuilds モック
const mockGetCachedGuilds = vi.fn();
vi.mock("@/lib/guilds/cache", () => ({
  getCachedGuilds: (...args: unknown[]) => mockGetCachedGuilds(...args),
  clearCache: vi.fn(),
}));

// getUserGuilds モック
const mockGetUserGuilds = vi.fn();
vi.mock("@/lib/discord/client", () => ({
  getUserGuilds: (...args: unknown[]) => mockGetUserGuilds(...args),
}));

// UserGuildsService モック
const mockGetUserGuildPermissions = vi.fn();
const mockSyncUserGuilds = vi.fn();
const mockUpsertSingleGuild = vi.fn();
vi.mock("@/lib/guilds/user-guilds-service", () => ({
  createUserGuildsService: vi.fn(() => ({
    getUserGuildPermissions: mockGetUserGuildPermissions,
    syncUserGuilds: mockSyncUserGuilds,
    upsertSingleGuild: mockUpsertSingleGuild,
  })),
}));

// GuildConfigService モック（updateGuildConfig で必要）
const mockUpsertGuildConfig = vi.fn();
vi.mock("@/lib/guilds/guild-config-service", () => ({
  createGuildConfigService: vi.fn(() => ({
    getGuildConfig: vi.fn(),
    upsertGuildConfig: mockUpsertGuildConfig,
  })),
}));

import { updateGuildConfig } from "@/app/dashboard/actions";

// ──────────────────────────────────────────────
// ヘルパー
// ──────────────────────────────────────────────

function setupAuthenticatedUser(userId = "user-1") {
  mockGetUser.mockResolvedValueOnce({
    data: { user: { id: userId } },
    error: null,
  });
}

/** MANAGE_GUILD (1 << 5 = 32) */
const MANAGE_GUILD_BITFIELD = "32";

/** キャッシュに MANAGE_GUILD 権限ありのギルドを設定 */
function setupCacheHit(guildId: string) {
  mockGetCachedGuilds.mockReturnValueOnce({
    guilds: [
      {
        guildId,
        name: "Cached Guild",
        permissions: {
          administrator: false,
          manageGuild: true,
          manageChannels: false,
          manageMessages: false,
          manageRoles: false,
          manageEvents: false,
          raw: 32n,
        },
      },
    ],
    invitableGuilds: [],
  });
}

function setupCacheMiss() {
  mockGetCachedGuilds.mockReturnValueOnce(null);
}

function setupDbHit(permissions = MANAGE_GUILD_BITFIELD) {
  mockGetUserGuildPermissions.mockResolvedValueOnce({
    success: true,
    data: permissions,
  });
}

function setupDbMiss() {
  mockGetUserGuildPermissions.mockResolvedValueOnce({
    success: true,
    data: null,
  });
}

function setupDbError() {
  mockGetUserGuildPermissions.mockResolvedValueOnce({
    success: false,
    error: {
      code: "FETCH_FAILED",
      message: "DB connection error",
    },
  });
}

function setupDiscordApiSuccess(guildId: string) {
  mockGetSession.mockResolvedValueOnce({
    data: { session: { provider_token: "discord-token" } },
  });
  mockGetUserGuilds.mockResolvedValueOnce({
    success: true,
    data: [
      {
        id: guildId,
        name: "Discord Guild",
        permissions: MANAGE_GUILD_BITFIELD,
      },
    ],
  });
}

function setupSyncSuccess() {
  mockUpsertSingleGuild.mockResolvedValueOnce({
    success: true,
    data: undefined,
  });
}

// ──────────────────────────────────────────────
// テスト
// ──────────────────────────────────────────────

describe("resolveServerAuth 3-Tier 権限解決", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Tier 1: キャッシュヒット", () => {
    it("キャッシュヒット時にDB・Discord APIが呼ばれない", async () => {
      setupAuthenticatedUser();
      setupCacheHit("11111111111111111");
      mockUpsertGuildConfig.mockResolvedValueOnce({
        success: true,
        data: { guildId: "11111111111111111", restricted: false },
      });

      const result = await updateGuildConfig({
        guildId: "11111111111111111",
        restricted: false,
      });

      expect(result.success).toBe(true);
      expect(mockGetUserGuildPermissions).not.toHaveBeenCalled();
      expect(mockGetUserGuilds).not.toHaveBeenCalled();
    });
  });

  describe("Tier 2: DBフォールバック", () => {
    it("キャッシュミス + DBヒット時にDiscord APIが呼ばれず、DBの権限が使われる", async () => {
      setupAuthenticatedUser();
      setupCacheMiss();
      setupDbHit(MANAGE_GUILD_BITFIELD);
      mockUpsertGuildConfig.mockResolvedValueOnce({
        success: true,
        data: { guildId: "11111111111111111", restricted: true },
      });

      const result = await updateGuildConfig({
        guildId: "11111111111111111",
        restricted: true,
      });

      expect(result.success).toBe(true);
      expect(mockGetUserGuildPermissions).toHaveBeenCalledWith(
        "user-1",
        "11111111111111111"
      );
      expect(mockGetUserGuilds).not.toHaveBeenCalled();
      expect(mockGetSession).not.toHaveBeenCalled();
    });

    it("DBから取得した権限が正しくパースされる（管理権限なし → PERMISSION_DENIED）", async () => {
      setupAuthenticatedUser();
      setupCacheMiss();
      // permissions "0" = 権限なし
      setupDbHit("0");

      const result = await updateGuildConfig({
        guildId: "11111111111111111",
        restricted: true,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe("PERMISSION_DENIED");
      }
      expect(mockGetUserGuilds).not.toHaveBeenCalled();
    });

    it("DBクエリ失敗時はDiscord APIにフォールバックする", async () => {
      setupAuthenticatedUser();
      setupCacheMiss();
      setupDbError();
      setupDiscordApiSuccess("11111111111111111");
      setupSyncSuccess();
      mockUpsertGuildConfig.mockResolvedValueOnce({
        success: true,
        data: { guildId: "11111111111111111", restricted: false },
      });

      const result = await updateGuildConfig({
        guildId: "11111111111111111",
        restricted: false,
      });

      expect(result.success).toBe(true);
      expect(mockGetUserGuilds).toHaveBeenCalledWith("discord-token");
    });
  });

  describe("Tier 3: Discord APIフォールバック", () => {
    it("キャッシュミス + DBミス + Discord API成功時にDBへ書き戻す", async () => {
      setupAuthenticatedUser();
      setupCacheMiss();
      setupDbMiss();
      setupDiscordApiSuccess("11111111111111111");
      setupSyncSuccess();
      mockUpsertGuildConfig.mockResolvedValueOnce({
        success: true,
        data: { guildId: "11111111111111111", restricted: false },
      });

      const result = await updateGuildConfig({
        guildId: "11111111111111111",
        restricted: false,
      });

      expect(result.success).toBe(true);
      expect(mockUpsertSingleGuild).toHaveBeenCalledWith({
        guildId: "11111111111111111",
        permissions: MANAGE_GUILD_BITFIELD,
      });
    });

    it("Discord API成功時のDB書き戻し失敗がUIをブロックしない", async () => {
      setupAuthenticatedUser();
      setupCacheMiss();
      setupDbMiss();
      setupDiscordApiSuccess("11111111111111111");
      mockUpsertSingleGuild.mockResolvedValueOnce({
        success: false,
        error: { code: "SYNC_FAILED", message: "DB write failed" },
      });
      mockUpsertGuildConfig.mockResolvedValueOnce({
        success: true,
        data: { guildId: "11111111111111111", restricted: false },
      });

      const result = await updateGuildConfig({
        guildId: "11111111111111111",
        restricted: false,
      });

      // 書き戻し失敗でも権限解決自体は成功する
      expect(result.success).toBe(true);
    });

    it("全層ミス時（Discord APIでギルド不在）にエラーが返される", async () => {
      setupAuthenticatedUser();
      setupCacheMiss();
      setupDbMiss();
      mockGetSession.mockResolvedValueOnce({
        data: { session: { provider_token: "discord-token" } },
      });
      mockGetUserGuilds.mockResolvedValueOnce({
        success: true,
        data: [{ id: "99999999999999999", name: "Other", permissions: "8" }],
      });

      const result = await updateGuildConfig({
        guildId: "11111111111111111",
        restricted: true,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe("PERMISSION_DENIED");
      }
    });
  });

  describe("後方互換性（Req 8.4）", () => {
    it("user_guildsが空の初期状態でDiscord APIフォールバックが正常動作する", async () => {
      setupAuthenticatedUser();
      setupCacheMiss();
      // DBは常にnull（空テーブル）
      setupDbMiss();
      setupDiscordApiSuccess("11111111111111111");
      setupSyncSuccess();
      mockUpsertGuildConfig.mockResolvedValueOnce({
        success: true,
        data: { guildId: "11111111111111111", restricted: false },
      });

      const result = await updateGuildConfig({
        guildId: "11111111111111111",
        restricted: false,
      });

      expect(result.success).toBe(true);
      // Discord APIが呼ばれ、結果がDBに書き戻される
      expect(mockGetUserGuilds).toHaveBeenCalled();
      expect(mockUpsertSingleGuild).toHaveBeenCalled();
    });
  });
});
