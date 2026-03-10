import { describe, expect, it } from "vitest";
import type { EventSeriesRecord } from "./event.js";

describe("EventSeriesRecord type", () => {
  it("can construct a valid EventSeriesRecord", () => {
    const record: EventSeriesRecord = {
      id: "series-1",
      guild_id: "guild-1",
      name: "Weekly Meeting",
      description: "Team sync",
      color: "#3B82F6",
      is_all_day: false,
      rrule: "FREQ=WEEKLY;BYDAY=MO",
      dtstart: "2024-06-10T10:00:00Z",
      duration_minutes: 60,
      location: "Online",
      channel_id: "ch-1",
      channel_name: "general",
      notifications: [{ key: "n1", num: 30, unit: "minutes" }],
      exdates: ["2024-06-17T10:00:00Z"],
      created_at: "2024-06-01T00:00:00Z",
      updated_at: "2024-06-01T00:00:00Z",
    };

    expect(record.id).toBe("series-1");
    expect(record.rrule).toBe("FREQ=WEEKLY;BYDAY=MO");
    expect(record.dtstart).toBe("2024-06-10T10:00:00Z");
    expect(record.duration_minutes).toBe(60);
    expect(record.exdates).toEqual(["2024-06-17T10:00:00Z"]);
    expect(record.notifications).toHaveLength(1);
  });

  it("allows nullable fields to be null", () => {
    const record: EventSeriesRecord = {
      id: "series-2",
      guild_id: "guild-1",
      name: "All Day Event",
      description: null,
      color: "#22C55E",
      is_all_day: true,
      rrule: "FREQ=DAILY",
      dtstart: "2024-06-10T00:00:00Z",
      duration_minutes: 1440,
      location: null,
      channel_id: null,
      channel_name: null,
      notifications: [],
      exdates: [],
      created_at: "2024-06-01T00:00:00Z",
      updated_at: "2024-06-01T00:00:00Z",
    };

    expect(record.description).toBeNull();
    expect(record.location).toBeNull();
    expect(record.channel_id).toBeNull();
    expect(record.channel_name).toBeNull();
  });
});
