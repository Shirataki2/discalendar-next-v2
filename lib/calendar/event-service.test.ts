/**
 * EventServiceのテスト
 *
 * タスク2.2: EventServiceの実装
 * - ギルドIDと日付範囲に基づくイベント取得
 * - Result型による成功/失敗の返却
 * - エラーコードの分類
 * - AbortController対応
 *
 * タスク2.1: EventServiceにイベント作成機能を追加
 * - 予定の新規作成ロジックをSupabaseへのINSERT操作として実装
 * - 必須フィールドとオプションフィールドを処理
 * - Result型パターンに従ったエラーハンドリング
 *
 * Requirements: 1.4, 5.1, 5.3, 5.4
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  CALENDAR_ERROR_CODES,
  type CalendarError,
  type CalendarErrorCode,
  type CreateEventInput,
  type CreateSeriesInput,
  type UpdateEventInput,
  type UpdateSeriesInput,
  type FetchEventsParams,
  type FetchEventsResult,
  createEventService,
  getCalendarErrorMessage,
} from "./event-service";
import type { CalendarEvent, EventRecord, EventSeriesRecord } from "./types";

// Supabaseクライアントのモック
const mockSupabaseClient = {
  from: vi.fn(),
  auth: {
    getSession: vi.fn().mockResolvedValue({
      data: {
        session: {
          user: { id: "test-user-id" },
          expires_at: Date.now() + 3600000,
        },
      },
      error: null,
    }),
    getUser: vi.fn().mockResolvedValue({
      data: {
        user: { id: "test-user-id" },
      },
      error: null,
    }),
    refreshSession: vi.fn().mockResolvedValue({
      data: {
        session: {
          user: { id: "test-user-id" },
          expires_at: Date.now() + 3600000,
        },
      },
      error: null,
    }),
  },
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

// INSERT操作用のモッククエリビルダー
const createMockInsertBuilder = (options: {
  data?: EventRecord;
  error?: { message: string; code?: string };
}) => {
  const result = {
    data: options.data ?? null,
    error: options.error ?? null,
  };

  const mockInsert = vi.fn();
  const mockSelect = vi.fn();
  const mockSingle = vi.fn();

  const internalPromise = Promise.resolve(result);

  const queryBuilder = {
    insert: mockInsert,
    select: mockSelect,
    single: mockSingle,
    then: (
      onFulfilled?: (value: typeof result) => unknown,
      onRejected?: (reason: unknown) => unknown
    ) => internalPromise.then(onFulfilled, onRejected),
    catch: (onRejected: (reason: unknown) => unknown) => internalPromise.catch(onRejected),
    _mocks: { insert: mockInsert, select: mockSelect, single: mockSingle },
  };

  mockInsert.mockReturnValue(queryBuilder);
  mockSelect.mockReturnValue(queryBuilder);
  mockSingle.mockReturnValue(queryBuilder);

  return queryBuilder;
};

// UPDATE操作用のモッククエリビルダー
const createMockUpdateBuilder = (options: {
  data?: EventRecord;
  error?: { message: string; code?: string };
}) => {
  const result = {
    data: options.data ?? null,
    error: options.error ?? null,
  };

  const mockUpdate = vi.fn();
  const mockEq = vi.fn();
  const mockSelect = vi.fn();
  const mockSingle = vi.fn();

  const internalPromise = Promise.resolve(result);

  const queryBuilder = {
    update: mockUpdate,
    eq: mockEq,
    select: mockSelect,
    single: mockSingle,
    then: (
      onFulfilled?: (value: typeof result) => unknown,
      onRejected?: (reason: unknown) => unknown
    ) => internalPromise.then(onFulfilled, onRejected),
    catch: (onRejected: (reason: unknown) => unknown) => internalPromise.catch(onRejected),
    _mocks: { update: mockUpdate, eq: mockEq, select: mockSelect, single: mockSingle },
  };

  mockUpdate.mockReturnValue(queryBuilder);
  mockEq.mockReturnValue(queryBuilder);
  mockSelect.mockReturnValue(queryBuilder);
  mockSingle.mockReturnValue(queryBuilder);

  return queryBuilder;
};

describe("CalendarErrorCode", () => {
  it("should have all expected error codes defined", () => {
    const expectedCodes: CalendarErrorCode[] = [
      "FETCH_FAILED",
      "NETWORK_ERROR",
      "UNAUTHORIZED",
      "CREATE_FAILED",
      "UPDATE_FAILED",
      "VALIDATION_ERROR",
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
    expect(message).toBe("認証が必要です。再度ログインしてください。");
  });

  it("should return correct message for CREATE_FAILED", () => {
    const message = getCalendarErrorMessage("CREATE_FAILED");
    expect(message).toBe("イベントの作成に失敗しました。");
  });

  it("should return correct message for UPDATE_FAILED", () => {
    const message = getCalendarErrorMessage("UPDATE_FAILED");
    expect(message).toBe("イベントの更新に失敗しました。");
  });

  it("should return correct message for VALIDATION_ERROR", () => {
    const message = getCalendarErrorMessage("VALIDATION_ERROR");
    expect(message).toBe("入力データが不正です。");
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
          notifications: [],
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
          notifications: [],
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
          notifications: [],
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

describe("createEventService - createEvent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should create event successfully with required fields (Req 1.4)", async () => {
    const mockRecord: EventRecord = {
      id: "new-event-1",
      guild_id: "guild-123",
      name: "新しいイベント",
      description: null,
      color: "#3B82F6",
      is_all_day: false,
      start_at: "2025-12-15T10:00:00Z",
      end_at: "2025-12-15T12:00:00Z",
      location: null,
      channel_id: null,
      channel_name: null,
      notifications: [],
      created_at: "2025-12-15T09:00:00Z",
      updated_at: "2025-12-15T09:00:00Z",
    };

    const insertBuilder = createMockInsertBuilder({ data: mockRecord });
    mockSupabaseClient.from.mockReturnValue(insertBuilder);

    const service = createEventService(mockSupabaseClient as unknown as Parameters<typeof createEventService>[0]);
    const input: CreateEventInput = {
      guildId: "guild-123",
      title: "新しいイベント",
      startAt: new Date("2025-12-15T10:00:00Z"),
      endAt: new Date("2025-12-15T12:00:00Z"),
    };

    const result = await service.createEvent(input);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.title).toBe("新しいイベント");
      expect(result.data.id).toBe("new-event-1");
      expect(result.data.allDay).toBe(false);
    }

    expect(mockSupabaseClient.from).toHaveBeenCalledWith("events");
    expect(insertBuilder._mocks.insert).toHaveBeenCalled();
    expect(insertBuilder._mocks.select).toHaveBeenCalled();
    expect(insertBuilder._mocks.single).toHaveBeenCalled();
  });

  it("should create event with all optional fields", async () => {
    const mockRecord: EventRecord = {
      id: "new-event-2",
      guild_id: "guild-123",
      name: "詳細なイベント",
      description: "イベントの説明",
      color: "#FF5733",
      is_all_day: true,
      start_at: "2025-12-16T00:00:00Z",
      end_at: "2025-12-17T00:00:00Z",
      location: "東京",
      channel_id: "ch-123",
      channel_name: "general",
      notifications: [],
      created_at: "2025-12-15T09:00:00Z",
      updated_at: "2025-12-15T09:00:00Z",
    };

    const insertBuilder = createMockInsertBuilder({ data: mockRecord });
    mockSupabaseClient.from.mockReturnValue(insertBuilder);

    const service = createEventService(mockSupabaseClient as unknown as Parameters<typeof createEventService>[0]);
    const input: CreateEventInput = {
      guildId: "guild-123",
      title: "詳細なイベント",
      startAt: new Date("2025-12-16T00:00:00Z"),
      endAt: new Date("2025-12-17T00:00:00Z"),
      description: "イベントの説明",
      isAllDay: true,
      color: "#FF5733",
      location: "東京",
      channelId: "ch-123",
      channelName: "general",
    };

    const result = await service.createEvent(input);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.title).toBe("詳細なイベント");
      expect(result.data.allDay).toBe(true);
      expect(result.data.description).toBe("イベントの説明");
      expect(result.data.location).toBe("東京");
      expect(result.data.color).toBe("#FF5733");
      expect(result.data.channel).toEqual({ id: "ch-123", name: "general" });
    }
  });

  it("should return VALIDATION_ERROR when title is empty", async () => {
    const service = createEventService(mockSupabaseClient as unknown as Parameters<typeof createEventService>[0]);
    const input: CreateEventInput = {
      guildId: "guild-123",
      title: "",
      startAt: new Date("2025-12-15T10:00:00Z"),
      endAt: new Date("2025-12-15T12:00:00Z"),
    };

    const result = await service.createEvent(input);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("VALIDATION_ERROR");
      expect(result.error.details).toContain("タイトルは必須です");
    }

    expect(mockSupabaseClient.from).not.toHaveBeenCalled();
  });

  it("should return VALIDATION_ERROR when title is only whitespace", async () => {
    const service = createEventService(mockSupabaseClient as unknown as Parameters<typeof createEventService>[0]);
    const input: CreateEventInput = {
      guildId: "guild-123",
      title: "   ",
      startAt: new Date("2025-12-15T10:00:00Z"),
      endAt: new Date("2025-12-15T12:00:00Z"),
    };

    const result = await service.createEvent(input);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("VALIDATION_ERROR");
    }
  });

  it("should return VALIDATION_ERROR when title exceeds 255 characters", async () => {
    const service = createEventService(mockSupabaseClient as unknown as Parameters<typeof createEventService>[0]);
    const input: CreateEventInput = {
      guildId: "guild-123",
      title: "a".repeat(256),
      startAt: new Date("2025-12-15T10:00:00Z"),
      endAt: new Date("2025-12-15T12:00:00Z"),
    };

    const result = await service.createEvent(input);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("VALIDATION_ERROR");
      expect(result.error.details).toContain("255文字以内");
    }
  });

  it("should return VALIDATION_ERROR when endAt is before startAt", async () => {
    const service = createEventService(mockSupabaseClient as unknown as Parameters<typeof createEventService>[0]);
    const input: CreateEventInput = {
      guildId: "guild-123",
      title: "テストイベント",
      startAt: new Date("2025-12-15T12:00:00Z"),
      endAt: new Date("2025-12-15T10:00:00Z"),
    };

    const result = await service.createEvent(input);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("VALIDATION_ERROR");
      expect(result.error.details).toContain("終了日時は開始日時より後");
    }
  });

  it("should return VALIDATION_ERROR when endAt equals startAt", async () => {
    const service = createEventService(mockSupabaseClient as unknown as Parameters<typeof createEventService>[0]);
    const sameDate = new Date("2025-12-15T10:00:00Z");
    const input: CreateEventInput = {
      guildId: "guild-123",
      title: "テストイベント",
      startAt: sameDate,
      endAt: sameDate,
    };

    const result = await service.createEvent(input);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("VALIDATION_ERROR");
    }
  });

  it("should return CREATE_FAILED error on database error", async () => {
    const insertBuilder = createMockInsertBuilder({
      error: { message: "Database connection failed" },
    });
    mockSupabaseClient.from.mockReturnValue(insertBuilder);

    const service = createEventService(mockSupabaseClient as unknown as Parameters<typeof createEventService>[0]);
    const input: CreateEventInput = {
      guildId: "guild-123",
      title: "テストイベント",
      startAt: new Date("2025-12-15T10:00:00Z"),
      endAt: new Date("2025-12-15T12:00:00Z"),
    };

    const result = await service.createEvent(input);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("CREATE_FAILED");
    }
  });

  it("should return UNAUTHORIZED error for permission denied", async () => {
    const insertBuilder = createMockInsertBuilder({
      error: { message: "permission denied", code: "42501" },
    });
    mockSupabaseClient.from.mockReturnValue(insertBuilder);

    const service = createEventService(mockSupabaseClient as unknown as Parameters<typeof createEventService>[0]);
    const input: CreateEventInput = {
      guildId: "guild-123",
      title: "テストイベント",
      startAt: new Date("2025-12-15T10:00:00Z"),
      endAt: new Date("2025-12-15T12:00:00Z"),
    };

    const result = await service.createEvent(input);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("UNAUTHORIZED");
    }
  });

  it("should return VALIDATION_ERROR for constraint violation", async () => {
    const insertBuilder = createMockInsertBuilder({
      error: { message: "violates unique constraint", code: "23505" },
    });
    mockSupabaseClient.from.mockReturnValue(insertBuilder);

    const service = createEventService(mockSupabaseClient as unknown as Parameters<typeof createEventService>[0]);
    const input: CreateEventInput = {
      guildId: "guild-123",
      title: "テストイベント",
      startAt: new Date("2025-12-15T10:00:00Z"),
      endAt: new Date("2025-12-15T12:00:00Z"),
    };

    const result = await service.createEvent(input);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("VALIDATION_ERROR");
    }
  });

  it("should trim title and description", async () => {
    const mockRecord: EventRecord = {
      id: "new-event-3",
      guild_id: "guild-123",
      name: "トリムされたタイトル",
      description: "トリムされた説明",
      color: "#3B82F6",
      is_all_day: false,
      start_at: "2025-12-15T10:00:00Z",
      end_at: "2025-12-15T12:00:00Z",
      location: null,
      channel_id: null,
      channel_name: null,
      notifications: [],
      created_at: "2025-12-15T09:00:00Z",
      updated_at: "2025-12-15T09:00:00Z",
    };

    const insertBuilder = createMockInsertBuilder({ data: mockRecord });
    mockSupabaseClient.from.mockReturnValue(insertBuilder);

    const service = createEventService(mockSupabaseClient as unknown as Parameters<typeof createEventService>[0]);
    const input: CreateEventInput = {
      guildId: "guild-123",
      title: "  トリムされたタイトル  ",
      startAt: new Date("2025-12-15T10:00:00Z"),
      endAt: new Date("2025-12-15T12:00:00Z"),
      description: "  トリムされた説明  ",
    };

    const result = await service.createEvent(input);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.title).toBe("トリムされたタイトル");
      expect(result.data.description).toBe("トリムされた説明");
    }

    // insertが呼ばれた際の引数を確認
    const insertCall = insertBuilder._mocks.insert.mock.calls[0]?.[0];
    expect(insertCall).toBeDefined();
    if (insertCall) {
      expect(insertCall.name).toBe("トリムされたタイトル");
      expect(insertCall.description).toBe("トリムされた説明");
    }
  });

  it("should use default values for optional fields", async () => {
    const mockRecord: EventRecord = {
      id: "new-event-4",
      guild_id: "guild-123",
      name: "デフォルト値テスト",
      description: null,
      color: "#3B82F6",
      is_all_day: false,
      start_at: "2025-12-15T10:00:00Z",
      end_at: "2025-12-15T12:00:00Z",
      location: null,
      channel_id: null,
      channel_name: null,
      notifications: [],
      created_at: "2025-12-15T09:00:00Z",
      updated_at: "2025-12-15T09:00:00Z",
    };

    const insertBuilder = createMockInsertBuilder({ data: mockRecord });
    mockSupabaseClient.from.mockReturnValue(insertBuilder);

    const service = createEventService(mockSupabaseClient as unknown as Parameters<typeof createEventService>[0]);
    const input: CreateEventInput = {
      guildId: "guild-123",
      title: "デフォルト値テスト",
      startAt: new Date("2025-12-15T10:00:00Z"),
      endAt: new Date("2025-12-15T12:00:00Z"),
    };

    const result = await service.createEvent(input);

    expect(result.success).toBe(true);

    // insertが呼ばれた際の引数を確認
    const insertCall = insertBuilder._mocks.insert.mock.calls[0]?.[0];
    expect(insertCall).toBeDefined();
    if (insertCall) {
      expect(insertCall.is_all_day).toBe(false);
      expect(insertCall.color).toBe("#3B82F6");
      expect(insertCall.description).toBeNull();
      expect(insertCall.location).toBeNull();
    }
  });
});

// DELETE操作用のモッククエリビルダー
const createMockDeleteBuilder = (options: {
  data?: null;
  error?: { message: string; code?: string };
}) => {
  const result = {
    data: options.data ?? null,
    error: options.error ?? null,
    count: options.error ? 0 : 1,
  };

  const mockDelete = vi.fn();
  const mockEq = vi.fn();

  const internalPromise = Promise.resolve(result);

  const queryBuilder = {
    delete: mockDelete,
    eq: mockEq,
    then: (
      onFulfilled?: (value: typeof result) => unknown,
      onRejected?: (reason: unknown) => unknown
    ) => internalPromise.then(onFulfilled, onRejected),
    catch: (onRejected: (reason: unknown) => unknown) => internalPromise.catch(onRejected),
    _mocks: { delete: mockDelete, eq: mockEq },
  };

  mockDelete.mockReturnValue(queryBuilder);
  mockEq.mockReturnValue(queryBuilder);

  return queryBuilder;
};

describe("createEventService - updateEvent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should update event successfully with all fields (Req 3.3)", async () => {
    const mockRecord: EventRecord = {
      id: "event-1",
      guild_id: "guild-123",
      name: "更新されたイベント",
      description: "更新された説明",
      color: "#FF5733",
      is_all_day: true,
      start_at: "2025-12-16T00:00:00Z",
      end_at: "2025-12-17T00:00:00Z",
      location: "大阪",
      channel_id: "ch-1",
      channel_name: "general",
      notifications: [],
      created_at: "2025-12-15T09:00:00Z",
      updated_at: "2025-12-15T10:00:00Z",
    };

    const updateBuilder = createMockUpdateBuilder({ data: mockRecord });
    mockSupabaseClient.from.mockReturnValue(updateBuilder);

    const service = createEventService(mockSupabaseClient as unknown as Parameters<typeof createEventService>[0]);
    const input: UpdateEventInput = {
      title: "更新されたイベント",
      startAt: new Date("2025-12-16T00:00:00Z"),
      endAt: new Date("2025-12-17T00:00:00Z"),
      description: "更新された説明",
      isAllDay: true,
      color: "#FF5733",
      location: "大阪",
    };

    const result = await service.updateEvent("event-1", input);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.title).toBe("更新されたイベント");
      expect(result.data.description).toBe("更新された説明");
      expect(result.data.allDay).toBe(true);
      expect(result.data.color).toBe("#FF5733");
      expect(result.data.location).toBe("大阪");
    }

    expect(mockSupabaseClient.from).toHaveBeenCalledWith("events");
    expect(updateBuilder._mocks.update).toHaveBeenCalled();
    expect(updateBuilder._mocks.eq).toHaveBeenCalledWith("id", "event-1");
    expect(updateBuilder._mocks.select).toHaveBeenCalled();
    expect(updateBuilder._mocks.single).toHaveBeenCalled();
  });

  it("should support partial update with only title", async () => {
    const mockRecord: EventRecord = {
      id: "event-1",
      guild_id: "guild-123",
      name: "部分更新されたタイトル",
      description: "元の説明",
      color: "#3B82F6",
      is_all_day: false,
      start_at: "2025-12-15T10:00:00Z",
      end_at: "2025-12-15T12:00:00Z",
      location: null,
      channel_id: null,
      channel_name: null,
      notifications: [],
      created_at: "2025-12-15T09:00:00Z",
      updated_at: "2025-12-15T10:00:00Z",
    };

    const updateBuilder = createMockUpdateBuilder({ data: mockRecord });
    mockSupabaseClient.from.mockReturnValue(updateBuilder);

    const service = createEventService(mockSupabaseClient as unknown as Parameters<typeof createEventService>[0]);
    const input: UpdateEventInput = {
      title: "部分更新されたタイトル",
    };

    const result = await service.updateEvent("event-1", input);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.title).toBe("部分更新されたタイトル");
    }

    // updateが呼ばれた際の引数を確認（titleのみ更新）
    const updateCall = updateBuilder._mocks.update.mock.calls[0]?.[0];
    expect(updateCall).toBeDefined();
    if (updateCall) {
      expect(updateCall.name).toBe("部分更新されたタイトル");
      // 他のフィールドは含まれていないこと
      expect(Object.keys(updateCall)).toHaveLength(1);
    }
  });

  it("should support partial update with only dates", async () => {
    const mockRecord: EventRecord = {
      id: "event-1",
      guild_id: "guild-123",
      name: "元のイベント",
      description: null,
      color: "#3B82F6",
      is_all_day: false,
      start_at: "2025-12-20T10:00:00Z",
      end_at: "2025-12-20T12:00:00Z",
      location: null,
      channel_id: null,
      channel_name: null,
      notifications: [],
      created_at: "2025-12-15T09:00:00Z",
      updated_at: "2025-12-15T10:00:00Z",
    };

    const updateBuilder = createMockUpdateBuilder({ data: mockRecord });
    mockSupabaseClient.from.mockReturnValue(updateBuilder);

    const service = createEventService(mockSupabaseClient as unknown as Parameters<typeof createEventService>[0]);
    const input: UpdateEventInput = {
      startAt: new Date("2025-12-20T10:00:00Z"),
      endAt: new Date("2025-12-20T12:00:00Z"),
    };

    const result = await service.updateEvent("event-1", input);

    expect(result.success).toBe(true);

    // updateが呼ばれた際の引数を確認
    const updateCall = updateBuilder._mocks.update.mock.calls[0]?.[0];
    expect(updateCall).toBeDefined();
    if (updateCall) {
      expect(updateCall.start_at).toBe("2025-12-20T10:00:00.000Z");
      expect(updateCall.end_at).toBe("2025-12-20T12:00:00.000Z");
      expect(Object.keys(updateCall)).toHaveLength(2);
    }
  });

  it("should return VALIDATION_ERROR when title is empty", async () => {
    const service = createEventService(mockSupabaseClient as unknown as Parameters<typeof createEventService>[0]);
    const input: UpdateEventInput = {
      title: "",
    };

    const result = await service.updateEvent("event-1", input);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("VALIDATION_ERROR");
      expect(result.error.details).toContain("タイトルは必須です");
    }

    expect(mockSupabaseClient.from).not.toHaveBeenCalled();
  });

  it("should return VALIDATION_ERROR when title exceeds 255 characters", async () => {
    const service = createEventService(mockSupabaseClient as unknown as Parameters<typeof createEventService>[0]);
    const input: UpdateEventInput = {
      title: "a".repeat(256),
    };

    const result = await service.updateEvent("event-1", input);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("VALIDATION_ERROR");
      expect(result.error.details).toContain("255文字以内");
    }
  });

  it("should return VALIDATION_ERROR when endAt is before startAt", async () => {
    const service = createEventService(mockSupabaseClient as unknown as Parameters<typeof createEventService>[0]);
    const input: UpdateEventInput = {
      startAt: new Date("2025-12-15T12:00:00Z"),
      endAt: new Date("2025-12-15T10:00:00Z"),
    };

    const result = await service.updateEvent("event-1", input);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("VALIDATION_ERROR");
      expect(result.error.details).toContain("終了日時は開始日時より後");
    }
  });

  it("should return UPDATE_FAILED error on database error", async () => {
    const updateBuilder = createMockUpdateBuilder({
      error: { message: "Database connection failed" },
    });
    mockSupabaseClient.from.mockReturnValue(updateBuilder);

    const service = createEventService(mockSupabaseClient as unknown as Parameters<typeof createEventService>[0]);
    const input: UpdateEventInput = {
      title: "更新テスト",
    };

    const result = await service.updateEvent("event-1", input);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("UPDATE_FAILED");
    }
  });

  it("should return UNAUTHORIZED error for permission denied", async () => {
    const updateBuilder = createMockUpdateBuilder({
      error: { message: "permission denied", code: "42501" },
    });
    mockSupabaseClient.from.mockReturnValue(updateBuilder);

    const service = createEventService(mockSupabaseClient as unknown as Parameters<typeof createEventService>[0]);
    const input: UpdateEventInput = {
      title: "更新テスト",
    };

    const result = await service.updateEvent("event-1", input);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("UNAUTHORIZED");
    }
  });

  it("should trim title and description", async () => {
    const mockRecord: EventRecord = {
      id: "event-1",
      guild_id: "guild-123",
      name: "トリムされたタイトル",
      description: "トリムされた説明",
      color: "#3B82F6",
      is_all_day: false,
      start_at: "2025-12-15T10:00:00Z",
      end_at: "2025-12-15T12:00:00Z",
      location: null,
      channel_id: null,
      channel_name: null,
      notifications: [],
      created_at: "2025-12-15T09:00:00Z",
      updated_at: "2025-12-15T10:00:00Z",
    };

    const updateBuilder = createMockUpdateBuilder({ data: mockRecord });
    mockSupabaseClient.from.mockReturnValue(updateBuilder);

    const service = createEventService(mockSupabaseClient as unknown as Parameters<typeof createEventService>[0]);
    const input: UpdateEventInput = {
      title: "  トリムされたタイトル  ",
      description: "  トリムされた説明  ",
    };

    const result = await service.updateEvent("event-1", input);

    expect(result.success).toBe(true);

    // updateが呼ばれた際の引数を確認
    const updateCall = updateBuilder._mocks.update.mock.calls[0]?.[0];
    expect(updateCall).toBeDefined();
    if (updateCall) {
      expect(updateCall.name).toBe("トリムされたタイトル");
      expect(updateCall.description).toBe("トリムされた説明");
    }
  });

  it("should handle empty update input (no fields to update)", async () => {
    const mockRecord: EventRecord = {
      id: "event-1",
      guild_id: "guild-123",
      name: "元のイベント",
      description: null,
      color: "#3B82F6",
      is_all_day: false,
      start_at: "2025-12-15T10:00:00Z",
      end_at: "2025-12-15T12:00:00Z",
      location: null,
      channel_id: null,
      channel_name: null,
      notifications: [],
      created_at: "2025-12-15T09:00:00Z",
      updated_at: "2025-12-15T10:00:00Z",
    };

    const updateBuilder = createMockUpdateBuilder({ data: mockRecord });
    mockSupabaseClient.from.mockReturnValue(updateBuilder);

    const service = createEventService(mockSupabaseClient as unknown as Parameters<typeof createEventService>[0]);
    const input: UpdateEventInput = {};

    const result = await service.updateEvent("event-1", input);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.title).toBe("元のイベント");
    }
  });
});

describe("createEventService - deleteEvent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should delete event successfully (Req 4.2)", async () => {
    const deleteBuilder = createMockDeleteBuilder({});
    mockSupabaseClient.from.mockReturnValue(deleteBuilder);

    const service = createEventService(mockSupabaseClient as unknown as Parameters<typeof createEventService>[0]);

    const result = await service.deleteEvent("event-1");

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBeUndefined();
    }

    expect(mockSupabaseClient.from).toHaveBeenCalledWith("events");
    expect(deleteBuilder._mocks.delete).toHaveBeenCalled();
    expect(deleteBuilder._mocks.eq).toHaveBeenCalledWith("id", "event-1");
  });

  it("should permanently delete the event (Req 4.5)", async () => {
    const deleteBuilder = createMockDeleteBuilder({});
    mockSupabaseClient.from.mockReturnValue(deleteBuilder);

    const service = createEventService(mockSupabaseClient as unknown as Parameters<typeof createEventService>[0]);

    const result = await service.deleteEvent("event-to-delete");

    expect(result.success).toBe(true);
    // 削除操作はDELETEメソッドを使用し、復元不可能な完全削除を保証
    expect(deleteBuilder._mocks.delete).toHaveBeenCalledTimes(1);
    expect(deleteBuilder._mocks.eq).toHaveBeenCalledWith("id", "event-to-delete");
  });

  it("should return DELETE_FAILED error on database error", async () => {
    const deleteBuilder = createMockDeleteBuilder({
      error: { message: "Database connection failed" },
    });
    mockSupabaseClient.from.mockReturnValue(deleteBuilder);

    const service = createEventService(mockSupabaseClient as unknown as Parameters<typeof createEventService>[0]);

    const result = await service.deleteEvent("event-1");

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("DELETE_FAILED");
      expect(result.error.message).toBe("イベントの削除に失敗しました。");
    }
  });

  it("should return UNAUTHORIZED error for permission denied", async () => {
    const deleteBuilder = createMockDeleteBuilder({
      error: { message: "permission denied", code: "42501" },
    });
    mockSupabaseClient.from.mockReturnValue(deleteBuilder);

    const service = createEventService(mockSupabaseClient as unknown as Parameters<typeof createEventService>[0]);

    const result = await service.deleteEvent("event-1");

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("UNAUTHORIZED");
    }
  });

  it("should handle network errors gracefully", async () => {
    // ネットワークエラーをシミュレートするためのカスタムビルダー
    const mockDelete = vi.fn();
    const mockEq = vi.fn();

    const networkError = new TypeError("Failed to fetch");
    const internalPromise = Promise.reject(networkError);

    const queryBuilder = {
      delete: mockDelete,
      eq: mockEq,
      then: (
        onFulfilled?: (value: unknown) => unknown,
        onRejected?: (reason: unknown) => unknown
      ) => internalPromise.then(onFulfilled, onRejected),
      catch: (onRejected: (reason: unknown) => unknown) => internalPromise.catch(onRejected),
    };

    mockDelete.mockReturnValue(queryBuilder);
    mockEq.mockReturnValue(queryBuilder);
    mockSupabaseClient.from.mockReturnValue(queryBuilder);

    const service = createEventService(mockSupabaseClient as unknown as Parameters<typeof createEventService>[0]);

    const result = await service.deleteEvent("event-1");

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("NETWORK_ERROR");
    }
  });

  it("should include error details from Supabase error", async () => {
    const deleteBuilder = createMockDeleteBuilder({
      error: { message: "Row not found", code: "PGRST116" },
    });
    mockSupabaseClient.from.mockReturnValue(deleteBuilder);

    const service = createEventService(mockSupabaseClient as unknown as Parameters<typeof createEventService>[0]);

    const result = await service.deleteEvent("non-existent-event");

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.details).toBe("Row not found");
    }
  });
});

describe("CalendarErrorCode - DELETE_FAILED", () => {
  it("should have DELETE_FAILED error code defined", () => {
    expect(CALENDAR_ERROR_CODES).toContain("DELETE_FAILED");
  });

  it("should return correct message for DELETE_FAILED", () => {
    const message = getCalendarErrorMessage("DELETE_FAILED");
    expect(message).toBe("イベントの削除に失敗しました。");
  });
});

describe("createEventService - notification persistence", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createEvent with notifications (Req 2.1)", () => {
    it("should include notifications in insert data when provided", async () => {
      const notifications = [
        { key: "n1", num: 1, unit: "hours" as const },
        { key: "n2", num: 3, unit: "days" as const },
      ];

      const mockRecord: EventRecord = {
        id: "event-with-notif",
        guild_id: "guild-123",
        name: "通知付きイベント",
        description: null,
        color: "#3B82F6",
        is_all_day: false,
        start_at: "2025-12-15T10:00:00Z",
        end_at: "2025-12-15T12:00:00Z",
        location: null,
        channel_id: null,
        channel_name: null,
        notifications,
        created_at: "2025-12-15T09:00:00Z",
        updated_at: "2025-12-15T09:00:00Z",
      };

      const insertBuilder = createMockInsertBuilder({ data: mockRecord });
      mockSupabaseClient.from.mockReturnValue(insertBuilder);

      const service = createEventService(mockSupabaseClient as unknown as Parameters<typeof createEventService>[0]);
      const input: CreateEventInput = {
        guildId: "guild-123",
        title: "通知付きイベント",
        startAt: new Date("2025-12-15T10:00:00Z"),
        endAt: new Date("2025-12-15T12:00:00Z"),
        notifications,
      };

      const result = await service.createEvent(input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.notifications).toEqual(notifications);
      }

      // insertが呼ばれた際の引数で notifications が含まれていることを確認
      const insertCall = insertBuilder._mocks.insert.mock.calls[0]?.[0];
      expect(insertCall).toBeDefined();
      if (insertCall) {
        expect(insertCall.notifications).toEqual(notifications);
      }
    });

    it("should default to empty array when notifications not provided (Req 5.3)", async () => {
      const mockRecord: EventRecord = {
        id: "event-no-notif",
        guild_id: "guild-123",
        name: "通知なしイベント",
        description: null,
        color: "#3B82F6",
        is_all_day: false,
        start_at: "2025-12-15T10:00:00Z",
        end_at: "2025-12-15T12:00:00Z",
        location: null,
        channel_id: null,
        channel_name: null,
        notifications: [],
        created_at: "2025-12-15T09:00:00Z",
        updated_at: "2025-12-15T09:00:00Z",
      };

      const insertBuilder = createMockInsertBuilder({ data: mockRecord });
      mockSupabaseClient.from.mockReturnValue(insertBuilder);

      const service = createEventService(mockSupabaseClient as unknown as Parameters<typeof createEventService>[0]);
      const input: CreateEventInput = {
        guildId: "guild-123",
        title: "通知なしイベント",
        startAt: new Date("2025-12-15T10:00:00Z"),
        endAt: new Date("2025-12-15T12:00:00Z"),
        // notifications は意図的に省略
      };

      const result = await service.createEvent(input);

      expect(result.success).toBe(true);

      // insertが呼ばれた際の引数で notifications が空配列であることを確認
      const insertCall = insertBuilder._mocks.insert.mock.calls[0]?.[0];
      expect(insertCall).toBeDefined();
      if (insertCall) {
        expect(insertCall.notifications).toEqual([]);
      }
    });

    it("should save event with empty notifications array (Req 5.3)", async () => {
      const mockRecord: EventRecord = {
        id: "event-empty-notif",
        guild_id: "guild-123",
        name: "空通知イベント",
        description: null,
        color: "#3B82F6",
        is_all_day: false,
        start_at: "2025-12-15T10:00:00Z",
        end_at: "2025-12-15T12:00:00Z",
        location: null,
        channel_id: null,
        channel_name: null,
        notifications: [],
        created_at: "2025-12-15T09:00:00Z",
        updated_at: "2025-12-15T09:00:00Z",
      };

      const insertBuilder = createMockInsertBuilder({ data: mockRecord });
      mockSupabaseClient.from.mockReturnValue(insertBuilder);

      const service = createEventService(mockSupabaseClient as unknown as Parameters<typeof createEventService>[0]);
      const input: CreateEventInput = {
        guildId: "guild-123",
        title: "空通知イベント",
        startAt: new Date("2025-12-15T10:00:00Z"),
        endAt: new Date("2025-12-15T12:00:00Z"),
        notifications: [],
      };

      const result = await service.createEvent(input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.notifications).toEqual([]);
      }

      const insertCall = insertBuilder._mocks.insert.mock.calls[0]?.[0];
      expect(insertCall).toBeDefined();
      if (insertCall) {
        expect(insertCall.notifications).toEqual([]);
      }
    });

    it("should persist notifications through CalendarEvent conversion", async () => {
      const notifications = [
        { key: "n1", num: 30, unit: "minutes" as const },
        { key: "n2", num: 1, unit: "weeks" as const },
      ];

      const mockRecord: EventRecord = {
        id: "event-convert",
        guild_id: "guild-123",
        name: "変換テスト",
        description: null,
        color: "#3B82F6",
        is_all_day: false,
        start_at: "2025-12-15T10:00:00Z",
        end_at: "2025-12-15T12:00:00Z",
        location: null,
        channel_id: null,
        channel_name: null,
        notifications,
        created_at: "2025-12-15T09:00:00Z",
        updated_at: "2025-12-15T09:00:00Z",
      };

      const insertBuilder = createMockInsertBuilder({ data: mockRecord });
      mockSupabaseClient.from.mockReturnValue(insertBuilder);

      const service = createEventService(mockSupabaseClient as unknown as Parameters<typeof createEventService>[0]);
      const input: CreateEventInput = {
        guildId: "guild-123",
        title: "変換テスト",
        startAt: new Date("2025-12-15T10:00:00Z"),
        endAt: new Date("2025-12-15T12:00:00Z"),
        notifications,
      };

      const result = await service.createEvent(input);

      expect(result.success).toBe(true);
      if (result.success) {
        // CalendarEvent に正しく変換されていることを確認
        expect(result.data.notifications).toHaveLength(2);
        expect(result.data.notifications?.[0]).toEqual({ key: "n1", num: 30, unit: "minutes" });
        expect(result.data.notifications?.[1]).toEqual({ key: "n2", num: 1, unit: "weeks" });
      }
    });
  });

  describe("updateEvent with notifications (Req 2.3, 2.4)", () => {
    it("should include notifications in update data when provided (Req 2.3)", async () => {
      const notifications = [
        { key: "n1", num: 2, unit: "hours" as const },
      ];

      const mockRecord: EventRecord = {
        id: "event-1",
        guild_id: "guild-123",
        name: "元のイベント",
        description: null,
        color: "#3B82F6",
        is_all_day: false,
        start_at: "2025-12-15T10:00:00Z",
        end_at: "2025-12-15T12:00:00Z",
        location: null,
        channel_id: null,
        channel_name: null,
        notifications,
        created_at: "2025-12-15T09:00:00Z",
        updated_at: "2025-12-15T10:00:00Z",
      };

      const updateBuilder = createMockUpdateBuilder({ data: mockRecord });
      mockSupabaseClient.from.mockReturnValue(updateBuilder);

      const service = createEventService(mockSupabaseClient as unknown as Parameters<typeof createEventService>[0]);
      const input: UpdateEventInput = {
        notifications,
      };

      const result = await service.updateEvent("event-1", input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.notifications).toEqual(notifications);
      }

      // updateが呼ばれた際の引数で notifications が含まれていることを確認
      const updateCall = updateBuilder._mocks.update.mock.calls[0]?.[0];
      expect(updateCall).toBeDefined();
      if (updateCall) {
        expect(updateCall.notifications).toEqual(notifications);
        // notifications のみが更新されること
        expect(Object.keys(updateCall)).toHaveLength(1);
      }
    });

    it("should not include notifications in update data when not provided", async () => {
      const mockRecord: EventRecord = {
        id: "event-1",
        guild_id: "guild-123",
        name: "更新されたタイトル",
        description: null,
        color: "#3B82F6",
        is_all_day: false,
        start_at: "2025-12-15T10:00:00Z",
        end_at: "2025-12-15T12:00:00Z",
        location: null,
        channel_id: null,
        channel_name: null,
        notifications: [{ key: "existing", num: 1, unit: "hours" as const }],
        created_at: "2025-12-15T09:00:00Z",
        updated_at: "2025-12-15T10:00:00Z",
      };

      const updateBuilder = createMockUpdateBuilder({ data: mockRecord });
      mockSupabaseClient.from.mockReturnValue(updateBuilder);

      const service = createEventService(mockSupabaseClient as unknown as Parameters<typeof createEventService>[0]);
      const input: UpdateEventInput = {
        title: "更新されたタイトル",
        // notifications は意図的に省略 → 既存値を維持
      };

      const result = await service.updateEvent("event-1", input);

      expect(result.success).toBe(true);

      // updateが呼ばれた際の引数で notifications が含まれていないことを確認
      const updateCall = updateBuilder._mocks.update.mock.calls[0]?.[0];
      expect(updateCall).toBeDefined();
      if (updateCall) {
        expect(updateCall).not.toHaveProperty("notifications");
        expect(updateCall.name).toBe("更新されたタイトル");
      }
    });

    it("should save empty array to clear all notifications (Req 2.4)", async () => {
      const mockRecord: EventRecord = {
        id: "event-1",
        guild_id: "guild-123",
        name: "元のイベント",
        description: null,
        color: "#3B82F6",
        is_all_day: false,
        start_at: "2025-12-15T10:00:00Z",
        end_at: "2025-12-15T12:00:00Z",
        location: null,
        channel_id: null,
        channel_name: null,
        notifications: [],
        created_at: "2025-12-15T09:00:00Z",
        updated_at: "2025-12-15T10:00:00Z",
      };

      const updateBuilder = createMockUpdateBuilder({ data: mockRecord });
      mockSupabaseClient.from.mockReturnValue(updateBuilder);

      const service = createEventService(mockSupabaseClient as unknown as Parameters<typeof createEventService>[0]);
      const input: UpdateEventInput = {
        notifications: [], // 全通知を削除
      };

      const result = await service.updateEvent("event-1", input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.notifications).toEqual([]);
      }

      // updateが呼ばれた際の引数で notifications が空配列であることを確認
      const updateCall = updateBuilder._mocks.update.mock.calls[0]?.[0];
      expect(updateCall).toBeDefined();
      if (updateCall) {
        expect(updateCall.notifications).toEqual([]);
      }
    });

    it("should update notifications together with other fields", async () => {
      const notifications = [
        { key: "n1", num: 5, unit: "minutes" as const },
        { key: "n2", num: 1, unit: "days" as const },
      ];

      const mockRecord: EventRecord = {
        id: "event-1",
        guild_id: "guild-123",
        name: "更新イベント",
        description: "新しい説明",
        color: "#3B82F6",
        is_all_day: false,
        start_at: "2025-12-15T10:00:00Z",
        end_at: "2025-12-15T12:00:00Z",
        location: null,
        channel_id: null,
        channel_name: null,
        notifications,
        created_at: "2025-12-15T09:00:00Z",
        updated_at: "2025-12-15T10:00:00Z",
      };

      const updateBuilder = createMockUpdateBuilder({ data: mockRecord });
      mockSupabaseClient.from.mockReturnValue(updateBuilder);

      const service = createEventService(mockSupabaseClient as unknown as Parameters<typeof createEventService>[0]);
      const input: UpdateEventInput = {
        title: "更新イベント",
        description: "新しい説明",
        notifications,
      };

      const result = await service.updateEvent("event-1", input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.notifications).toEqual(notifications);
        expect(result.data.title).toBe("更新イベント");
        expect(result.data.description).toBe("新しい説明");
      }

      // updateが呼ばれた際の引数を確認
      const updateCall = updateBuilder._mocks.update.mock.calls[0]?.[0];
      expect(updateCall).toBeDefined();
      if (updateCall) {
        expect(updateCall.notifications).toEqual(notifications);
        expect(updateCall.name).toBe("更新イベント");
        expect(updateCall.description).toBe("新しい説明");
        expect(Object.keys(updateCall)).toHaveLength(3);
      }
    });
  });

  describe("error handling with notifications (Req 5.2)", () => {
    it("should return CREATE_FAILED when saving event with notifications fails", async () => {
      const insertBuilder = createMockInsertBuilder({
        error: { message: "Database connection failed" },
      });
      mockSupabaseClient.from.mockReturnValue(insertBuilder);

      const service = createEventService(mockSupabaseClient as unknown as Parameters<typeof createEventService>[0]);
      const input: CreateEventInput = {
        guildId: "guild-123",
        title: "通知付きイベント",
        startAt: new Date("2025-12-15T10:00:00Z"),
        endAt: new Date("2025-12-15T12:00:00Z"),
        notifications: [
          { key: "n1", num: 1, unit: "hours" },
        ],
      };

      const result = await service.createEvent(input);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe("CREATE_FAILED");
        expect(result.error.message).toBe("イベントの作成に失敗しました。");
      }
    });

    it("should return UPDATE_FAILED when updating notifications fails", async () => {
      const updateBuilder = createMockUpdateBuilder({
        error: { message: "Database connection failed" },
      });
      mockSupabaseClient.from.mockReturnValue(updateBuilder);

      const service = createEventService(mockSupabaseClient as unknown as Parameters<typeof createEventService>[0]);
      const input: UpdateEventInput = {
        notifications: [
          { key: "n1", num: 2, unit: "days" },
        ],
      };

      const result = await service.updateEvent("event-1", input);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe("UPDATE_FAILED");
        expect(result.error.message).toBe("イベントの更新に失敗しました。");
      }
    });
  });
});

// =============================================================================
// createRecurringSeries テスト (Task 3.1)
// =============================================================================

describe("createEventService - createRecurringSeries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const validSeriesInput: CreateSeriesInput = {
    guildId: "guild-123",
    title: "毎週の定例会",
    startAt: new Date("2026-03-01T10:00:00Z"),
    endAt: new Date("2026-03-01T11:00:00Z"),
    rrule: "FREQ=WEEKLY;BYDAY=MO",
  };

  const mockSeriesRecord: EventSeriesRecord = {
    id: "series-1",
    guild_id: "guild-123",
    name: "毎週の定例会",
    description: null,
    color: "#3B82F6",
    is_all_day: false,
    rrule: "FREQ=WEEKLY;BYDAY=MO",
    dtstart: "2026-03-01T10:00:00Z",
    duration_minutes: 60,
    location: null,
    channel_id: null,
    channel_name: null,
    notifications: [],
    exdates: [],
    created_at: "2026-02-23T12:00:00Z",
    updated_at: "2026-02-23T12:00:00Z",
  };

  it("should create series successfully with required fields (Req 1.3, 8.1)", async () => {
    const insertBuilder = createMockInsertBuilder({ data: mockSeriesRecord as unknown as EventRecord });
    mockSupabaseClient.from.mockReturnValue(insertBuilder);

    const service = createEventService(mockSupabaseClient as unknown as Parameters<typeof createEventService>[0]);

    const result = await service.createRecurringSeries(validSeriesInput);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.id).toBe("series-1");
      expect(result.data.name).toBe("毎週の定例会");
      expect(result.data.rrule).toBe("FREQ=WEEKLY;BYDAY=MO");
      expect(result.data.duration_minutes).toBe(60);
      expect(result.data.guild_id).toBe("guild-123");
    }

    expect(mockSupabaseClient.from).toHaveBeenCalledWith("event_series");
  });

  it("should create series with all optional fields", async () => {
    const fullRecord: EventSeriesRecord = {
      ...mockSeriesRecord,
      id: "series-2",
      name: "詳細な定例会",
      description: "毎週の進捗報告会議",
      color: "#FF5733",
      is_all_day: false,
      location: "会議室A",
      channel_id: "ch-123",
      channel_name: "meeting",
      notifications: [{ key: "n1", num: 1, unit: "hours" }],
    };

    const insertBuilder = createMockInsertBuilder({ data: fullRecord as unknown as EventRecord });
    mockSupabaseClient.from.mockReturnValue(insertBuilder);

    const service = createEventService(mockSupabaseClient as unknown as Parameters<typeof createEventService>[0]);
    const input: CreateSeriesInput = {
      guildId: "guild-123",
      title: "詳細な定例会",
      startAt: new Date("2026-03-01T10:00:00Z"),
      endAt: new Date("2026-03-01T11:00:00Z"),
      description: "毎週の進捗報告会議",
      color: "#FF5733",
      location: "会議室A",
      channelId: "ch-123",
      channelName: "meeting",
      notifications: [{ key: "n1", num: 1, unit: "hours" }],
      rrule: "FREQ=WEEKLY;BYDAY=MO",
    };

    const result = await service.createRecurringSeries(input);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("詳細な定例会");
      expect(result.data.description).toBe("毎週の進捗報告会議");
      expect(result.data.color).toBe("#FF5733");
      expect(result.data.location).toBe("会議室A");
      expect(result.data.channel_id).toBe("ch-123");
      expect(result.data.channel_name).toBe("meeting");
      expect(result.data.notifications).toEqual([{ key: "n1", num: 1, unit: "hours" }]);
    }
  });

  it("should calculate duration_minutes from startAt and endAt", async () => {
    const insertBuilder = createMockInsertBuilder({ data: mockSeriesRecord as unknown as EventRecord });
    mockSupabaseClient.from.mockReturnValue(insertBuilder);

    const service = createEventService(mockSupabaseClient as unknown as Parameters<typeof createEventService>[0]);
    const input: CreateSeriesInput = {
      ...validSeriesInput,
      startAt: new Date("2026-03-01T10:00:00Z"),
      endAt: new Date("2026-03-01T12:30:00Z"), // 150 minutes
    };

    await service.createRecurringSeries(input);

    const insertCall = insertBuilder._mocks.insert.mock.calls[0]?.[0];
    expect(insertCall).toBeDefined();
    if (insertCall) {
      expect(insertCall.duration_minutes).toBe(150);
    }
  });

  it("should send correct insert data to Supabase", async () => {
    const insertBuilder = createMockInsertBuilder({ data: mockSeriesRecord as unknown as EventRecord });
    mockSupabaseClient.from.mockReturnValue(insertBuilder);

    const service = createEventService(mockSupabaseClient as unknown as Parameters<typeof createEventService>[0]);

    await service.createRecurringSeries(validSeriesInput);

    const insertCall = insertBuilder._mocks.insert.mock.calls[0]?.[0];
    expect(insertCall).toBeDefined();
    if (insertCall) {
      expect(insertCall.guild_id).toBe("guild-123");
      expect(insertCall.name).toBe("毎週の定例会");
      expect(insertCall.rrule).toBe("FREQ=WEEKLY;BYDAY=MO");
      expect(insertCall.dtstart).toBe("2026-03-01T10:00:00.000Z");
      expect(insertCall.duration_minutes).toBe(60);
      expect(insertCall.is_all_day).toBe(false);
      expect(insertCall.color).toBe("#3B82F6");
      expect(insertCall.exdates).toEqual([]);
      expect(insertCall.notifications).toEqual([]);
    }
  });

  it("should return VALIDATION_ERROR when title is empty", async () => {
    const service = createEventService(mockSupabaseClient as unknown as Parameters<typeof createEventService>[0]);
    const input: CreateSeriesInput = {
      ...validSeriesInput,
      title: "",
    };

    const result = await service.createRecurringSeries(input);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("VALIDATION_ERROR");
      expect(result.error.details).toContain("タイトルは必須です");
    }

    expect(mockSupabaseClient.from).not.toHaveBeenCalled();
  });

  it("should return VALIDATION_ERROR when title exceeds 255 characters", async () => {
    const service = createEventService(mockSupabaseClient as unknown as Parameters<typeof createEventService>[0]);
    const input: CreateSeriesInput = {
      ...validSeriesInput,
      title: "a".repeat(256),
    };

    const result = await service.createRecurringSeries(input);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("VALIDATION_ERROR");
      expect(result.error.details).toContain("255文字以内");
    }
  });

  it("should return VALIDATION_ERROR when endAt is before startAt", async () => {
    const service = createEventService(mockSupabaseClient as unknown as Parameters<typeof createEventService>[0]);
    const input: CreateSeriesInput = {
      ...validSeriesInput,
      startAt: new Date("2026-03-01T12:00:00Z"),
      endAt: new Date("2026-03-01T10:00:00Z"),
    };

    const result = await service.createRecurringSeries(input);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("VALIDATION_ERROR");
      expect(result.error.details).toContain("終了日時は開始日時より後");
    }
  });

  it("should return VALIDATION_ERROR when rrule is empty", async () => {
    const service = createEventService(mockSupabaseClient as unknown as Parameters<typeof createEventService>[0]);
    const input: CreateSeriesInput = {
      ...validSeriesInput,
      rrule: "",
    };

    const result = await service.createRecurringSeries(input);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("VALIDATION_ERROR");
      expect(result.error.details).toContain("RRULE");
    }
  });

  it("should return VALIDATION_ERROR when rrule is invalid (Req 8.5)", async () => {
    const service = createEventService(mockSupabaseClient as unknown as Parameters<typeof createEventService>[0]);
    const input: CreateSeriesInput = {
      ...validSeriesInput,
      rrule: "INVALID_RRULE_STRING",
    };

    const result = await service.createRecurringSeries(input);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("VALIDATION_ERROR");
      expect(result.error.details).toContain("RRULE");
    }
  });

  it("should return CREATE_FAILED error on database error", async () => {
    const insertBuilder = createMockInsertBuilder({
      error: { message: "Database connection failed" },
    });
    mockSupabaseClient.from.mockReturnValue(insertBuilder);

    const service = createEventService(mockSupabaseClient as unknown as Parameters<typeof createEventService>[0]);

    const result = await service.createRecurringSeries(validSeriesInput);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("CREATE_FAILED");
    }
  });

  it("should return UNAUTHORIZED error for permission denied", async () => {
    const insertBuilder = createMockInsertBuilder({
      error: { message: "permission denied", code: "42501" },
    });
    mockSupabaseClient.from.mockReturnValue(insertBuilder);

    const service = createEventService(mockSupabaseClient as unknown as Parameters<typeof createEventService>[0]);

    const result = await service.createRecurringSeries(validSeriesInput);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("UNAUTHORIZED");
    }
  });

  it("should trim title and description", async () => {
    const insertBuilder = createMockInsertBuilder({ data: mockSeriesRecord as unknown as EventRecord });
    mockSupabaseClient.from.mockReturnValue(insertBuilder);

    const service = createEventService(mockSupabaseClient as unknown as Parameters<typeof createEventService>[0]);
    const input: CreateSeriesInput = {
      ...validSeriesInput,
      title: "  トリムされたタイトル  ",
      description: "  トリムされた説明  ",
    };

    await service.createRecurringSeries(input);

    const insertCall = insertBuilder._mocks.insert.mock.calls[0]?.[0];
    expect(insertCall).toBeDefined();
    if (insertCall) {
      expect(insertCall.name).toBe("トリムされたタイトル");
      expect(insertCall.description).toBe("トリムされた説明");
    }
  });

  it("should use default values for optional fields", async () => {
    const insertBuilder = createMockInsertBuilder({ data: mockSeriesRecord as unknown as EventRecord });
    mockSupabaseClient.from.mockReturnValue(insertBuilder);

    const service = createEventService(mockSupabaseClient as unknown as Parameters<typeof createEventService>[0]);

    await service.createRecurringSeries(validSeriesInput);

    const insertCall = insertBuilder._mocks.insert.mock.calls[0]?.[0];
    expect(insertCall).toBeDefined();
    if (insertCall) {
      expect(insertCall.is_all_day).toBe(false);
      expect(insertCall.color).toBe("#3B82F6");
      expect(insertCall.description).toBeNull();
      expect(insertCall.location).toBeNull();
      expect(insertCall.channel_id).toBeNull();
      expect(insertCall.channel_name).toBeNull();
      expect(insertCall.notifications).toEqual([]);
      expect(insertCall.exdates).toEqual([]);
    }
  });

  it("should have SERIES_NOT_FOUND and RRULE_PARSE_ERROR error codes defined", () => {
    expect(CALENDAR_ERROR_CODES).toContain("SERIES_NOT_FOUND");
    expect(CALENDAR_ERROR_CODES).toContain("RRULE_PARSE_ERROR");
  });

  it("should return correct message for new error codes", () => {
    expect(getCalendarErrorMessage("SERIES_NOT_FOUND")).toBe("指定されたイベントシリーズが見つかりません。");
    expect(getCalendarErrorMessage("RRULE_PARSE_ERROR")).toBe("繰り返しルールの解析に失敗しました。");
  });
});

// =============================================================================
// fetchEventsWithSeries テスト (Task 3.2)
// =============================================================================

// event_series用 SELECT クエリビルダー
const createMockSeriesQueryBuilder = (options: {
  data?: EventSeriesRecord[];
  error?: { message: string; code?: string };
}) => {
  const result = {
    data: options.data ?? null,
    error: options.error ?? null,
  };

  const mockSelect = vi.fn();
  const mockEq = vi.fn();

  const internalPromise = Promise.resolve(result);

  const queryBuilder = {
    select: mockSelect,
    eq: mockEq,
    then: (
      onFulfilled?: (value: typeof result) => unknown,
      onRejected?: (reason: unknown) => unknown
    ) => internalPromise.then(onFulfilled, onRejected),
    catch: (onRejected: (reason: unknown) => unknown) => internalPromise.catch(onRejected),
    _mocks: { select: mockSelect, eq: mockEq },
  };

  mockSelect.mockReturnValue(queryBuilder);
  mockEq.mockReturnValue(queryBuilder);

  return queryBuilder;
};

// events + 例外レコード取得用のクエリビルダー（is + not フィルタ対応）
const createMockEventsWithFilterBuilder = (options: {
  data?: EventRecord[];
  error?: { message: string; code?: string };
}) => {
  const result = {
    data: options.data ?? null,
    error: options.error ?? null,
  };

  const mockSelect = vi.fn();
  const mockEq = vi.fn();
  const mockGte = vi.fn();
  const mockLte = vi.fn();
  const mockIs = vi.fn();
  const mockNot = vi.fn();
  const mockAbortSignal = vi.fn();

  const internalPromise = Promise.resolve(result);

  const queryBuilder = {
    select: mockSelect,
    eq: mockEq,
    gte: mockGte,
    lte: mockLte,
    is: mockIs,
    not: mockNot,
    abortSignal: mockAbortSignal,
    then: (
      onFulfilled?: (value: typeof result) => unknown,
      onRejected?: (reason: unknown) => unknown
    ) => internalPromise.then(onFulfilled, onRejected),
    catch: (onRejected: (reason: unknown) => unknown) => internalPromise.catch(onRejected),
    _mocks: { select: mockSelect, eq: mockEq, gte: mockGte, lte: mockLte, is: mockIs, not: mockNot, abortSignal: mockAbortSignal },
  };

  mockSelect.mockReturnValue(queryBuilder);
  mockEq.mockReturnValue(queryBuilder);
  mockGte.mockReturnValue(queryBuilder);
  mockLte.mockReturnValue(queryBuilder);
  mockIs.mockReturnValue(queryBuilder);
  mockNot.mockReturnValue(queryBuilder);
  mockAbortSignal.mockReturnValue(queryBuilder);

  return queryBuilder;
};

describe("createEventService - fetchEventsWithSeries (Task 3.2)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const baseParams: FetchEventsParams = {
    guildId: "guild-123",
    startDate: new Date("2026-03-01T00:00:00Z"),
    endDate: new Date("2026-03-31T23:59:59Z"),
  };

  it("should return only single events when no series exist (Req 9.1)", async () => {
    const singleEvents: EventRecord[] = [
      {
        id: "event-1",
        guild_id: "guild-123",
        name: "単発イベント",
        description: null,
        color: "#3B82F6",
        is_all_day: false,
        start_at: "2026-03-10T10:00:00Z",
        end_at: "2026-03-10T12:00:00Z",
        location: null,
        channel_id: null,
        channel_name: null,
        notifications: [],
        created_at: "2026-03-01T00:00:00Z",
        updated_at: "2026-03-01T00:00:00Z",
      },
    ];

    // 1st call: events (single events, series_id IS NULL)
    const eventsBuilder = createMockEventsWithFilterBuilder({ data: singleEvents });
    // 2nd call: event_series
    const seriesBuilder = createMockSeriesQueryBuilder({ data: [] });
    // 3rd call: events (exception records, series_id IS NOT NULL)
    const exceptionBuilder = createMockEventsWithFilterBuilder({ data: [] });

    mockSupabaseClient.from
      .mockReturnValueOnce(eventsBuilder)
      .mockReturnValueOnce(seriesBuilder)
      .mockReturnValueOnce(exceptionBuilder);

    const service = createEventService(mockSupabaseClient as unknown as Parameters<typeof createEventService>[0]);
    const result = await service.fetchEventsWithSeries(baseParams);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toHaveLength(1);
      expect(result.data[0].title).toBe("単発イベント");
      expect(result.data[0].isRecurring).toBeFalsy();
      expect(result.data[0].seriesId).toBeUndefined();
    }
  });

  it("should return expanded occurrences for recurring series (Req 1.4, 4.1)", async () => {
    const seriesRecords: EventSeriesRecord[] = [
      {
        id: "series-1",
        guild_id: "guild-123",
        name: "毎週月曜の会議",
        description: "定例会議",
        color: "#FF5733",
        is_all_day: false,
        rrule: "FREQ=WEEKLY;BYDAY=MO",
        dtstart: "2026-03-02T10:00:00Z", // Monday
        duration_minutes: 60,
        location: "会議室A",
        channel_id: null,
        channel_name: null,
        notifications: [],
        exdates: [],
        created_at: "2026-02-01T00:00:00Z",
        updated_at: "2026-02-01T00:00:00Z",
      },
    ];

    const eventsBuilder = createMockEventsWithFilterBuilder({ data: [] });
    const seriesBuilder = createMockSeriesQueryBuilder({ data: seriesRecords });
    const exceptionBuilder = createMockEventsWithFilterBuilder({ data: [] });

    mockSupabaseClient.from
      .mockReturnValueOnce(eventsBuilder)
      .mockReturnValueOnce(seriesBuilder)
      .mockReturnValueOnce(exceptionBuilder);

    const service = createEventService(mockSupabaseClient as unknown as Parameters<typeof createEventService>[0]);
    const result = await service.fetchEventsWithSeries(baseParams);

    expect(result.success).toBe(true);
    if (result.success) {
      // March 2026 has 5 Mondays: 2, 9, 16, 23, 30
      expect(result.data.length).toBeGreaterThanOrEqual(4);
      for (const event of result.data) {
        expect(event.isRecurring).toBe(true);
        expect(event.seriesId).toBe("series-1");
        expect(event.title).toBe("毎週月曜の会議");
        expect(event.color).toBe("#FF5733");
        expect(event.description).toBe("定例会議");
        expect(event.location).toBe("会議室A");
        expect(event.rruleSummary).toBeDefined();
        // Duration should be 60 minutes
        expect(event.end.getTime() - event.start.getTime()).toBe(60 * 60 * 1000);
      }
    }
  });

  it("should merge single events and recurring occurrences (Req 4.4, 9.3)", async () => {
    const singleEvents: EventRecord[] = [
      {
        id: "event-1",
        guild_id: "guild-123",
        name: "単発イベント",
        description: null,
        color: "#3B82F6",
        is_all_day: false,
        start_at: "2026-03-15T14:00:00Z",
        end_at: "2026-03-15T15:00:00Z",
        location: null,
        channel_id: null,
        channel_name: null,
        notifications: [],
        created_at: "2026-03-01T00:00:00Z",
        updated_at: "2026-03-01T00:00:00Z",
      },
    ];

    const seriesRecords: EventSeriesRecord[] = [
      {
        id: "series-1",
        guild_id: "guild-123",
        name: "毎日の朝会",
        description: null,
        color: "#22C55E",
        is_all_day: false,
        rrule: "FREQ=DAILY;COUNT=5",
        dtstart: "2026-03-10T09:00:00Z",
        duration_minutes: 30,
        location: null,
        channel_id: null,
        channel_name: null,
        notifications: [],
        exdates: [],
        created_at: "2026-02-01T00:00:00Z",
        updated_at: "2026-02-01T00:00:00Z",
      },
    ];

    const eventsBuilder = createMockEventsWithFilterBuilder({ data: singleEvents });
    const seriesBuilder = createMockSeriesQueryBuilder({ data: seriesRecords });
    const exceptionBuilder = createMockEventsWithFilterBuilder({ data: [] });

    mockSupabaseClient.from
      .mockReturnValueOnce(eventsBuilder)
      .mockReturnValueOnce(seriesBuilder)
      .mockReturnValueOnce(exceptionBuilder);

    const service = createEventService(mockSupabaseClient as unknown as Parameters<typeof createEventService>[0]);
    const result = await service.fetchEventsWithSeries(baseParams);

    expect(result.success).toBe(true);
    if (result.success) {
      // 1 single + 5 recurring = 6
      expect(result.data).toHaveLength(6);

      const singleResult = result.data.find((e) => e.id === "event-1");
      expect(singleResult).toBeDefined();
      expect(singleResult?.isRecurring).toBeFalsy();

      const recurringResults = result.data.filter((e) => e.isRecurring);
      expect(recurringResults).toHaveLength(5);
    }
  });

  it("should exclude EXDATE occurrences from results (Req 8.3)", async () => {
    const seriesRecords: EventSeriesRecord[] = [
      {
        id: "series-1",
        guild_id: "guild-123",
        name: "毎日の朝会",
        description: null,
        color: "#22C55E",
        is_all_day: false,
        rrule: "FREQ=DAILY;COUNT=5",
        dtstart: "2026-03-10T09:00:00Z",
        duration_minutes: 30,
        location: null,
        channel_id: null,
        channel_name: null,
        notifications: [],
        exdates: ["2026-03-12T09:00:00Z"], // 3rd occurrence excluded
        created_at: "2026-02-01T00:00:00Z",
        updated_at: "2026-02-01T00:00:00Z",
      },
    ];

    const eventsBuilder = createMockEventsWithFilterBuilder({ data: [] });
    const seriesBuilder = createMockSeriesQueryBuilder({ data: seriesRecords });
    const exceptionBuilder = createMockEventsWithFilterBuilder({ data: [] });

    mockSupabaseClient.from
      .mockReturnValueOnce(eventsBuilder)
      .mockReturnValueOnce(seriesBuilder)
      .mockReturnValueOnce(exceptionBuilder);

    const service = createEventService(mockSupabaseClient as unknown as Parameters<typeof createEventService>[0]);
    const result = await service.fetchEventsWithSeries(baseParams);

    expect(result.success).toBe(true);
    if (result.success) {
      // 5 occurrences - 1 EXDATE = 4
      expect(result.data).toHaveLength(4);
      // The excluded date should not appear
      const hasExcludedDate = result.data.some(
        (e) => e.start.toISOString() === "2026-03-12T09:00:00.000Z"
      );
      expect(hasExcludedDate).toBe(false);
    }
  });

  it("should replace occurrences with exception records (Req 4.4)", async () => {
    const seriesRecords: EventSeriesRecord[] = [
      {
        id: "series-1",
        guild_id: "guild-123",
        name: "毎日の朝会",
        description: null,
        color: "#22C55E",
        is_all_day: false,
        rrule: "FREQ=DAILY;COUNT=3",
        dtstart: "2026-03-10T09:00:00Z",
        duration_minutes: 30,
        location: null,
        channel_id: null,
        channel_name: null,
        notifications: [],
        exdates: [],
        created_at: "2026-02-01T00:00:00Z",
        updated_at: "2026-02-01T00:00:00Z",
      },
    ];

    // Exception record: 2nd occurrence edited
    const exceptionRecords: EventRecord[] = [
      {
        id: "exception-1",
        guild_id: "guild-123",
        name: "変更された朝会",
        description: "時間が変わりました",
        color: "#EF4444",
        is_all_day: false,
        start_at: "2026-03-11T10:00:00Z", // Changed time
        end_at: "2026-03-11T10:30:00Z",
        location: "別の会議室",
        channel_id: null,
        channel_name: null,
        notifications: [],
        created_at: "2026-03-01T00:00:00Z",
        updated_at: "2026-03-01T00:00:00Z",
      },
    ];

    // Add series_id and original_date to exception record
    const exceptionWithSeries = exceptionRecords.map((r) => ({
      ...r,
      series_id: "series-1",
      original_date: "2026-03-11T09:00:00Z",
    }));

    const eventsBuilder = createMockEventsWithFilterBuilder({ data: [] });
    const seriesBuilder = createMockSeriesQueryBuilder({ data: seriesRecords });
    const exceptionBuilder = createMockEventsWithFilterBuilder({ data: exceptionWithSeries as unknown as EventRecord[] });

    mockSupabaseClient.from
      .mockReturnValueOnce(eventsBuilder)
      .mockReturnValueOnce(seriesBuilder)
      .mockReturnValueOnce(exceptionBuilder);

    const service = createEventService(mockSupabaseClient as unknown as Parameters<typeof createEventService>[0]);
    const result = await service.fetchEventsWithSeries(baseParams);

    expect(result.success).toBe(true);
    if (result.success) {
      // 3 occurrences, but 2nd is replaced by exception
      expect(result.data).toHaveLength(3);

      const exceptionEvent = result.data.find((e) => e.id === "exception-1");
      expect(exceptionEvent).toBeDefined();
      expect(exceptionEvent?.title).toBe("変更された朝会");
      expect(exceptionEvent?.color).toBe("#EF4444");
      expect(exceptionEvent?.location).toBe("別の会議室");
      expect(exceptionEvent?.isRecurring).toBe(true);
      expect(exceptionEvent?.seriesId).toBe("series-1");
      expect(exceptionEvent?.originalDate).toEqual(new Date("2026-03-11T09:00:00Z"));
    }
  });

  it("should generate unique IDs for occurrence events", async () => {
    const seriesRecords: EventSeriesRecord[] = [
      {
        id: "series-1",
        guild_id: "guild-123",
        name: "毎日イベント",
        description: null,
        color: "#22C55E",
        is_all_day: false,
        rrule: "FREQ=DAILY;COUNT=3",
        dtstart: "2026-03-10T09:00:00Z",
        duration_minutes: 30,
        location: null,
        channel_id: null,
        channel_name: null,
        notifications: [],
        exdates: [],
        created_at: "2026-02-01T00:00:00Z",
        updated_at: "2026-02-01T00:00:00Z",
      },
    ];

    const eventsBuilder = createMockEventsWithFilterBuilder({ data: [] });
    const seriesBuilder = createMockSeriesQueryBuilder({ data: seriesRecords });
    const exceptionBuilder = createMockEventsWithFilterBuilder({ data: [] });

    mockSupabaseClient.from
      .mockReturnValueOnce(eventsBuilder)
      .mockReturnValueOnce(seriesBuilder)
      .mockReturnValueOnce(exceptionBuilder);

    const service = createEventService(mockSupabaseClient as unknown as Parameters<typeof createEventService>[0]);
    const result = await service.fetchEventsWithSeries(baseParams);

    expect(result.success).toBe(true);
    if (result.success) {
      const ids = result.data.map((e) => e.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    }
  });

  it("should handle RRULE parse error gracefully (Req 8.4)", async () => {
    const seriesRecords: EventSeriesRecord[] = [
      {
        id: "series-bad",
        guild_id: "guild-123",
        name: "壊れたシリーズ",
        description: null,
        color: "#22C55E",
        is_all_day: false,
        rrule: "INVALID_RRULE",
        dtstart: "2026-03-10T09:00:00Z",
        duration_minutes: 30,
        location: null,
        channel_id: null,
        channel_name: null,
        notifications: [],
        exdates: [],
        created_at: "2026-02-01T00:00:00Z",
        updated_at: "2026-02-01T00:00:00Z",
      },
    ];

    const eventsBuilder = createMockEventsWithFilterBuilder({ data: [] });
    const seriesBuilder = createMockSeriesQueryBuilder({ data: seriesRecords });
    const exceptionBuilder = createMockEventsWithFilterBuilder({ data: [] });

    mockSupabaseClient.from
      .mockReturnValueOnce(eventsBuilder)
      .mockReturnValueOnce(seriesBuilder)
      .mockReturnValueOnce(exceptionBuilder);

    const service = createEventService(mockSupabaseClient as unknown as Parameters<typeof createEventService>[0]);
    const result = await service.fetchEventsWithSeries(baseParams);

    // Should still succeed, just skip the broken series
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toHaveLength(0);
    }
  });

  it("should return FETCH_FAILED when single events query fails", async () => {
    const eventsBuilder = createMockEventsWithFilterBuilder({
      error: { message: "Database connection failed" },
    });

    mockSupabaseClient.from.mockReturnValueOnce(eventsBuilder);

    const service = createEventService(mockSupabaseClient as unknown as Parameters<typeof createEventService>[0]);
    const result = await service.fetchEventsWithSeries(baseParams);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("FETCH_FAILED");
    }
  });

  it("should return FETCH_FAILED when series query fails", async () => {
    const eventsBuilder = createMockEventsWithFilterBuilder({ data: [] });
    const seriesBuilder = createMockSeriesQueryBuilder({
      error: { message: "Database connection failed" },
    });

    mockSupabaseClient.from
      .mockReturnValueOnce(eventsBuilder)
      .mockReturnValueOnce(seriesBuilder);

    const service = createEventService(mockSupabaseClient as unknown as Parameters<typeof createEventService>[0]);
    const result = await service.fetchEventsWithSeries(baseParams);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("FETCH_FAILED");
    }
  });

  it("should include rruleSummary for recurring events (Req 4.3)", async () => {
    const seriesRecords: EventSeriesRecord[] = [
      {
        id: "series-1",
        guild_id: "guild-123",
        name: "毎週の会議",
        description: null,
        color: "#22C55E",
        is_all_day: false,
        rrule: "FREQ=WEEKLY;BYDAY=TU",
        dtstart: "2026-03-03T10:00:00Z", // Tuesday
        duration_minutes: 60,
        location: null,
        channel_id: null,
        channel_name: null,
        notifications: [],
        exdates: [],
        created_at: "2026-02-01T00:00:00Z",
        updated_at: "2026-02-01T00:00:00Z",
      },
    ];

    const eventsBuilder = createMockEventsWithFilterBuilder({ data: [] });
    const seriesBuilder = createMockSeriesQueryBuilder({ data: seriesRecords });
    const exceptionBuilder = createMockEventsWithFilterBuilder({ data: [] });

    mockSupabaseClient.from
      .mockReturnValueOnce(eventsBuilder)
      .mockReturnValueOnce(seriesBuilder)
      .mockReturnValueOnce(exceptionBuilder);

    const service = createEventService(mockSupabaseClient as unknown as Parameters<typeof createEventService>[0]);
    const result = await service.fetchEventsWithSeries(baseParams);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.length).toBeGreaterThan(0);
      for (const event of result.data) {
        expect(event.rruleSummary).toBeDefined();
        expect(event.rruleSummary).toContain("火");
      }
    }
  });

  it("should propagate notifications from series to occurrences", async () => {
    const seriesRecords: EventSeriesRecord[] = [
      {
        id: "series-1",
        guild_id: "guild-123",
        name: "通知付き定例",
        description: null,
        color: "#22C55E",
        is_all_day: false,
        rrule: "FREQ=DAILY;COUNT=2",
        dtstart: "2026-03-10T09:00:00Z",
        duration_minutes: 30,
        location: null,
        channel_id: null,
        channel_name: null,
        notifications: [{ key: "n1", num: 1, unit: "hours" }],
        exdates: [],
        created_at: "2026-02-01T00:00:00Z",
        updated_at: "2026-02-01T00:00:00Z",
      },
    ];

    const eventsBuilder = createMockEventsWithFilterBuilder({ data: [] });
    const seriesBuilder = createMockSeriesQueryBuilder({ data: seriesRecords });
    const exceptionBuilder = createMockEventsWithFilterBuilder({ data: [] });

    mockSupabaseClient.from
      .mockReturnValueOnce(eventsBuilder)
      .mockReturnValueOnce(seriesBuilder)
      .mockReturnValueOnce(exceptionBuilder);

    const service = createEventService(mockSupabaseClient as unknown as Parameters<typeof createEventService>[0]);
    const result = await service.fetchEventsWithSeries(baseParams);

    expect(result.success).toBe(true);
    if (result.success) {
      for (const event of result.data) {
        expect(event.notifications).toEqual([{ key: "n1", num: 1, unit: "hours" }]);
      }
    }
  });

  it("should support AbortSignal for request cancellation", async () => {
    const eventsBuilder = createMockEventsWithFilterBuilder({ data: [] });
    const seriesBuilder = createMockSeriesQueryBuilder({ data: [] });
    const exceptionBuilder = createMockEventsWithFilterBuilder({ data: [] });

    mockSupabaseClient.from
      .mockReturnValueOnce(eventsBuilder)
      .mockReturnValueOnce(seriesBuilder)
      .mockReturnValueOnce(exceptionBuilder);

    const abortController = new AbortController();
    const service = createEventService(mockSupabaseClient as unknown as Parameters<typeof createEventService>[0]);
    await service.fetchEventsWithSeries({
      ...baseParams,
      signal: abortController.signal,
    });

    expect(eventsBuilder._mocks.abortSignal).toHaveBeenCalledWith(abortController.signal);
  });

  it("should return FETCH_FAILED when exception records query fails", async () => {
    const eventsBuilder = createMockEventsWithFilterBuilder({ data: [] });
    const seriesBuilder = createMockSeriesQueryBuilder({ data: [] });
    const exceptionBuilder = createMockEventsWithFilterBuilder({
      error: { message: "Database connection failed" },
    });

    mockSupabaseClient.from
      .mockReturnValueOnce(eventsBuilder)
      .mockReturnValueOnce(seriesBuilder)
      .mockReturnValueOnce(exceptionBuilder);

    const service = createEventService(mockSupabaseClient as unknown as Parameters<typeof createEventService>[0]);
    const result = await service.fetchEventsWithSeries(baseParams);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("FETCH_FAILED");
    }
  });

  it("should handle all-day series correctly", async () => {
    const seriesRecords: EventSeriesRecord[] = [
      {
        id: "series-allday",
        guild_id: "guild-123",
        name: "終日イベント",
        description: null,
        color: "#F59E0B",
        is_all_day: true,
        rrule: "FREQ=WEEKLY;BYDAY=FR;COUNT=2",
        dtstart: "2026-03-06T00:00:00Z", // Friday
        duration_minutes: 1440,
        location: null,
        channel_id: null,
        channel_name: null,
        notifications: [],
        exdates: [],
        created_at: "2026-02-01T00:00:00Z",
        updated_at: "2026-02-01T00:00:00Z",
      },
    ];

    const eventsBuilder = createMockEventsWithFilterBuilder({ data: [] });
    const seriesBuilder = createMockSeriesQueryBuilder({ data: seriesRecords });
    const exceptionBuilder = createMockEventsWithFilterBuilder({ data: [] });

    mockSupabaseClient.from
      .mockReturnValueOnce(eventsBuilder)
      .mockReturnValueOnce(seriesBuilder)
      .mockReturnValueOnce(exceptionBuilder);

    const service = createEventService(mockSupabaseClient as unknown as Parameters<typeof createEventService>[0]);
    const result = await service.fetchEventsWithSeries(baseParams);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toHaveLength(2);
      for (const event of result.data) {
        expect(event.allDay).toBe(true);
      }
    }
  });
});

// =============================================================================
// updateOccurrence テスト (Task 3.3)
// =============================================================================

// 単一レコード取得用 (select → eq → single → thenable)
const createMockSelectSingleBuilder = (options: {
  data?: EventSeriesRecord | null;
  error?: { message: string; code?: string };
}) => {
  const result = {
    data: options.data ?? null,
    error: options.error ?? null,
  };

  const mockSelect = vi.fn();
  const mockEq = vi.fn();
  const mockSingle = vi.fn();

  const internalPromise = Promise.resolve(result);

  const queryBuilder = {
    select: mockSelect,
    eq: mockEq,
    single: mockSingle,
    then: (
      onFulfilled?: (value: typeof result) => unknown,
      onRejected?: (reason: unknown) => unknown
    ) => internalPromise.then(onFulfilled, onRejected),
    catch: (onRejected: (reason: unknown) => unknown) => internalPromise.catch(onRejected),
    _mocks: { select: mockSelect, eq: mockEq, single: mockSingle },
  };

  mockSelect.mockReturnValue(queryBuilder);
  mockEq.mockReturnValue(queryBuilder);
  mockSingle.mockReturnValue(queryBuilder);

  return queryBuilder;
};

// シンプルなUPDATE用 (update → eq → thenable, select/singleなし)
const createMockSimpleUpdateBuilder = (options: {
  error?: { message: string; code?: string };
}) => {
  const result = {
    data: null,
    error: options.error ?? null,
  };

  const mockUpdate = vi.fn();
  const mockEq = vi.fn();

  const internalPromise = Promise.resolve(result);

  const queryBuilder = {
    update: mockUpdate,
    eq: mockEq,
    then: (
      onFulfilled?: (value: typeof result) => unknown,
      onRejected?: (reason: unknown) => unknown
    ) => internalPromise.then(onFulfilled, onRejected),
    catch: (onRejected: (reason: unknown) => unknown) => internalPromise.catch(onRejected),
    _mocks: { update: mockUpdate, eq: mockEq },
  };

  mockUpdate.mockReturnValue(queryBuilder);
  mockEq.mockReturnValue(queryBuilder);

  return queryBuilder;
};

describe("createEventService - updateOccurrence (Task 3.3)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockSeries: EventSeriesRecord = {
    id: "series-1",
    guild_id: "guild-123",
    name: "毎週の定例会",
    description: "週次ミーティング",
    color: "#22C55E",
    is_all_day: false,
    rrule: "FREQ=WEEKLY;BYDAY=MO",
    dtstart: "2026-03-02T10:00:00Z",
    duration_minutes: 60,
    location: "会議室A",
    channel_id: "ch-1",
    channel_name: "general",
    notifications: [{ key: "n1", num: 1, unit: "hours" }],
    exdates: [],
    created_at: "2026-02-01T00:00:00Z",
    updated_at: "2026-02-01T00:00:00Z",
  };

  const originalDate = new Date("2026-03-09T10:00:00Z"); // 2nd Monday

  it("should create exception record successfully (Req 5.2)", async () => {
    const exceptionRecord: EventRecord = {
      id: "exception-1",
      guild_id: "guild-123",
      name: "変更された定例会",
      description: "週次ミーティング",
      color: "#22C55E",
      is_all_day: false,
      start_at: "2026-03-09T11:00:00Z",
      end_at: "2026-03-09T12:00:00Z",
      location: "会議室A",
      channel_id: "ch-1",
      channel_name: "general",
      notifications: [{ key: "n1", num: 1, unit: "hours" }],
      created_at: "2026-03-09T00:00:00Z",
      updated_at: "2026-03-09T00:00:00Z",
    };

    // 1st call: fetch series
    const seriesSelectBuilder = createMockSelectSingleBuilder({ data: mockSeries });
    // 2nd call: insert exception
    const insertBuilder = createMockInsertBuilder({ data: exceptionRecord });

    mockSupabaseClient.from
      .mockReturnValueOnce(seriesSelectBuilder)
      .mockReturnValueOnce(insertBuilder);

    const service = createEventService(mockSupabaseClient as unknown as Parameters<typeof createEventService>[0]);
    const result = await service.updateOccurrence("series-1", originalDate, {
      title: "変更された定例会",
      startAt: new Date("2026-03-09T11:00:00Z"),
      endAt: new Date("2026-03-09T12:00:00Z"),
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.title).toBe("変更された定例会");
      expect(result.data.seriesId).toBe("series-1");
      expect(result.data.isRecurring).toBe(true);
      expect(result.data.originalDate).toEqual(originalDate);
    }
  });

  it("should set series_id and original_date on the inserted record", async () => {
    const exceptionRecord: EventRecord = {
      id: "exception-2",
      guild_id: "guild-123",
      name: "変更された定例会",
      description: "週次ミーティング",
      color: "#22C55E",
      is_all_day: false,
      start_at: "2026-03-09T11:00:00Z",
      end_at: "2026-03-09T12:00:00Z",
      location: "会議室A",
      channel_id: "ch-1",
      channel_name: "general",
      notifications: [{ key: "n1", num: 1, unit: "hours" }],
      created_at: "2026-03-09T00:00:00Z",
      updated_at: "2026-03-09T00:00:00Z",
    };

    const seriesSelectBuilder = createMockSelectSingleBuilder({ data: mockSeries });
    const insertBuilder = createMockInsertBuilder({ data: exceptionRecord });

    mockSupabaseClient.from
      .mockReturnValueOnce(seriesSelectBuilder)
      .mockReturnValueOnce(insertBuilder);

    const service = createEventService(mockSupabaseClient as unknown as Parameters<typeof createEventService>[0]);
    await service.updateOccurrence("series-1", originalDate, {
      title: "変更された定例会",
      startAt: new Date("2026-03-09T11:00:00Z"),
      endAt: new Date("2026-03-09T12:00:00Z"),
    });

    // insertが呼ばれた際の引数を確認
    const insertCall = insertBuilder._mocks.insert.mock.calls[0]?.[0];
    expect(insertCall).toBeDefined();
    if (insertCall) {
      expect(insertCall.series_id).toBe("series-1");
      expect(insertCall.original_date).toBe("2026-03-09T10:00:00.000Z");
    }

    // event_series テーブルから取得、events テーブルへ挿入
    expect(mockSupabaseClient.from).toHaveBeenCalledWith("event_series");
    expect(mockSupabaseClient.from).toHaveBeenCalledWith("events");
  });

  it("should use series data as defaults for omitted fields", async () => {
    const exceptionRecord: EventRecord = {
      id: "exception-3",
      guild_id: "guild-123",
      name: "毎週の定例会",
      description: "新しい説明",
      color: "#22C55E",
      is_all_day: false,
      start_at: "2026-03-09T10:00:00Z",
      end_at: "2026-03-09T11:00:00Z",
      location: "会議室A",
      channel_id: "ch-1",
      channel_name: "general",
      notifications: [{ key: "n1", num: 1, unit: "hours" }],
      created_at: "2026-03-09T00:00:00Z",
      updated_at: "2026-03-09T00:00:00Z",
    };

    const seriesSelectBuilder = createMockSelectSingleBuilder({ data: mockSeries });
    const insertBuilder = createMockInsertBuilder({ data: exceptionRecord });

    mockSupabaseClient.from
      .mockReturnValueOnce(seriesSelectBuilder)
      .mockReturnValueOnce(insertBuilder);

    const service = createEventService(mockSupabaseClient as unknown as Parameters<typeof createEventService>[0]);
    // descriptionのみ変更、他はシリーズのデフォルト値を使用
    await service.updateOccurrence("series-1", originalDate, {
      description: "新しい説明",
    });

    const insertCall = insertBuilder._mocks.insert.mock.calls[0]?.[0];
    expect(insertCall).toBeDefined();
    if (insertCall) {
      // シリーズのデフォルト値が使用されること
      expect(insertCall.name).toBe("毎週の定例会");
      expect(insertCall.color).toBe("#22C55E");
      expect(insertCall.is_all_day).toBe(false);
      expect(insertCall.location).toBe("会議室A");
      expect(insertCall.channel_id).toBe("ch-1");
      expect(insertCall.channel_name).toBe("general");
      expect(insertCall.notifications).toEqual([{ key: "n1", num: 1, unit: "hours" }]);
      // 説明は入力値が使用されること
      expect(insertCall.description).toBe("新しい説明");
      // start_at はオカレンスの元の日付がデフォルト
      expect(insertCall.start_at).toBe("2026-03-09T10:00:00.000Z");
      // end_at は元の日付 + duration_minutes がデフォルト
      expect(insertCall.end_at).toBe("2026-03-09T11:00:00.000Z");
    }
  });

  it("should return SERIES_NOT_FOUND when series doesn't exist", async () => {
    const seriesSelectBuilder = createMockSelectSingleBuilder({
      error: { message: "Row not found", code: "PGRST116" },
    });

    mockSupabaseClient.from.mockReturnValueOnce(seriesSelectBuilder);

    const service = createEventService(mockSupabaseClient as unknown as Parameters<typeof createEventService>[0]);
    const result = await service.updateOccurrence("non-existent", originalDate, {
      title: "変更",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("SERIES_NOT_FOUND");
    }
  });

  it("should return VALIDATION_ERROR when title is empty", async () => {
    const service = createEventService(mockSupabaseClient as unknown as Parameters<typeof createEventService>[0]);
    const result = await service.updateOccurrence("series-1", originalDate, {
      title: "",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("VALIDATION_ERROR");
      expect(result.error.details).toContain("タイトルは必須です");
    }

    // バリデーションエラーの場合、DBにアクセスしない
    expect(mockSupabaseClient.from).not.toHaveBeenCalled();
  });

  it("should return VALIDATION_ERROR when title exceeds 255 characters", async () => {
    const service = createEventService(mockSupabaseClient as unknown as Parameters<typeof createEventService>[0]);
    const result = await service.updateOccurrence("series-1", originalDate, {
      title: "a".repeat(256),
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("VALIDATION_ERROR");
      expect(result.error.details).toContain("255文字以内");
    }
  });

  it("should return VALIDATION_ERROR when endAt is before startAt", async () => {
    const service = createEventService(mockSupabaseClient as unknown as Parameters<typeof createEventService>[0]);
    const result = await service.updateOccurrence("series-1", originalDate, {
      startAt: new Date("2026-03-09T12:00:00Z"),
      endAt: new Date("2026-03-09T10:00:00Z"),
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("VALIDATION_ERROR");
      expect(result.error.details).toContain("終了日時は開始日時より後");
    }
  });

  it("should return CREATE_FAILED on database insert error", async () => {
    const seriesSelectBuilder = createMockSelectSingleBuilder({ data: mockSeries });
    const insertBuilder = createMockInsertBuilder({
      error: { message: "Database connection failed" },
    });

    mockSupabaseClient.from
      .mockReturnValueOnce(seriesSelectBuilder)
      .mockReturnValueOnce(insertBuilder);

    const service = createEventService(mockSupabaseClient as unknown as Parameters<typeof createEventService>[0]);
    const result = await service.updateOccurrence("series-1", originalDate, {
      title: "変更された定例会",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("CREATE_FAILED");
    }
  });

  it("should trim title and description in the inserted record", async () => {
    const exceptionRecord: EventRecord = {
      id: "exception-trim",
      guild_id: "guild-123",
      name: "トリムされたタイトル",
      description: "トリムされた説明",
      color: "#22C55E",
      is_all_day: false,
      start_at: "2026-03-09T10:00:00Z",
      end_at: "2026-03-09T11:00:00Z",
      location: "会議室A",
      channel_id: "ch-1",
      channel_name: "general",
      notifications: [],
      created_at: "2026-03-09T00:00:00Z",
      updated_at: "2026-03-09T00:00:00Z",
    };

    const seriesSelectBuilder = createMockSelectSingleBuilder({ data: mockSeries });
    const insertBuilder = createMockInsertBuilder({ data: exceptionRecord });

    mockSupabaseClient.from
      .mockReturnValueOnce(seriesSelectBuilder)
      .mockReturnValueOnce(insertBuilder);

    const service = createEventService(mockSupabaseClient as unknown as Parameters<typeof createEventService>[0]);
    await service.updateOccurrence("series-1", originalDate, {
      title: "  トリムされたタイトル  ",
      description: "  トリムされた説明  ",
    });

    const insertCall = insertBuilder._mocks.insert.mock.calls[0]?.[0];
    expect(insertCall).toBeDefined();
    if (insertCall) {
      expect(insertCall.name).toBe("トリムされたタイトル");
      expect(insertCall.description).toBe("トリムされた説明");
    }
  });
});

// =============================================================================
// deleteOccurrence テスト (Task 3.3)
// =============================================================================

describe("createEventService - deleteOccurrence (Task 3.3)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockSeries: EventSeriesRecord = {
    id: "series-1",
    guild_id: "guild-123",
    name: "毎週の定例会",
    description: null,
    color: "#22C55E",
    is_all_day: false,
    rrule: "FREQ=WEEKLY;BYDAY=MO",
    dtstart: "2026-03-02T10:00:00Z",
    duration_minutes: 60,
    location: null,
    channel_id: null,
    channel_name: null,
    notifications: [],
    exdates: [],
    created_at: "2026-02-01T00:00:00Z",
    updated_at: "2026-02-01T00:00:00Z",
  };

  const occurrenceDate = new Date("2026-03-09T10:00:00Z");

  it("should add occurrence date to exdates successfully (Req 5.4)", async () => {
    const seriesSelectBuilder = createMockSelectSingleBuilder({ data: mockSeries });
    const updateBuilder = createMockSimpleUpdateBuilder({});

    mockSupabaseClient.from
      .mockReturnValueOnce(seriesSelectBuilder)
      .mockReturnValueOnce(updateBuilder);

    const service = createEventService(mockSupabaseClient as unknown as Parameters<typeof createEventService>[0]);
    const result = await service.deleteOccurrence("series-1", occurrenceDate);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBeUndefined();
    }

    // exdates に日付が追加された update が呼ばれること
    const updateCall = updateBuilder._mocks.update.mock.calls[0]?.[0];
    expect(updateCall).toBeDefined();
    if (updateCall) {
      expect(updateCall.exdates).toContain("2026-03-09T10:00:00.000Z");
      expect(updateCall.exdates).toHaveLength(1);
    }

    // シリーズIDで eq が呼ばれること
    expect(updateBuilder._mocks.eq).toHaveBeenCalledWith("id", "series-1");
  });

  it("should append to existing exdates without overwriting", async () => {
    const seriesWithExdates: EventSeriesRecord = {
      ...mockSeries,
      exdates: ["2026-03-02T10:00:00Z"], // Already has one exdate
    };

    const seriesSelectBuilder = createMockSelectSingleBuilder({ data: seriesWithExdates });
    const updateBuilder = createMockSimpleUpdateBuilder({});

    mockSupabaseClient.from
      .mockReturnValueOnce(seriesSelectBuilder)
      .mockReturnValueOnce(updateBuilder);

    const service = createEventService(mockSupabaseClient as unknown as Parameters<typeof createEventService>[0]);
    await service.deleteOccurrence("series-1", occurrenceDate);

    const updateCall = updateBuilder._mocks.update.mock.calls[0]?.[0];
    expect(updateCall).toBeDefined();
    if (updateCall) {
      expect(updateCall.exdates).toHaveLength(2);
      expect(updateCall.exdates).toContain("2026-03-02T10:00:00Z");
      expect(updateCall.exdates).toContain("2026-03-09T10:00:00.000Z");
    }
  });

  it("should return SERIES_NOT_FOUND when series doesn't exist", async () => {
    const seriesSelectBuilder = createMockSelectSingleBuilder({
      error: { message: "Row not found", code: "PGRST116" },
    });

    mockSupabaseClient.from.mockReturnValueOnce(seriesSelectBuilder);

    const service = createEventService(mockSupabaseClient as unknown as Parameters<typeof createEventService>[0]);
    const result = await service.deleteOccurrence("non-existent", occurrenceDate);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("SERIES_NOT_FOUND");
    }
  });

  it("should return DELETE_FAILED on database update error", async () => {
    const seriesSelectBuilder = createMockSelectSingleBuilder({ data: mockSeries });
    const updateBuilder = createMockSimpleUpdateBuilder({
      error: { message: "Database connection failed" },
    });

    mockSupabaseClient.from
      .mockReturnValueOnce(seriesSelectBuilder)
      .mockReturnValueOnce(updateBuilder);

    const service = createEventService(mockSupabaseClient as unknown as Parameters<typeof createEventService>[0]);
    const result = await service.deleteOccurrence("series-1", occurrenceDate);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("DELETE_FAILED");
    }
  });

  it("should return UNAUTHORIZED on permission denied error", async () => {
    const seriesSelectBuilder = createMockSelectSingleBuilder({ data: mockSeries });
    const updateBuilder = createMockSimpleUpdateBuilder({
      error: { message: "permission denied", code: "42501" },
    });

    mockSupabaseClient.from
      .mockReturnValueOnce(seriesSelectBuilder)
      .mockReturnValueOnce(updateBuilder);

    const service = createEventService(mockSupabaseClient as unknown as Parameters<typeof createEventService>[0]);
    const result = await service.deleteOccurrence("series-1", occurrenceDate);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("UNAUTHORIZED");
    }
  });

  it("should handle network errors gracefully", async () => {
    const mockSelect = vi.fn();
    const mockEq = vi.fn();
    const mockSingle = vi.fn();

    const networkError = new TypeError("Failed to fetch");
    const internalPromise = Promise.reject(networkError);

    const queryBuilder = {
      select: mockSelect,
      eq: mockEq,
      single: mockSingle,
      then: (
        onFulfilled?: (value: unknown) => unknown,
        onRejected?: (reason: unknown) => unknown
      ) => internalPromise.then(onFulfilled, onRejected),
      catch: (onRejected: (reason: unknown) => unknown) => internalPromise.catch(onRejected),
    };

    mockSelect.mockReturnValue(queryBuilder);
    mockEq.mockReturnValue(queryBuilder);
    mockSingle.mockReturnValue(queryBuilder);
    mockSupabaseClient.from.mockReturnValue(queryBuilder);

    const service = createEventService(mockSupabaseClient as unknown as Parameters<typeof createEventService>[0]);
    const result = await service.deleteOccurrence("series-1", occurrenceDate);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("NETWORK_ERROR");
    }
  });
});

// UPDATE+SELECT+SINGLE用モッククエリビルダー（EventSeriesRecord向け）
const createMockSeriesUpdateBuilder = (options: {
  data?: EventSeriesRecord | null;
  error?: { message: string; code?: string };
}) => {
  const result = {
    data: options.data ?? null,
    error: options.error ?? null,
  };

  const mockUpdate = vi.fn();
  const mockEq = vi.fn();
  const mockSelect = vi.fn();
  const mockSingle = vi.fn();

  const internalPromise = Promise.resolve(result);

  const queryBuilder = {
    update: mockUpdate,
    eq: mockEq,
    select: mockSelect,
    single: mockSingle,
    then: (
      onFulfilled?: (value: typeof result) => unknown,
      onRejected?: (reason: unknown) => unknown
    ) => internalPromise.then(onFulfilled, onRejected),
    catch: (onRejected: (reason: unknown) => unknown) => internalPromise.catch(onRejected),
    _mocks: { update: mockUpdate, eq: mockEq, select: mockSelect, single: mockSingle },
  };

  mockUpdate.mockReturnValue(queryBuilder);
  mockEq.mockReturnValue(queryBuilder);
  mockSelect.mockReturnValue(queryBuilder);
  mockSingle.mockReturnValue(queryBuilder);

  return queryBuilder;
};

// DELETE+EQ用モッククエリビルダー（シリーズ例外レコード削除向け）
const createMockSeriesDeleteBuilder = (options: {
  error?: { message: string; code?: string };
}) => {
  const result = {
    data: null,
    error: options.error ?? null,
  };

  const mockDelete = vi.fn();
  const mockEq = vi.fn();

  const internalPromise = Promise.resolve(result);

  const queryBuilder = {
    delete: mockDelete,
    eq: mockEq,
    then: (
      onFulfilled?: (value: typeof result) => unknown,
      onRejected?: (reason: unknown) => unknown
    ) => internalPromise.then(onFulfilled, onRejected),
    catch: (onRejected: (reason: unknown) => unknown) => internalPromise.catch(onRejected),
    _mocks: { delete: mockDelete, eq: mockEq },
  };

  mockDelete.mockReturnValue(queryBuilder);
  mockEq.mockReturnValue(queryBuilder);

  return queryBuilder;
};

describe("createEventService - updateSeries (Task 3.4)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockSeries: EventSeriesRecord = {
    id: "series-1",
    guild_id: "guild-123",
    name: "毎週の定例会",
    description: "チーム定例",
    color: "#22C55E",
    is_all_day: false,
    rrule: "FREQ=WEEKLY;BYDAY=MO",
    dtstart: "2026-03-02T10:00:00Z",
    duration_minutes: 60,
    location: "会議室A",
    channel_id: null,
    channel_name: null,
    notifications: [],
    exdates: [],
    created_at: "2026-02-01T00:00:00Z",
    updated_at: "2026-02-01T00:00:00Z",
  };

  it("should update series title successfully (Req 6.1)", async () => {
    const updatedSeries: EventSeriesRecord = {
      ...mockSeries,
      name: "新しい定例会名",
      updated_at: "2026-03-01T00:00:00Z",
    };

    const seriesSelectBuilder = createMockSelectSingleBuilder({ data: mockSeries });
    const seriesUpdateBuilder = createMockSeriesUpdateBuilder({ data: updatedSeries });

    mockSupabaseClient.from
      .mockReturnValueOnce(seriesSelectBuilder)   // SELECT series
      .mockReturnValueOnce(seriesUpdateBuilder);  // UPDATE series

    const service = createEventService(mockSupabaseClient as unknown as Parameters<typeof createEventService>[0]);
    const result = await service.updateSeries("series-1", { title: "新しい定例会名" });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("新しい定例会名");
    }
  });

  it("should update multiple fields at once (Req 6.1)", async () => {
    const updatedSeries: EventSeriesRecord = {
      ...mockSeries,
      name: "更新後の会議",
      description: "新しい説明",
      color: "#EF4444",
      location: "会議室B",
      updated_at: "2026-03-01T00:00:00Z",
    };

    const seriesSelectBuilder = createMockSelectSingleBuilder({ data: mockSeries });
    const seriesUpdateBuilder = createMockSeriesUpdateBuilder({ data: updatedSeries });

    mockSupabaseClient.from
      .mockReturnValueOnce(seriesSelectBuilder)
      .mockReturnValueOnce(seriesUpdateBuilder);

    const service = createEventService(mockSupabaseClient as unknown as Parameters<typeof createEventService>[0]);
    const result = await service.updateSeries("series-1", {
      title: "更新後の会議",
      description: "新しい説明",
      color: "#EF4444",
      location: "会議室B",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("更新後の会議");
      expect(result.data.description).toBe("新しい説明");
      expect(result.data.color).toBe("#EF4444");
      expect(result.data.location).toBe("会議室B");
    }

    // update に正しいデータが渡されること
    const updateCall = seriesUpdateBuilder._mocks.update.mock.calls[0]?.[0];
    expect(updateCall).toBeDefined();
    if (updateCall) {
      expect(updateCall.name).toBe("更新後の会議");
      expect(updateCall.description).toBe("新しい説明");
      expect(updateCall.color).toBe("#EF4444");
      expect(updateCall.location).toBe("会議室B");
    }
  });

  it("should update RRULE and recalculate duration (Req 6.2)", async () => {
    const newStartAt = new Date("2026-03-02T14:00:00Z");
    const newEndAt = new Date("2026-03-02T15:30:00Z");

    const updatedSeries: EventSeriesRecord = {
      ...mockSeries,
      rrule: "FREQ=WEEKLY;BYDAY=TU,TH",
      dtstart: newStartAt.toISOString(),
      duration_minutes: 90,
      updated_at: "2026-03-01T00:00:00Z",
    };

    const seriesSelectBuilder = createMockSelectSingleBuilder({ data: mockSeries });
    const seriesUpdateBuilder = createMockSeriesUpdateBuilder({ data: updatedSeries });

    mockSupabaseClient.from
      .mockReturnValueOnce(seriesSelectBuilder)
      .mockReturnValueOnce(seriesUpdateBuilder);

    const service = createEventService(mockSupabaseClient as unknown as Parameters<typeof createEventService>[0]);
    const result = await service.updateSeries("series-1", {
      rrule: "FREQ=WEEKLY;BYDAY=TU,TH",
      startAt: newStartAt,
      endAt: newEndAt,
    });

    expect(result.success).toBe(true);

    // update に正しいRRULEとdtstart、duration_minutesが渡されること
    const updateCall = seriesUpdateBuilder._mocks.update.mock.calls[0]?.[0];
    expect(updateCall).toBeDefined();
    if (updateCall) {
      expect(updateCall.rrule).toBe("FREQ=WEEKLY;BYDAY=TU,TH");
      expect(updateCall.dtstart).toBe(newStartAt.toISOString());
      expect(updateCall.duration_minutes).toBe(90);
    }
  });

  it("should reset exceptions when resetExceptions is true (Req 6.4)", async () => {
    const updatedSeries: EventSeriesRecord = {
      ...mockSeries,
      name: "全体更新",
      updated_at: "2026-03-01T00:00:00Z",
    };

    const seriesSelectBuilder = createMockSelectSingleBuilder({ data: mockSeries });
    const exceptionDeleteBuilder = createMockSeriesDeleteBuilder({});
    const seriesUpdateBuilder = createMockSeriesUpdateBuilder({ data: updatedSeries });

    mockSupabaseClient.from
      .mockReturnValueOnce(seriesSelectBuilder)    // SELECT series
      .mockReturnValueOnce(exceptionDeleteBuilder) // DELETE exceptions
      .mockReturnValueOnce(seriesUpdateBuilder);   // UPDATE series

    const service = createEventService(mockSupabaseClient as unknown as Parameters<typeof createEventService>[0]);
    const result = await service.updateSeries("series-1", {
      title: "全体更新",
      resetExceptions: true,
    });

    expect(result.success).toBe(true);

    // 例外レコード削除が呼ばれること
    expect(exceptionDeleteBuilder._mocks.delete).toHaveBeenCalled();
    expect(exceptionDeleteBuilder._mocks.eq).toHaveBeenCalledWith("series_id", "series-1");
  });

  it("should not delete exceptions when resetExceptions is false", async () => {
    const updatedSeries: EventSeriesRecord = {
      ...mockSeries,
      name: "タイトル変更のみ",
      updated_at: "2026-03-01T00:00:00Z",
    };

    const seriesSelectBuilder = createMockSelectSingleBuilder({ data: mockSeries });
    const seriesUpdateBuilder = createMockSeriesUpdateBuilder({ data: updatedSeries });

    mockSupabaseClient.from
      .mockReturnValueOnce(seriesSelectBuilder)
      .mockReturnValueOnce(seriesUpdateBuilder);

    const service = createEventService(mockSupabaseClient as unknown as Parameters<typeof createEventService>[0]);
    const result = await service.updateSeries("series-1", {
      title: "タイトル変更のみ",
    });

    expect(result.success).toBe(true);

    // from は 2回だけ呼ばれる（SELECT series + UPDATE series）
    expect(mockSupabaseClient.from).toHaveBeenCalledTimes(2);
  });

  it("should return SERIES_NOT_FOUND when series doesn't exist", async () => {
    const seriesSelectBuilder = createMockSelectSingleBuilder({
      error: { message: "Row not found", code: "PGRST116" },
    });

    mockSupabaseClient.from.mockReturnValueOnce(seriesSelectBuilder);

    const service = createEventService(mockSupabaseClient as unknown as Parameters<typeof createEventService>[0]);
    const result = await service.updateSeries("non-existent", { title: "テスト" });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("SERIES_NOT_FOUND");
    }
  });

  it("should return VALIDATION_ERROR for empty title", async () => {
    const service = createEventService(mockSupabaseClient as unknown as Parameters<typeof createEventService>[0]);
    const result = await service.updateSeries("series-1", { title: "" });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("VALIDATION_ERROR");
    }
  });

  it("should return VALIDATION_ERROR for title exceeding 255 characters", async () => {
    const service = createEventService(mockSupabaseClient as unknown as Parameters<typeof createEventService>[0]);
    const longTitle = "a".repeat(256);
    const result = await service.updateSeries("series-1", { title: longTitle });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("VALIDATION_ERROR");
    }
  });

  it("should return VALIDATION_ERROR when endAt is before startAt", async () => {
    const service = createEventService(mockSupabaseClient as unknown as Parameters<typeof createEventService>[0]);
    const result = await service.updateSeries("series-1", {
      startAt: new Date("2026-03-02T15:00:00Z"),
      endAt: new Date("2026-03-02T14:00:00Z"),
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("VALIDATION_ERROR");
    }
  });

  it("should return VALIDATION_ERROR for invalid RRULE", async () => {
    const seriesSelectBuilder = createMockSelectSingleBuilder({ data: mockSeries });
    mockSupabaseClient.from.mockReturnValueOnce(seriesSelectBuilder);

    const service = createEventService(mockSupabaseClient as unknown as Parameters<typeof createEventService>[0]);
    const result = await service.updateSeries("series-1", { rrule: "INVALID_RRULE" });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("VALIDATION_ERROR");
    }
  });

  it("should return UPDATE_FAILED on database error", async () => {
    const seriesSelectBuilder = createMockSelectSingleBuilder({ data: mockSeries });
    const seriesUpdateBuilder = createMockSeriesUpdateBuilder({
      error: { message: "Database connection failed" },
    });

    mockSupabaseClient.from
      .mockReturnValueOnce(seriesSelectBuilder)
      .mockReturnValueOnce(seriesUpdateBuilder);

    const service = createEventService(mockSupabaseClient as unknown as Parameters<typeof createEventService>[0]);
    const result = await service.updateSeries("series-1", { title: "テスト" });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("UPDATE_FAILED");
    }
  });

  it("should handle network errors gracefully", async () => {
    const mockSelect = vi.fn();
    const mockEq = vi.fn();
    const mockSingle = vi.fn();

    const networkError = new TypeError("Failed to fetch");
    const internalPromise = Promise.reject(networkError);

    const queryBuilder = {
      select: mockSelect,
      eq: mockEq,
      single: mockSingle,
      then: (
        onFulfilled?: (value: unknown) => unknown,
        onRejected?: (reason: unknown) => unknown
      ) => internalPromise.then(onFulfilled, onRejected),
      catch: (onRejected: (reason: unknown) => unknown) => internalPromise.catch(onRejected),
    };

    mockSelect.mockReturnValue(queryBuilder);
    mockEq.mockReturnValue(queryBuilder);
    mockSingle.mockReturnValue(queryBuilder);
    mockSupabaseClient.from.mockReturnValue(queryBuilder);

    const service = createEventService(mockSupabaseClient as unknown as Parameters<typeof createEventService>[0]);
    const result = await service.updateSeries("series-1", { title: "テスト" });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("NETWORK_ERROR");
    }
  });
});

describe("createEventService - deleteSeries (Task 3.4)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should delete series and related exceptions successfully (Req 6.3)", async () => {
    const exceptionDeleteBuilder = createMockSeriesDeleteBuilder({});
    const seriesDeleteBuilder = createMockSeriesDeleteBuilder({});

    mockSupabaseClient.from
      .mockReturnValueOnce(exceptionDeleteBuilder) // DELETE exceptions
      .mockReturnValueOnce(seriesDeleteBuilder);   // DELETE series

    const service = createEventService(mockSupabaseClient as unknown as Parameters<typeof createEventService>[0]);
    const result = await service.deleteSeries("series-1");

    expect(result.success).toBe(true);

    // 例外レコードが先に削除される
    expect(mockSupabaseClient.from).toHaveBeenCalledWith("events");
    expect(exceptionDeleteBuilder._mocks.eq).toHaveBeenCalledWith("series_id", "series-1");

    // シリーズが削除される
    expect(mockSupabaseClient.from).toHaveBeenCalledWith("event_series");
    expect(seriesDeleteBuilder._mocks.eq).toHaveBeenCalledWith("id", "series-1");
  });

  it("should return DELETE_FAILED when exception deletion fails", async () => {
    const exceptionDeleteBuilder = createMockSeriesDeleteBuilder({
      error: { message: "Database error" },
    });

    mockSupabaseClient.from.mockReturnValueOnce(exceptionDeleteBuilder);

    const service = createEventService(mockSupabaseClient as unknown as Parameters<typeof createEventService>[0]);
    const result = await service.deleteSeries("series-1");

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("DELETE_FAILED");
    }
  });

  it("should return DELETE_FAILED when series deletion fails", async () => {
    const exceptionDeleteBuilder = createMockSeriesDeleteBuilder({});
    const seriesDeleteBuilder = createMockSeriesDeleteBuilder({
      error: { message: "Database error" },
    });

    mockSupabaseClient.from
      .mockReturnValueOnce(exceptionDeleteBuilder)
      .mockReturnValueOnce(seriesDeleteBuilder);

    const service = createEventService(mockSupabaseClient as unknown as Parameters<typeof createEventService>[0]);
    const result = await service.deleteSeries("series-1");

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("DELETE_FAILED");
    }
  });

  it("should return UNAUTHORIZED on permission denied error", async () => {
    const exceptionDeleteBuilder = createMockSeriesDeleteBuilder({
      error: { message: "permission denied", code: "42501" },
    });

    mockSupabaseClient.from.mockReturnValueOnce(exceptionDeleteBuilder);

    const service = createEventService(mockSupabaseClient as unknown as Parameters<typeof createEventService>[0]);
    const result = await service.deleteSeries("series-1");

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("UNAUTHORIZED");
    }
  });

  it("should handle network errors gracefully", async () => {
    const mockDelete = vi.fn();
    const mockEq = vi.fn();

    const networkError = new TypeError("Failed to fetch");
    const internalPromise = Promise.reject(networkError);

    const queryBuilder = {
      delete: mockDelete,
      eq: mockEq,
      then: (
        onFulfilled?: (value: unknown) => unknown,
        onRejected?: (reason: unknown) => unknown
      ) => internalPromise.then(onFulfilled, onRejected),
      catch: (onRejected: (reason: unknown) => unknown) => internalPromise.catch(onRejected),
    };

    mockDelete.mockReturnValue(queryBuilder);
    mockEq.mockReturnValue(queryBuilder);
    mockSupabaseClient.from.mockReturnValue(queryBuilder);

    const service = createEventService(mockSupabaseClient as unknown as Parameters<typeof createEventService>[0]);
    const result = await service.deleteSeries("series-1");

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("NETWORK_ERROR");
    }
  });
});

describe("createEventService - splitSeries (Task 3.5)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockSeries: EventSeriesRecord = {
    id: "series-1",
    guild_id: "guild-123",
    name: "毎週の定例会",
    description: "チーム定例",
    color: "#22C55E",
    is_all_day: false,
    rrule: "FREQ=WEEKLY;BYDAY=MO",
    dtstart: "2026-03-02T10:00:00Z",
    duration_minutes: 60,
    location: "会議室A",
    channel_id: "ch-1",
    channel_name: "general",
    notifications: [],
    exdates: [],
    created_at: "2026-02-01T00:00:00Z",
    updated_at: "2026-02-01T00:00:00Z",
  };

  it("should split series: update original with UNTIL and create new series (Req 7.1)", async () => {
    const splitDate = new Date("2026-04-06T10:00:00Z");
    const newInput: UpdateSeriesInput = {
      title: "新しい定例会",
      rrule: "FREQ=WEEKLY;BYDAY=TU,TH",
    };

    const updatedOriginal: EventSeriesRecord = {
      ...mockSeries,
      rrule: "FREQ=WEEKLY;BYDAY=MO;UNTIL=20260405T235959Z",
      updated_at: "2026-03-15T00:00:00Z",
    };

    const newSeries: EventSeriesRecord = {
      id: "series-2",
      guild_id: "guild-123",
      name: "新しい定例会",
      description: "チーム定例",
      color: "#22C55E",
      is_all_day: false,
      rrule: "FREQ=WEEKLY;BYDAY=TU,TH",
      dtstart: splitDate.toISOString(),
      duration_minutes: 60,
      location: "会議室A",
      channel_id: "ch-1",
      channel_name: "general",
      notifications: [],
      exdates: [],
      created_at: "2026-03-15T00:00:00Z",
      updated_at: "2026-03-15T00:00:00Z",
    };

    // Step 1: SELECT series (存在確認)
    const seriesSelectBuilder = createMockSelectSingleBuilder({ data: mockSeries });
    // Step 2: UPDATE original series (UNTIL追加)
    const seriesUpdateBuilder = createMockSeriesUpdateBuilder({ data: updatedOriginal });
    // Step 3: INSERT new series
    const seriesInsertBuilder = createMockInsertBuilder({ data: newSeries as unknown as EventRecord });

    mockSupabaseClient.from
      .mockReturnValueOnce(seriesSelectBuilder)   // SELECT
      .mockReturnValueOnce(seriesUpdateBuilder)   // UPDATE original
      .mockReturnValueOnce(seriesInsertBuilder);  // INSERT new

    const service = createEventService(mockSupabaseClient as unknown as Parameters<typeof createEventService>[0]);
    const result = await service.splitSeries("series-1", splitDate, newInput);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.id).toBe("series-2");
      expect(result.data.name).toBe("新しい定例会");
    }

    // UPDATE呼び出しの検証: UNTIL が追加されている
    const updateCall = seriesUpdateBuilder._mocks.update.mock.calls[0]?.[0];
    expect(updateCall).toBeDefined();
    if (updateCall) {
      expect(updateCall.rrule).toContain("UNTIL=");
    }

    // INSERT呼び出しの検証
    const insertCall = seriesInsertBuilder._mocks.insert.mock.calls[0]?.[0];
    expect(insertCall).toBeDefined();
    if (insertCall) {
      expect(insertCall.name).toBe("新しい定例会");
      expect(insertCall.dtstart).toBe(splitDate.toISOString());
    }
  });

  it("should inherit series properties for new series when not specified in input (Req 7.1)", async () => {
    const splitDate = new Date("2026-04-06T10:00:00Z");
    const newInput: UpdateSeriesInput = {
      rrule: "FREQ=DAILY",
    };

    const updatedOriginal: EventSeriesRecord = {
      ...mockSeries,
      rrule: "FREQ=WEEKLY;BYDAY=MO;UNTIL=20260405T235959Z",
      updated_at: "2026-03-15T00:00:00Z",
    };

    const newSeries: EventSeriesRecord = {
      ...mockSeries,
      id: "series-2",
      rrule: "FREQ=DAILY",
      dtstart: splitDate.toISOString(),
      created_at: "2026-03-15T00:00:00Z",
      updated_at: "2026-03-15T00:00:00Z",
    };

    const seriesSelectBuilder = createMockSelectSingleBuilder({ data: mockSeries });
    const seriesUpdateBuilder = createMockSeriesUpdateBuilder({ data: updatedOriginal });
    const seriesInsertBuilder = createMockInsertBuilder({ data: newSeries as unknown as EventRecord });

    mockSupabaseClient.from
      .mockReturnValueOnce(seriesSelectBuilder)
      .mockReturnValueOnce(seriesUpdateBuilder)
      .mockReturnValueOnce(seriesInsertBuilder);

    const service = createEventService(mockSupabaseClient as unknown as Parameters<typeof createEventService>[0]);
    const result = await service.splitSeries("series-1", splitDate, newInput);

    expect(result.success).toBe(true);

    // INSERT呼び出しの検証: 元シリーズのプロパティを継承
    const insertCall = seriesInsertBuilder._mocks.insert.mock.calls[0]?.[0];
    expect(insertCall).toBeDefined();
    if (insertCall) {
      expect(insertCall.guild_id).toBe("guild-123");
      expect(insertCall.name).toBe("毎週の定例会"); // 元のタイトルを継承
      expect(insertCall.description).toBe("チーム定例");
      expect(insertCall.color).toBe("#22C55E");
      expect(insertCall.location).toBe("会議室A");
      expect(insertCall.rrule).toBe("FREQ=DAILY");
      expect(insertCall.duration_minutes).toBe(60);
    }
  });

  it("should return SERIES_NOT_FOUND when series doesn't exist (Req 7.1)", async () => {
    const seriesSelectBuilder = createMockSelectSingleBuilder({
      error: { message: "Row not found", code: "PGRST116" },
    });

    mockSupabaseClient.from.mockReturnValueOnce(seriesSelectBuilder);

    const service = createEventService(mockSupabaseClient as unknown as Parameters<typeof createEventService>[0]);
    const result = await service.splitSeries(
      "non-existent",
      new Date("2026-04-06T10:00:00Z"),
      { rrule: "FREQ=DAILY" },
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("SERIES_NOT_FOUND");
    }
  });

  it("should rollback original series UNTIL on new series creation failure (Req 7.1)", async () => {
    const splitDate = new Date("2026-04-06T10:00:00Z");

    const updatedOriginal: EventSeriesRecord = {
      ...mockSeries,
      rrule: "FREQ=WEEKLY;BYDAY=MO;UNTIL=20260405T235959Z",
      updated_at: "2026-03-15T00:00:00Z",
    };

    const seriesSelectBuilder = createMockSelectSingleBuilder({ data: mockSeries });
    const seriesUpdateBuilder = createMockSeriesUpdateBuilder({ data: updatedOriginal });
    // INSERT failure
    const seriesInsertBuilder = createMockInsertBuilder({
      error: { message: "Database error" },
    } as { data?: EventRecord; error?: { message: string; code?: string } });
    // Rollback: restore original RRULE
    const rollbackUpdateBuilder = createMockSeriesUpdateBuilder({ data: mockSeries });

    mockSupabaseClient.from
      .mockReturnValueOnce(seriesSelectBuilder)   // SELECT
      .mockReturnValueOnce(seriesUpdateBuilder)   // UPDATE original (UNTIL追加)
      .mockReturnValueOnce(seriesInsertBuilder)   // INSERT new (失敗)
      .mockReturnValueOnce(rollbackUpdateBuilder); // UPDATE original (復元)

    const service = createEventService(mockSupabaseClient as unknown as Parameters<typeof createEventService>[0]);
    const result = await service.splitSeries("series-1", splitDate, { rrule: "FREQ=DAILY" });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("CREATE_FAILED");
    }

    // ロールバックUPDATEが呼ばれること
    expect(mockSupabaseClient.from).toHaveBeenCalledTimes(4);
    const rollbackCall = rollbackUpdateBuilder._mocks.update.mock.calls[0]?.[0];
    expect(rollbackCall).toBeDefined();
    if (rollbackCall) {
      expect(rollbackCall.rrule).toBe(mockSeries.rrule); // 元のRRULEに復元
    }
  });

  it("should return UPDATE_FAILED when original series UNTIL update fails (Req 7.1)", async () => {
    const seriesSelectBuilder = createMockSelectSingleBuilder({ data: mockSeries });
    const seriesUpdateBuilder = createMockSeriesUpdateBuilder({
      error: { message: "Database error" },
    });

    mockSupabaseClient.from
      .mockReturnValueOnce(seriesSelectBuilder)
      .mockReturnValueOnce(seriesUpdateBuilder);

    const service = createEventService(mockSupabaseClient as unknown as Parameters<typeof createEventService>[0]);
    const result = await service.splitSeries(
      "series-1",
      new Date("2026-04-06T10:00:00Z"),
      { rrule: "FREQ=DAILY" },
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("UPDATE_FAILED");
    }
  });

  it("should handle network errors gracefully", async () => {
    const mockSelect = vi.fn();
    const mockEq = vi.fn();
    const mockSingle = vi.fn();

    const networkError = new TypeError("Failed to fetch");
    const internalPromise = Promise.reject(networkError);

    const queryBuilder = {
      select: mockSelect,
      eq: mockEq,
      single: mockSingle,
      then: (
        onFulfilled?: (value: unknown) => unknown,
        onRejected?: (reason: unknown) => unknown
      ) => internalPromise.then(onFulfilled, onRejected),
      catch: (onRejected: (reason: unknown) => unknown) => internalPromise.catch(onRejected),
    };

    mockSelect.mockReturnValue(queryBuilder);
    mockEq.mockReturnValue(queryBuilder);
    mockSingle.mockReturnValue(queryBuilder);
    mockSupabaseClient.from.mockReturnValue(queryBuilder);

    const service = createEventService(mockSupabaseClient as unknown as Parameters<typeof createEventService>[0]);
    const result = await service.splitSeries(
      "series-1",
      new Date("2026-04-06T10:00:00Z"),
      { rrule: "FREQ=DAILY" },
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("NETWORK_ERROR");
    }
  });

  it("should ensure split series are independently operable (Req 7.3)", async () => {
    const splitDate = new Date("2026-04-06T10:00:00Z");

    const updatedOriginal: EventSeriesRecord = {
      ...mockSeries,
      rrule: "FREQ=WEEKLY;BYDAY=MO;UNTIL=20260405T235959Z",
      updated_at: "2026-03-15T00:00:00Z",
    };

    const newSeries: EventSeriesRecord = {
      id: "series-2",
      guild_id: "guild-123",
      name: "毎週の定例会",
      description: "チーム定例",
      color: "#22C55E",
      is_all_day: false,
      rrule: "FREQ=DAILY",
      dtstart: splitDate.toISOString(),
      duration_minutes: 60,
      location: "会議室A",
      channel_id: "ch-1",
      channel_name: "general",
      notifications: [],
      exdates: [],
      created_at: "2026-03-15T00:00:00Z",
      updated_at: "2026-03-15T00:00:00Z",
    };

    const seriesSelectBuilder = createMockSelectSingleBuilder({ data: mockSeries });
    const seriesUpdateBuilder = createMockSeriesUpdateBuilder({ data: updatedOriginal });
    const seriesInsertBuilder = createMockInsertBuilder({ data: newSeries as unknown as EventRecord });

    mockSupabaseClient.from
      .mockReturnValueOnce(seriesSelectBuilder)
      .mockReturnValueOnce(seriesUpdateBuilder)
      .mockReturnValueOnce(seriesInsertBuilder);

    const service = createEventService(mockSupabaseClient as unknown as Parameters<typeof createEventService>[0]);
    const result = await service.splitSeries("series-1", splitDate, { rrule: "FREQ=DAILY" });

    expect(result.success).toBe(true);
    if (result.success) {
      // 新シリーズは独自のIDを持つ
      expect(result.data.id).not.toBe(mockSeries.id);
      // 新シリーズのexdatesは空（独立したシリーズ）
      expect(result.data.exdates).toEqual([]);
    }
  });
});

describe("createEventService - truncateSeries (Task 3.5)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockSeries: EventSeriesRecord = {
    id: "series-1",
    guild_id: "guild-123",
    name: "毎週の定例会",
    description: "チーム定例",
    color: "#22C55E",
    is_all_day: false,
    rrule: "FREQ=WEEKLY;BYDAY=MO",
    dtstart: "2026-03-02T10:00:00Z",
    duration_minutes: 60,
    location: "会議室A",
    channel_id: null,
    channel_name: null,
    notifications: [],
    exdates: [],
    created_at: "2026-02-01T00:00:00Z",
    updated_at: "2026-02-01T00:00:00Z",
  };

  it("should truncate series by adding UNTIL to RRULE (Req 7.2)", async () => {
    const untilDate = new Date("2026-04-06T10:00:00Z");

    const updatedSeries: EventSeriesRecord = {
      ...mockSeries,
      rrule: "FREQ=WEEKLY;BYDAY=MO;UNTIL=20260405T235959Z",
      updated_at: "2026-03-15T00:00:00Z",
    };

    const seriesSelectBuilder = createMockSelectSingleBuilder({ data: mockSeries });
    const futureExceptionsDeleteBuilder = createMockDeleteWithFilterBuilder({});
    const seriesUpdateBuilder = createMockSeriesUpdateBuilder({ data: updatedSeries });

    mockSupabaseClient.from
      .mockReturnValueOnce(seriesSelectBuilder)           // SELECT
      .mockReturnValueOnce(futureExceptionsDeleteBuilder) // DELETE future exceptions
      .mockReturnValueOnce(seriesUpdateBuilder);          // UPDATE

    const service = createEventService(mockSupabaseClient as unknown as Parameters<typeof createEventService>[0]);
    const result = await service.truncateSeries("series-1", untilDate);

    expect(result.success).toBe(true);

    // UPDATE呼び出しの検証: UNTIL パラメータが追加されている
    const updateCall = seriesUpdateBuilder._mocks.update.mock.calls[0]?.[0];
    expect(updateCall).toBeDefined();
    if (updateCall) {
      expect(updateCall.rrule).toContain("UNTIL=");
    }
  });

  it("should remove future exdates when truncating (Req 7.2)", async () => {
    const untilDate = new Date("2026-04-06T10:00:00Z");
    const seriesWithExdates: EventSeriesRecord = {
      ...mockSeries,
      exdates: [
        "2026-03-09T10:00:00Z", // before untilDate - keep
        "2026-04-13T10:00:00Z", // after untilDate - remove
        "2026-05-04T10:00:00Z", // after untilDate - remove
      ],
    };

    const updatedSeries: EventSeriesRecord = {
      ...seriesWithExdates,
      rrule: "FREQ=WEEKLY;BYDAY=MO;UNTIL=20260405T235959Z",
      exdates: ["2026-03-09T10:00:00Z"],
      updated_at: "2026-03-15T00:00:00Z",
    };

    const seriesSelectBuilder = createMockSelectSingleBuilder({ data: seriesWithExdates });
    const futureExceptionsDeleteBuilder = createMockDeleteWithFilterBuilder({});
    const seriesUpdateBuilder = createMockSeriesUpdateBuilder({ data: updatedSeries });

    mockSupabaseClient.from
      .mockReturnValueOnce(seriesSelectBuilder)           // SELECT
      .mockReturnValueOnce(futureExceptionsDeleteBuilder) // DELETE future exceptions
      .mockReturnValueOnce(seriesUpdateBuilder);          // UPDATE

    const service = createEventService(mockSupabaseClient as unknown as Parameters<typeof createEventService>[0]);
    const result = await service.truncateSeries("series-1", untilDate);

    expect(result.success).toBe(true);

    // exdatesが正しくフィルタリングされている
    const updateCall = seriesUpdateBuilder._mocks.update.mock.calls[0]?.[0];
    expect(updateCall).toBeDefined();
    if (updateCall) {
      expect(updateCall.exdates).toEqual(["2026-03-09T10:00:00Z"]);
    }
  });

  it("should return SERIES_NOT_FOUND when series doesn't exist (Req 7.2)", async () => {
    const seriesSelectBuilder = createMockSelectSingleBuilder({
      error: { message: "Row not found", code: "PGRST116" },
    });

    mockSupabaseClient.from.mockReturnValueOnce(seriesSelectBuilder);

    const service = createEventService(mockSupabaseClient as unknown as Parameters<typeof createEventService>[0]);
    const result = await service.truncateSeries(
      "non-existent",
      new Date("2026-04-06T10:00:00Z"),
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("SERIES_NOT_FOUND");
    }
  });

  it("should return UPDATE_FAILED on database error during truncation", async () => {
    const seriesSelectBuilder = createMockSelectSingleBuilder({ data: mockSeries });
    const futureExceptionsDeleteBuilder = createMockDeleteWithFilterBuilder({});
    const seriesUpdateBuilder = createMockSeriesUpdateBuilder({
      error: { message: "Database error" },
    });

    mockSupabaseClient.from
      .mockReturnValueOnce(seriesSelectBuilder)
      .mockReturnValueOnce(futureExceptionsDeleteBuilder)
      .mockReturnValueOnce(seriesUpdateBuilder);

    const service = createEventService(mockSupabaseClient as unknown as Parameters<typeof createEventService>[0]);
    const result = await service.truncateSeries(
      "series-1",
      new Date("2026-04-06T10:00:00Z"),
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("UPDATE_FAILED");
    }
  });

  it("should handle network errors gracefully", async () => {
    const mockSelect = vi.fn();
    const mockEq = vi.fn();
    const mockSingle = vi.fn();

    const networkError = new TypeError("Failed to fetch");
    const internalPromise = Promise.reject(networkError);

    const queryBuilder = {
      select: mockSelect,
      eq: mockEq,
      single: mockSingle,
      then: (
        onFulfilled?: (value: unknown) => unknown,
        onRejected?: (reason: unknown) => unknown
      ) => internalPromise.then(onFulfilled, onRejected),
      catch: (onRejected: (reason: unknown) => unknown) => internalPromise.catch(onRejected),
    };

    mockSelect.mockReturnValue(queryBuilder);
    mockEq.mockReturnValue(queryBuilder);
    mockSingle.mockReturnValue(queryBuilder);
    mockSupabaseClient.from.mockReturnValue(queryBuilder);

    const service = createEventService(mockSupabaseClient as unknown as Parameters<typeof createEventService>[0]);
    const result = await service.truncateSeries(
      "series-1",
      new Date("2026-04-06T10:00:00Z"),
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("NETWORK_ERROR");
    }
  });

  it("should also delete future exception records when truncating (Req 7.2)", async () => {
    const untilDate = new Date("2026-04-06T10:00:00Z");

    const updatedSeries: EventSeriesRecord = {
      ...mockSeries,
      rrule: "FREQ=WEEKLY;BYDAY=MO;UNTIL=20260405T235959Z",
      updated_at: "2026-03-15T00:00:00Z",
    };

    const seriesSelectBuilder = createMockSelectSingleBuilder({ data: mockSeries });
    // DELETE future exceptions
    const futureExceptionsDeleteBuilder = createMockDeleteWithFilterBuilder({});
    // UPDATE series RRULE
    const seriesUpdateBuilder = createMockSeriesUpdateBuilder({ data: updatedSeries });

    mockSupabaseClient.from
      .mockReturnValueOnce(seriesSelectBuilder)         // SELECT
      .mockReturnValueOnce(futureExceptionsDeleteBuilder) // DELETE future exceptions
      .mockReturnValueOnce(seriesUpdateBuilder);        // UPDATE

    const service = createEventService(mockSupabaseClient as unknown as Parameters<typeof createEventService>[0]);
    const result = await service.truncateSeries("series-1", untilDate);

    expect(result.success).toBe(true);

    // 例外レコード削除が呼ばれること
    expect(futureExceptionsDeleteBuilder._mocks.delete).toHaveBeenCalled();
    expect(futureExceptionsDeleteBuilder._mocks.eq).toHaveBeenCalledWith("series_id", "series-1");
    expect(futureExceptionsDeleteBuilder._mocks.gte).toHaveBeenCalledWith("original_date", untilDate.toISOString());
  });
});

// DELETE + EQ + GTE フィルタ用モッククエリビルダー
const createMockDeleteWithFilterBuilder = (options: {
  error?: { message: string; code?: string };
}) => {
  const result = {
    data: null,
    error: options.error ?? null,
  };

  const mockDelete = vi.fn();
  const mockEq = vi.fn();
  const mockGte = vi.fn();

  const internalPromise = Promise.resolve(result);

  const queryBuilder = {
    delete: mockDelete,
    eq: mockEq,
    gte: mockGte,
    then: (
      onFulfilled?: (value: typeof result) => unknown,
      onRejected?: (reason: unknown) => unknown
    ) => internalPromise.then(onFulfilled, onRejected),
    catch: (onRejected: (reason: unknown) => unknown) => internalPromise.catch(onRejected),
    _mocks: { delete: mockDelete, eq: mockEq, gte: mockGte },
  };

  mockDelete.mockReturnValue(queryBuilder);
  mockEq.mockReturnValue(queryBuilder);
  mockGte.mockReturnValue(queryBuilder);

  return queryBuilder;
};
