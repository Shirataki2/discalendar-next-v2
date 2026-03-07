/**
 * fetchGuilds メンバーシップ同期統合テスト
 *
 * Discord API 成功時に user_guilds テーブルへの同期が行われることを検証する。
 *
 * Requirements: 3.1, 3.2, 3.3, 3.4
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getUserGuilds } from "@/lib/discord/client";
import type { DiscordGuild } from "@/lib/discord/types";
import { clearCache } from "@/lib/guilds/cache";
import { fetchGuilds } from "@/lib/guilds/fetch-guilds";
import { getJoinedGuilds } from "@/lib/guilds/service";
import type { Guild } from "@/lib/guilds/types";
import type { UserGuildsServiceInterface } from "@/lib/guilds/user-guilds-service";
import { createUserGuildsService } from "@/lib/guilds/user-guilds-service";

vi.mock("@/lib/discord/client");
vi.mock("@/lib/guilds/service");
vi.mock("@/lib/guilds/user-guilds-service");
vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({}),
}));

describe("fetchGuilds メンバーシップ同期", () => {
  const userId = "user-sync-test";
  const providerToken = "valid-token";

  const mockDiscordGuilds: DiscordGuild[] = [
    {
      id: "guild-1",
      name: "Guild 1",
      icon: "icon1",
      owner: true,
      permissions: "2147483647",
      features: [],
    },
    {
      id: "guild-2",
      name: "Guild 2",
      icon: null,
      owner: false,
      permissions: "0",
      features: [],
    },
    {
      id: "guild-not-in-db",
      name: "Not In DB",
      icon: null,
      owner: false,
      permissions: "8",
      features: [],
    },
  ];

  const mockJoinedGuilds: Guild[] = [
    {
      id: 1,
      guildId: "guild-1",
      name: "Guild 1",
      avatarUrl: "https://cdn.discordapp.com/icons/guild-1/icon1.png",
      locale: "ja",
    },
    {
      id: 2,
      guildId: "guild-2",
      name: "Guild 2",
      avatarUrl: null,
      locale: "ja",
    },
  ];

  let mockSyncUserGuilds: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    clearCache();
    vi.useFakeTimers();

    mockSyncUserGuilds = vi.fn().mockResolvedValue({
      success: true,
      data: { synced: 2, removed: 0 },
    });

    vi.mocked(createUserGuildsService).mockReturnValue({
      syncUserGuilds: mockSyncUserGuilds,
      getUserGuildPermissions: vi.fn(),
    } as UserGuildsServiceInterface);
  });

  afterEach(() => {
    vi.useRealTimers();
    clearCache();
  });

  it("Discord API 成功時に syncUserGuilds が DB 存在ギルドのみで呼ばれる", async () => {
    vi.mocked(getUserGuilds).mockResolvedValueOnce({
      success: true,
      data: mockDiscordGuilds,
    });
    vi.mocked(getJoinedGuilds).mockResolvedValueOnce(mockJoinedGuilds);

    const result = await fetchGuilds(userId, providerToken);

    // ギルド一覧は正常に返却される
    expect(result.guilds).toHaveLength(2);
    expect(result.error).toBeUndefined();

    // syncUserGuilds が呼ばれている
    expect(mockSyncUserGuilds).toHaveBeenCalledTimes(1);
    expect(mockSyncUserGuilds).toHaveBeenCalledWith(userId, [
      { guildId: "guild-1", permissions: "2147483647" },
      { guildId: "guild-2", permissions: "0" },
    ]);
  });

  it("同期失敗時にエラーログされるがギルド一覧は正常に返却される", async () => {
    const { captureException } = await import("@sentry/nextjs");

    vi.mocked(getUserGuilds).mockResolvedValueOnce({
      success: true,
      data: mockDiscordGuilds,
    });
    vi.mocked(getJoinedGuilds).mockResolvedValueOnce(mockJoinedGuilds);

    mockSyncUserGuilds.mockResolvedValueOnce({
      success: false,
      error: {
        code: "SYNC_FAILED",
        message: "sync error",
      },
    });

    const result = await fetchGuilds(userId, providerToken);

    // ギルド一覧は正常に返却される（同期失敗がUIをブロックしない）
    expect(result.guilds).toHaveLength(2);
    expect(result.error).toBeUndefined();

    // syncUserGuilds は呼ばれている
    expect(mockSyncUserGuilds).toHaveBeenCalledTimes(1);
  });

  it("同期処理が例外をスローしてもギルド一覧は正常に返却される", async () => {
    const { captureException } = await import("@sentry/nextjs");

    vi.mocked(getUserGuilds).mockResolvedValueOnce({
      success: true,
      data: mockDiscordGuilds,
    });
    vi.mocked(getJoinedGuilds).mockResolvedValueOnce(mockJoinedGuilds);

    mockSyncUserGuilds.mockRejectedValueOnce(new Error("Network failure"));

    const result = await fetchGuilds(userId, providerToken);

    // ギルド一覧は正常に返却される
    expect(result.guilds).toHaveLength(2);
    expect(result.error).toBeUndefined();

    // captureException が呼ばれている
    expect(captureException).toHaveBeenCalled();
  });

  it("キャッシュヒット時は syncUserGuilds が呼ばれない", async () => {
    vi.mocked(getUserGuilds).mockResolvedValueOnce({
      success: true,
      data: mockDiscordGuilds,
    });
    vi.mocked(getJoinedGuilds).mockResolvedValueOnce(mockJoinedGuilds);

    // 1回目: APIから取得（キャッシュにセット）
    await fetchGuilds(userId, providerToken);

    // モックをクリアして2回目の呼び出しを検証
    mockSyncUserGuilds.mockClear();

    // 2回目: キャッシュから取得
    const result = await fetchGuilds(userId, providerToken);

    expect(result.guilds).toHaveLength(2);
    // キャッシュヒットのため syncUserGuilds は呼ばれない
    expect(mockSyncUserGuilds).not.toHaveBeenCalled();
  });

  it("Discord API 失敗時は syncUserGuilds が呼ばれない", async () => {
    vi.mocked(getUserGuilds).mockResolvedValueOnce({
      success: false,
      error: { code: "unauthorized", message: "Token expired" },
    });

    const result = await fetchGuilds(userId, providerToken);

    expect(result.error).toEqual({ type: "token_expired" });
    expect(mockSyncUserGuilds).not.toHaveBeenCalled();
  });

  it("Discord API が空のギルドを返した場合は syncUserGuilds が空配列で呼ばれる", async () => {
    vi.mocked(getUserGuilds).mockResolvedValueOnce({
      success: true,
      data: [],
    });

    const result = await fetchGuilds(userId, providerToken);

    expect(result.guilds).toEqual([]);
    // 空のギルドリストでも syncUserGuilds は呼ばれる（脱退検知のため）
    expect(mockSyncUserGuilds).toHaveBeenCalledWith(userId, []);
  });
});
