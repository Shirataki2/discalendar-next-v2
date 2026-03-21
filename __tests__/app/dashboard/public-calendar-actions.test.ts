/**
 * togglePublicCalendar / regeneratePublicSlug Server Actions のテスト
 *
 * Task 3.2: 公開カレンダー設定を操作する Server Actions
 * - サーバー側で Discord 権限を解決（クライアント入力を信頼しない）
 * - 権限がある場合のみ PublicCalendarService の操作を呼び出す
 * - 権限がない場合は PERMISSION_DENIED エラーを返す
 * - 更新成功時に revalidatePath でダッシュボードを再検証する
 *
 * Requirements: 1.1, 1.2, 1.3
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

// PublicCalendarService モック
const mockEnablePublicCalendar = vi.fn();
const mockDisablePublicCalendar = vi.fn();
const mockRegeneratePublicSlug = vi.fn();
const mockGetPublicSettings = vi.fn();
vi.mock("@/lib/calendar/public-calendar-service", () => ({
  createPublicCalendarService: vi.fn(() => ({
    enablePublicCalendar: mockEnablePublicCalendar,
    disablePublicCalendar: mockDisablePublicCalendar,
    regeneratePublicSlug: mockRegeneratePublicSlug,
    getPublicGuildBySlug: vi.fn(),
    fetchPublicEvents: vi.fn(),
    getPublicSettings: mockGetPublicSettings,
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

// GuildConfigService モック（authorizeEventOperation で使用される場合に備えて）
vi.mock("@/lib/guilds/guild-config-service", () => ({
  createGuildConfigService: vi.fn(() => ({
    getGuildConfig: vi.fn(),
    upsertGuildConfig: vi.fn(),
  })),
}));

import { revalidatePath } from "next/cache";
import {
  regeneratePublicSlugAction,
  togglePublicCalendar,
} from "@/app/dashboard/actions";

/** 管理権限ありのキャッシュモック設定 */
function setupAdminAuth(guildId: string) {
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
}

