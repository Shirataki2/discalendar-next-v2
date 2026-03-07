/**
 * 通知チャンネル管理 Server Actions のテスト
 *
 * Task 4.1: fetchGuildChannels - チャンネル一覧取得
 * Task 4.2: updateNotificationChannel - 通知チャンネル更新
 *
 * Requirements: 1.1, 3.1, 3.2, 5.1, 5.2, 5.3
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

// getGuildChannels モック
const mockGetGuildChannels = vi.fn();
vi.mock("@/lib/discord/notification-channel-service", () => ({
  getGuildChannels: (...args: unknown[]) => mockGetGuildChannels(...args),
}));

// EventSettingsService モック
const mockUpsertEventSettings = vi.fn();
const mockGetEventSettings = vi.fn();
vi.mock("@/lib/guilds/event-settings-service", () => ({
  createEventSettingsService: vi.fn(() => ({
    getEventSettings: mockGetEventSettings,
    upsertEventSettings: mockUpsertEventSettings,
  })),
}));

// GuildConfigService モック（resolveServerAuth → authorizeEventOperation で使う可能性用）
vi.mock("@/lib/guilds/guild-config-service", () => ({
  createGuildConfigService: vi.fn(() => ({
    getGuildConfig: vi.fn(),
    upsertGuildConfig: vi.fn(),
  })),
}));

// UserGuildsService モック（resolveServerAuth 3-tier で使用）
const mockGetUserGuildPermissions = vi.fn();
const mockSyncUserGuilds = vi.fn();
vi.mock("@/lib/guilds/user-guilds-service", () => ({
  createUserGuildsService: vi.fn(() => ({
    getUserGuildPermissions: mockGetUserGuildPermissions,
    syncUserGuilds: mockSyncUserGuilds,
  })),
}));

import {
  fetchGuildChannels,
  updateNotificationChannel,
} from "@/app/dashboard/actions";

// ──────────────────────────────────────────────
// ヘルパー
// ──────────────────────────────────────────────

/** 管理権限ありの permissions */
const ADMIN_PERMISSIONS = {
  administrator: true,
  manageGuild: false,
  manageChannels: false,
  manageMessages: false,
  manageRoles: false,
  manageEvents: false,
  sendMessages: false,
  viewChannel: false,
  raw: 8n,
};

/** 権限なしの permissions */
const NO_PERMISSIONS = {
  administrator: false,
  manageGuild: false,
  manageChannels: false,
  manageMessages: false,
  manageRoles: false,
  manageEvents: false,
  sendMessages: false,
  viewChannel: false,
  raw: 0n,
};

/** 認証済みユーザーとキャッシュをセットアップ */
function setupAuthenticatedUser(permissions = ADMIN_PERMISSIONS) {
  mockGetUser.mockResolvedValueOnce({
    data: { user: { id: "user-1" } },
    error: null,
  });
  mockGetCachedGuilds.mockReturnValueOnce({
    guilds: [
      {
        guildId: "guild-123",
        name: "Test Guild",
        permissions,
      },
    ],
    invitableGuilds: [],
  });
}

// ──────────────────────────────────────────────
// Task 4.1: fetchGuildChannels
// ──────────────────────────────────────────────

describe("fetchGuildChannels Server Action", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("未認証の場合 UNAUTHORIZED エラーを返す", async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: null },
      error: { message: "Not authenticated" },
    });

    const result = await fetchGuildChannels("guild-123");

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("UNAUTHORIZED");
    }
  });

  it("無効なギルドIDの場合 VALIDATION_ERROR を返す", async () => {
    const result = await fetchGuildChannels(
      "a".repeat(31) // 31文字 = 上限超過
    );

    // guildId のバリデーションは resolveServerAuth 前に実施
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("VALIDATION_ERROR");
    }
  });

  it("認証済みの場合チャンネル一覧を返す", async () => {
    setupAuthenticatedUser();

    const channels = [
      {
        id: "ch-1",
        name: "general",
        parentId: null,
        categoryName: null,
        position: 0,
        canBotSendMessages: true,
      },
    ];
    mockGetGuildChannels.mockResolvedValueOnce({
      success: true,
      data: channels,
    });

    const result = await fetchGuildChannels("guild-123");

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(channels);
    }
    expect(mockGetGuildChannels).toHaveBeenCalledWith("guild-123");
  });

  it("Discord API エラーの場合エラーを返す", async () => {
    setupAuthenticatedUser();

    mockGetGuildChannels.mockResolvedValueOnce({
      success: false,
      error: {
        code: "unauthorized",
        message: "BOTの認証に失敗しました。",
      },
    });

    const result = await fetchGuildChannels("guild-123");

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("unauthorized");
    }
  });

  it("キャッシュミス時に Discord API から権限を取得してチャンネルを返す", async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: { id: "user-1" } },
      error: null,
    });
    mockGetCachedGuilds.mockReturnValueOnce(null);
    mockGetUserGuildPermissions.mockResolvedValueOnce({
      success: true,
      data: null,
    }); // DBミス
    mockSyncUserGuilds.mockResolvedValueOnce({
      success: true,
      data: { synced: 1, removed: 0 },
    });
    mockGetSession.mockResolvedValueOnce({
      data: { session: { provider_token: "discord-token" } },
    });
    mockGetUserGuilds.mockResolvedValueOnce({
      success: true,
      data: [{ id: "guild-123", name: "Test", permissions: "8" }],
    });

    const channels = [
      {
        id: "ch-1",
        name: "general",
        parentId: null,
        categoryName: null,
        position: 0,
        canBotSendMessages: true,
      },
    ];
    mockGetGuildChannels.mockResolvedValueOnce({
      success: true,
      data: channels,
    });

    const result = await fetchGuildChannels("guild-123");

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(channels);
    }
  });

  it("管理権限なしでもチャンネル一覧を閲覧できる（閲覧は権限不要）", async () => {
    setupAuthenticatedUser(NO_PERMISSIONS);

    const channels = [
      {
        id: "ch-1",
        name: "general",
        parentId: null,
        categoryName: null,
        position: 0,
        canBotSendMessages: true,
      },
    ];
    mockGetGuildChannels.mockResolvedValueOnce({
      success: true,
      data: channels,
    });

    const result = await fetchGuildChannels("guild-123");

    // 閲覧は MANAGE_GUILD 権限不要
    expect(result.success).toBe(true);
  });
});

