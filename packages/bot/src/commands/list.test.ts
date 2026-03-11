import { describe, expect, it } from "vitest";
import type { EventSeriesRecord } from "../types/event.js";
import { expandSeriesToEvents, getExpansionRange } from "./list.js";

function makeSeries(
  overrides: Partial<EventSeriesRecord> = {}
): EventSeriesRecord {
  return {
    id: "series-1",
    guild_id: "guild-1",
    name: "Weekly Meeting",
    description: null,
    color: "#3b82f6",
    is_all_day: false,
    rrule: "FREQ=WEEKLY;BYDAY=MO",
    dtstart: "2026-03-02T01:00:00.000Z",
    duration_minutes: 60,
    location: null,
    channel_id: null,
    channel_name: null,
    notifications: [],
    exdates: [],
    created_at: "2026-03-01T00:00:00.000Z",
    updated_at: "2026-03-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("expandSeriesToEvents", () => {
  it("シリーズのオカレンスを範囲内で展開する", () => {
    const series = makeSeries();
    const rangeStart = new Date("2026-03-09T00:00:00Z");
    const rangeEnd = new Date("2026-03-23T23:59:59Z");

    const events = expandSeriesToEvents([series], rangeStart, rangeEnd);

    expect(events.length).toBe(3);
    expect(events[0].start_at).toBe("2026-03-09T01:00:00.000Z");
    expect(events[1].start_at).toBe("2026-03-16T01:00:00.000Z");
    expect(events[2].start_at).toBe("2026-03-23T01:00:00.000Z");
  });

  it("end_at が duration_minutes から計算される", () => {
    const series = makeSeries({ duration_minutes: 90 });
    const rangeStart = new Date("2026-03-09T00:00:00Z");
    const rangeEnd = new Date("2026-03-10T00:00:00Z");

    const events = expandSeriesToEvents([series], rangeStart, rangeEnd);

    expect(events.length).toBe(1);
    // 01:00 + 90分 = 02:30
    expect(events[0].end_at).toBe("2026-03-09T02:30:00.000Z");
  });

  it("recurrence にサマリーテキストが設定される", () => {
    const series = makeSeries();
    const rangeStart = new Date("2026-03-09T00:00:00Z");
    const rangeEnd = new Date("2026-03-10T00:00:00Z");

    const events = expandSeriesToEvents([series], rangeStart, rangeEnd);

    expect(events[0].recurrence).toBe("毎週 月曜日");
  });

  it("exdates に含まれる日付は除外される", () => {
    const series = makeSeries({
      exdates: ["2026-03-09T01:00:00.000Z"],
    });
    const rangeStart = new Date("2026-03-09T00:00:00Z");
    const rangeEnd = new Date("2026-03-23T23:59:59Z");

    const events = expandSeriesToEvents([series], rangeStart, rangeEnd);

    expect(events.length).toBe(2);
    expect(events[0].start_at).toBe("2026-03-16T01:00:00.000Z");
    expect(events[1].start_at).toBe("2026-03-23T01:00:00.000Z");
  });

  it("ID が series:{id}:occ:{ISO日付} 形式になる", () => {
    const series = makeSeries({ id: "abc-123" });
    const rangeStart = new Date("2026-03-09T00:00:00Z");
    const rangeEnd = new Date("2026-03-10T00:00:00Z");

    const events = expandSeriesToEvents([series], rangeStart, rangeEnd);

    expect(events[0].id).toBe("series:abc-123:occ:2026-03-09T01:00:00.000Z");
  });

  it("範囲外のオカレンスは含まれない", () => {
    const series = makeSeries();
    const rangeStart = new Date("2026-03-10T00:00:00Z");
    const rangeEnd = new Date("2026-03-14T00:00:00Z");

    const events = expandSeriesToEvents([series], rangeStart, rangeEnd);

    expect(events.length).toBe(0);
  });

  it("シリーズのメタデータがイベントに引き継がれる", () => {
    const series = makeSeries({
      guild_id: "g-test",
      description: "テスト説明",
      color: "#ff0000",
      location: "会議室A",
      notifications: [{ key: "n1", num: 30, unit: "minutes" }],
    });
    const rangeStart = new Date("2026-03-09T00:00:00Z");
    const rangeEnd = new Date("2026-03-10T00:00:00Z");

    const events = expandSeriesToEvents([series], rangeStart, rangeEnd);

    expect(events[0].guild_id).toBe("g-test");
    expect(events[0].description).toBe("テスト説明");
    expect(events[0].color).toBe("#ff0000");
    expect(events[0].location).toBe("会議室A");
    expect(events[0].notifications).toEqual([
      { key: "n1", num: 30, unit: "minutes" },
    ]);
  });
});

describe("getExpansionRange", () => {
  const now = new Date("2026-03-10T12:00:00Z");
  const ninetyDaysMs = 90 * 24 * 60 * 60 * 1000;

  it("future: now から 90日後", () => {
    const { rangeStart, rangeEnd } = getExpansionRange("future", now);

    expect(rangeStart.getTime()).toBe(now.getTime());
    expect(rangeEnd.getTime()).toBe(now.getTime() + ninetyDaysMs);
  });

  it("past: 90日前 から now", () => {
    const { rangeStart, rangeEnd } = getExpansionRange("past", now);

    expect(rangeStart.getTime()).toBe(now.getTime() - ninetyDaysMs);
    expect(rangeEnd.getTime()).toBe(now.getTime());
  });

  it("all: 90日前 から 90日後", () => {
    const { rangeStart, rangeEnd } = getExpansionRange("all", now);

    expect(rangeStart.getTime()).toBe(now.getTime() - ninetyDaysMs);
    expect(rangeEnd.getTime()).toBe(now.getTime() + ninetyDaysMs);
  });
});
