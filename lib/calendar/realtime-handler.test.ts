import { describe, expect, it } from "vitest";
import type { CalendarEvent, EventRecord } from "./types";
import {
  handleRealtimeDelete,
  handleRealtimeInsert,
  handleRealtimeUpdate,
} from "./realtime-handler";

/**
 * テスト用EventRecordファクトリ
 */
function createEventRecord(overrides: Partial<EventRecord> = {}): EventRecord {
  return {
    id: "event-1",
    guild_id: "guild-123",
    name: "テストイベント",
    description: null,
    color: "#3788d8",
    is_all_day: false,
    start_at: "2026-03-28T10:00:00Z",
    end_at: "2026-03-28T12:00:00Z",
    location: null,
    channel_id: null,
    channel_name: null,
    notifications: [],
    series_id: null,
    original_date: null,
    created_at: "2026-03-28T00:00:00Z",
    updated_at: "2026-03-28T00:00:00Z",
    ...overrides,
  };
}

/**
 * テスト用CalendarEventファクトリ
 */
function createCalendarEvent(
  overrides: Partial<CalendarEvent> = {},
): CalendarEvent {
  return {
    id: "event-1",
    title: "既存イベント",
    start: new Date("2026-03-28T10:00:00Z"),
    end: new Date("2026-03-28T12:00:00Z"),
    allDay: false,
    color: "#3788d8",
    ...overrides,
  };
}

describe("handleRealtimeInsert", () => {
  it("新規EventRecordをCalendarEvent配列に追加する", () => {
    const currentEvents: CalendarEvent[] = [
      createCalendarEvent({ id: "existing-1", title: "既存イベント1" }),
    ];
    const newRecord = createEventRecord({
      id: "new-1",
      name: "新規イベント",
      color: "#FF5733",
    });

    const result = handleRealtimeInsert(currentEvents, newRecord);

    expect(result).toHaveLength(2);
    expect(result[1].id).toBe("new-1");
    expect(result[1].title).toBe("新規イベント");
    expect(result[1].color).toBe("#FF5733");
  });

  it("変換されたCalendarEventがDateオブジェクトを持つ", () => {
    const currentEvents: CalendarEvent[] = [];
    const newRecord = createEventRecord({
      start_at: "2026-04-01T09:00:00Z",
      end_at: "2026-04-01T11:00:00Z",
    });

    const result = handleRealtimeInsert(currentEvents, newRecord);

    expect(result[0].start).toBeInstanceOf(Date);
    expect(result[0].end).toBeInstanceOf(Date);
    expect(result[0].start).toEqual(new Date("2026-04-01T09:00:00Z"));
    expect(result[0].end).toEqual(new Date("2026-04-01T11:00:00Z"));
  });

  it("重複IDの場合はUPDATEとして処理する（楽観的更新との整合性）", () => {
    const currentEvents: CalendarEvent[] = [
      createCalendarEvent({
        id: "event-1",
        title: "楽観的更新済み",
        color: "#000000",
      }),
    ];
    const duplicateRecord = createEventRecord({
      id: "event-1",
      name: "サーバー確定データ",
      color: "#FF5733",
    });

    const result = handleRealtimeInsert(currentEvents, duplicateRecord);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("event-1");
    expect(result[0].title).toBe("サーバー確定データ");
    expect(result[0].color).toBe("#FF5733");
  });

  it("新しい配列参照を返す（immutable update）", () => {
    const currentEvents: CalendarEvent[] = [
      createCalendarEvent({ id: "existing-1" }),
    ];
    const newRecord = createEventRecord({ id: "new-1" });

    const result = handleRealtimeInsert(currentEvents, newRecord);

    expect(result).not.toBe(currentEvents);
  });

  it("空の配列に対してINSERTが正しく動作する", () => {
    const currentEvents: CalendarEvent[] = [];
    const newRecord = createEventRecord({ id: "first-event" });

    const result = handleRealtimeInsert(currentEvents, newRecord);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("first-event");
  });

  it("チャンネル情報付きレコードが正しく変換される", () => {
    const currentEvents: CalendarEvent[] = [];
    const newRecord = createEventRecord({
      id: "with-channel",
      channel_id: "ch-1",
      channel_name: "general",
    });

    const result = handleRealtimeInsert(currentEvents, newRecord);

    expect(result[0].channel).toEqual({ id: "ch-1", name: "general" });
  });

  it("終日イベントが正しく変換される", () => {
    const currentEvents: CalendarEvent[] = [];
    const newRecord = createEventRecord({
      id: "allday-1",
      is_all_day: true,
      start_at: "2026-04-01T00:00:00Z",
      end_at: "2026-04-02T00:00:00Z",
    });

    const result = handleRealtimeInsert(currentEvents, newRecord);

    expect(result[0].allDay).toBe(true);
  });
});

