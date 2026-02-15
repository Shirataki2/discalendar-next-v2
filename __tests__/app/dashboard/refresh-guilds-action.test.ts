/**
 * refreshGuilds Server Action のテスト
 *
 * Task 4.1: refreshGuilds Server Action の追加
 * - キャッシュを無効化して fetchGuilds を再実行する
 * - 認証済みセッションからアクセストークンを取得する
 * - 未認証時はエラーを返す
 * - 戻り値に guilds, invitableGuilds, guildPermissions を含める
 * - GuildWithPermissions から permissions フィールドを除外する（BigInt シリアライズ対策）
 *
 * Requirements: 5.1
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ── モック設定 ──

const mockGetUser = vi.fn();
const mockGetSession = vi.fn();
const mockSelect = vi.fn();
const mockIn = vi.fn();
const mockSupabase = {
  auth: {
    getUser: mockGetUser,
    getSession: mockGetSession,
  },
  from: vi.fn(() => ({
    select: mockSelect.mockReturnValue({
      in: mockIn,
    }),
  })),
};

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabase)),
}));

const mockClearCache = vi.fn();
vi.mock("@/lib/guilds/cache", () => ({
  clearCache: (...args: unknown[]) => mockClearCache(...args),
  getCachedGuilds: vi.fn(),
  getOrSetPendingRequest: vi.fn(),
  setCachedGuilds: vi.fn(),
}));

const mockFetchGuilds = vi.fn();
vi.mock("@/app/dashboard/page", () => ({
  fetchGuilds: (...args: unknown[]) => mockFetchGuilds(...args),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/discord/client", () => ({
  getUserGuilds: vi.fn(),
}));

vi.mock("@/lib/guilds/guild-config-service", () => ({
  createGuildConfigService: vi.fn(() => ({
    getGuildConfig: vi.fn(),
    upsertGuildConfig: vi.fn(),
  })),
}));

import { refreshGuilds } from "@/app/dashboard/actions";

describe("refreshGuilds Server Action", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("未認証の場合エラーを返す", async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: null },
      error: { message: "Not authenticated" },
    });

    const result = await refreshGuilds();

    expect(result.guilds).toEqual([]);
    expect(result.invitableGuilds).toEqual([]);
    expect(result.guildPermissions).toEqual({});
    expect(result.error).toEqual({ type: "no_token" });
  });

  it("provider_token がない場合エラーを返す", async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: { id: "user-1" } },
      error: null,
    });
    mockGetSession.mockResolvedValueOnce({
      data: { session: null },
    });

    const result = await refreshGuilds();

    expect(result.guilds).toEqual([]);
    expect(result.invitableGuilds).toEqual([]);
    expect(result.guildPermissions).toEqual({});
    expect(result.error).toEqual({ type: "no_token" });
  });

  it("キャッシュをクリアして fetchGuilds を再実行する", async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: { id: "user-1" } },
      error: null,
    });
    mockGetSession.mockResolvedValueOnce({
      data: { session: { provider_token: "discord-token" } },
    });
    mockFetchGuilds.mockResolvedValueOnce({
      guilds: [
        {
          id: 1,
          guildId: "g1",
          name: "Guild 1",
          avatarUrl: null,
          locale: "ja",
          permissions: {
            administrator: true,
            manageGuild: false,
            manageChannels: false,
            manageMessages: false,
            manageRoles: false,
            manageEvents: false,
            raw: 8n,
          },
        },
      ],
      invitableGuilds: [{ guildId: "g2", name: "Guild 2", avatarUrl: null }],
    });
    mockIn.mockResolvedValueOnce({
      data: [{ guild_id: "g1", restricted: false }],
      error: null,
    });

    const result = await refreshGuilds();

    expect(mockClearCache).toHaveBeenCalledWith("user-1");
    expect(mockFetchGuilds).toHaveBeenCalledWith("user-1", "discord-token");
    expect(result.guilds).toHaveLength(1);
    expect(result.guilds[0]).toEqual({
      id: 1,
      guildId: "g1",
      name: "Guild 1",
      avatarUrl: null,
      locale: "ja",
    });
    expect(result.invitableGuilds).toHaveLength(1);
    expect(result.guildPermissions).toEqual({
      g1: { permissionsBitfield: "8", restricted: false },
    });
    expect(result.error).toBeUndefined();
  });

  it("戻り値の guilds から permissions フィールドが除外される", async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: { id: "user-1" } },
      error: null,
    });
    mockGetSession.mockResolvedValueOnce({
      data: { session: { provider_token: "discord-token" } },
    });
    mockFetchGuilds.mockResolvedValueOnce({
      guilds: [
        {
          id: 1,
          guildId: "g1",
          name: "Test",
          avatarUrl: null,
          locale: "ja",
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
    mockIn.mockResolvedValueOnce({
      data: [],
      error: null,
    });

    const result = await refreshGuilds();

    // permissions フィールドが含まれないこと（BigInt シリアライズ不可）
    for (const guild of result.guilds) {
      expect(guild).not.toHaveProperty("permissions");
    }
  });

  it("fetchGuilds がエラーを返した場合、エラーを伝播する", async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: { id: "user-1" } },
      error: null,
    });
    mockGetSession.mockResolvedValueOnce({
      data: { session: { provider_token: "discord-token" } },
    });
    mockFetchGuilds.mockResolvedValueOnce({
      guilds: [],
      invitableGuilds: [],
      error: { type: "api_error", message: "Discord API error" },
    });

    const result = await refreshGuilds();

    expect(mockClearCache).toHaveBeenCalledWith("user-1");
    expect(result.guilds).toEqual([]);
    expect(result.invitableGuilds).toEqual([]);
    expect(result.guildPermissions).toEqual({});
    expect(result.error).toEqual({
      type: "api_error",
      message: "Discord API error",
    });
  });

  it("guild_config クエリ失敗時は restricted: false をデフォルトにする", async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: { id: "user-1" } },
      error: null,
    });
    mockGetSession.mockResolvedValueOnce({
      data: { session: { provider_token: "discord-token" } },
    });
    mockFetchGuilds.mockResolvedValueOnce({
      guilds: [
        {
          id: 1,
          guildId: "g1",
          name: "Guild 1",
          avatarUrl: null,
          locale: "ja",
          permissions: {
            administrator: true,
            manageGuild: false,
            manageChannels: false,
            manageMessages: false,
            manageRoles: false,
            manageEvents: false,
            raw: 8n,
          },
        },
      ],
      invitableGuilds: [],
    });
    mockIn.mockResolvedValueOnce({
      data: null,
      error: { message: "DB error" },
    });

    const result = await refreshGuilds();

    expect(result.guildPermissions).toEqual({
      g1: { permissionsBitfield: "8", restricted: false },
    });
  });
});
