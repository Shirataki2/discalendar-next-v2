/**
 * EventService 繰り返しイベント統合テスト
 *
 * タスク8.1: EventServiceの統合テストを作成する
 * - シリーズ作成から統合取得までの一貫性テスト
 * - 単一オカレンスの削除後の展開結果テスト（EXDATE反映確認）
 * - シリーズ分割前後のオカレンス境界検証テスト
 * - 既存の単発イベントCRUDに影響がないことの回帰テスト
 *
 * Requirements: 1.3, 1.4, 5.2, 5.4, 7.1, 9.1
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  type CreateSeriesInput,
  type FetchEventsParams,
  type UpdateSeriesInput,
  createEventService,
} from "./event-service";
import type { EventRecord, EventSeriesRecord } from "./types";

// ---------- Mock helpers ----------

const mockSupabaseClient = {
  from: vi.fn(),
};

type SupabaseParam = Parameters<typeof createEventService>[0];

afterEach(() => {
  mockSupabaseClient.from.mockReset();
});

/**
 * 汎用クエリビルダーモック
 * select/eq/gte/lte/is/not/or/abortSignal/insert/upsert/update/delete/single をサポート
 */
function createFlexibleBuilder<T>(options: {
  data?: T;
  error?: { message: string; code?: string } | null;
}) {
  const result = { data: options.data ?? null, error: options.error ?? null };
  const promise = Promise.resolve(result);

  const builder: Record<string, unknown> = {};
  const chainMethods = [
    "select", "eq", "gte", "lte", "is", "not", "or",
    "abortSignal", "insert", "upsert", "update", "delete", "single",
  ];

  for (const m of chainMethods) {
    builder[m] = vi.fn().mockReturnValue(builder);
  }

  builder.then = (
    onFulfilled?: (v: typeof result) => unknown,
    onRejected?: (r: unknown) => unknown,
  ) => promise.then(onFulfilled, onRejected);
  builder.catch = (onRejected: (r: unknown) => unknown) => promise.catch(onRejected);

  return builder;
}

// ---------- Test data factories ----------

