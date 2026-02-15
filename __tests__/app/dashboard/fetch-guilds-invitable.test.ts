/**
 * fetchGuilds 拡張テスト — BOT 未参加ギルドの識別と返却
 *
 * Requirements: bot-invite-flow 1.1, 3.1, 3.2, 3.3
 *
 * テスト対象:
 * - Discord API レスポンスと DB 照合結果の差分から invitableGuilds を生成
 * - canInviteBot 権限フィルタリング
 * - Discord CDN アイコン URL 構築
 * - エラー発生時のフォールバック（invitableGuilds 空配列）
 * - キャッシュに invitableGuilds も含めて保存
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchGuilds } from "@/app/dashboard/page";
import { getUserGuilds } from "@/lib/discord/client";
import type { DiscordGuild } from "@/lib/discord/types";
import { clearCache } from "@/lib/guilds/cache";
import { getJoinedGuilds } from "@/lib/guilds/service";
import type { Guild } from "@/lib/guilds/types";

vi.mock("@/lib/discord/client");
vi.mock("@/lib/guilds/service");

describe("fetchGuilds BOT 未参加ギルド拡張", () => {
  const userId = "user-invitable-test";
  const providerToken = "valid-token";

  // ADMINISTRATOR(8) = 0x08
  const adminPermissions = "8";
  // MANAGE_GUILD(32) = 0x20
  const manageGuildPermissions = "32";
  // MANAGE_MESSAGES(8192) のみ — BOT 招待権限なし
  const manageMessagesOnly = "8192";
  // 権限なし
  const noPermissions = "0";

  /** Discord API から返されるギルド一覧（BOT 参加済み + 未参加混在） */
  const mockDiscordGuilds: DiscordGuild[] = [
    {
      id: "guild-joined-1",
      name: "Joined Guild 1",
      icon: "icon_j1",
      owner: true,
      permissions: adminPermissions,
      features: [],
    },
    {
      id: "guild-joined-2",
      name: "Joined Guild 2",
      icon: null,
      owner: false,
      permissions: manageGuildPermissions,
      features: [],
    },
    {
      id: "guild-invitable-admin",
      name: "Invitable Admin Guild",
      icon: "icon_ia",
      owner: false,
      permissions: adminPermissions,
      features: [],
    },
    {
      id: "guild-invitable-manage",
      name: "Invitable Manage Guild",
      icon: "icon_im",
      owner: false,
      permissions: manageGuildPermissions,
      features: [],
    },
    {
      id: "guild-no-invite-perm",
      name: "No Invite Permission Guild",
      icon: "icon_nip",
      owner: false,
      permissions: manageMessagesOnly,
      features: [],
    },
    {
      id: "guild-no-perm",
      name: "No Permission Guild",
      icon: null,
      owner: false,
      permissions: noPermissions,
      features: [],
    },
  ];

  /** DB に存在するギルド（BOT 参加済み） */
  const mockJoinedGuilds: Guild[] = [
    {
      id: 1,
      guildId: "guild-joined-1",
      name: "Joined Guild 1",
      avatarUrl: "https://cdn.discordapp.com/icons/guild-joined-1/icon_j1.png",
      locale: "ja",
    },
    {
      id: 2,
      guildId: "guild-joined-2",
      name: "Joined Guild 2",
      avatarUrl: null,
      locale: "ja",
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    clearCache();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    clearCache();
  });

  it("DB に存在しないギルドのうち招待権限ありのものを invitableGuilds として返す", async () => {
    vi.mocked(getUserGuilds).mockResolvedValueOnce({
      success: true,
      data: mockDiscordGuilds,
    });
    vi.mocked(getJoinedGuilds).mockResolvedValueOnce(mockJoinedGuilds);

    const result = await fetchGuilds(userId, providerToken);

    // BOT 参加済みギルドは 2 件
    expect(result.guilds).toHaveLength(2);

    // invitableGuilds は canInviteBot 権限ありの 2 件のみ
    expect(result.invitableGuilds).toHaveLength(2);

    const invitableIds = result.invitableGuilds.map((g) => g.guildId);
    expect(invitableIds).toContain("guild-invitable-admin");
    expect(invitableIds).toContain("guild-invitable-manage");

    // 招待権限なしのギルドは含まれない
    expect(invitableIds).not.toContain("guild-no-invite-perm");
    expect(invitableIds).not.toContain("guild-no-perm");

    // BOT 参加済みギルドは含まれない
    expect(invitableIds).not.toContain("guild-joined-1");
    expect(invitableIds).not.toContain("guild-joined-2");
  });

  it("invitableGuilds に Discord CDN アイコン URL が正しく設定される", async () => {
    vi.mocked(getUserGuilds).mockResolvedValueOnce({
      success: true,
      data: mockDiscordGuilds,
    });
    vi.mocked(getJoinedGuilds).mockResolvedValueOnce(mockJoinedGuilds);

    const result = await fetchGuilds(userId, providerToken);

    const adminGuild = result.invitableGuilds.find(
      (g) => g.guildId === "guild-invitable-admin"
    );
    expect(adminGuild).toBeDefined();
    expect(adminGuild?.avatarUrl).toBe(
      "https://cdn.discordapp.com/icons/guild-invitable-admin/icon_ia.png?size=128"
    );
    expect(adminGuild?.name).toBe("Invitable Admin Guild");

    const manageGuild = result.invitableGuilds.find(
      (g) => g.guildId === "guild-invitable-manage"
    );
    expect(manageGuild).toBeDefined();
    expect(manageGuild?.avatarUrl).toBe(
      "https://cdn.discordapp.com/icons/guild-invitable-manage/icon_im.png?size=128"
    );
  });

  it("アイコンなしのギルドは avatarUrl が null になる", async () => {
    const discordGuildsWithNullIcon: DiscordGuild[] = [
      {
        id: "guild-no-icon",
        name: "No Icon Guild",
        icon: null,
        owner: true,
        permissions: adminPermissions,
        features: [],
      },
    ];

    vi.mocked(getUserGuilds).mockResolvedValueOnce({
      success: true,
      data: discordGuildsWithNullIcon,
    });
    vi.mocked(getJoinedGuilds).mockResolvedValueOnce([]);

    const result = await fetchGuilds(userId, providerToken);

    expect(result.invitableGuilds).toHaveLength(1);
    expect(result.invitableGuilds[0].avatarUrl).toBeNull();
  });

  it("全ギルドが DB に存在する場合は invitableGuilds が空配列になる", async () => {
    const allJoinedDiscordGuilds: DiscordGuild[] = [
      {
        id: "guild-joined-1",
        name: "Joined Guild 1",
        icon: "icon_j1",
        owner: true,
        permissions: adminPermissions,
        features: [],
      },
    ];

    vi.mocked(getUserGuilds).mockResolvedValueOnce({
      success: true,
      data: allJoinedDiscordGuilds,
    });
    vi.mocked(getJoinedGuilds).mockResolvedValueOnce([mockJoinedGuilds[0]]);

    const result = await fetchGuilds(userId, providerToken);

    expect(result.guilds).toHaveLength(1);
    expect(result.invitableGuilds).toHaveLength(0);
  });

  it("Discord API エラー時は invitableGuilds が空配列にフォールバックする", async () => {
    vi.mocked(getUserGuilds).mockResolvedValueOnce({
      success: false,
      error: { code: "unauthorized", message: "Token expired" },
    });

    const result = await fetchGuilds(userId, providerToken);

    expect(result.guilds).toEqual([]);
    expect(result.invitableGuilds).toEqual([]);
    expect(result.error).toEqual({ type: "token_expired" });
  });

  it("DB エラー時は invitableGuilds が空配列にフォールバックする", async () => {
    vi.mocked(getUserGuilds).mockResolvedValueOnce({
      success: true,
      data: mockDiscordGuilds,
    });
    vi.mocked(getJoinedGuilds).mockRejectedValueOnce(
      new Error("Database connection failed")
    );

    const result = await fetchGuilds(userId, providerToken);

    expect(result.guilds).toEqual([]);
    expect(result.invitableGuilds).toEqual([]);
    expect(result.error).toBeDefined();
  });

  it("provider_token 未提供時は invitableGuilds が空配列になる", async () => {
    const result = await fetchGuilds(userId, null);

    expect(result.guilds).toEqual([]);
    expect(result.invitableGuilds).toEqual([]);
    expect(result.error).toEqual({ type: "no_token" });
  });

  it("キャッシュされた結果にも invitableGuilds が含まれる", async () => {
    vi.mocked(getUserGuilds).mockResolvedValueOnce({
      success: true,
      data: mockDiscordGuilds,
    });
    vi.mocked(getJoinedGuilds).mockResolvedValueOnce(mockJoinedGuilds);

    // 1回目: API から取得
    const result1 = await fetchGuilds(userId, providerToken);
    expect(result1.invitableGuilds).toHaveLength(2);

    // 2回目: キャッシュから取得
    const result2 = await fetchGuilds(userId, providerToken);
    expect(result2.invitableGuilds).toHaveLength(2);
    expect(result2.invitableGuilds).toEqual(result1.invitableGuilds);

    // API は 1 回だけ呼ばれる
    expect(getUserGuilds).toHaveBeenCalledTimes(1);
  });

  it("Discord ギルド一覧が空の場合は invitableGuilds も空配列になる", async () => {
    vi.mocked(getUserGuilds).mockResolvedValueOnce({
      success: true,
      data: [],
    });

    const result = await fetchGuilds(userId, providerToken);

    expect(result.guilds).toEqual([]);
    expect(result.invitableGuilds).toEqual([]);
  });
});
