import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createUserGuildsService,
  type UserGuildsServiceInterface,
} from "@/lib/guilds/user-guilds-service";

const mockSupabaseClient = {
  from: vi.fn(),
};

describe("UserGuildsService", () => {
  let service: UserGuildsServiceInterface;

  beforeEach(() => {
    service = createUserGuildsService(
      mockSupabaseClient as unknown as Parameters<
        typeof createUserGuildsService
      >[0]
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("syncUserGuilds", () => {
    const userId = "user-uuid-123";
    const guilds = [
      { guildId: "guild-1", permissions: "2147483647" },
      { guildId: "guild-2", permissions: "0" },
    ];

    it("upsert 成功時に synced 件数と removed 件数を返す", async () => {
      const mockUpsertQuery = {
        upsert: vi.fn().mockResolvedValue({ data: null, error: null }),
      };
      const mockDeleteQuery = {
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        not: vi.fn().mockReturnThis(),
        select: vi.fn().mockResolvedValue({
          data: [{ guild_id: "guild-old" }],
          error: null,
        }),
      };

      mockSupabaseClient.from
        .mockReturnValueOnce(mockUpsertQuery)
        .mockReturnValueOnce(mockDeleteQuery);

      const result = await service.syncUserGuilds(userId, guilds);

      expect(result).toEqual({
        success: true,
        data: { synced: 2, removed: 1 },
      });

      expect(mockSupabaseClient.from).toHaveBeenCalledWith("user_guilds");
      expect(mockUpsertQuery.upsert).toHaveBeenCalledWith(
        [
          {
            user_id: userId,
            guild_id: "guild-1",
            permissions: "2147483647",
          },
          { user_id: userId, guild_id: "guild-2", permissions: "0" },
        ],
        { onConflict: "user_id,guild_id" }
      );
    });

    it("upsert 失敗時に SYNC_FAILED エラーを返す", async () => {
      const mockUpsertQuery = {
        upsert: vi.fn().mockResolvedValue({
          data: null,
          error: { message: "FK constraint violation" },
        }),
      };

      mockSupabaseClient.from.mockReturnValueOnce(mockUpsertQuery);

      const result = await service.syncUserGuilds(userId, guilds);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe("SYNC_FAILED");
        expect(result.error.details).toBe("FK constraint violation");
      }
    });

    it("不在ギルド削除失敗時に DELETE_FAILED エラーを返す", async () => {
      const mockUpsertQuery = {
        upsert: vi.fn().mockResolvedValue({ data: null, error: null }),
      };
      const mockDeleteQuery = {
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        not: vi.fn().mockReturnThis(),
        select: vi.fn().mockResolvedValue({
          data: null,
          error: { message: "Delete failed" },
        }),
      };

      mockSupabaseClient.from
        .mockReturnValueOnce(mockUpsertQuery)
        .mockReturnValueOnce(mockDeleteQuery);

      const result = await service.syncUserGuilds(userId, guilds);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe("DELETE_FAILED");
        expect(result.error.details).toBe("Delete failed");
      }
    });

    it("空のギルドリストで全レコードが削除される", async () => {
      const mockDeleteQuery = {
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockResolvedValue({
          data: [{ guild_id: "guild-1" }, { guild_id: "guild-2" }],
          error: null,
        }),
      };

      mockSupabaseClient.from.mockReturnValueOnce(mockDeleteQuery);

      const result = await service.syncUserGuilds(userId, []);

      expect(result).toEqual({
        success: true,
        data: { synced: 0, removed: 2 },
      });
      // upsert はスキップされるので from は 1 回のみ（delete 用）
      expect(mockSupabaseClient.from).toHaveBeenCalledTimes(1);
    });

    it("例外発生時に SYNC_FAILED エラーを返す", async () => {
      mockSupabaseClient.from.mockImplementation(() => {
        throw new Error("Network error");
      });

      const result = await service.syncUserGuilds(userId, guilds);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe("SYNC_FAILED");
        expect(result.error.details).toBe("Network error");
      }
    });

    it("削除対象がない場合 removed: 0 を返す", async () => {
      const mockUpsertQuery = {
        upsert: vi.fn().mockResolvedValue({ data: null, error: null }),
      };
      const mockDeleteQuery = {
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        not: vi.fn().mockReturnThis(),
        select: vi.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      };

      mockSupabaseClient.from
        .mockReturnValueOnce(mockUpsertQuery)
        .mockReturnValueOnce(mockDeleteQuery);

      const result = await service.syncUserGuilds(userId, guilds);

      expect(result).toEqual({
        success: true,
        data: { synced: 2, removed: 0 },
      });
    });
  });

  describe("getUserGuildPermissions", () => {
    const userId = "user-uuid-123";
    const guildId = "guild-1";

    it("レコードが存在する場合 permissions 文字列を返す", async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { permissions: "2147483647" },
          error: null,
        }),
      };
      mockSupabaseClient.from.mockReturnValue(mockQuery);

      const result = await service.getUserGuildPermissions(userId, guildId);

      expect(result).toEqual({
        success: true,
        data: "2147483647",
      });
      expect(mockSupabaseClient.from).toHaveBeenCalledWith("user_guilds");
      expect(mockQuery.select).toHaveBeenCalledWith("permissions");
    });

    it("レコードが存在しない場合 null を返す", async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { code: "PGRST116", message: "No rows found" },
        }),
      };
      mockSupabaseClient.from.mockReturnValue(mockQuery);

      const result = await service.getUserGuildPermissions(userId, guildId);

      expect(result).toEqual({
        success: true,
        data: null,
      });
    });

    it("DB エラー時に FETCH_FAILED エラーを返す", async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { code: "500", message: "Internal server error" },
        }),
      };
      mockSupabaseClient.from.mockReturnValue(mockQuery);

      const result = await service.getUserGuildPermissions(userId, guildId);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe("FETCH_FAILED");
        expect(result.error.details).toBe("Internal server error");
      }
    });

    it("permissions が '0' の場合も正しく返す", async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { permissions: "0" },
          error: null,
        }),
      };
      mockSupabaseClient.from.mockReturnValue(mockQuery);

      const result = await service.getUserGuildPermissions(userId, guildId);

      expect(result).toEqual({
        success: true,
        data: "0",
      });
    });
  });
});