function makeSeriesRecord(overrides?: Partial<EventSeriesRecord>): EventSeriesRecord {
  return {
    id: "series-1",
    guild_id: "guild-123",
    name: "Weekly Meeting",
    description: null,
    color: "#3B82F6",
    is_all_day: false,
    rrule: "FREQ=WEEKLY;BYDAY=TU",
    dtstart: "2026-01-06T10:00:00.000Z",
    duration_minutes: 60,
    location: null,
    channel_id: null,
    channel_name: null,
    notifications: [],
    exdates: [],
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

function makeEventRecord(overrides?: Partial<EventRecord>): EventRecord {
  return {
    id: "event-single-1",
    guild_id: "guild-123",
    name: "単発イベント",
    description: null,
    color: "#FF5733",
    is_all_day: false,
    start_at: "2026-01-15T14:00:00.000Z",
    end_at: "2026-01-15T16:00:00.000Z",
    location: null,
    channel_id: null,
    channel_name: null,
    notifications: [],
    series_id: null,
    original_date: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

/**
 * fetchEventsWithSeries で必要な3回の from() 呼び出しをルーティングするモック
 *
 * fetchEventsWithSeries は以下の順で from() を呼ぶ:
 * 1. from("events") → 単発イベント (series_id IS NULL)
 * 2. from("event_series") → シリーズ一覧
 * 3. from("events") → 例外レコード (series_id IS NOT NULL)
 */
function setupFetchWithSeriesMock(config: {
  singleEvents?: EventRecord[];
  series?: EventSeriesRecord[];
  exceptions?: EventRecord[];
}) {
  let eventsCallCount = 0;

  mockSupabaseClient.from.mockImplementation((table: string) => {
    if (table === "event_series") {
      return createFlexibleBuilder({ data: config.series ?? [] });
    }
    if (table === "events") {
      eventsCallCount++;
      if (eventsCallCount === 1) {
        return createFlexibleBuilder({ data: config.singleEvents ?? [] });
      }
      return createFlexibleBuilder({ data: config.exceptions ?? [] });
    }
    return createFlexibleBuilder({ data: [] });
  });
}

// ---------- Tests ----------

describe("EventService 繰り返しイベント統合テスト", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("シリーズ作成から統合取得までの一貫性テスト (Req 1.3, 1.4)", () => {
    it("createRecurringSeries で作成したシリーズが fetchEventsWithSeries で取得できる", async () => {
      const series = makeSeriesRecord({
        rrule: "FREQ=WEEKLY;BYDAY=TU",
        dtstart: "2026-01-06T10:00:00.000Z",
        duration_minutes: 60,
      });

      // Step 1: createRecurringSeries のモック
      const insertBuilder = createFlexibleBuilder({ data: series });
      mockSupabaseClient.from.mockReturnValue(insertBuilder);

      const service = createEventService(mockSupabaseClient as unknown as SupabaseParam);
      const createInput: CreateSeriesInput = {
        guildId: "guild-123",
        title: "Weekly Meeting",
        startAt: new Date("2026-01-06T10:00:00.000Z"),
        endAt: new Date("2026-01-06T11:00:00.000Z"),
        rrule: "FREQ=WEEKLY;BYDAY=TU",
      };

      const createResult = await service.createRecurringSeries(createInput);
      expect(createResult.success).toBe(true);
      if (!createResult.success) return;
      expect(createResult.data.id).toBe("series-1");
      expect(createResult.data.rrule).toBe("FREQ=WEEKLY;BYDAY=TU");

      // Step 2: fetchEventsWithSeries で取得
      mockSupabaseClient.from.mockReset();
      setupFetchWithSeriesMock({
        singleEvents: [],
        series: [series],
        exceptions: [],
      });

      const fetchParams: FetchEventsParams = {
        guildId: "guild-123",
        startDate: new Date("2026-01-01T00:00:00Z"),
        endDate: new Date("2026-01-31T23:59:59Z"),
      };

      const fetchResult = await service.fetchEventsWithSeries(fetchParams);
      expect(fetchResult.success).toBe(true);
      if (!fetchResult.success) return;

      // 1月中の火曜日: 6, 13, 20, 27
      expect(fetchResult.data.length).toBe(4);

      // 各オカレンスが繰り返しイベントのフラグを持つ
      for (const event of fetchResult.data) {
        expect(event.isRecurring).toBe(true);
        expect(event.seriesId).toBe("series-1");
        expect(event.title).toBe("Weekly Meeting");
        expect(event.rruleSummary).toBeDefined();
      }

      // 各オカレンスの開始日が火曜日であること
      const starts = fetchResult.data.map((e) => e.start);
      expect(starts[0].getUTCDay()).toBe(2); // 火曜日
      expect(starts[1].getUTCDay()).toBe(2);
      expect(starts[2].getUTCDay()).toBe(2);
      expect(starts[3].getUTCDay()).toBe(2);
    });

    it("終了条件 COUNT 付きシリーズのオカレンス数が正しい", async () => {
      const series = makeSeriesRecord({
        rrule: "FREQ=DAILY;COUNT=3",
        dtstart: "2026-02-01T09:00:00.000Z",
        duration_minutes: 30,
      });

      setupFetchWithSeriesMock({ series: [series] });

      const service = createEventService(mockSupabaseClient as unknown as SupabaseParam);
      const result = await service.fetchEventsWithSeries({
        guildId: "guild-123",
        startDate: new Date("2026-02-01T00:00:00Z"),
        endDate: new Date("2026-02-28T23:59:59Z"),
      });

      expect(result.success).toBe(true);
      if (!result.success) return;

      // COUNT=3 なのでオカレンスは3つ
      expect(result.data.length).toBe(3);
    });

    it("シリーズの duration_minutes がオカレンスの end に正しく反映される", async () => {
      const series = makeSeriesRecord({
        rrule: "FREQ=DAILY;COUNT=1",
        dtstart: "2026-03-01T14:00:00.000Z",
        duration_minutes: 120,
      });

      setupFetchWithSeriesMock({ series: [series] });

      const service = createEventService(mockSupabaseClient as unknown as SupabaseParam);
      const result = await service.fetchEventsWithSeries({
        guildId: "guild-123",
        startDate: new Date("2026-03-01T00:00:00Z"),
        endDate: new Date("2026-03-01T23:59:59Z"),
      });

      expect(result.success).toBe(true);
      if (!result.success) return;

      expect(result.data.length).toBe(1);
      const event = result.data[0];
      expect(event.start.toISOString()).toBe("2026-03-01T14:00:00.000Z");
      expect(event.end.toISOString()).toBe("2026-03-01T16:00:00.000Z"); // +120分
    });

    it("RRULE バリデーション失敗時は VALIDATION_ERROR を返す", async () => {
      const service = createEventService(mockSupabaseClient as unknown as SupabaseParam);
      const result = await service.createRecurringSeries({
        guildId: "guild-123",
        title: "Invalid",
        startAt: new Date("2026-01-01T10:00:00Z"),
        endAt: new Date("2026-01-01T11:00:00Z"),
        rrule: "INVALID_RRULE_STRING",
      });

      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.error.code).toBe("VALIDATION_ERROR");
      expect(result.error.details).toContain("RRULE");
    });

    it("タイトルが空の場合は VALIDATION_ERROR を返す", async () => {
      const service = createEventService(mockSupabaseClient as unknown as SupabaseParam);
      const result = await service.createRecurringSeries({
        guildId: "guild-123",
        title: "",
        startAt: new Date("2026-01-01T10:00:00Z"),
        endAt: new Date("2026-01-01T11:00:00Z"),
        rrule: "FREQ=DAILY",
      });

      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.error.code).toBe("VALIDATION_ERROR");
    });
  });

  describe("単一オカレンスの削除後の展開結果テスト (Req 5.4)", () => {
    it("deleteOccurrence で EXDATE 追加後、該当オカレンスが展開結果から除外される", async () => {
      const series = makeSeriesRecord({
        rrule: "FREQ=WEEKLY;BYDAY=TU",
        dtstart: "2026-01-06T10:00:00.000Z",
      });

      // Step 1: deleteOccurrence のモック (シリーズ取得 → EXDATE更新)
      const seriesBuilder = createFlexibleBuilder({ data: series });
      const updateBuilder = createFlexibleBuilder({ data: null, error: null });

      mockSupabaseClient.from
        .mockReturnValueOnce(seriesBuilder)   // select series
        .mockReturnValueOnce(updateBuilder);  // update exdates

      const service = createEventService(mockSupabaseClient as unknown as SupabaseParam);
      const occurrenceDateToDelete = new Date("2026-01-13T10:00:00.000Z"); // 2番目の火曜日

      const deleteResult = await service.deleteOccurrence("guild-123", "series-1", occurrenceDateToDelete);
      expect(deleteResult.success).toBe(true);

      // Step 2: fetchEventsWithSeries で EXDATE 反映を確認
      mockSupabaseClient.from.mockReset();
      const seriesWithExdate = makeSeriesRecord({
        rrule: "FREQ=WEEKLY;BYDAY=TU",
        dtstart: "2026-01-06T10:00:00.000Z",
        exdates: ["2026-01-13T10:00:00.000Z"],
      });

      setupFetchWithSeriesMock({
        singleEvents: [],
        series: [seriesWithExdate],
        exceptions: [],
      });

      const fetchResult = await service.fetchEventsWithSeries({
        guildId: "guild-123",
        startDate: new Date("2026-01-01T00:00:00Z"),
        endDate: new Date("2026-01-31T23:59:59Z"),
      });

      expect(fetchResult.success).toBe(true);
      if (!fetchResult.success) return;

      // 1月の火曜日は 6, 13, 20, 27 の4つだが、13日が除外されるので3つ
      expect(fetchResult.data.length).toBe(3);

      // 除外された日付が結果に含まれていないことを確認
      const startDates = fetchResult.data.map((e) => e.start.toISOString());
      expect(startDates).not.toContain("2026-01-13T10:00:00.000Z");
      expect(startDates).toContain("2026-01-06T10:00:00.000Z");
      expect(startDates).toContain("2026-01-20T10:00:00.000Z");
      expect(startDates).toContain("2026-01-27T10:00:00.000Z");
    });

    it("存在しないシリーズへの deleteOccurrence は SERIES_NOT_FOUND を返す", async () => {
      const builder = createFlexibleBuilder({
        data: null,
        error: { message: "No rows found" },
      });
      mockSupabaseClient.from.mockReturnValue(builder);

      const service = createEventService(mockSupabaseClient as unknown as SupabaseParam);
      const result = await service.deleteOccurrence(
        "guild-123",
        "non-existent-series",
        new Date("2026-01-13T10:00:00Z"),
      );

      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.error.code).toBe("SERIES_NOT_FOUND");
    });
  });

  describe("単一オカレンスの編集テスト (Req 5.2)", () => {
    it("updateOccurrence で例外レコードが作成され、統合取得時に反映される", async () => {
      const series = makeSeriesRecord({
        id: "series-2",
        rrule: "FREQ=DAILY;COUNT=3",
        dtstart: "2026-02-01T09:00:00.000Z",
        duration_minutes: 60,
      });

      // updateOccurrence: シリーズ取得 → 例外レコードINSERT
      const seriesSelectBuilder = createFlexibleBuilder({ data: series });
      const exceptionRecord = makeEventRecord({
        id: "exc-1",
        guild_id: "guild-123",
        name: "変更済み Meeting",
        start_at: "2026-02-02T11:00:00.000Z",
        end_at: "2026-02-02T12:00:00.000Z",
        series_id: "series-2",
        original_date: "2026-02-02T09:00:00.000Z",
      });
      const insertBuilder = createFlexibleBuilder({ data: exceptionRecord });

      mockSupabaseClient.from
        .mockReturnValueOnce(seriesSelectBuilder) // select series
        .mockReturnValueOnce(insertBuilder);      // insert exception

      const service = createEventService(mockSupabaseClient as unknown as SupabaseParam);
      const updateResult = await service.updateOccurrence(
        "guild-123",
        "series-2",
        new Date("2026-02-02T09:00:00.000Z"),
        { title: "変更済み Meeting", startAt: new Date("2026-02-02T11:00:00Z"), endAt: new Date("2026-02-02T12:00:00Z") },
      );

      expect(updateResult.success).toBe(true);
      if (!updateResult.success) return;
      expect(updateResult.data.title).toBe("変更済み Meeting");
      expect(updateResult.data.seriesId).toBe("series-2");
      expect(updateResult.data.isRecurring).toBe(true);

      // fetchEventsWithSeries で例外レコードが統合されることを確認
      mockSupabaseClient.from.mockReset();
      setupFetchWithSeriesMock({
        singleEvents: [],
        series: [series],
        exceptions: [exceptionRecord],
      });

      const fetchResult = await service.fetchEventsWithSeries({
        guildId: "guild-123",
        startDate: new Date("2026-02-01T00:00:00Z"),
        endDate: new Date("2026-02-03T23:59:59Z"),
      });

      expect(fetchResult.success).toBe(true);
      if (!fetchResult.success) return;

      // COUNT=3: 2/1, 2/2, 2/3 のうち、2/2 は例外レコードで置換
      expect(fetchResult.data.length).toBe(3);

      const modifiedEvent = fetchResult.data.find(
        (e) => e.originalDate?.toISOString() === "2026-02-02T09:00:00.000Z",
      );
      expect(modifiedEvent).toBeDefined();
      expect(modifiedEvent?.title).toBe("変更済み Meeting");
      expect(modifiedEvent?.start.toISOString()).toBe("2026-02-02T11:00:00.000Z");
    });

    it("updateOccurrence のバリデーションエラー: 空シリーズID", async () => {
      const service = createEventService(mockSupabaseClient as unknown as SupabaseParam);
      const result = await service.updateOccurrence(
        "guild-123",
        "",
        new Date("2026-01-01T10:00:00Z"),
        { title: "test" },
      );

      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.error.code).toBe("VALIDATION_ERROR");
    });
  });

  describe("シリーズ全体の編集・削除テスト (Req 6.1, 6.2, 6.3)", () => {
    it("updateSeries でシリーズのマスター情報が更新される", async () => {
      const series = makeSeriesRecord({ id: "series-3" });
      const updatedSeries = makeSeriesRecord({
        id: "series-3",
        name: "Updated Weekly",
        color: "#22C55E",
      });

      // シリーズ取得 → 更新
      mockSupabaseClient.from
        .mockReturnValueOnce(createFlexibleBuilder({ data: series }))
        .mockReturnValueOnce(createFlexibleBuilder({ data: updatedSeries }));

      const service = createEventService(mockSupabaseClient as unknown as SupabaseParam);
      const result = await service.updateSeries("guild-123", "series-3", {
        title: "Updated Weekly",
        color: "#22C55E",
      });

      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.data.name).toBe("Updated Weekly");
      expect(result.data.color).toBe("#22C55E");
    });

    it("updateSeries with resetExceptions で例外レコードが削除される", async () => {
      const series = makeSeriesRecord({ id: "series-4" });
      const updatedSeries = makeSeriesRecord({
        id: "series-4",
        name: "Reset Series",
        exdates: [],
      });

      // シリーズ取得 → 例外削除 → シリーズ更新
      mockSupabaseClient.from
        .mockReturnValueOnce(createFlexibleBuilder({ data: series }))  // select series
        .mockReturnValueOnce(createFlexibleBuilder({ data: null }))    // delete exceptions
        .mockReturnValueOnce(createFlexibleBuilder({ data: updatedSeries })); // update series

      const service = createEventService(mockSupabaseClient as unknown as SupabaseParam);
      const result = await service.updateSeries("guild-123", "series-4", {
        title: "Reset Series",
        resetExceptions: true,
      });

      expect(result.success).toBe(true);
    });

    it("updateSeries は存在しないシリーズに対して SERIES_NOT_FOUND を返す", async () => {
      mockSupabaseClient.from.mockReturnValue(
        createFlexibleBuilder({ data: null, error: { message: "No rows found" } }),
      );

      const service = createEventService(mockSupabaseClient as unknown as SupabaseParam);
      const result = await service.updateSeries("guild-123", "non-existent", { title: "test" });

      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.error.code).toBe("SERIES_NOT_FOUND");
    });

    it("deleteSeries でシリーズと関連例外が削除される", async () => {
      // Step 1: 例外レコード削除 → Step 2: シリーズ削除
      mockSupabaseClient.from
        .mockReturnValueOnce(createFlexibleBuilder({ data: null }))  // delete exceptions
        .mockReturnValueOnce(createFlexibleBuilder({ data: null })); // delete series

      const service = createEventService(mockSupabaseClient as unknown as SupabaseParam);
      const result = await service.deleteSeries("guild-123", "series-5");

      expect(result.success).toBe(true);

      // from が "events" と "event_series" で呼ばれたことを確認
      expect(mockSupabaseClient.from).toHaveBeenCalledWith("events");
      expect(mockSupabaseClient.from).toHaveBeenCalledWith("event_series");
    });
  });

  describe("シリーズ分割前後のオカレンス境界検証テスト (Req 7.1, 7.2, 7.3)", () => {
    it("splitSeries で元シリーズに UNTIL が設定され、新シリーズが作成される", async () => {
      const originalSeries = makeSeriesRecord({
        id: "series-split-1",
        rrule: "FREQ=WEEKLY;BYDAY=TU",
        dtstart: "2026-01-06T10:00:00.000Z",
      });

      const updatedOriginal = makeSeriesRecord({
        id: "series-split-1",
        rrule: "FREQ=WEEKLY;BYDAY=TU;UNTIL=20260119T235959Z",
      });

      const newSeries = makeSeriesRecord({
        id: "series-split-2",
        rrule: "FREQ=WEEKLY;BYDAY=WE",
        dtstart: "2026-01-20T10:00:00.000Z",
      });

      // select original → update original (add UNTIL) → insert new series
      mockSupabaseClient.from
        .mockReturnValueOnce(createFlexibleBuilder({ data: originalSeries }))
        .mockReturnValueOnce(createFlexibleBuilder({ data: updatedOriginal }))
        .mockReturnValueOnce(createFlexibleBuilder({ data: newSeries }));

      const service = createEventService(mockSupabaseClient as unknown as SupabaseParam);
      const splitResult = await service.splitSeries(
        "guild-123",
        "series-split-1",
        new Date("2026-01-20T10:00:00.000Z"),
        { rrule: "FREQ=WEEKLY;BYDAY=WE" },
      );

      expect(splitResult.success).toBe(true);
      if (!splitResult.success) return;
      expect(splitResult.data.id).toBe("series-split-2");

      // 分割後の境界テスト: 元シリーズ (UNTIL あり) + 新シリーズ
      mockSupabaseClient.from.mockReset();
      setupFetchWithSeriesMock({
        singleEvents: [],
        series: [updatedOriginal, newSeries],
        exceptions: [],
      });

      const fetchResult = await service.fetchEventsWithSeries({
        guildId: "guild-123",
        startDate: new Date("2026-01-01T00:00:00Z"),
        endDate: new Date("2026-02-28T23:59:59Z"),
      });

      expect(fetchResult.success).toBe(true);
      if (!fetchResult.success) return;

      // 元シリーズ (火曜日, ~1/19): 1/6, 1/13 = 2件
      // 新シリーズ (水曜日, 1/20~): 1/21, 1/28, 2/4, 2/11, 2/18, 2/25 = 6件
      const originalOccurrences = fetchResult.data.filter(
        (e) => e.seriesId === "series-split-1",
      );
      const newOccurrences = fetchResult.data.filter(
        (e) => e.seriesId === "series-split-2",
      );

      expect(originalOccurrences.length).toBe(2);
      expect(newOccurrences.length).toBe(6);

      // 元シリーズの最後のオカレンスが分割日より前であること
      const lastOriginal = originalOccurrences[originalOccurrences.length - 1];
      expect(lastOriginal.start.getTime()).toBeLessThan(new Date("2026-01-20T10:00:00Z").getTime());

      // 新シリーズの最初のオカレンスが分割日以降であること
      const firstNew = newOccurrences[0];
      expect(firstNew.start.getTime()).toBeGreaterThanOrEqual(new Date("2026-01-20T00:00:00Z").getTime());
    });

    it("splitSeries で新シリーズ作成が失敗した場合、元シリーズの RRULE が復元される", async () => {
      const originalSeries = makeSeriesRecord({
        id: "series-compensate",
        rrule: "FREQ=DAILY",
      });

      const updatedOriginal = makeSeriesRecord({
        id: "series-compensate",
        rrule: "FREQ=DAILY;UNTIL=20260114T235959Z",
      });

      const compensatedOriginal = makeSeriesRecord({
        id: "series-compensate",
        rrule: "FREQ=DAILY",
      });

      // select → update (add UNTIL) → insert (FAIL) → compensation (restore RRULE)
      mockSupabaseClient.from
        .mockReturnValueOnce(createFlexibleBuilder({ data: originalSeries }))
        .mockReturnValueOnce(createFlexibleBuilder({ data: updatedOriginal }))
        .mockReturnValueOnce(createFlexibleBuilder({ data: null, error: { message: "Insert failed" } }))
        .mockReturnValueOnce(createFlexibleBuilder({ data: compensatedOriginal }));

      const service = createEventService(mockSupabaseClient as unknown as SupabaseParam);
      const result = await service.splitSeries(
        "guild-123",
        "series-compensate",
        new Date("2026-01-15T10:00:00Z"),
        { title: "New Part" },
      );

      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.error.code).toBe("CREATE_FAILED");

      // 補償処理で from("event_series") が呼ばれていることを確認
      const fromCalls = mockSupabaseClient.from.mock.calls;
      expect(fromCalls.length).toBe(4);
      expect(fromCalls[3][0]).toBe("event_series"); // compensation update
    });

    it("splitSeries は存在しないシリーズに対して SERIES_NOT_FOUND を返す", async () => {
      mockSupabaseClient.from.mockReturnValue(
        createFlexibleBuilder({ data: null, error: { message: "No rows" } }),
      );

      const service = createEventService(mockSupabaseClient as unknown as SupabaseParam);
      const result = await service.splitSeries(
        "guild-123",
        "non-existent",
        new Date("2026-01-15T10:00:00Z"),
        { title: "test" },
      );

      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.error.code).toBe("SERIES_NOT_FOUND");
    });

    it("truncateSeries で指定日以降のオカレンスが生成されなくなる", async () => {
      const series = makeSeriesRecord({
        id: "series-truncate",
        rrule: "FREQ=DAILY",
        dtstart: "2026-03-01T09:00:00.000Z",
        exdates: ["2026-03-05T09:00:00.000Z", "2026-03-20T09:00:00.000Z"],
      });

      const truncatedSeries = makeSeriesRecord({
        id: "series-truncate",
        rrule: "FREQ=DAILY;UNTIL=20260309T235959Z",
        dtstart: "2026-03-01T09:00:00.000Z",
        exdates: ["2026-03-05T09:00:00.000Z"],
      });

      // select series → delete future exceptions → update RRULE with UNTIL
      mockSupabaseClient.from
        .mockReturnValueOnce(createFlexibleBuilder({ data: series }))
        .mockReturnValueOnce(createFlexibleBuilder({ data: null }))
        .mockReturnValueOnce(createFlexibleBuilder({ data: truncatedSeries }));

      const service = createEventService(mockSupabaseClient as unknown as SupabaseParam);
      const result = await service.truncateSeries(
        "guild-123",
        "series-truncate",
        new Date("2026-03-10T09:00:00.000Z"),
      );

      expect(result.success).toBe(true);

      // 切り詰め後の取得テスト
      mockSupabaseClient.from.mockReset();
      setupFetchWithSeriesMock({
        singleEvents: [],
        series: [truncatedSeries],
        exceptions: [],
      });

      const fetchResult = await service.fetchEventsWithSeries({
        guildId: "guild-123",
        startDate: new Date("2026-03-01T00:00:00Z"),
        endDate: new Date("2026-03-31T23:59:59Z"),
      });

      expect(fetchResult.success).toBe(true);
      if (!fetchResult.success) return;

      // 3/1 ~ 3/9 の DAILY (3/5は除外): 8日分
      // 3/10以降は生成されない
      for (const event of fetchResult.data) {
        expect(event.start.getTime()).toBeLessThan(new Date("2026-03-10T00:00:00Z").getTime());
      }

      // 除外日 (3/5) が含まれていないことを確認
      const dates = fetchResult.data.map((e) => e.start.toISOString());
      expect(dates).not.toContain("2026-03-05T09:00:00.000Z");
    });
  });

  describe("既存の単発イベントCRUDに影響がないことの回帰テスト (Req 9.1)", () => {
    it("fetchEventsWithSeries は単発イベントをそのまま返す", async () => {
      const singleEvent = makeEventRecord({
        id: "single-1",
        name: "単発ミーティング",
        start_at: "2026-01-15T14:00:00.000Z",
        end_at: "2026-01-15T16:00:00.000Z",
      });

      setupFetchWithSeriesMock({
        singleEvents: [singleEvent],
        series: [],
        exceptions: [],
      });

      const service = createEventService(mockSupabaseClient as unknown as SupabaseParam);
      const result = await service.fetchEventsWithSeries({
        guildId: "guild-123",
        startDate: new Date("2026-01-01T00:00:00Z"),
        endDate: new Date("2026-01-31T23:59:59Z"),
      });

      expect(result.success).toBe(true);
      if (!result.success) return;

      expect(result.data.length).toBe(1);
      expect(result.data[0].title).toBe("単発ミーティング");
      expect(result.data[0].isRecurring).toBeUndefined();
      expect(result.data[0].seriesId).toBeUndefined();
    });

    it("単発イベントと繰り返しオカレンスが混在して返される", async () => {
      const singleEvent = makeEventRecord({
        id: "single-2",
        name: "1回限りのイベント",
        start_at: "2026-01-15T14:00:00.000Z",
        end_at: "2026-01-15T16:00:00.000Z",
      });

      const series = makeSeriesRecord({
        id: "series-mixed",
        rrule: "FREQ=WEEKLY;BYDAY=MO;COUNT=2",
        dtstart: "2026-01-05T09:00:00.000Z",
        duration_minutes: 60,
      });

      setupFetchWithSeriesMock({
        singleEvents: [singleEvent],
        series: [series],
        exceptions: [],
      });

      const service = createEventService(mockSupabaseClient as unknown as SupabaseParam);
      const result = await service.fetchEventsWithSeries({
        guildId: "guild-123",
        startDate: new Date("2026-01-01T00:00:00Z"),
        endDate: new Date("2026-01-31T23:59:59Z"),
      });

      expect(result.success).toBe(true);
      if (!result.success) return;

      // 単発1 + 繰り返し2 = 3件
      expect(result.data.length).toBe(3);

      const singles = result.data.filter((e) => !e.isRecurring);
      const recurrings = result.data.filter((e) => e.isRecurring);

      expect(singles.length).toBe(1);
      expect(recurrings.length).toBe(2);
    });

    it("シリーズが空の場合、単発イベントのみが返される", async () => {
      const events = [
        makeEventRecord({ id: "e1", name: "Event A", start_at: "2026-01-10T10:00:00Z", end_at: "2026-01-10T11:00:00Z" }),
        makeEventRecord({ id: "e2", name: "Event B", start_at: "2026-01-20T10:00:00Z", end_at: "2026-01-20T11:00:00Z" }),
      ];

      setupFetchWithSeriesMock({
        singleEvents: events,
        series: [],
        exceptions: [],
      });

      const service = createEventService(mockSupabaseClient as unknown as SupabaseParam);
      const result = await service.fetchEventsWithSeries({
        guildId: "guild-123",
        startDate: new Date("2026-01-01T00:00:00Z"),
        endDate: new Date("2026-01-31T23:59:59Z"),
      });

      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.data.length).toBe(2);
      expect(result.data[0].title).toBe("Event A");
      expect(result.data[1].title).toBe("Event B");
    });

    it("createEvent は繰り返しイベント追加の影響を受けない", async () => {
      const newRecord = makeEventRecord({
        id: "new-single",
        name: "新規単発",
        start_at: "2026-02-01T10:00:00Z",
        end_at: "2026-02-01T11:00:00Z",
      });

      const insertBuilder = createFlexibleBuilder({ data: newRecord });
      mockSupabaseClient.from.mockReturnValue(insertBuilder);

      const service = createEventService(mockSupabaseClient as unknown as SupabaseParam);
      const result = await service.createEvent({
        guildId: "guild-123",
        title: "新規単発",
        startAt: new Date("2026-02-01T10:00:00Z"),
        endAt: new Date("2026-02-01T11:00:00Z"),
      });

      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.data.title).toBe("新規単発");
      expect(result.data.seriesId).toBeUndefined();
      expect(result.data.isRecurring).toBeUndefined();

      expect(mockSupabaseClient.from).toHaveBeenCalledWith("events");
    });

    it("updateEvent は繰り返しイベント追加の影響を受けない", async () => {
      const updatedRecord = makeEventRecord({
        id: "existing-single",
        name: "更新された単発",
      });

      const updateBuilder = createFlexibleBuilder({ data: updatedRecord });
      mockSupabaseClient.from.mockReturnValue(updateBuilder);

      const service = createEventService(mockSupabaseClient as unknown as SupabaseParam);
      const result = await service.updateEvent("guild-123", "existing-single", {
        title: "更新された単発",
      });

      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.data.title).toBe("更新された単発");

      expect(mockSupabaseClient.from).toHaveBeenCalledWith("events");
    });

    it("deleteEvent は繰り返しイベント追加の影響を受けない", async () => {
      const deleteBuilder = createFlexibleBuilder({ data: null });
      mockSupabaseClient.from.mockReturnValue(deleteBuilder);

      const service = createEventService(mockSupabaseClient as unknown as SupabaseParam);
      const result = await service.deleteEvent("guild-123", "single-to-delete");

      expect(result.success).toBe(true);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith("events");
    });
  });

  describe("複数シリーズの統合取得テスト", () => {
    it("複数シリーズのオカレンスが正しく統合される", async () => {
      const series1 = makeSeriesRecord({
        id: "s1",
        name: "Morning Standup",
        rrule: "FREQ=DAILY;COUNT=2",
        dtstart: "2026-02-01T09:00:00.000Z",
        duration_minutes: 15,
      });

      const series2 = makeSeriesRecord({
        id: "s2",
        name: "Weekly Review",
        rrule: "FREQ=WEEKLY;BYDAY=FR;COUNT=1",
        dtstart: "2026-02-06T15:00:00.000Z",
        duration_minutes: 60,
      });

      setupFetchWithSeriesMock({
        singleEvents: [],
        series: [series1, series2],
        exceptions: [],
      });

      const service = createEventService(mockSupabaseClient as unknown as SupabaseParam);
      const result = await service.fetchEventsWithSeries({
        guildId: "guild-123",
        startDate: new Date("2026-02-01T00:00:00Z"),
        endDate: new Date("2026-02-28T23:59:59Z"),
      });

      expect(result.success).toBe(true);
      if (!result.success) return;

      // s1: 2件, s2: 1件 = 3件
      expect(result.data.length).toBe(3);

      const s1Events = result.data.filter((e) => e.seriesId === "s1");
      const s2Events = result.data.filter((e) => e.seriesId === "s2");
      expect(s1Events.length).toBe(2);
      expect(s2Events.length).toBe(1);
    });
  });

  describe("オカレンスID形式のテスト", () => {
    it("通常のオカレンスIDはシリーズIDとオカレンス日時の組み合わせ", async () => {
      const series = makeSeriesRecord({
        id: "series-id-test",
        rrule: "FREQ=DAILY;COUNT=1",
        dtstart: "2026-03-01T12:00:00.000Z",
      });

      setupFetchWithSeriesMock({
        singleEvents: [],
        series: [series],
        exceptions: [],
      });

      const service = createEventService(mockSupabaseClient as unknown as SupabaseParam);
      const result = await service.fetchEventsWithSeries({
        guildId: "guild-123",
        startDate: new Date("2026-03-01T00:00:00Z"),
        endDate: new Date("2026-03-01T23:59:59Z"),
      });

      expect(result.success).toBe(true);
      if (!result.success) return;

      expect(result.data.length).toBe(1);
      // ID形式: "series-id:occurrence-date-iso"
      expect(result.data[0].id).toBe("series-id-test:2026-03-01T12:00:00.000Z");
    });
  });

  describe("fetchEventsWithSeries エラーハンドリング", () => {
    it("単発イベント取得時のDBエラーはエラー結果を返す", async () => {
      mockSupabaseClient.from.mockReturnValue(
        createFlexibleBuilder({
          data: null,
          error: { message: "Connection refused" },
        }),
      );

      const service = createEventService(mockSupabaseClient as unknown as SupabaseParam);
      const result = await service.fetchEventsWithSeries({
        guildId: "guild-123",
        startDate: new Date("2026-01-01T00:00:00Z"),
        endDate: new Date("2026-01-31T23:59:59Z"),
      });

      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.error.code).toBe("FETCH_FAILED");
    });
  });

  describe("fetchEventsWithSeries クエリ条件の検証 (DIS-53)", () => {
    it("単発イベントクエリが期間重複判定を使用する", async () => {
      const singleBuilder = createFlexibleBuilder({ data: [] });
      const seriesBuilder = createFlexibleBuilder({ data: [] });
      const exceptionBuilder = createFlexibleBuilder({ data: [] });

      let eventsCallCount = 0;
      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === "event_series") return seriesBuilder;
        eventsCallCount++;
        return eventsCallCount === 1 ? singleBuilder : exceptionBuilder;
      });

      const service = createEventService(mockSupabaseClient as unknown as SupabaseParam);
      const params: FetchEventsParams = {
        guildId: "guild-123",
        startDate: new Date("2026-03-01T00:00:00Z"),
        endDate: new Date("2026-03-31T23:59:59Z"),
      };

      await service.fetchEventsWithSeries(params);

      // 単発イベントクエリ: start_at <= endDate AND end_at >= startDate
      expect(singleBuilder.lte).toHaveBeenCalledWith("start_at", params.endDate.toISOString());
      expect(singleBuilder.gte).toHaveBeenCalledWith("end_at", params.startDate.toISOString());
      expect(singleBuilder.is).toHaveBeenCalledWith("series_id", null);
    });

    it("例外レコードクエリの .or() が期間重複判定を含む", async () => {
      const singleBuilder = createFlexibleBuilder({ data: [] });
      const seriesBuilder = createFlexibleBuilder({ data: [] });
      const exceptionBuilder = createFlexibleBuilder({ data: [] });

      let eventsCallCount = 0;
      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === "event_series") return seriesBuilder;
        eventsCallCount++;
        return eventsCallCount === 1 ? singleBuilder : exceptionBuilder;
      });

      const service = createEventService(mockSupabaseClient as unknown as SupabaseParam);
      const params: FetchEventsParams = {
        guildId: "guild-123",
        startDate: new Date("2026-03-01T00:00:00Z"),
        endDate: new Date("2026-03-31T23:59:59Z"),
      };

      await service.fetchEventsWithSeries(params);

      // 例外レコードクエリ: original_date範囲 OR (start_at <= endDate AND end_at >= startDate)
      const start = params.startDate.toISOString();
      const end = params.endDate.toISOString();
      expect(exceptionBuilder.or).toHaveBeenCalledWith(
        `and(original_date.gte.${start},original_date.lte.${end}),and(start_at.lte.${end},end_at.gte.${start})`,
      );
    });
  });
});