/** 管理権限なしのキャッシュモック設定 */
function setupNonAdminAuth(guildId: string) {
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

describe("togglePublicCalendar Server Action", () => {
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

    const result = await togglePublicCalendar({
      guildId: "12345678901234567",
      enabled: true,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("UNAUTHORIZED");
    }
    expect(mockEnablePublicCalendar).not.toHaveBeenCalled();
  });

  it("管理権限がない場合 PERMISSION_DENIED を返す", async () => {
    setupNonAdminAuth("12345678901234567");

    const result = await togglePublicCalendar({
      guildId: "12345678901234567",
      enabled: true,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("PERMISSION_DENIED");
    }
    expect(mockEnablePublicCalendar).not.toHaveBeenCalled();
  });

  it("enabled=true の場合 enablePublicCalendar を呼び出し、スラッグを返す", async () => {
    setupAdminAuth("12345678901234567");
    mockEnablePublicCalendar.mockResolvedValueOnce({
      success: true,
      data: { slug: "abc123def456" },
    });

    const result = await togglePublicCalendar({
      guildId: "12345678901234567",
      enabled: true,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({
        isPublic: true,
        publicSlug: "abc123def456",
      });
    }
    expect(mockEnablePublicCalendar).toHaveBeenCalledWith("12345678901234567");
    expect(mockDisablePublicCalendar).not.toHaveBeenCalled();
  });

  it("enabled=false の場合 disablePublicCalendar を呼び出し、スラッグを保持する", async () => {
    setupAdminAuth("12345678901234567");
    mockDisablePublicCalendar.mockResolvedValueOnce({
      success: true,
      data: { slug: "abc123def456" },
    });

    const result = await togglePublicCalendar({
      guildId: "12345678901234567",
      enabled: false,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({
        isPublic: false,
        publicSlug: "abc123def456",
      });
    }
    expect(mockDisablePublicCalendar).toHaveBeenCalledWith("12345678901234567");
    expect(mockEnablePublicCalendar).not.toHaveBeenCalled();
  });

  it("有効化成功時に revalidatePath を呼び出す", async () => {
    setupAdminAuth("12345678901234567");
    mockEnablePublicCalendar.mockResolvedValueOnce({
      success: true,
      data: { slug: "abc123def456" },
    });

    await togglePublicCalendar({
      guildId: "12345678901234567",
      enabled: true,
    });

    expect(revalidatePath).toHaveBeenCalledWith("/dashboard");
  });

  it("無効化成功時に revalidatePath を呼び出す", async () => {
    setupAdminAuth("12345678901234567");
    mockDisablePublicCalendar.mockResolvedValueOnce({
      success: true,
      data: { slug: "abc123def456" },
    });

    await togglePublicCalendar({
      guildId: "12345678901234567",
      enabled: false,
    });

    expect(revalidatePath).toHaveBeenCalledWith("/dashboard");
  });

  it("サービスエラー時に revalidatePath を呼び出さず、エラーを返す", async () => {
    setupAdminAuth("12345678901234567");
    mockEnablePublicCalendar.mockResolvedValueOnce({
      success: false,
      error: {
        code: "SLUG_GENERATION_FAILED",
        message: "スラッグの生成に失敗しました。",
      },
    });

    const result = await togglePublicCalendar({
      guildId: "12345678901234567",
      enabled: true,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("SLUG_GENERATION_FAILED");
    }
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("無効なギルドIDの場合 VALIDATION_ERROR を返す", async () => {
    const result = await togglePublicCalendar({
      guildId: "invalid-id",
      enabled: true,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("VALIDATION_ERROR");
    }
    expect(mockGetUser).not.toHaveBeenCalled();
  });
});

describe("regeneratePublicSlugAction Server Action", () => {
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

    const result = await regeneratePublicSlugAction({
      guildId: "12345678901234567",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("UNAUTHORIZED");
    }
    expect(mockRegeneratePublicSlug).not.toHaveBeenCalled();
  });

  it("管理権限がない場合 PERMISSION_DENIED を返す", async () => {
    setupNonAdminAuth("12345678901234567");

    const result = await regeneratePublicSlugAction({
      guildId: "12345678901234567",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("PERMISSION_DENIED");
    }
    expect(mockRegeneratePublicSlug).not.toHaveBeenCalled();
  });

  it("スラッグを再生成して新しいスラッグを返す", async () => {
    setupAdminAuth("12345678901234567");
    mockRegeneratePublicSlug.mockResolvedValueOnce({
      success: true,
      data: { slug: "newslug123ab" },
    });

    const result = await regeneratePublicSlugAction({
      guildId: "12345678901234567",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({ publicSlug: "newslug123ab" });
    }
    expect(mockRegeneratePublicSlug).toHaveBeenCalledWith("12345678901234567");
  });

  it("再生成成功時に revalidatePath を呼び出す", async () => {
    setupAdminAuth("12345678901234567");
    mockRegeneratePublicSlug.mockResolvedValueOnce({
      success: true,
      data: { slug: "newslug123ab" },
    });

    await regeneratePublicSlugAction({
      guildId: "12345678901234567",
    });

    expect(revalidatePath).toHaveBeenCalledWith("/dashboard");
  });

  it("再生成失敗時に revalidatePath を呼び出さず、エラーを返す", async () => {
    setupAdminAuth("12345678901234567");
    mockRegeneratePublicSlug.mockResolvedValueOnce({
      success: false,
      error: {
        code: "SLUG_GENERATION_FAILED",
        message: "スラッグの生成に失敗しました。",
      },
    });

    const result = await regeneratePublicSlugAction({
      guildId: "12345678901234567",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("SLUG_GENERATION_FAILED");
    }
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("無効なギルドIDの場合 VALIDATION_ERROR を返す", async () => {
    const result = await regeneratePublicSlugAction({
      guildId: "invalid-id",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("VALIDATION_ERROR");
    }
    expect(mockGetUser).not.toHaveBeenCalled();
  });
});
