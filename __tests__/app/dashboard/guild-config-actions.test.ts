/**
 * updateGuildConfig Server Action のテスト
 *
 * Task 6.1: ギルド設定更新の Server Action を作成する
 * - サーバー側で Discord 権限を解決（クライアント入力を信頼しない）
 * - 権限がある場合のみ GuildConfigService.upsertGuildConfig を呼び出す
 * - 権限がない場合は PERMISSION_DENIED エラーを返す
 * - 更新成功時に revalidatePath でダッシュボードを再検証する
 *
 * Requirements: 3.3, 3.4
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

const mockUpsertGuildConfig = vi.fn();
vi.mock("@/lib/guilds/guild-config-service", () => ({
  createGuildConfigService: vi.fn(() => ({
    getGuildConfig: vi.fn(),
    upsertGuildConfig: mockUpsertGuildConfig,
  })),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

// getCachedGuilds モック
const mockGetCachedGuilds = vi.fn();
vi.mock("@/lib/guilds/cache", () => ({
  getCachedGuilds: (...args: unknown[]) => mockGetCachedGuilds(...args),
}));

// getUserGuilds モック
const mockGetUserGuilds = vi.fn();
vi.mock("@/lib/discord/client", () => ({
  getUserGuilds: (...args: unknown[]) => mockGetUserGuilds(...args),
}));

import { revalidatePath } from "next/cache";
import { updateGuildConfig } from "@/app/dashboard/actions";

describe("updateGuildConfig Server Action", () => {
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

    const result = await updateGuildConfig({
      guildId: "guild-1",
      restricted: true,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("UNAUTHORIZED");
    }
    expect(mockUpsertGuildConfig).not.toHaveBeenCalled();
  });

  it("キャッシュから権限を取得し、管理権限がない場合 PERMISSION_DENIED を返す", async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: { id: "user-1" } },
      error: null,
    });
    // キャッシュに権限なしのギルドを返す
    mockGetCachedGuilds.mockReturnValueOnce({
      guilds: [
        {
          guildId: "guild-1",
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

    const result = await updateGuildConfig({
      guildId: "guild-1",
      restricted: true,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("PERMISSION_DENIED");
      expect(result.error.message).toContain("管理権限");
    }
    expect(mockUpsertGuildConfig).not.toHaveBeenCalled();
  });

  it("キャッシュから ADMINISTRATOR 権限を取得し、ギルド設定を更新する", async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: { id: "user-1" } },
      error: null,
    });
    // キャッシュにADMINISTRATOR権限ありのギルドを返す
    mockGetCachedGuilds.mockReturnValueOnce({
      guilds: [
        {
          guildId: "guild-1",
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
    mockUpsertGuildConfig.mockResolvedValueOnce({
      success: true,
      data: { guildId: "guild-1", restricted: true },
    });

    const result = await updateGuildConfig({
      guildId: "guild-1",
      restricted: true,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({ guildId: "guild-1", restricted: true });
    }
    expect(mockUpsertGuildConfig).toHaveBeenCalledWith("guild-1", {
      restricted: true,
    });
  });

  it("キャッシュミス時に Discord API から権限を取得する", async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: { id: "user-1" } },
      error: null,
    });
    mockGetCachedGuilds.mockReturnValueOnce(null); // キャッシュミス
    mockGetSession.mockResolvedValueOnce({
      data: { session: { provider_token: "discord-token" } },
    });
    mockGetUserGuilds.mockResolvedValueOnce({
      success: true,
      data: [{ id: "guild-1", name: "Test", permissions: "32" }], // MANAGE_GUILD
    });
    mockUpsertGuildConfig.mockResolvedValueOnce({
      success: true,
      data: { guildId: "guild-1", restricted: false },
    });

    const result = await updateGuildConfig({
      guildId: "guild-1",
      restricted: false,
    });

    expect(result.success).toBe(true);
    expect(mockGetUserGuilds).toHaveBeenCalledWith("discord-token");
    expect(mockUpsertGuildConfig).toHaveBeenCalledWith("guild-1", {
      restricted: false,
    });
  });

  it("provider_token がない場合 UNAUTHORIZED エラーを返す", async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: { id: "user-1" } },
      error: null,
    });
    mockGetCachedGuilds.mockReturnValueOnce(null);
    mockGetSession.mockResolvedValueOnce({
      data: { session: null },
    });

    const result = await updateGuildConfig({
      guildId: "guild-1",
      restricted: true,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("UNAUTHORIZED");
    }
  });

  it("更新成功時に revalidatePath を呼び出す", async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: { id: "user-1" } },
      error: null,
    });
    mockGetCachedGuilds.mockReturnValueOnce({
      guilds: [
        {
          guildId: "guild-1",
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
    mockUpsertGuildConfig.mockResolvedValueOnce({
      success: true,
      data: { guildId: "guild-1", restricted: true },
    });

    await updateGuildConfig({
      guildId: "guild-1",
      restricted: true,
    });

    expect(revalidatePath).toHaveBeenCalledWith("/dashboard");
  });

  it("更新失敗時に revalidatePath を呼び出さない", async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: { id: "user-1" } },
      error: null,
    });
    mockGetCachedGuilds.mockReturnValueOnce({
      guilds: [
        {
          guildId: "guild-1",
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
    mockUpsertGuildConfig.mockResolvedValueOnce({
      success: false,
      error: {
        code: "UPDATE_FAILED",
        message: "DB error",
      },
    });

    const result = await updateGuildConfig({
      guildId: "guild-1",
      restricted: true,
    });

    expect(result.success).toBe(false);
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("ギルドのメンバーでない場合 PERMISSION_DENIED エラーを返す", async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: { id: "user-1" } },
      error: null,
    });
    mockGetCachedGuilds.mockReturnValueOnce(null);
    mockGetSession.mockResolvedValueOnce({
      data: { session: { provider_token: "discord-token" } },
    });
    mockGetUserGuilds.mockResolvedValueOnce({
      success: true,
      data: [{ id: "other-guild", name: "Other", permissions: "8" }],
    });

    const result = await updateGuildConfig({
      guildId: "guild-1",
      restricted: true,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("PERMISSION_DENIED");
    }
  });
});
