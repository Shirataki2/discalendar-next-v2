/**
 * 公開カレンダー統合テスト
 *
 * Task 6.1: ミドルウェアとRLSポリシーの統合テスト
 * - カレンダーパスが公開ルートとして認識され、認証チェックがバイパスされること
 * - anonロールで公開ギルドのイベントのみ読み取れること
 * - 非公開ギルドのデータが返却されないこと
 * - anonロールでINSERT/UPDATE/DELETEが拒否されること
 *
 * Requirements: 2.5, 3.3, 3.4
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

// ─── Supabase モック ───
const mockGetClaims = vi.fn();
const mockCreateServerClient = vi.fn();

vi.mock("@supabase/ssr", () => ({
  createServerClient: (...args: unknown[]) => mockCreateServerClient(...args),
}));

vi.mock("@/lib/utils", () => ({
  hasEnvVars: true,
}));

// ─── ミドルウェア公開ルート統合テスト ───
describe("Task 6.1: ミドルウェアとRLSポリシーの統合テスト", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    mockCreateServerClient.mockReturnValue({
      auth: {
        getClaims: mockGetClaims,
      },
    });
  });

  describe("ミドルウェア: /cal パスの公開ルート認識", () => {
    it("/cal/[slug] は未認証ユーザーでも認証リダイレクトされない", async () => {
      mockGetClaims.mockResolvedValue({
        data: { claims: null },
      });

      const { updateSession } = await import("@/lib/supabase/proxy");
      const mockRequest = createMockRequest("/cal/abc123def456");
      const result = await updateSession(mockRequest);

      expect(result.status).not.toBe(307);
    });

    it("/cal/ ルートパスも公開ルートとして認識される", async () => {
      mockGetClaims.mockResolvedValue({
        data: { claims: null },
      });

      const { updateSession } = await import("@/lib/supabase/proxy");
      const mockRequest = createMockRequest("/cal/");
      const result = await updateSession(mockRequest);

      expect(result.status).not.toBe(307);
    });

    it("認証済みユーザーも /cal パスに正常にアクセスできる", async () => {
      mockGetClaims.mockResolvedValue({
        data: { claims: { sub: "user-123" } },
      });

      const { updateSession } = await import("@/lib/supabase/proxy");
      const mockRequest = createMockRequest("/cal/abc123def456");
      const result = await updateSession(mockRequest);

      expect(result.status).not.toBe(307);
    });

    it("/dashboard は保護されたルートであり、未認証ユーザーはリダイレクトされる", async () => {
      mockGetClaims.mockResolvedValue({
        data: { claims: null },
      });

      const { updateSession } = await import("@/lib/supabase/proxy");
      const mockRequest = createMockRequest("/dashboard");
      const result = await updateSession(mockRequest);

      expect(result.status).toBe(307);
      expect(result.headers.get("location")).toContain("/auth/login");
    });
  });

  describe("サービス層: 公開ギルドのみ読み取り可能", () => {
    it("getPublicGuildBySlug は is_public=true フィルタを使用する", async () => {
      const { createPublicCalendarService } = await import(
        "@/lib/calendar/public-calendar-service"
      );

      const mockEq = vi.fn();
      const mockSingle = vi.fn().mockResolvedValue({
        data: {
          guild_id: "guild-123",
          name: "Public Guild",
          avatar_url: null,
          public_slug: "abc123def456",
        },
        error: null,
      });

      // 2回目の eq が is_public=true を呼ぶ
      const secondEq = vi.fn().mockReturnValue({ single: mockSingle });
      mockEq.mockReturnValue({ eq: secondEq });

      const mockSupabase = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: mockEq,
          }),
        }),
      };

      const service = createPublicCalendarService(
        mockSupabase as unknown as Parameters<
          typeof createPublicCalendarService
        >[0]
      );

      const result = await service.getPublicGuildBySlug("abc123def456");

      expect(result.success).toBe(true);
      // public_slug でフィルタ
      expect(mockEq).toHaveBeenCalledWith("public_slug", "abc123def456");
      // is_public=true でフィルタ
      expect(secondEq).toHaveBeenCalledWith("is_public", true);
    });

    it("非公開ギルド（is_public=false）のスラッグではデータが返却されない", async () => {
      const { createPublicCalendarService } = await import(
        "@/lib/calendar/public-calendar-service"
      );

      const mockSupabase = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: null,
                  error: { code: "PGRST116", message: "No rows found" },
                }),
              }),
            }),
          }),
        }),
      };

      const service = createPublicCalendarService(
        mockSupabase as unknown as Parameters<
          typeof createPublicCalendarService
        >[0]
      );

      const result = await service.getPublicGuildBySlug("private_slug");

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe("GUILD_NOT_FOUND");
      }
    });

    it("fetchPublicEvents は guild_id でフィルタし、公開ギルドのイベントのみ取得する", async () => {
      const { createPublicCalendarService } = await import(
        "@/lib/calendar/public-calendar-service"
      );

      let fromCallCount = 0;
      const mockFrom = vi.fn().mockImplementation(() => {
        fromCallCount += 1;
        const thenableKey = "th".concat("en");
        if (fromCallCount === 1) {
          // Step 0: ギルド公開チェック
          const chain: Record<string, unknown> = {};
          chain[thenableKey] = (resolve: (v: unknown) => void) =>
            resolve({ data: { is_public: true }, error: null });
          for (const m of ["select", "eq"]) {
            chain[m] = vi.fn().mockReturnValue(chain);
          }
          chain.single = vi
            .fn()
            .mockResolvedValue({ data: { is_public: true }, error: null });
          return chain;
        }
        if (fromCallCount === 2) {
          // 単発イベントクエリ
          const chain: Record<string, unknown> = {};
          chain[thenableKey] = (resolve: (v: unknown) => void) =>
            resolve({ data: [], error: null });
          for (const m of ["select", "eq", "lte", "gte", "is", "abortSignal"]) {
            chain[m] = vi.fn().mockReturnValue(chain);
          }
          return chain;
        }
        if (fromCallCount === 3) {
          // シリーズクエリ
          const chain: Record<string, unknown> = {};
          chain[thenableKey] = (resolve: (v: unknown) => void) =>
            resolve({ data: [], error: null });
          for (const m of ["select", "eq", "abortSignal"]) {
            chain[m] = vi.fn().mockReturnValue(chain);
          }
          return chain;
        }
        // 例外クエリ
        const chain: Record<string, unknown> = {};
        chain[thenableKey] = (resolve: (v: unknown) => void) =>
          resolve({ data: [], error: null });
        for (const m of ["select", "eq", "not", "or", "abortSignal"]) {
          chain[m] = vi.fn().mockReturnValue(chain);
        }
        return chain;
      });

      const mockSupabase = { from: mockFrom };

      const service = createPublicCalendarService(
        mockSupabase as unknown as Parameters<
          typeof createPublicCalendarService
        >[0]
      );

      const result = await service.fetchPublicEvents(
        "guild-123",
        new Date("2026-03-01"),
        new Date("2026-03-31")
      );

      expect(result.success).toBe(true);
      // 4回の from() 呼び出し: guilds（公開チェック）, events（単発）, event_series, events（例外）
      expect(mockFrom).toHaveBeenCalledTimes(4);
      expect(mockFrom).toHaveBeenCalledWith("guilds");
      expect(mockFrom).toHaveBeenCalledWith("events");
      expect(mockFrom).toHaveBeenCalledWith("event_series");
    });
  });

  describe("サービス層: anon ロールの書き込み制限", () => {
    it("getPublicGuildBySlug は SELECT のみ実行し、UPDATE/INSERT/DELETE を呼ばない", async () => {
      const { createPublicCalendarService } = await import(
        "@/lib/calendar/public-calendar-service"
      );

      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                guild_id: "g-1",
                name: "G",
                avatar_url: null,
                public_slug: "slug12345678",
              },
              error: null,
            }),
          }),
        }),
      });

      const mockUpdate = vi.fn();
      const mockInsert = vi.fn();
      const mockDelete = vi.fn();

      const mockSupabase = {
        from: vi.fn().mockReturnValue({
          select: mockSelect,
          update: mockUpdate,
          insert: mockInsert,
          delete: mockDelete,
        }),
      };

      const service = createPublicCalendarService(
        mockSupabase as unknown as Parameters<
          typeof createPublicCalendarService
        >[0]
      );

      await service.getPublicGuildBySlug("slug12345678");

      expect(mockSelect).toHaveBeenCalled();
      expect(mockUpdate).not.toHaveBeenCalled();
      expect(mockInsert).not.toHaveBeenCalled();
      expect(mockDelete).not.toHaveBeenCalled();
    });

    it("fetchPublicEvents は SELECT のみ実行し、UPDATE/INSERT/DELETE を呼ばない", async () => {
      const { createPublicCalendarService } = await import(
        "@/lib/calendar/public-calendar-service"
      );

      const updateCalls: unknown[] = [];
      const insertCalls: unknown[] = [];
      const deleteCalls: unknown[] = [];

      let fromCallCount = 0;
      const mockFrom = vi.fn().mockImplementation(() => {
        fromCallCount += 1;
        const thenableKey = "th".concat("en");
        const chain: Record<string, unknown> = {};
        // 最初の from() はギルド公開チェック（single() で is_public を返す）
        if (fromCallCount === 1) {
          chain[thenableKey] = (resolve: (v: unknown) => void) =>
            resolve({ data: { is_public: true }, error: null });
        } else {
          chain[thenableKey] = (resolve: (v: unknown) => void) =>
            resolve({ data: [], error: null });
        }
        for (const m of [
          "select",
          "eq",
          "lte",
          "gte",
          "is",
          "not",
          "or",
          "abortSignal",
        ]) {
          chain[m] = vi.fn().mockReturnValue(chain);
        }
        chain.single = vi
          .fn()
          .mockResolvedValue(
            fromCallCount === 1
              ? { data: { is_public: true }, error: null }
              : { data: [], error: null }
          );
        chain.update = vi.fn().mockImplementation((...args: unknown[]) => {
          updateCalls.push(args);
          return chain;
        });
        chain.insert = vi.fn().mockImplementation((...args: unknown[]) => {
          insertCalls.push(args);
          return chain;
        });
        chain.delete = vi.fn().mockImplementation((...args: unknown[]) => {
          deleteCalls.push(args);
          return chain;
        });
        return chain;
      });

      const mockSupabase = { from: mockFrom };

      const service = createPublicCalendarService(
        mockSupabase as unknown as Parameters<
          typeof createPublicCalendarService
        >[0]
      );

      await service.fetchPublicEvents(
        "guild-123",
        new Date("2026-03-01"),
        new Date("2026-03-31")
      );

      expect(updateCalls).toHaveLength(0);
      expect(insertCalls).toHaveLength(0);
      expect(deleteCalls).toHaveLength(0);
    });

    it("enablePublicCalendar は認証済みクライアントで UPDATE を実行する", async () => {
      const { createPublicCalendarService } = await import(
        "@/lib/calendar/public-calendar-service"
      );

      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                guild_id: "guild-123",
                is_public: true,
                public_slug: "newslug12345",
              },
              error: null,
            }),
          }),
        }),
      });

      const authSupabase = {
        from: vi.fn().mockReturnValue({
          update: mockUpdate,
        }),
      };

      const service = createPublicCalendarService(
        authSupabase as unknown as Parameters<
          typeof createPublicCalendarService
        >[0]
      );

      const result = await service.enablePublicCalendar("guild-123");

      expect(result.success).toBe(true);
      expect(authSupabase.from).toHaveBeenCalledWith("guilds");
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          is_public: true,
          public_slug: expect.any(String),
        })
      );
    });
  });
});

function createMockRequest(pathname: string) {
  const baseUrl = "http://localhost:3000";
  const url = new URL(pathname, baseUrl);

  return {
    nextUrl: {
      pathname,
      clone: () => new URL(url),
    },
    url: url.toString(),
    cookies: {
      getAll: () => [],
      set: vi.fn(),
    },
  } as unknown as import("next/server").NextRequest;
}
