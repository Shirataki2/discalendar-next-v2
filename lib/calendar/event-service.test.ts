/**
 * EventServiceのテスト
 *
 * タスク2.2: EventServiceの実装
 * - ギルドIDと日付範囲に基づくイベント取得
 * - Result型による成功/失敗の返却
 * - エラーコードの分類
 * - AbortController対応
 *
 * Requirements: 5.1, 5.3, 5.4
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  CALENDAR_ERROR_CODES,
  type CalendarError,
  type CalendarErrorCode,
  type FetchEventsParams,
  type FetchEventsResult,
  createEventService,
  getCalendarErrorMessage,
} from "./event-service";
import type { CalendarEvent, EventRecord } from "./types";

// Supabaseクライアントのモック
const mockSupabaseClient = {
  from: vi.fn(),
};

// Supabaseクエリビルダーのモック
// Supabaseのクエリビルダーはthenableなので、awaitできるようにする
const createMockQueryBuilder = (options: {
  data?: EventRecord[];
  error?: { message: string; code?: string };
  abortError?: Error;
}) => {
  const result = {
    data: options.data ?? null,
    error: options.error ?? null,
  };

  const mockSelect = vi.fn();
  const mockEq = vi.fn();
  const mockGte = vi.fn();
  const mockLte = vi.fn();
  const mockAbortSignal = vi.fn();

  // Promiseを作成してthenableにする
  const internalPromise = options.abortError
    ? Promise.reject(options.abortError)
    : Promise.resolve(result);

  // 各メソッドはthis（queryBuilder）を返す
  const queryBuilder = {
    select: mockSelect,
    eq: mockEq,
    gte: mockGte,
    lte: mockLte,
    abortSignal: mockAbortSignal,
    then: (
      onFulfilled?: (value: typeof result) => unknown,
      onRejected?: (reason: unknown) => unknown
    ) => internalPromise.then(onFulfilled, onRejected),
    catch: (onRejected: (reason: unknown) => unknown) => internalPromise.catch(onRejected),
    _mocks: { select: mockSelect, eq: mockEq, gte: mockGte, lte: mockLte, abortSignal: mockAbortSignal },
  };

  // メソッドチェーンでthisを返す
  mockSelect.mockReturnValue(queryBuilder);
  mockEq.mockReturnValue(queryBuilder);
  mockGte.mockReturnValue(queryBuilder);
  mockLte.mockReturnValue(queryBuilder);
  mockAbortSignal.mockReturnValue(queryBuilder);

  return queryBuilder;
};

describe("CalendarErrorCode", () => {
  it("should have all expected error codes defined", () => {
    const expectedCodes: CalendarErrorCode[] = [
      "FETCH_FAILED",
      "NETWORK_ERROR",
      "UNAUTHORIZED",
    ];

    for (const code of expectedCodes) {
      expect(CALENDAR_ERROR_CODES).toContain(code);
    }
  });
});

describe("getCalendarErrorMessage", () => {
  it("should return correct message for FETCH_FAILED", () => {
    const message = getCalendarErrorMessage("FETCH_FAILED");
    expect(message).toBe("イベントの取得に失敗しました。");
  });

  it("should return correct message for NETWORK_ERROR", () => {
    const message = getCalendarErrorMessage("NETWORK_ERROR");
    expect(message).toBe("ネットワークエラーが発生しました。接続を確認してください。");
  });

  it("should return correct message for UNAUTHORIZED", () => {
    const message = getCalendarErrorMessage("UNAUTHORIZED");
    expect(message).toBe("このギルドのイベントを表示する権限がありません。");
  });
});

describe("createEventService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("fetchEvents", () => {
    it("should return events successfully (Req 5.1)", async () => {
      const mockRecords: EventRecord[] = [
        {
          id: "event-1",
          guild_id: "guild-123",
          name: "テストイベント",
          description: "説明",
          color: "#FF5733",
          is_all_day: false,
          start_at: "2025-12-15T10:00:00Z",
          end_at: "2025-12-15T12:00:00Z",
          location: null,
          channel_id: null,
          channel_name: null,
          created_at: "2025-12-01T00:00:00Z",
          updated_at: "2025-12-01T00:00:00Z",
        },
      ];

      const queryBuilder = createMockQueryBuilder({ data: mockRecords });
      mockSupabaseClient.from.mockReturnValue(queryBuilder);

      const service = createEventService(mockSupabaseClient as unknown as Parameters<typeof createEventService>[0]);
      const params: FetchEventsParams = {
        guildId: "guild-123",
        startDate: new Date("2025-12-01T00:00:00Z"),
        endDate: new Date("2025-12-31T23:59:59Z"),
      };

      const result = await service.fetchEvents(params);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(1);
        expect(result.data[0].title).toBe("テストイベント");
        expect(result.data[0].id).toBe("event-1");
      }
    });

    it("should filter events by guildId and date range", async () => {
      const queryBuilder = createMockQueryBuilder({ data: [] });
      mockSupabaseClient.from.mockReturnValue(queryBuilder);

      const service = createEventService(mockSupabaseClient as unknown as Parameters<typeof createEventService>[0]);
      const params: FetchEventsParams = {
        guildId: "guild-123",
        startDate: new Date("2025-12-01T00:00:00Z"),
        endDate: new Date("2025-12-31T23:59:59Z"),
      };

      await service.fetchEvents(params);

      expect(mockSupabaseClient.from).toHaveBeenCalledWith("events");
      expect(queryBuilder._mocks.eq).toHaveBeenCalledWith("guild_id", "guild-123");
      expect(queryBuilder._mocks.gte).toHaveBeenCalledWith("start_at", params.startDate.toISOString());
      expect(queryBuilder._mocks.lte).toHaveBeenCalledWith("start_at", params.endDate.toISOString());
    });

    it("should return empty array when no events exist", async () => {
      const queryBuilder = createMockQueryBuilder({ data: [] });
      mockSupabaseClient.from.mockReturnValue(queryBuilder);

      const service = createEventService(mockSupabaseClient as unknown as Parameters<typeof createEventService>[0]);
      const params: FetchEventsParams = {
        guildId: "guild-123",
        startDate: new Date("2025-12-01T00:00:00Z"),
        endDate: new Date("2025-12-31T23:59:59Z"),
      };

      const result = await service.fetchEvents(params);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual([]);
      }
    });

    it("should return FETCH_FAILED error on database error (Req 5.4)", async () => {
      const queryBuilder = createMockQueryBuilder({
        error: { message: "Database connection failed" },
      });
      mockSupabaseClient.from.mockReturnValue(queryBuilder);

      const service = createEventService(mockSupabaseClient as unknown as Parameters<typeof createEventService>[0]);
      const params: FetchEventsParams = {
        guildId: "guild-123",
        startDate: new Date("2025-12-01T00:00:00Z"),
        endDate: new Date("2025-12-31T23:59:59Z"),
      };

      const result = await service.fetchEvents(params);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe("FETCH_FAILED");
      }
    });

    it("should return UNAUTHORIZED error for permission denied (Req 5.4)", async () => {
      const queryBuilder = createMockQueryBuilder({
        error: { message: "permission denied", code: "42501" },
      });
      mockSupabaseClient.from.mockReturnValue(queryBuilder);

      const service = createEventService(mockSupabaseClient as unknown as Parameters<typeof createEventService>[0]);
      const params: FetchEventsParams = {
        guildId: "guild-123",
        startDate: new Date("2025-12-01T00:00:00Z"),
        endDate: new Date("2025-12-31T23:59:59Z"),
      };

      const result = await service.fetchEvents(params);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe("UNAUTHORIZED");
      }
    });

    it("should use AbortController signal for request cancellation", async () => {
      const queryBuilder = createMockQueryBuilder({ data: [] });
      mockSupabaseClient.from.mockReturnValue(queryBuilder);

      const service = createEventService(mockSupabaseClient as unknown as Parameters<typeof createEventService>[0]);
      const abortController = new AbortController();
      const params: FetchEventsParams = {
        guildId: "guild-123",
        startDate: new Date("2025-12-01T00:00:00Z"),
        endDate: new Date("2025-12-31T23:59:59Z"),
        signal: abortController.signal,
      };

      await service.fetchEvents(params);

      expect(queryBuilder._mocks.abortSignal).toHaveBeenCalledWith(abortController.signal);
    });

    it("should return NETWORK_ERROR when fetch is aborted", async () => {
      const abortError = new DOMException("The operation was aborted", "AbortError");
      const queryBuilder = createMockQueryBuilder({
        data: [],
        abortError: abortError,
      });
      mockSupabaseClient.from.mockReturnValue(queryBuilder);

      const service = createEventService(mockSupabaseClient as unknown as Parameters<typeof createEventService>[0]);
      const abortController = new AbortController();
      abortController.abort();

      const params: FetchEventsParams = {
        guildId: "guild-123",
        startDate: new Date("2025-12-01T00:00:00Z"),
        endDate: new Date("2025-12-31T23:59:59Z"),
        signal: abortController.signal,
      };

      const result = await service.fetchEvents(params);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe("NETWORK_ERROR");
      }
    });

    it("should convert EventRecords to CalendarEvents correctly", async () => {
      const mockRecords: EventRecord[] = [
        {
          id: "event-1",
          guild_id: "guild-123",
          name: "イベント1",
          description: "説明1",
          color: "#FF5733",
          is_all_day: false,
          start_at: "2025-12-15T10:00:00Z",
          end_at: "2025-12-15T12:00:00Z",
          location: "東京",
          channel_id: "ch-1",
          channel_name: "general",
          created_at: "2025-12-01T00:00:00Z",
          updated_at: "2025-12-01T00:00:00Z",
        },
        {
          id: "event-2",
          guild_id: "guild-123",
          name: "終日イベント",
          description: null,
          color: "#4CAF50",
          is_all_day: true,
          start_at: "2025-12-16T00:00:00Z",
          end_at: "2025-12-17T00:00:00Z",
          location: null,
          channel_id: null,
          channel_name: null,
          created_at: "2025-12-01T00:00:00Z",
          updated_at: "2025-12-01T00:00:00Z",
        },
      ];

      const queryBuilder = createMockQueryBuilder({ data: mockRecords });
      mockSupabaseClient.from.mockReturnValue(queryBuilder);

      const service = createEventService(mockSupabaseClient as unknown as Parameters<typeof createEventService>[0]);
      const params: FetchEventsParams = {
        guildId: "guild-123",
        startDate: new Date("2025-12-01T00:00:00Z"),
        endDate: new Date("2025-12-31T23:59:59Z"),
      };

      const result = await service.fetchEvents(params);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(2);

        // First event
        expect(result.data[0].title).toBe("イベント1");
        expect(result.data[0].allDay).toBe(false);
        expect(result.data[0].location).toBe("東京");
        expect(result.data[0].channel).toEqual({ id: "ch-1", name: "general" });

        // Second event (all-day)
        expect(result.data[1].title).toBe("終日イベント");
        expect(result.data[1].allDay).toBe(true);
        expect(result.data[1].location).toBeUndefined();
        expect(result.data[1].channel).toBeUndefined();
      }
    });
  });
});

describe("FetchEventsResult type", () => {
  it("should allow success result with data", () => {
    const successResult: FetchEventsResult = {
      success: true,
      data: [
        {
          id: "event-1",
          title: "テスト",
          start: new Date(),
          end: new Date(),
          allDay: false,
          color: "#FF5733",
        },
      ],
    };

    expect(successResult.success).toBe(true);
    if (successResult.success) {
      expect(successResult.data).toHaveLength(1);
    }
  });

  it("should allow failure result with error", () => {
    const failureResult: FetchEventsResult = {
      success: false,
      error: {
        code: "FETCH_FAILED",
        message: "イベントの取得に失敗しました。",
      },
    };

    expect(failureResult.success).toBe(false);
    if (!failureResult.success) {
      expect(failureResult.error.code).toBe("FETCH_FAILED");
    }
  });
});

describe("CalendarError type", () => {
  it("should allow creating a valid CalendarError object", () => {
    const error: CalendarError = {
      code: "NETWORK_ERROR",
      message: "ネットワークエラーが発生しました。接続を確認してください。",
    };

    expect(error.code).toBe("NETWORK_ERROR");
    expect(error.message).toBe("ネットワークエラーが発生しました。接続を確認してください。");
  });

  it("should allow optional details field", () => {
    const error: CalendarError = {
      code: "FETCH_FAILED",
      message: "イベントの取得に失敗しました。",
      details: "Database timeout after 30 seconds",
    };

    expect(error.details).toBe("Database timeout after 30 seconds");
  });
});
