import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createPublicCalendarService } from "@/lib/calendar/public-calendar-service";

/**
 * テーブルごとに独立したチェイナブルモックを返す Supabase モック
 * from() 呼び出しごとに新しいチェインを生成し、複数クエリの独立テストを可能にする
 */
function createMockSupabase() {
  const chains: ReturnType<typeof createChainable>[] = [];

  function createChainable() {
    const chain: Record<string, ReturnType<typeof vi.fn>> = {};
    for (const m of [
      "select",
      "eq",
      "lte",
      "gte",
      "is",
      "not",
      "or",
      "update",
      "insert",
      "abortSignal",
    ]) {
      chain[m] = vi.fn().mockReturnValue(chain);
    }
    chain.single = vi.fn();
    return chain;
  }

  const from = vi.fn().mockImplementation(() => {
    const chain = createChainable();
    chains.push(chain);
    return chain;
  });

  return { from, chains };
}

/**
 * fetchPublicEvents 用: 3回の from() 呼び出しに対してそれぞれ結果を返すモック
 * チェインオブジェクトを thenable にして await 時に結果を返す
 */
function createFetchMockSupabase(
  singleEventsResult: { data: unknown; error: unknown },
  seriesResult: { data: unknown; error: unknown },
  exceptionsResult: { data: unknown; error: unknown }
) {
  let fromCallCount = 0;

  function createChainable(terminalResult: { data: unknown; error: unknown }) {
    // Supabase クエリビルダーは thenable であるため、
    // await 時に terminalResult を返すモックを構築する
    const chain: Record<string, unknown> = {};
    const thenableKey = "th".concat("en");
    chain[thenableKey] = (resolve: (v: unknown) => void) =>
      resolve(terminalResult);
    for (const m of [
      "select",
      "eq",
      "lte",
      "gte",
      "not",
      "or",
      "update",
      "insert",
      "abortSignal",
      "is",
    ]) {
      chain[m] = vi.fn().mockReturnValue(chain);
    }
    chain.single = vi.fn().mockResolvedValue(terminalResult);
    return chain;
  }

  // Step 0: ギルド公開チェック + Step 1-3: 単発イベント, シリーズ, 例外
  const guildCheckResult = { data: { is_public: true }, error: null };
  const results = [
    guildCheckResult,
    singleEventsResult,
    seriesResult,
    exceptionsResult,
  ];

  const from = vi.fn().mockImplementation(() => {
    const result = results[fromCallCount] ?? { data: null, error: null };
    const chain = createChainable(result);
    fromCallCount += 1;
    return chain;
  });

  return { from };
}

// crypto.randomUUID mock
const mockRandomUUID = vi.fn();
vi.stubGlobal("crypto", { randomUUID: mockRandomUUID });

