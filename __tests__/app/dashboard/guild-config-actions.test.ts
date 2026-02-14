/**
 * updateGuildConfig Server Action のテスト
 *
 * Task 6.1: ギルド設定更新の Server Action を作成する
 * - 認証チェック後に parsePermissions → canManageGuild で管理権限を検証
 * - 権限がある場合のみ GuildConfigService.upsertGuildConfig を呼び出す
 * - 権限がない場合は PERMISSION_DENIED エラーを返す
 * - 更新成功時に revalidatePath でダッシュボードを再検証する
 *
 * Requirements: 3.3, 3.4
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// モック設定
const mockGetUser = vi.fn();
const mockSupabase = {
  auth: {
    getUser: mockGetUser,
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
      permissionsBitfield: "8",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("UNAUTHORIZED");
    }
    expect(mockUpsertGuildConfig).not.toHaveBeenCalled();
  });

  it("管理権限がない場合 PERMISSION_DENIED エラーを返す", async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: { id: "user-1" } },
      error: null,
    });

    const result = await updateGuildConfig({
      guildId: "guild-1",
      restricted: true,
      permissionsBitfield: "0", // 権限なし
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("PERMISSION_DENIED");
      expect(result.error.message).toContain("管理権限");
    }
    expect(mockUpsertGuildConfig).not.toHaveBeenCalled();
  });

  it("manageChannels のみでは管理権限と認められない", async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: { id: "user-1" } },
      error: null,
    });

    const result = await updateGuildConfig({
      guildId: "guild-1",
      restricted: true,
      permissionsBitfield: "16", // MANAGE_CHANNELS のみ
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("PERMISSION_DENIED");
    }
  });

  it("ADMINISTRATOR 権限がある場合にギルド設定を更新する", async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: { id: "user-1" } },
      error: null,
    });
    mockUpsertGuildConfig.mockResolvedValueOnce({
      success: true,
      data: { guildId: "guild-1", restricted: true },
    });

    const result = await updateGuildConfig({
      guildId: "guild-1",
      restricted: true,
      permissionsBitfield: "8", // ADMINISTRATOR
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({ guildId: "guild-1", restricted: true });
    }
    expect(mockUpsertGuildConfig).toHaveBeenCalledWith("guild-1", {
      restricted: true,
    });
  });

  it("MANAGE_GUILD 権限がある場合にギルド設定を更新する", async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: { id: "user-1" } },
      error: null,
    });
    mockUpsertGuildConfig.mockResolvedValueOnce({
      success: true,
      data: { guildId: "guild-1", restricted: false },
    });

    const result = await updateGuildConfig({
      guildId: "guild-1",
      restricted: false,
      permissionsBitfield: "32", // MANAGE_GUILD
    });

    expect(result.success).toBe(true);
    expect(mockUpsertGuildConfig).toHaveBeenCalledWith("guild-1", {
      restricted: false,
    });
  });

  it("更新成功時に revalidatePath を呼び出す", async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: { id: "user-1" } },
      error: null,
    });
    mockUpsertGuildConfig.mockResolvedValueOnce({
      success: true,
      data: { guildId: "guild-1", restricted: true },
    });

    await updateGuildConfig({
      guildId: "guild-1",
      restricted: true,
      permissionsBitfield: "8",
    });

    expect(revalidatePath).toHaveBeenCalledWith("/dashboard");
  });

  it("更新失敗時に revalidatePath を呼び出さない", async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: { id: "user-1" } },
      error: null,
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
      permissionsBitfield: "8",
    });

    expect(result.success).toBe(false);
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("GuildConfigService のエラーをそのまま返す", async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: { id: "user-1" } },
      error: null,
    });
    mockUpsertGuildConfig.mockResolvedValueOnce({
      success: false,
      error: {
        code: "UPDATE_FAILED",
        message: "ギルド設定の更新に失敗しました。",
        details: "Foreign key constraint violation",
      },
    });

    const result = await updateGuildConfig({
      guildId: "guild-1",
      restricted: true,
      permissionsBitfield: "8",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("UPDATE_FAILED");
      expect(result.error.details).toBe("Foreign key constraint violation");
    }
  });
});
