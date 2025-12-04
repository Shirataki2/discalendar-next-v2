/**
 * Task 4.1: ギルドサービスの単体テスト
 *
 * Requirements:
 * - 3.1: Discord APIから取得したギルドIDリストを使用してSupabaseのguildsテーブルを検索
 * - 3.2: ANY演算子を使用した一括クエリでN+1問題を回避
 * - 3.3: DBに登録済みかつユーザーが所属しているギルドのみを返却
 *
 * Contracts: GuildService Service Interface (design.md)
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Guild, GuildRow } from "./types";
import { getJoinedGuilds } from "./service";

// Supabaseクライアントのモック型
type MockSupabaseClient = {
  from: ReturnType<typeof vi.fn>;
  select: ReturnType<typeof vi.fn>;
  in: ReturnType<typeof vi.fn>;
};

// モック用のSupabaseクライアント
const mockSupabaseClient: MockSupabaseClient = {
  from: vi.fn(),
  select: vi.fn(),
  in: vi.fn(),
};

// lib/supabase/serverモジュールをモック
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabaseClient)),
}));

describe("Task 4.1: ギルドサービス - getJoinedGuilds", () => {
  beforeEach(() => {
    // チェーンメソッドのモックをセットアップ
    mockSupabaseClient.from.mockReturnValue({
      select: mockSupabaseClient.select,
    });
    mockSupabaseClient.select.mockReturnValue({
      in: mockSupabaseClient.in,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should return empty array for empty guildIds input", async () => {
    // Arrange
    const guildIds: string[] = [];

    // Act
    const result = await getJoinedGuilds(guildIds);

    // Assert
    expect(result).toEqual([]);
    // 空配列の場合、DBクエリは実行されないこと
    expect(mockSupabaseClient.from).not.toHaveBeenCalled();
  });

  it("should return matching guilds for single guildId", async () => {
    // Arrange
    const guildIds = ["123456789012345678"];
    const mockRows: GuildRow[] = [
      {
        id: 1,
        guild_id: "123456789012345678",
        name: "Test Server",
        avatar_url: "https://cdn.discordapp.com/icons/123456789012345678/abc.png",
        locale: "ja",
      },
    ];

    mockSupabaseClient.in.mockResolvedValueOnce({
      data: mockRows,
      error: null,
    });

    // Act
    const result = await getJoinedGuilds(guildIds);

    // Assert
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      id: 1,
      guildId: "123456789012345678",
      name: "Test Server",
      avatarUrl: "https://cdn.discordapp.com/icons/123456789012345678/abc.png",
      locale: "ja",
    });
    expect(mockSupabaseClient.from).toHaveBeenCalledWith("guilds");
    expect(mockSupabaseClient.in).toHaveBeenCalledWith("guild_id", guildIds);
  });

  it("should return matching guilds for multiple guildIds (batch query)", async () => {
    // Arrange
    const guildIds = [
      "123456789012345678",
      "234567890123456789",
      "345678901234567890",
    ];
    const mockRows: GuildRow[] = [
      {
        id: 1,
        guild_id: "123456789012345678",
        name: "Server One",
        avatar_url: null,
        locale: "ja",
      },
      {
        id: 2,
        guild_id: "345678901234567890",
        name: "Server Three",
        avatar_url: "https://cdn.discordapp.com/icons/345678901234567890/def.png",
        locale: "en",
      },
    ];

    mockSupabaseClient.in.mockResolvedValueOnce({
      data: mockRows,
      error: null,
    });

    // Act
    const result = await getJoinedGuilds(guildIds);

    // Assert - DBに登録済みのギルドのみ返却（2件）
    expect(result).toHaveLength(2);
    expect(result[0].guildId).toBe("123456789012345678");
    expect(result[1].guildId).toBe("345678901234567890");
    // 単一のクエリで実行されること（N+1回避）
    expect(mockSupabaseClient.in).toHaveBeenCalledTimes(1);
    expect(mockSupabaseClient.in).toHaveBeenCalledWith("guild_id", guildIds);
  });

  it("should return empty array when no guildIds match in DB", async () => {
    // Arrange
    const guildIds = ["999888777666555444", "111222333444555666"];

    mockSupabaseClient.in.mockResolvedValueOnce({
      data: [],
      error: null,
    });

    // Act
    const result = await getJoinedGuilds(guildIds);

    // Assert
    expect(result).toEqual([]);
    expect(mockSupabaseClient.in).toHaveBeenCalledWith("guild_id", guildIds);
  });

  it("should filter out non-matching guildIds", async () => {
    // Arrange - 3つのギルドIDのうち、1つだけDBに存在
    const guildIds = [
      "111111111111111111",
      "222222222222222222",
      "333333333333333333",
    ];
    const mockRows: GuildRow[] = [
      {
        id: 5,
        guild_id: "222222222222222222",
        name: "Only This Server",
        avatar_url: null,
        locale: "ja",
      },
    ];

    mockSupabaseClient.in.mockResolvedValueOnce({
      data: mockRows,
      error: null,
    });

    // Act
    const result = await getJoinedGuilds(guildIds);

    // Assert - DBに存在する1件のみ返却
    expect(result).toHaveLength(1);
    expect(result[0].guildId).toBe("222222222222222222");
    expect(result[0].name).toBe("Only This Server");
  });

  it("should convert GuildRow to Guild correctly", async () => {
    // Arrange
    const guildIds = ["123456789012345678"];
    const mockRows: GuildRow[] = [
      {
        id: 42,
        guild_id: "123456789012345678",
        name: "Conversion Test",
        avatar_url: "https://example.com/icon.png",
        locale: "en-US",
      },
    ];

    mockSupabaseClient.in.mockResolvedValueOnce({
      data: mockRows,
      error: null,
    });

    // Act
    const result = await getJoinedGuilds(guildIds);

    // Assert - snake_caseからcamelCaseへの変換を確認
    expect(result[0]).toEqual<Guild>({
      id: 42,
      guildId: "123456789012345678",
      name: "Conversion Test",
      avatarUrl: "https://example.com/icon.png",
      locale: "en-US",
    });
  });

  it("should handle null avatar_url correctly", async () => {
    // Arrange
    const guildIds = ["123456789012345678"];
    const mockRows: GuildRow[] = [
      {
        id: 1,
        guild_id: "123456789012345678",
        name: "No Icon Server",
        avatar_url: null,
        locale: "ja",
      },
    ];

    mockSupabaseClient.in.mockResolvedValueOnce({
      data: mockRows,
      error: null,
    });

    // Act
    const result = await getJoinedGuilds(guildIds);

    // Assert
    expect(result[0].avatarUrl).toBeNull();
  });

  it("should throw error when Supabase query fails", async () => {
    // Arrange
    const guildIds = ["123456789012345678"];

    mockSupabaseClient.in.mockResolvedValueOnce({
      data: null,
      error: { message: "Database connection failed", code: "PGRST301" },
    });

    // Act & Assert
    await expect(getJoinedGuilds(guildIds)).rejects.toThrow(
      "Database connection failed"
    );
  });

  it("should query guilds table with correct select statement", async () => {
    // Arrange
    const guildIds = ["123456789012345678"];

    mockSupabaseClient.in.mockResolvedValueOnce({
      data: [],
      error: null,
    });

    // Act
    await getJoinedGuilds(guildIds);

    // Assert
    expect(mockSupabaseClient.from).toHaveBeenCalledWith("guilds");
    expect(mockSupabaseClient.select).toHaveBeenCalledWith("*");
    expect(mockSupabaseClient.in).toHaveBeenCalledWith("guild_id", guildIds);
  });
});
