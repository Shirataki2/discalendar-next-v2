/**
 * getOrCreateIcsFeedToken / regenerateIcsFeedToken Server Actions のテスト
 *
 * Task 4.3 (ics-feed-export): トークン管理の統合テスト
 * - トークン取得: 初回呼び出しで新規生成、2回目で既存トークンを返す
 * - トークン再生成: 旧トークンが無効化され、新トークンが生成される
 * - 未認証・非メンバーのアクセスがエラーを返す
 *
 * Requirements: 4.5, 5.4
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// モック設定
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

// IcsFeedTokenService モック
const mockGetOrCreateToken = vi.fn();
const mockRegenerateToken = vi.fn();
const mockBuildFeedUrl = vi.fn();
vi.mock("@/lib/ics/ics-feed-token-service", () => ({
  createIcsFeedTokenService: vi.fn(() => ({
    getOrCreateToken: mockGetOrCreateToken,
    regenerateToken: mockRegenerateToken,
    buildFeedUrl: mockBuildFeedUrl,
  })),
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
const mockUpsertSingleGuild = vi.fn();
vi.mock("@/lib/guilds/user-guilds-service", () => ({
  createUserGuildsService: vi.fn(() => ({
    getUserGuildPermissions: mockGetUserGuildPermissions,
    syncUserGuilds: vi.fn(),
    upsertSingleGuild: mockUpsertSingleGuild,
  })),
}));

// GuildConfigService モック
vi.mock("@/lib/guilds/guild-config-service", () => ({
  createGuildConfigService: vi.fn(() => ({
    getGuildConfig: vi.fn(),
    upsertGuildConfig: vi.fn(),
  })),
}));

// PublicCalendarService モック
const mockGetPublicSettings = vi.fn();
vi.mock("@/lib/calendar/public-calendar-service", () => ({
  createPublicCalendarService: vi.fn(() => ({
    enablePublicCalendar: vi.fn(),
    disablePublicCalendar: vi.fn(),
    regeneratePublicSlug: vi.fn(),
    getPublicGuildBySlug: vi.fn(),
    fetchPublicEvents: vi.fn(),
    getPublicSettings: mockGetPublicSettings,
  })),
}));

import {
  getOrCreateIcsFeedToken,
  regenerateIcsFeedToken,
} from "@/app/dashboard/actions";

const TEST_GUILD_ID = "12345678901234567";

/** メンバー権限ありのキャッシュモック設定 */
function setupMemberAuth(guildId: string) {
  mockGetUser.mockResolvedValueOnce({
    data: { user: { id: "user-1" } },
    error: null,
  });
  mockGetCachedGuilds.mockReturnValueOnce({
    guilds: [
      {
        guildId,
        name: "Test Guild",
        permissions: {
          administrator: false,
          manageGuild: false,
          manageChannels: false,
          manageMessages: false,
          manageRoles: false,
          manageEvents: false,
          raw: 0n,
        },
      },
    ],
    invitableGuilds: [],
  });
}

/** 管理権限ありのキャッシュモック設定 */
function setupManagerAuth(guildId: string) {
  mockGetUser.mockResolvedValueOnce({
    data: { user: { id: "user-1" } },
    error: null,
  });
  mockGetCachedGuilds.mockReturnValueOnce({
    guilds: [
      {
        guildId,
        name: "Test Guild",
        permissions: {
          administrator: false,
          manageGuild: true,
          manageChannels: false,
          manageMessages: false,
          manageRoles: false,
          manageEvents: false,
          raw: 0n,
        },
      },
    ],
    invitableGuilds: [],
  });
}

/** 未認証モック設定 */
function setupUnauthenticated() {
  mockGetUser.mockResolvedValueOnce({
    data: { user: null },
    error: null,
  });
}

/** 非メンバー設定 */
function setupNonMember() {
  mockGetUser.mockResolvedValueOnce({
    data: { user: { id: "user-1" } },
    error: null,
  });
  // キャッシュにもDBにもいない
  mockGetCachedGuilds.mockReturnValueOnce(null);
  mockGetUserGuildPermissions.mockResolvedValueOnce({
    success: true,
    data: null,
  });
  // Discord APIにもいない
  mockGetSession.mockResolvedValueOnce({
    data: { session: { provider_token: "discord-token" } },
    error: null,
  });
  mockGetUserGuilds.mockResolvedValueOnce({
    success: true,
    data: [],
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
});

afterEach(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = undefined;
});

