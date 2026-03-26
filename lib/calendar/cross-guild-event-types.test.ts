import { describe, expect, it } from "vitest";
import type { EventRecord, EventSeriesRecord } from "./types";
import {
  type GuildInfo,
  type UpcomingEvent,
  UPCOMING_EVENTS_LIMIT,
  toUpcomingEventFromRecord,
  toUpcomingEventFromOccurrence,
} from "./cross-guild-event-types";

/** テスト用ギルド情報 */
const testGuild: GuildInfo = {
  guildId: "guild-123",
  name: "テストサーバー",
  avatarUrl: "https://cdn.discordapp.com/icons/guild-123/abc.png",
};

/** テスト用の単発イベントレコード */
function createEventRecord(overrides: Partial<EventRecord> = {}): EventRecord {
  return {
    id: "event-1",
    guild_id: "guild-123",
    name: "テストイベント",
    description: "説明文",
    color: "#3b82f6",
    is_all_day: false,
    start_at: "2026-04-01T10:00:00Z",
    end_at: "2026-04-01T11:00:00Z",
    location: null,
    channel_id: null,
    channel_name: null,
    notifications: [],
    series_id: null,
    original_date: null,
    created_at: "2026-03-20T00:00:00Z",
    updated_at: "2026-03-20T00:00:00Z",
    ...overrides,
  };
}

/** テスト用のイベントシリーズレコード */
function createSeriesRecord(
  overrides: Partial<EventSeriesRecord> = {},
): EventSeriesRecord {
  return {
    id: "series-1",
    guild_id: "guild-123",
    name: "定例ミーティング",
    description: null,
    color: "#22c55e",
    is_all_day: false,
    rrule: "FREQ=WEEKLY;BYDAY=MO",
    dtstart: "2026-03-01T10:00:00Z",
    duration_minutes: 60,
    location: null,
    channel_id: null,
    channel_name: null,
    notifications: [],
    exdates: [],
    created_at: "2026-03-01T00:00:00Z",
    updated_at: "2026-03-01T00:00:00Z",
    ...overrides,
  };
}

describe("UPCOMING_EVENTS_LIMIT", () => {
  it("デフォルトの表示件数上限が20である", () => {
    expect(UPCOMING_EVENTS_LIMIT).toBe(20);
  });
});

describe("toUpcomingEventFromRecord", () => {
  it("EventRecord をギルド情報付き UpcomingEvent に変換する", () => {
    const record = createEventRecord();
    const result = toUpcomingEventFromRecord(record, testGuild);

    expect(result).toEqual({
      id: "event-1",
      title: "テストイベント",
      start: "2026-04-01T10:00:00Z",
      end: "2026-04-01T11:00:00Z",
      allDay: false,
      color: "#3b82f6",
      isRecurring: false,
      guildId: "guild-123",
      guildName: "テストサーバー",
      guildAvatarUrl:
        "https://cdn.discordapp.com/icons/guild-123/abc.png",
    } satisfies UpcomingEvent);
  });

  it("終日イベントを正しく変換する", () => {
    const record = createEventRecord({
      is_all_day: true,
      start_at: "2026-04-01T00:00:00Z",
      end_at: "2026-04-02T00:00:00Z",
    });
    const result = toUpcomingEventFromRecord(record, testGuild);

    expect(result.allDay).toBe(true);
  });

  it("ギルドアイコンが null の場合も変換できる", () => {
    const guild: GuildInfo = { ...testGuild, avatarUrl: null };
    const record = createEventRecord();
    const result = toUpcomingEventFromRecord(record, guild);

    expect(result.guildAvatarUrl).toBeNull();
  });

  it("isRecurring は常に false を返す", () => {
    const record = createEventRecord();
    const result = toUpcomingEventFromRecord(record, testGuild);

    expect(result.isRecurring).toBe(false);
  });
});

describe("toUpcomingEventFromOccurrence", () => {
  it("シリーズのオカレンスをギルド情報付き UpcomingEvent に変換する", () => {
    const series = createSeriesRecord();
    const occurrenceDate = new Date("2026-04-06T10:00:00Z");
    const result = toUpcomingEventFromOccurrence(
      series,
      occurrenceDate,
      testGuild,
    );

    expect(result).toEqual({
      id: "series-1:2026-04-06",
      title: "定例ミーティング",
      start: "2026-04-06T10:00:00.000Z",
      end: "2026-04-06T11:00:00.000Z",
      allDay: false,
      color: "#22c55e",
      isRecurring: true,
      guildId: "guild-123",
      guildName: "テストサーバー",
      guildAvatarUrl:
        "https://cdn.discordapp.com/icons/guild-123/abc.png",
    } satisfies UpcomingEvent);
  });

  it("終日シリーズのオカレンスを正しく変換する", () => {
    const series = createSeriesRecord({
      is_all_day: true,
      duration_minutes: 1440,
    });
    const occurrenceDate = new Date("2026-04-06T00:00:00Z");
    const result = toUpcomingEventFromOccurrence(
      series,
      occurrenceDate,
      testGuild,
    );

    expect(result.allDay).toBe(true);
    expect(result.isRecurring).toBe(true);
  });

  it("オカレンスIDが '{seriesId}:{YYYY-MM-DD}' 形式で生成される", () => {
    const series = createSeriesRecord({ id: "my-series-id" });
    const occurrenceDate = new Date("2026-04-13T10:00:00Z");
    const result = toUpcomingEventFromOccurrence(
      series,
      occurrenceDate,
      testGuild,
    );

    expect(result.id).toBe("my-series-id:2026-04-13");
  });

  it("duration_minutes に基づいて end が正しく計算される", () => {
    const series = createSeriesRecord({ duration_minutes: 120 });
    const occurrenceDate = new Date("2026-04-06T14:00:00Z");
    const result = toUpcomingEventFromOccurrence(
      series,
      occurrenceDate,
      testGuild,
    );

    expect(result.start).toBe("2026-04-06T14:00:00.000Z");
    expect(result.end).toBe("2026-04-06T16:00:00.000Z");
  });
});
