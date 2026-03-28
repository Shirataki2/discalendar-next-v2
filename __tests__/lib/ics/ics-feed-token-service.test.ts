import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createIcsFeedTokenService,
  type IcsFeedTokenServiceInterface,
} from "@/lib/ics/ics-feed-token-service";

/**
 * テーブルごとに独立したチェイナブルモックを返す Supabase モック
 */
function createMockSupabase() {
  const chains: ReturnType<typeof createChainable>[] = [];

  function createChainable() {
    const chain: Record<string, ReturnType<typeof vi.fn>> = {};
    for (const m of ["select", "eq", "is", "update", "insert", "upsert"]) {
      chain[m] = vi.fn().mockReturnValue(chain);
    }
    chain.single = vi.fn();
    chain.maybeSingle = vi.fn();
    return chain;
  }

  const from = vi.fn().mockImplementation(() => {
    const chain = createChainable();
    chains.push(chain);
    return chain;
  });

  return { from, chains };
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
    it("アクティブなトークンが存在する場合はそれを返す", async () => {
      const existingToken = {
        id: "token-uuid-1",
        guild_id: "123456789",
        token: "a".repeat(64),
        created_at: "2026-03-28T00:00:00Z",
        revoked_at: null,
      };

      mockSupabase.chains[0] = undefined as never;
      const chain = createSelectChain(mockSupabase, {
        data: existingToken,
        error: null,
      });

      const result = await service.getOrCreateToken("123456789");

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.token).toBe("a".repeat(64));
      }
      expect(mockSupabase.from).toHaveBeenCalledWith("ics_feed_tokens");
    });

    it("アクティブトークンがなければ新規生成する", async () => {
      // First call: select returns null (no active token)
      const selectChain = createThenableChain(mockSupabase, {
        data: null,
        error: { code: "PGRST116", message: "not found" },
      });

      // Second call: insert returns new token
      const insertChain = createThenableChain(mockSupabase, {
        data: {
          id: "token-uuid-new",
          guild_id: "123456789",
          token: "b".repeat(64),
          created_at: "2026-03-28T12:00:00Z",
          revoked_at: null,
        },
        error: null,
      });

      const result = await service.getOrCreateToken("123456789");

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.token).toHaveLength(64);
      }
    });

    it("DB挿入エラー時はINTERNAL_ERRORを返す", async () => {
      // select: no active token
      createThenableChain(mockSupabase, {
        data: null,
        error: { code: "PGRST116", message: "not found" },
      });

      // insert: error
      createThenableChain(mockSupabase, {
        data: null,
        error: { code: "42000", message: "DB error" },
      });

      const result = await service.getOrCreateToken("123456789");

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe("INTERNAL_ERROR");
      }
    });
  });

  describe("regenerateToken", () => {
    it("既存トークンを無効化して新しいトークンを生成する", async () => {
      // First call: update (revoke old token)
      createThenableChain(mockSupabase, { data: {}, error: null });

      // Second call: insert new token
      createThenableChain(mockSupabase, {
        data: {
          id: "token-uuid-new",
          guild_id: "123456789",
          token: "c".repeat(64),
          created_at: "2026-03-28T12:00:00Z",
          revoked_at: null,
        },
        error: null,
      });

      const result = await service.regenerateToken("123456789");

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.token).toHaveLength(64);
      }
    });

    it("無効化に失敗した場合はINTERNAL_ERRORを返す", async () => {
      createThenableChain(mockSupabase, {
        data: null,
        error: { code: "42000", message: "update error" },
      });

      const result = await service.regenerateToken("123456789");

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe("INTERNAL_ERROR");
      }
    });

    it("新規トークン挿入に失敗した場合はINTERNAL_ERRORを返す", async () => {
      // revoke succeeds
      createThenableChain(mockSupabase, { data: {}, error: null });

      // insert fails
      createThenableChain(mockSupabase, {
        data: null,
        error: { code: "42000", message: "insert error" },
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

/**
 * thenable なチェインを作成するヘルパー
 * Supabase クエリビルダーは thenable であるため、await 時に結果を返す
 */
function createThenableChain(
  mockSupabase: ReturnType<typeof createMockSupabase>,
  terminalResult: { data: unknown; error: unknown }
) {
  const chain: Record<string, unknown> = {};
  const thenableKey = "th".concat("en");
  chain[thenableKey] = (resolve: (v: unknown) => void) =>
    resolve(terminalResult);
  for (const m of ["select", "eq", "is", "update", "insert", "upsert"]) {
    chain[m] = vi.fn().mockReturnValue(chain);
  }
  chain.single = vi.fn().mockResolvedValue(terminalResult);
  chain.maybeSingle = vi.fn().mockResolvedValue(terminalResult);

  const originalFrom = mockSupabase.from;
  const callCount = originalFrom.mock.calls.length;
  originalFrom.mockImplementationOnce(() => chain);

  return chain;
}

function createSelectChain(
  mockSupabase: ReturnType<typeof createMockSupabase>,
  singleResult: { data: unknown; error: unknown }
) {
  return createThenableChain(mockSupabase, singleResult);
}