// ──────────────────────────────────────────────
// Task 4.2: updateNotificationChannel
// ──────────────────────────────────────────────

describe("updateNotificationChannel Server Action", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("未認証の場合 UNAUTHORIZED エラーを返す", async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: null },
      error: { message: "Not authenticated" },
    });

    const result = await updateNotificationChannel({
      guildId: "guild-123",
      channelId: "12345678901234567",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("UNAUTHORIZED");
    }
  });

  it("MANAGE_GUILD 権限がない場合 PERMISSION_DENIED を返す", async () => {
    setupAuthenticatedUser(NO_PERMISSIONS);

    const result = await updateNotificationChannel({
      guildId: "guild-123",
      channelId: "12345678901234567",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("PERMISSION_DENIED");
    }
    expect(mockUpsertEventSettings).not.toHaveBeenCalled();
  });

  it("無効なギルドIDの場合 VALIDATION_ERROR を返す", async () => {
    const result = await updateNotificationChannel({
      guildId: "invalid guild id with spaces!!",
      channelId: "12345678901234567",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("VALIDATION_ERROR");
    }
  });

  it("無効なチャンネルID（非Snowflake）の場合 VALIDATION_ERROR を返す", async () => {
    setupAuthenticatedUser();

    const result = await updateNotificationChannel({
      guildId: "guild-123",
      channelId: "not-a-snowflake",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("VALIDATION_ERROR");
    }
    expect(mockUpsertEventSettings).not.toHaveBeenCalled();
  });

  it("短すぎるチャンネルIDの場合 VALIDATION_ERROR を返す", async () => {
    setupAuthenticatedUser();

    const result = await updateNotificationChannel({
      guildId: "guild-123",
      channelId: "1234567890123456", // 16桁 = 短すぎ
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("VALIDATION_ERROR");
    }
  });

  it("権限ありで有効なチャンネルIDの場合 upsert を呼び出す", async () => {
    setupAuthenticatedUser();

    mockUpsertEventSettings.mockResolvedValueOnce({
      success: true,
      data: { guildId: "guild-123", channelId: "12345678901234567" },
    });

    const result = await updateNotificationChannel({
      guildId: "guild-123",
      channelId: "12345678901234567",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({
        guildId: "guild-123",
        channelId: "12345678901234567",
      });
    }
    expect(mockUpsertEventSettings).toHaveBeenCalledWith(
      "guild-123",
      "12345678901234567"
    );
  });

  it("upsert 失敗時にエラーを返す（details は除去）", async () => {
    setupAuthenticatedUser();

    mockUpsertEventSettings.mockResolvedValueOnce({
      success: false,
      error: {
        code: "UPDATE_FAILED",
        message: "設定の保存に失敗しました。",
        details: "Internal DB error details",
      },
    });

    const result = await updateNotificationChannel({
      guildId: "guild-123",
      channelId: "12345678901234567",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("UPDATE_FAILED");
      // details はクライアントに漏洩しない
      expect("details" in result.error).toBe(false);
    }
  });

  it("MANAGE_GUILD 権限ありで upsert を実行する", async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: { id: "user-1" } },
      error: null,
    });
    mockGetCachedGuilds.mockReturnValueOnce({
      guilds: [
        {
          guildId: "guild-123",
          name: "Test Guild",
          permissions: {
            administrator: false,
            manageGuild: true,
            manageChannels: false,
            manageMessages: false,
            manageRoles: false,
            manageEvents: false,
            sendMessages: false,
            viewChannel: false,
            raw: 32n, // MANAGE_GUILD
          },
        },
      ],
      invitableGuilds: [],
    });

    mockUpsertEventSettings.mockResolvedValueOnce({
      success: true,
      data: { guildId: "guild-123", channelId: "12345678901234567" },
    });

    const result = await updateNotificationChannel({
      guildId: "guild-123",
      channelId: "12345678901234567",
    });

    expect(result.success).toBe(true);
    expect(mockUpsertEventSettings).toHaveBeenCalled();
  });

  it("20桁のSnowflake IDを受け付ける", async () => {
    setupAuthenticatedUser();

    mockUpsertEventSettings.mockResolvedValueOnce({
      success: true,
      data: {
        guildId: "guild-123",
        channelId: "12345678901234567890",
      },
    });

    const result = await updateNotificationChannel({
      guildId: "guild-123",
      channelId: "12345678901234567890", // 20桁
    });

    expect(result.success).toBe(true);
  });
});
