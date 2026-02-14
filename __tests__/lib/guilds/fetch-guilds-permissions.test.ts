/**
 * fetchGuilds 権限情報拡張テスト
 *
 * GuildWithPermissions 型と fetchGuilds() の権限解析統合を検証する。
 *
 * Requirements: 2.1, 2.2, 2.3, 2.4
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

describe("fetchGuilds 権限情報拡張", () => {
  const userId = "user-perm-test";
  const providerToken = "valid-token";

  // ADMINISTRATOR(8) + MANAGE_GUILD(32) = 40
  const adminPermissions = "40";
  // 権限なし
  const noPermissions = "0";
  // MANAGE_EVENTS(1 << 33) のみ = 8589934592
  const manageEventsOnly = "8589934592";

  const mockDiscordGuilds: DiscordGuild[] = [
    {
      id: "guild-1",
      name: "Admin Guild",
      icon: "icon1",
      owner: true,
      permissions: adminPermissions,
      features: [],
    },
    {
      id: "guild-2",
      name: "No Permission Guild",
      icon: null,
      owner: false,
      permissions: noPermissions,
      features: [],
    },
    {
      id: "guild-3",
      name: "Events Only Guild",
      icon: "icon3",
      owner: false,
      permissions: manageEventsOnly,
      features: [],
    },
  ];

  const mockJoinedGuilds: Guild[] = [
    {
      id: 1,
      guildId: "guild-1",
      name: "Admin Guild",
      avatarUrl: "https://cdn.discordapp.com/icons/guild-1/icon1.png",
      locale: "ja",
    },
    {
      id: 2,
      guildId: "guild-2",
      name: "No Permission Guild",
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

  it("Discord API の権限ビットフィールドを解析して GuildWithPermissions を返す", async () => {
    vi.mocked(getUserGuilds).mockResolvedValueOnce({
      success: true,
      data: mockDiscordGuilds,
    });
    vi.mocked(getJoinedGuilds).mockResolvedValueOnce(mockJoinedGuilds);

    const result = await fetchGuilds(userId, providerToken);

    expect(result.guilds).toHaveLength(2);

    // guild-1: ADMINISTRATOR + MANAGE_GUILD
    const adminGuild = result.guilds.find((g) => g.guildId === "guild-1");
    expect(adminGuild).toBeDefined();
    expect(adminGuild?.permissions).toBeDefined();
    expect(adminGuild?.permissions.administrator).toBe(true);
    expect(adminGuild?.permissions.manageGuild).toBe(true);
    expect(adminGuild?.permissions.manageChannels).toBe(false);
    expect(adminGuild?.permissions.manageMessages).toBe(false);
    expect(adminGuild?.permissions.manageRoles).toBe(false);
    expect(adminGuild?.permissions.manageEvents).toBe(false);

    // guild-2: 権限なし
    const noPermGuild = result.guilds.find((g) => g.guildId === "guild-2");
    expect(noPermGuild).toBeDefined();
    expect(noPermGuild?.permissions).toBeDefined();
    expect(noPermGuild?.permissions.administrator).toBe(false);
    expect(noPermGuild?.permissions.manageGuild).toBe(false);
    expect(noPermGuild?.permissions.manageChannels).toBe(false);
    expect(noPermGuild?.permissions.manageMessages).toBe(false);
    expect(noPermGuild?.permissions.manageRoles).toBe(false);
    expect(noPermGuild?.permissions.manageEvents).toBe(false);
  });

  it("DB に存在しないギルドの権限は結果に含まれない", async () => {
    vi.mocked(getUserGuilds).mockResolvedValueOnce({
      success: true,
      data: mockDiscordGuilds,
    });
    vi.mocked(getJoinedGuilds).mockResolvedValueOnce(mockJoinedGuilds);

    const result = await fetchGuilds(userId, providerToken);

    // guild-3 は DB に存在しないため結果に含まれない
    const eventsGuild = result.guilds.find((g) => g.guildId === "guild-3");
    expect(eventsGuild).toBeUndefined();
  });

  it("provider_token が未提供の場合はデフォルト権限（全 false）の空配列を返す", async () => {
    const result = await fetchGuilds(userId, null);

    expect(result.guilds).toEqual([]);
    expect(result.error).toEqual({ type: "no_token" });
  });

  it("Discord API エラー時はデフォルト権限で空配列を返す", async () => {
    vi.mocked(getUserGuilds).mockResolvedValueOnce({
      success: false,
      error: { code: "unauthorized", message: "Token expired" },
    });

    const result = await fetchGuilds(userId, providerToken);

    expect(result.guilds).toEqual([]);
    expect(result.error).toEqual({ type: "token_expired" });
  });

  it("Discord ギルドの permissions フィールドが不正な場合はデフォルト権限を付与する", async () => {
    const guildsWithInvalidPermissions: DiscordGuild[] = [
      {
        id: "guild-1",
        name: "Invalid Perm Guild",
        icon: null,
        owner: false,
        permissions: "invalid-not-a-number",
        features: [],
      },
    ];

    vi.mocked(getUserGuilds).mockResolvedValueOnce({
      success: true,
      data: guildsWithInvalidPermissions,
    });
    vi.mocked(getJoinedGuilds).mockResolvedValueOnce([mockJoinedGuilds[0]]);

    const result = await fetchGuilds(userId, providerToken);

    expect(result.guilds).toHaveLength(1);
    expect(result.guilds[0].permissions.administrator).toBe(false);
    expect(result.guilds[0].permissions.manageGuild).toBe(false);
    expect(result.guilds[0].permissions.raw).toBe(0n);
  });

  it("キャッシュされた結果にも権限情報が含まれる", async () => {
    vi.mocked(getUserGuilds).mockResolvedValueOnce({
      success: true,
      data: mockDiscordGuilds,
    });
    vi.mocked(getJoinedGuilds).mockResolvedValueOnce(mockJoinedGuilds);

    // 1回目: APIから取得
    const result1 = await fetchGuilds(userId, providerToken);
    expect(result1.guilds[0].permissions).toBeDefined();

    // 2回目: キャッシュから取得
    const result2 = await fetchGuilds(userId, providerToken);
    expect(result2.guilds[0].permissions).toBeDefined();
    expect(result2.guilds[0].permissions.administrator).toBe(
      result1.guilds[0].permissions.administrator
    );

    // API は1回だけ呼ばれる
    expect(getUserGuilds).toHaveBeenCalledTimes(1);
  });

  it("GuildWithPermissions は Guild のプロパティをすべて保持する", async () => {
    vi.mocked(getUserGuilds).mockResolvedValueOnce({
      success: true,
      data: mockDiscordGuilds,
    });
    vi.mocked(getJoinedGuilds).mockResolvedValueOnce(mockJoinedGuilds);

    const result = await fetchGuilds(userId, providerToken);
    const guild = result.guilds[0];

    // Guild の既存プロパティがすべて保持されている
    expect(guild.id).toBe(1);
    expect(guild.guildId).toBe("guild-1");
    expect(guild.name).toBe("Admin Guild");
    expect(guild.avatarUrl).toBe(
      "https://cdn.discordapp.com/icons/guild-1/icon1.png"
    );
    expect(guild.locale).toBe("ja");
    // permissions が追加されている
    expect(guild.permissions).toBeDefined();
  });
});
