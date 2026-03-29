import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createIcsFeedTokenService,
  type IcsFeedTokenServiceInterface,
} from "@/lib/ics/ics-feed-token-service";

function createMockSupabase() {
  const rpc = vi.fn();
  return { rpc };
}

describe("IcsFeedTokenService", () => {
  let service: IcsFeedTokenServiceInterface;
  let mockSupabase: ReturnType<typeof createMockSupabase>;

  beforeEach(() => {
    mockSupabase = createMockSupabase();
    service = createIcsFeedTokenService(
      mockSupabase as unknown as Parameters<typeof createIcsFeedTokenService>[0]
    );
  });

  describe("getOrCreateToken", () => {
    it("RPCが既存トークンを返す場合はそれを使う", async () => {
      mockSupabase.rpc.mockResolvedValueOnce({
        data: "a".repeat(64),
        error: null,
      });

      const result = await service.getOrCreateToken("123456789");

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.token).toBe("a".repeat(64));
      }
      expect(mockSupabase.rpc).toHaveBeenCalledWith(
        "get_or_create_ics_feed_token",
        expect.objectContaining({ p_guild_id: "123456789" })
      );
    });

    it("RPCが新規トークンを生成して返す", async () => {
      mockSupabase.rpc.mockResolvedValueOnce({
        data: "b".repeat(64),
        error: null,
      });

      const result = await service.getOrCreateToken("123456789");

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.token).toHaveLength(64);
      }
    });

    it("RPCエラー時はINTERNAL_ERRORを返す", async () => {
      mockSupabase.rpc.mockResolvedValueOnce({
        data: null,
        error: {
          code: "P0001",
          message: "PERMISSION_DENIED: Not a guild member",
        },
      });

      const result = await service.getOrCreateToken("123456789");

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe("INTERNAL_ERROR");
        expect(result.error.details).toContain("PERMISSION_DENIED");
      }
    });
  });

  describe("regenerateToken", () => {
    it("RPCでアトミックにトークンを再生成する", async () => {
      mockSupabase.rpc.mockResolvedValueOnce({
        data: "c".repeat(64),
        error: null,
      });

      const result = await service.regenerateToken("123456789");

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.token).toBe("c".repeat(64));
      }
      expect(mockSupabase.rpc).toHaveBeenCalledWith(
        "regenerate_ics_feed_token",
        expect.objectContaining({ p_guild_id: "123456789" })
      );
    });

    it("RPCエラー時はINTERNAL_ERRORを返す", async () => {
      mockSupabase.rpc.mockResolvedValueOnce({
        data: null,
        error: { code: "42000", message: "DB error" },
      });

      const result = await service.regenerateToken("123456789");

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe("INTERNAL_ERROR");
      }
    });
  });

  describe("buildFeedUrl", () => {
    it("非公開ギルドの場合はトークン付きURLを返す", () => {
      const url = service.buildFeedUrl({
        guildId: "123456789",
        token: "abc123",
        isPublic: false,
        supabaseProjectUrl: "https://example.supabase.co",
      });

      expect(url).toBe(
        "https://example.supabase.co/functions/v1/ics-feed?guild_id=123456789&token=abc123"
      );
    });

    it("公開ギルドの場合はトークンなしURLを返す", () => {
      const url = service.buildFeedUrl({
        guildId: "123456789",
        token: null,
        isPublic: true,
        supabaseProjectUrl: "https://example.supabase.co",
      });

      expect(url).toBe(
        "https://example.supabase.co/functions/v1/ics-feed?guild_id=123456789"
      );
    });
  });
});