describe("getOrCreateIcsFeedToken", () => {
  it("非公開ギルドで初回呼び出し時にトークンを新規生成しURLを返す", async () => {
    setupMemberAuth(TEST_GUILD_ID);
    mockGetPublicSettings.mockResolvedValueOnce({
      success: true,
      data: { isPublic: false, publicSlug: null },
    });
    mockGetOrCreateToken.mockResolvedValueOnce({
      success: true,
      data: { token: "a".repeat(64) },
    });
    mockBuildFeedUrl.mockReturnValueOnce(
      `https://test.supabase.co/functions/v1/ics-feed?guild_id=${TEST_GUILD_ID}&token=${"a".repeat(64)}`
    );

    const result = await getOrCreateIcsFeedToken(TEST_GUILD_ID);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.token).toBe("a".repeat(64));
      expect(result.data.feedUrl).toContain("guild_id=");
      expect(result.data.feedUrl).toContain("token=");
    }
    expect(mockGetOrCreateToken).toHaveBeenCalledWith(TEST_GUILD_ID);
  });

  it("公開ギルドの場合はトークン生成せずトークンなしURLを返す", async () => {
    setupMemberAuth(TEST_GUILD_ID);
    mockGetPublicSettings.mockResolvedValueOnce({
      success: true,
      data: { isPublic: true, publicSlug: "slug123" },
    });
    mockBuildFeedUrl.mockReturnValueOnce(
      `https://test.supabase.co/functions/v1/ics-feed?guild_id=${TEST_GUILD_ID}`
    );

    const result = await getOrCreateIcsFeedToken(TEST_GUILD_ID);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.token).toBe("");
      expect(result.data.feedUrl).not.toContain("token=");
    }
    expect(mockGetOrCreateToken).not.toHaveBeenCalled();
  });

  it("未認証ユーザーはUNAUTHORIZEDエラーを返す", async () => {
    setupUnauthenticated();

    const result = await getOrCreateIcsFeedToken(TEST_GUILD_ID);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("UNAUTHORIZED");
    }
  });

  it("非メンバーはPERMISSION_DENIEDエラーを返す", async () => {
    setupNonMember();

    const result = await getOrCreateIcsFeedToken(TEST_GUILD_ID);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("PERMISSION_DENIED");
    }
  });

  it("不正なguild_idはVALIDATION_ERRORを返す", async () => {
    const result = await getOrCreateIcsFeedToken("invalid");

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("VALIDATION_ERROR");
    }
  });

  it("トークンサービスエラー時はINTERNAL_ERRORを返す", async () => {
    setupMemberAuth(TEST_GUILD_ID);
    mockGetPublicSettings.mockResolvedValueOnce({
      success: true,
      data: { isPublic: false, publicSlug: null },
    });
    mockGetOrCreateToken.mockResolvedValueOnce({
      success: false,
      error: { code: "INTERNAL_ERROR", message: "DB error" },
    });

    const result = await getOrCreateIcsFeedToken(TEST_GUILD_ID);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("INTERNAL_ERROR");
    }
  });
});

describe("regenerateIcsFeedToken", () => {
  it("管理権限ありで旧トークンを無効化し新トークンでURLを返す", async () => {
    setupManagerAuth(TEST_GUILD_ID);
    mockGetPublicSettings.mockResolvedValueOnce({
      success: true,
      data: { isPublic: false, publicSlug: null },
    });
    mockRegenerateToken.mockResolvedValueOnce({
      success: true,
      data: { token: "c".repeat(64) },
    });
    mockBuildFeedUrl.mockReturnValueOnce(
      `https://test.supabase.co/functions/v1/ics-feed?guild_id=${TEST_GUILD_ID}&token=${"c".repeat(64)}`
    );

    const result = await regenerateIcsFeedToken(TEST_GUILD_ID);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.token).toBe("c".repeat(64));
      expect(result.data.feedUrl).toContain("token=");
    }
    expect(mockRegenerateToken).toHaveBeenCalledWith(TEST_GUILD_ID);
  });

  it("管理権限なしのメンバーはPERMISSION_DENIEDエラーを返す", async () => {
    setupMemberAuth(TEST_GUILD_ID);

    const result = await regenerateIcsFeedToken(TEST_GUILD_ID);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("PERMISSION_DENIED");
    }
    expect(mockRegenerateToken).not.toHaveBeenCalled();
  });

  it("未認証ユーザーはUNAUTHORIZEDエラーを返す", async () => {
    setupUnauthenticated();

    const result = await regenerateIcsFeedToken(TEST_GUILD_ID);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("UNAUTHORIZED");
    }
  });

  it("不正なguild_idはVALIDATION_ERRORを返す", async () => {
    const result = await regenerateIcsFeedToken("invalid");

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("VALIDATION_ERROR");
    }
  });

  it("公開ギルドではトークン再生成を拒否する", async () => {
    setupManagerAuth(TEST_GUILD_ID);
    mockGetPublicSettings.mockResolvedValueOnce({
      success: true,
      data: { isPublic: true, publicSlug: "slug123" },
    });

    const result = await regenerateIcsFeedToken(TEST_GUILD_ID);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("VALIDATION_ERROR");
    }
    expect(mockRegenerateToken).not.toHaveBeenCalled();
  });

  it("トークン再生成失敗時はINTERNAL_ERRORを返す", async () => {
    setupManagerAuth(TEST_GUILD_ID);
    mockGetPublicSettings.mockResolvedValueOnce({
      success: true,
      data: { isPublic: false, publicSlug: null },
    });
    mockRegenerateToken.mockResolvedValueOnce({
      success: false,
      error: { code: "INTERNAL_ERROR", message: "revoke error" },
    });

    const result = await regenerateIcsFeedToken(TEST_GUILD_ID);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("INTERNAL_ERROR");
    }
  });
});