describe("handleRealtimeUpdate", () => {
  it("既存IDのイベントを新データで置換する", () => {
    const currentEvents: CalendarEvent[] = [
      createCalendarEvent({ id: "event-1", title: "更新前タイトル" }),
      createCalendarEvent({ id: "event-2", title: "他のイベント" }),
    ];
    const updatedRecord = createEventRecord({
      id: "event-1",
      name: "更新後タイトル",
      color: "#FF0000",
    });

    const result = handleRealtimeUpdate(currentEvents, updatedRecord);

    expect(result).toHaveLength(2);
    expect(result[0].id).toBe("event-1");
    expect(result[0].title).toBe("更新後タイトル");
    expect(result[0].color).toBe("#FF0000");
    expect(result[1].id).toBe("event-2");
    expect(result[1].title).toBe("他のイベント");
  });

  it("該当IDが存在しない場合は配列を変更しない", () => {
    const currentEvents: CalendarEvent[] = [
      createCalendarEvent({ id: "event-1", title: "既存" }),
    ];
    const updatedRecord = createEventRecord({
      id: "nonexistent",
      name: "存在しないID",
    });

    const result = handleRealtimeUpdate(currentEvents, updatedRecord);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("event-1");
    expect(result[0].title).toBe("既存");
  });

  it("新しい配列参照を返す（immutable update）", () => {
    const currentEvents: CalendarEvent[] = [
      createCalendarEvent({ id: "event-1" }),
    ];
    const updatedRecord = createEventRecord({ id: "event-1", name: "更新" });

    const result = handleRealtimeUpdate(currentEvents, updatedRecord);

    expect(result).not.toBe(currentEvents);
  });

  it("日時の変更が正しく反映される", () => {
    const currentEvents: CalendarEvent[] = [
      createCalendarEvent({
        id: "event-1",
        start: new Date("2026-03-28T10:00:00Z"),
        end: new Date("2026-03-28T12:00:00Z"),
      }),
    ];
    const updatedRecord = createEventRecord({
      id: "event-1",
      start_at: "2026-03-29T14:00:00Z",
      end_at: "2026-03-29T16:00:00Z",
    });

    const result = handleRealtimeUpdate(currentEvents, updatedRecord);

    expect(result[0].start).toEqual(new Date("2026-03-29T14:00:00Z"));
    expect(result[0].end).toEqual(new Date("2026-03-29T16:00:00Z"));
  });
});

describe("handleRealtimeDelete", () => {
  it("指定IDのイベントを配列から除外する", () => {
    const currentEvents: CalendarEvent[] = [
      createCalendarEvent({ id: "event-1", title: "削除対象" }),
      createCalendarEvent({ id: "event-2", title: "残るイベント" }),
    ];

    const result = handleRealtimeDelete(currentEvents, { id: "event-1" });

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("event-2");
    expect(result[0].title).toBe("残るイベント");
  });

  it("該当IDが存在しない場合は配列を変更しない", () => {
    const currentEvents: CalendarEvent[] = [
      createCalendarEvent({ id: "event-1" }),
      createCalendarEvent({ id: "event-2" }),
    ];

    const result = handleRealtimeDelete(currentEvents, { id: "nonexistent" });

    expect(result).toHaveLength(2);
  });

  it("新しい配列参照を返す（immutable update）", () => {
    const currentEvents: CalendarEvent[] = [
      createCalendarEvent({ id: "event-1" }),
    ];

    const result = handleRealtimeDelete(currentEvents, { id: "event-1" });

    expect(result).not.toBe(currentEvents);
  });

  it("最後のイベントを削除すると空配列になる", () => {
    const currentEvents: CalendarEvent[] = [
      createCalendarEvent({ id: "event-1" }),
    ];

    const result = handleRealtimeDelete(currentEvents, { id: "event-1" });

    expect(result).toHaveLength(0);
    expect(result).toEqual([]);
  });

  it("同一IDのイベントが複数存在する場合すべて削除する", () => {
    // 通常は起きないが、防御的に全削除する
    const currentEvents: CalendarEvent[] = [
      createCalendarEvent({ id: "dup-1", title: "重複1" }),
      createCalendarEvent({ id: "dup-1", title: "重複2" }),
      createCalendarEvent({ id: "other", title: "他" }),
    ];

    const result = handleRealtimeDelete(currentEvents, { id: "dup-1" });

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("other");
  });
});
