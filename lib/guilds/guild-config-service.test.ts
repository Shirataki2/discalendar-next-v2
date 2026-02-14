/**
 * GuildConfigService のユニットテスト
 *
 * Task 2.2: GuildConfigService のユニットテストを作成する
 * - getGuildConfig: レコード存在/不在のケース
 * - upsertGuildConfig: 新規作成/既存更新のケース
 * - DB エラー時のエラーレスポンス
 *
 * Requirements: 3.1, 3.2, 3.3
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  type GuildConfigServiceInterface,
  createGuildConfigService,
} from "./guild-config-service";

// Supabase クライアントモック
const mockSupabaseClient = {
  from: vi.fn(),
};

describe("GuildConfigService", () => {
  let service: GuildConfigServiceInterface;

  beforeEach(() => {
    service = createGuildConfigService(
      mockSupabaseClient as unknown as Parameters<
        typeof createGuildConfigService
      >[0],
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("getGuildConfig", () => {
    it("レコードが存在する場合、guild_config を返す", async () => {
      const mockRow = { guild_id: "123456789", restricted: true };

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockRow,
          error: null,
        }),
      };
      mockSupabaseClient.from.mockReturnValue(mockQuery);

      const result = await service.getGuildConfig("123456789");

      expect(result).toEqual({
        guildId: "123456789",
        restricted: true,
      });
      expect(mockSupabaseClient.from).toHaveBeenCalledWith("guild_config");
      expect(mockQuery.eq).toHaveBeenCalledWith("guild_id", "123456789");
    });

    it("レコードが存在しない場合、restricted: false のデフォルト値を返す", async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { code: "PGRST116", message: "No rows found" },
        }),
      };
      mockSupabaseClient.from.mockReturnValue(mockQuery);

      const result = await service.getGuildConfig("999999999");

      expect(result).toEqual({
        guildId: "999999999",
        restricted: false,
      });
    });

    it("DB エラー時はデフォルト値を返す（フェイルセーフ）", async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { code: "500", message: "Internal server error" },
        }),
      };
      mockSupabaseClient.from.mockReturnValue(mockQuery);

      const result = await service.getGuildConfig("123456789");

      expect(result).toEqual({
        guildId: "123456789",
        restricted: false,
      });
    });

    it("restricted: false のレコードを正しく返す", async () => {
      const mockRow = { guild_id: "123456789", restricted: false };

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockRow,
          error: null,
        }),
      };
      mockSupabaseClient.from.mockReturnValue(mockQuery);

      const result = await service.getGuildConfig("123456789");

      expect(result).toEqual({
        guildId: "123456789",
        restricted: false,
      });
    });
  });

  describe("upsertGuildConfig", () => {
    it("新規作成（INSERT）が成功した場合、success を返す", async () => {
      const mockRow = { guild_id: "123456789", restricted: true };

      const mockQuery = {
        upsert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockRow,
          error: null,
        }),
      };
      mockSupabaseClient.from.mockReturnValue(mockQuery);

      const result = await service.upsertGuildConfig("123456789", {
        restricted: true,
      });

      expect(result).toEqual({
        success: true,
        data: {
          guildId: "123456789",
          restricted: true,
        },
      });
      expect(mockSupabaseClient.from).toHaveBeenCalledWith("guild_config");
      expect(mockQuery.upsert).toHaveBeenCalledWith({
        guild_id: "123456789",
        restricted: true,
      });
    });

    it("既存更新（UPDATE）が成功した場合、success を返す", async () => {
      const mockRow = { guild_id: "123456789", restricted: false };

      const mockQuery = {
        upsert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockRow,
          error: null,
        }),
      };
      mockSupabaseClient.from.mockReturnValue(mockQuery);

      const result = await service.upsertGuildConfig("123456789", {
        restricted: false,
      });

      expect(result).toEqual({
        success: true,
        data: {
          guildId: "123456789",
          restricted: false,
        },
      });
    });

    it("DB エラー時はエラーレスポンスを返す", async () => {
      const mockQuery = {
        upsert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { message: "Foreign key constraint violation", code: "23503" },
        }),
      };
      mockSupabaseClient.from.mockReturnValue(mockQuery);

      const result = await service.upsertGuildConfig("invalid_guild_id", {
        restricted: true,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe("UPDATE_FAILED");
        expect(result.error.message).toBe(
          "ギルド設定の更新に失敗しました。",
        );
        expect(result.error.details).toBe(
          "Foreign key constraint violation",
        );
      }
    });

    it("例外発生時はエラーレスポンスを返す", async () => {
      const mockQuery = {
        upsert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockRejectedValue(new Error("Network error")),
      };
      mockSupabaseClient.from.mockReturnValue(mockQuery);

      const result = await service.upsertGuildConfig("123456789", {
        restricted: true,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe("UPDATE_FAILED");
        expect(result.error.details).toBe("Network error");
      }
    });

    it("upsert は冪等である（同じ入力で同じ結果）", async () => {
      const mockRow = { guild_id: "123456789", restricted: true };

      const mockQuery = {
        upsert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockRow,
          error: null,
        }),
      };
      mockSupabaseClient.from.mockReturnValue(mockQuery);

      const result1 = await service.upsertGuildConfig("123456789", {
        restricted: true,
      });
      const result2 = await service.upsertGuildConfig("123456789", {
        restricted: true,
      });

      expect(result1).toEqual(result2);
    });
  });
});