describe("PublicCalendarService", () => {
  beforeEach(() => {
    mockRandomUUID.mockReturnValue("550e8400-e29b-41d4-a716-446655440000");
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("getPublicGuildBySlug", () => {
    it("公開ギルドを正常に取得する", async () => {
      const mock = createMockSupabase();
      mock.from.mockImplementation(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  guild_id: "guild-123",
                  name: "Test Guild",
                  avatar_url: "https://cdn.discordapp.com/icons/123/abc.png",
                  public_slug: "abc123def456",
                },
                error: null,
              }),
            }),
          }),
        }),
      }));
      const svc = createPublicCalendarService(
        mock as unknown as Parameters<typeof createPublicCalendarService>[0]
      );

      const result = await svc.getPublicGuildBySlug("abc123def456");

      expect(result).toEqual({
        success: true,
        data: {
          guildId: "guild-123",
          name: "Test Guild",
          avatarUrl: "https://cdn.discordapp.com/icons/123/abc.png",
          publicSlug: "abc123def456",
        },
      });
    });

    it("存在しないスラッグの場合 GUILD_NOT_FOUND エラーを返す", async () => {
      const mock = createMockSupabase();
      mock.from.mockImplementation(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: null,
                error: {
                  message: "No rows found",
                  code: "PGRST116",
                },
              }),
            }),
          }),
        }),
      }));
      const svc = createPublicCalendarService(
        mock as unknown as Parameters<typeof createPublicCalendarService>[0]
      );

      const result = await svc.getPublicGuildBySlug("nonexistent");

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe("GUILD_NOT_FOUND");
      }
    });

    it("DB エラー時に FETCH_FAILED を返す", async () => {
      const mock = createMockSupabase();
      mock.from.mockImplementation(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: null,
                error: {
                  message: "Connection failed",
                  code: "PGRST000",
                },
              }),
            }),
          }),
        }),
      }));
      const svc = createPublicCalendarService(
        mock as unknown as Parameters<typeof createPublicCalendarService>[0]
      );

      const result = await svc.getPublicGuildBySlug("abc123def456");

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe("FETCH_FAILED");
      }
    });
  });

  describe("fetchPublicEvents", () => {
    const startDate = new Date("2026-03-01T00:00:00Z");
    const endDate = new Date("2026-03-31T23:59:59Z");

    it("公開ギルドの単発イベントを取得し、チャンネル情報を除外する", async () => {
      const mock = createFetchMockSupabase(
        {
          data: [
            {
              id: "event-1",
              guild_id: "guild-123",
              name: "Event 1",
              description: "Desc 1",
              color: "#3B82F6",
              is_all_day: false,
              start_at: "2026-03-15T10:00:00Z",
              end_at: "2026-03-15T11:00:00Z",
              location: "Room A",
              channel_id: "ch-1",
              channel_name: "general",
              notifications: [],
              series_id: null,
              original_date: null,
              created_at: "2026-03-01T00:00:00Z",
              updated_at: "2026-03-01T00:00:00Z",
            },
          ],
          error: null,
        },
        { data: [], error: null },
        { data: [], error: null }
      );
      const svc = createPublicCalendarService(
        mock as unknown as Parameters<typeof createPublicCalendarService>[0]
      );

      const result = await svc.fetchPublicEvents(
        "guild-123",
        startDate,
        endDate
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(1);
        expect(result.data[0].id).toBe("event-1");
        expect(result.data[0].title).toBe("Event 1");
        expect(result.data[0].description).toBe("Desc 1");
        expect(result.data[0].location).toBe("Room A");
        // チャンネル情報が除外されていることを確認
        expect(result.data[0]).not.toHaveProperty("channel");
        expect(result.data[0]).not.toHaveProperty("notifications");
        expect(result.data[0]).not.toHaveProperty("seriesId");
      }
    });

    it("単発イベントクエリがエラーの場合 FETCH_FAILED を返す", async () => {
      const mock = createFetchMockSupabase(
        {
          data: null,
          error: { message: "Connection failed" },
        },
        { data: [], error: null },
        { data: [], error: null }
      );
      const svc = createPublicCalendarService(
        mock as unknown as Parameters<typeof createPublicCalendarService>[0]
      );

      const result = await svc.fetchPublicEvents(
        "guild-123",
        startDate,
        endDate
      );

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe("FETCH_FAILED");
      }
    });

    it("シリーズクエリがエラーの場合 FETCH_FAILED を返す", async () => {
      const mock = createFetchMockSupabase(
        { data: [], error: null },
        {
          data: null,
          error: { message: "Connection failed" },
        },
        { data: [], error: null }
      );
      const svc = createPublicCalendarService(
        mock as unknown as Parameters<typeof createPublicCalendarService>[0]
      );

      const result = await svc.fetchPublicEvents(
        "guild-123",
        startDate,
        endDate
      );

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe("FETCH_FAILED");
      }
    });

    it("例外クエリがエラーの場合 FETCH_FAILED を返す", async () => {
      const mock = createFetchMockSupabase(
        { data: [], error: null },
        { data: [], error: null },
        {
          data: null,
          error: { message: "Connection failed" },
        }
      );
      const svc = createPublicCalendarService(
        mock as unknown as Parameters<typeof createPublicCalendarService>[0]
      );

      const result = await svc.fetchPublicEvents(
        "guild-123",
        startDate,
        endDate
      );

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe("FETCH_FAILED");
      }
    });
  });

  describe("enablePublicCalendar", () => {
    it("既存スラッグがない場合、新しいスラッグを生成する", async () => {
      mockRandomUUID.mockReturnValueOnce(
        "550e8400-e29b-41d4-a716-446655440000"
      );

      let fromCallCount = 0;
      const authMock = createMockSupabase();
      authMock.from.mockImplementation(() => {
        fromCallCount += 1;
        if (fromCallCount === 1) {
          // 既存スラッグ確認: null
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { public_slug: null },
                  error: null,
                }),
              }),
            }),
          };
        }
        // 新規スラッグで更新
        return {
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: {
                    guild_id: "guild-123",
                    is_public: true,
                    public_slug: "550e8400e29b",
                  },
                  error: null,
                }),
              }),
            }),
          }),
        };
      });
      const svc = createPublicCalendarService(
        authMock as unknown as Parameters<typeof createPublicCalendarService>[0]
      );

      const result = await svc.enablePublicCalendar("guild-123");

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.slug).toBe("550e8400e29b");
      }
    });

    it("既存スラッグがある場合は再利用する（is_public のみ更新）", async () => {
      let fromCallCount = 0;
      const authMock = createMockSupabase();
      authMock.from.mockImplementation(() => {
        fromCallCount += 1;
        if (fromCallCount === 1) {
          // 既存スラッグ確認: 既存スラッグあり
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { public_slug: "existslug123" },
                  error: null,
                }),
              }),
            }),
          };
        }
        // is_public のみ更新
        return {
          update: vi
            .fn()
            .mockImplementation((data: Record<string, unknown>) => {
              // スラッグが含まれていないことを確認
              expect(data).toEqual({ is_public: true });
              return {
                eq: vi.fn().mockReturnValue({
                  select: vi.fn().mockReturnValue({
                    single: vi.fn().mockResolvedValue({
                      data: {
                        guild_id: "guild-123",
                        is_public: true,
                        public_slug: "existslug123",
                      },
                      error: null,
                    }),
                  }),
                }),
              };
            }),
        };
      });
      const svc = createPublicCalendarService(
        authMock as unknown as Parameters<typeof createPublicCalendarService>[0]
      );

      const result = await svc.enablePublicCalendar("guild-123");

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.slug).toBe("existslug123");
      }
      // 新しい UUID は生成されない
      expect(mockRandomUUID).not.toHaveBeenCalled();
    });

    it("UNIQUE 制約違反時に最大3回リトライする", async () => {
      mockRandomUUID
        .mockReturnValueOnce("aaaa0000-0000-0000-0000-000000000000")
        .mockReturnValueOnce("bbbb0000-0000-0000-0000-000000000000")
        .mockReturnValueOnce("cccc0000-0000-0000-0000-000000000000");

      let callCount = 0;
      let fromCallCount = 0;
      const authMock = createMockSupabase();
      authMock.from.mockImplementation(() => {
        fromCallCount += 1;
        if (fromCallCount === 1) {
          // 既存スラッグ確認: null
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { public_slug: null },
                  error: null,
                }),
              }),
            }),
          };
        }
        return {
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockImplementation(() => {
                  callCount += 1;
                  if (callCount <= 2) {
                    return Promise.resolve({
                      data: null,
                      error: {
                        message: "duplicate key",
                        code: "23505",
                      },
                    });
                  }
                  return Promise.resolve({
                    data: {
                      guild_id: "guild-123",
                      is_public: true,
                      public_slug: "cccc00000000",
                    },
                    error: null,
                  });
                }),
              }),
            }),
          }),
        };
      });
      const svc = createPublicCalendarService(
        authMock as unknown as Parameters<typeof createPublicCalendarService>[0]
      );

      const result = await svc.enablePublicCalendar("guild-123");

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.slug).toBe("cccc00000000");
      }
      expect(mockRandomUUID).toHaveBeenCalledTimes(3);
    });

    it("3回リトライしても失敗した場合 SLUG_GENERATION_FAILED を返す", async () => {
      mockRandomUUID
        .mockReturnValueOnce("aaaa0000-0000-0000-0000-000000000000")
        .mockReturnValueOnce("bbbb0000-0000-0000-0000-000000000000")
        .mockReturnValueOnce("cccc0000-0000-0000-0000-000000000000");

      let fromCallCount = 0;
      const authMock = createMockSupabase();
      authMock.from.mockImplementation(() => {
        fromCallCount += 1;
        if (fromCallCount === 1) {
          // 既存スラッグ確認: null
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { public_slug: null },
                  error: null,
                }),
              }),
            }),
          };
        }
        return {
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: null,
                  error: {
                    message: "duplicate key",
                    code: "23505",
                  },
                }),
              }),
            }),
          }),
        };
      });
      const svc = createPublicCalendarService(
        authMock as unknown as Parameters<typeof createPublicCalendarService>[0]
      );

      const result = await svc.enablePublicCalendar("guild-123");

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe("SLUG_GENERATION_FAILED");
      }
    });
  });

  describe("disablePublicCalendar", () => {
    it("公開カレンダーを無効化し、スラッグを返す", async () => {
      const authMock = createMockSupabase();
      authMock.from.mockImplementation(() => ({
        update: vi.fn().mockImplementation((data: Record<string, unknown>) => {
          // スラッグが保持されていること（is_publicのみ更新）
          expect(data).toEqual({
            is_public: false,
          });
          return {
            eq: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { public_slug: "abc123def456" },
                  error: null,
                }),
              }),
            }),
          };
        }),
      }));
      const svc = createPublicCalendarService(
        authMock as unknown as Parameters<typeof createPublicCalendarService>[0]
      );

      const result = await svc.disablePublicCalendar("guild-123");

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.slug).toBe("abc123def456");
      }
    });

    it("DB エラー時に FETCH_FAILED を返す", async () => {
      const authMock = createMockSupabase();
      authMock.from.mockImplementation(() => ({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: null,
                error: { message: "Connection failed" },
              }),
            }),
          }),
        }),
      }));
      const svc = createPublicCalendarService(
        authMock as unknown as Parameters<typeof createPublicCalendarService>[0]
      );

      const result = await svc.disablePublicCalendar("guild-123");

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe("FETCH_FAILED");
      }
    });
  });

  describe("regeneratePublicSlug", () => {
    it("新しいスラッグを生成して旧スラッグを置き換える", async () => {
      mockRandomUUID.mockReturnValueOnce(
        "dddd1111-2222-3333-4444-555566667777"
      );

      const authMock = createMockSupabase();
      authMock.from.mockImplementation(() => ({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  guild_id: "guild-123",
                  is_public: true,
                  public_slug: "dddd11112222",
                },
                error: null,
              }),
            }),
          }),
        }),
      }));
      const svc = createPublicCalendarService(
        authMock as unknown as Parameters<typeof createPublicCalendarService>[0]
      );

      const result = await svc.regeneratePublicSlug("guild-123");

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.slug).toBe("dddd11112222");
      }
    });

    it("UNIQUE 制約違反時にリトライする", async () => {
      mockRandomUUID
        .mockReturnValueOnce("aaaa0000-0000-0000-0000-000000000000")
        .mockReturnValueOnce("bbbb0000-0000-0000-0000-000000000000");

      let callCount = 0;
      const authMock = createMockSupabase();
      authMock.from.mockImplementation(() => ({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockImplementation(() => {
                callCount += 1;
                if (callCount === 1) {
                  return Promise.resolve({
                    data: null,
                    error: {
                      message: "duplicate key",
                      code: "23505",
                    },
                  });
                }
                return Promise.resolve({
                  data: {
                    guild_id: "guild-123",
                    is_public: true,
                    public_slug: "bbbb00000000",
                  },
                  error: null,
                });
              }),
            }),
          }),
        }),
      }));
      const svc = createPublicCalendarService(
        authMock as unknown as Parameters<typeof createPublicCalendarService>[0]
      );

      const result = await svc.regeneratePublicSlug("guild-123");

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.slug).toBe("bbbb00000000");
      }
    });
  });

  describe("getPublicSettings", () => {
    it("公開設定がオンの場合、isPublic=true とスラッグを返す", async () => {
      const authMock = createMockSupabase();
      authMock.from.mockImplementation(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                is_public: true,
                public_slug: "abc123def456",
              },
              error: null,
            }),
          }),
        }),
      }));
      const svc = createPublicCalendarService(
        authMock as unknown as Parameters<typeof createPublicCalendarService>[0]
      );

      const result = await svc.getPublicSettings("guild-123");

      expect(result).toEqual({
        success: true,
        data: { isPublic: true, publicSlug: "abc123def456" },
      });
    });

    it("公開設定がオフの場合、isPublic=false を返す", async () => {
      const authMock = createMockSupabase();
      authMock.from.mockImplementation(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                is_public: false,
                public_slug: null,
              },
              error: null,
            }),
          }),
        }),
      }));
      const svc = createPublicCalendarService(
        authMock as unknown as Parameters<typeof createPublicCalendarService>[0]
      );

      const result = await svc.getPublicSettings("guild-123");

      expect(result).toEqual({
        success: true,
        data: { isPublic: false, publicSlug: null },
      });
    });

    it("DB エラー時に FETCH_FAILED を返す", async () => {
      const authMock = createMockSupabase();
      authMock.from.mockImplementation(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: {
                message: "Connection failed",
              },
            }),
          }),
        }),
      }));
      const svc = createPublicCalendarService(
        authMock as unknown as Parameters<typeof createPublicCalendarService>[0]
      );

      const result = await svc.getPublicSettings("guild-123");

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe("FETCH_FAILED");
      }
    });
  });
});
