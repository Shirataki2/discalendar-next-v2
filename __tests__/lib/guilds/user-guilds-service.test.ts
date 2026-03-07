import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createUserGuildsService,
  type UserGuildsServiceInterface,
} from "@/lib/guilds/user-guilds-service";

const mockRpc = vi.fn();
const mockSupabaseClient = {
  from: vi.fn(),
  rpc: mockRpc,
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
    const guilds = [
      { guildId: "guild-1", permissions: "2147483647" },
      { guildId: "guild-2", permissions: "0" },
    ];

    it("RPC 成功時に synced 件数と removed 件数を返す", async () => {
      mockRpc.mockResolvedValueOnce({
        data: [{ synced: 2, removed: 1 }],
        error: null,
      });

      const result = await service.syncUserGuilds(guilds);

      expect(result).toEqual({
        success: true,
        data: { synced: 2, removed: 1 },
      });

      expect(mockRpc).toHaveBeenCalledWith("sync_user_guilds", {
        p_guild_ids: ["guild-1", "guild-2"],
        p_permissions: [2_147_483_647, 0],
      });
    });

    it("RPC 失敗時に SYNC_FAILED エラーを返す", async () => {
      mockRpc.mockResolvedValueOnce({
        data: null,
        error: { message: "FK constraint violation" },
      });

      const result = await service.syncUserGuilds(guilds);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe("SYNC_FAILED");
        expect(result.error.details).toBe("FK constraint violation");
      }
    });

    it("空のギルドリストでも RPC が呼ばれる", async () => {
      mockRpc.mockResolvedValueOnce({
        data: [{ synced: 0, removed: 2 }],
        error: null,
      });

      const result = await service.syncUserGuilds([]);

      expect(result).toEqual({
        success: true,
        data: { synced: 0, removed: 2 },
      });

      expect(mockRpc).toHaveBeenCalledWith("sync_user_guilds", {
        p_guild_ids: [],
        p_permissions: [],
      });
    });

    it("例外発生時に SYNC_FAILED エラーを返す", async () => {
      mockRpc.mockRejectedValueOnce(new Error("Network error"));

      const result = await service.syncUserGuilds(guilds);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe("SYNC_FAILED");
        expect(result.error.details).toBe("Network error");
      }
    });

    it("RPC がオブジェクト（非配列）を返しても正しく処理する", async () => {
      mockRpc.mockResolvedValueOnce({
        data: { synced: 2, removed: 0 },
        error: null,
      });

      const result = await service.syncUserGuilds(guilds);

      expect(result).toEqual({
        success: true,
        data: { synced: 2, removed: 0 },
      });
    });
  });

  describe("upsertSingleGuild", () => {
    it("RPC 成功時に success を返す", async () => {
      mockRpc.mockResolvedValueOnce({ data: null, error: null });

      const result = await service.upsertSingleGuild({
        guildId: "guild-1",
        permissions: "32",
      });

      expect(result).toEqual({ success: true, data: undefined });
      expect(mockRpc).toHaveBeenCalledWith("upsert_user_guild", {
        p_guild_id: "guild-1",
        p_permissions: 32,
      });
    });

    it("RPC 失敗時に SYNC_FAILED エラーを返す", async () => {
      mockRpc.mockResolvedValueOnce({
        data: null,
        error: { message: "FK constraint violation" },
      });

      const result = await service.upsertSingleGuild({
        guildId: "guild-1",
        permissions: "32",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe("SYNC_FAILED");
        expect(result.error.details).toBe("FK constraint violation");
      }
    });

    it("例外発生時に SYNC_FAILED エラーを返す", async () => {
      mockRpc.mockRejectedValueOnce(new Error("Network error"));

      const result = await service.upsertSingleGuild({
        guildId: "guild-1",
        permissions: "32",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe("SYNC_FAILED");
        expect(result.error.details).toBe("Network error");
      }
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
