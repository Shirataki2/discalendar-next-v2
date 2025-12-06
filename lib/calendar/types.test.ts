/**
 * イベント型定義とデータ変換ロジックのテスト
 *
 * タスク2.1: イベント型定義とデータ変換ロジックの作成
 * Requirements: 3.1, 9.1
 */
import { describe, expect, it } from "vitest";
import {
  type CalendarEvent,
  type EventRecord,
  toCalendarEvent,
  toCalendarEvents,
} from "./types";

describe("EventRecord type", () => {
  it("should represent a valid event record from Supabase", () => {
    const record: EventRecord = {
      id: "123e4567-e89b-12d3-a456-426614174000",
      guild_id: "guild-123",
      name: "テストイベント",
      description: "イベントの説明",
      color: "#FF5733",
      is_all_day: false,
      start_at: "2025-12-15T10:00:00Z",
      end_at: "2025-12-15T12:00:00Z",
      location: "東京都渋谷区",
      channel_id: "channel-456",
      channel_name: "general",
      created_at: "2025-12-01T00:00:00Z",
      updated_at: "2025-12-01T00:00:00Z",
    };

    expect(record.id).toBe("123e4567-e89b-12d3-a456-426614174000");
    expect(record.guild_id).toBe("guild-123");
    expect(record.name).toBe("テストイベント");
  });

  it("should allow null values for optional fields", () => {
    const record: EventRecord = {
      id: "123e4567-e89b-12d3-a456-426614174000",
      guild_id: "guild-123",
      name: "テストイベント",
      description: null,
      color: "#3788d8",
      is_all_day: true,
      start_at: "2025-12-15T00:00:00Z",
      end_at: "2025-12-16T00:00:00Z",
      location: null,
      channel_id: null,
      channel_name: null,
      created_at: "2025-12-01T00:00:00Z",
      updated_at: "2025-12-01T00:00:00Z",
    };

    expect(record.description).toBeNull();
    expect(record.location).toBeNull();
    expect(record.channel_id).toBeNull();
    expect(record.channel_name).toBeNull();
  });
});

describe("CalendarEvent type", () => {
  it("should represent a calendar event for display", () => {
    const event: CalendarEvent = {
      id: "123e4567-e89b-12d3-a456-426614174000",
      title: "テストイベント",
      start: new Date("2025-12-15T10:00:00Z"),
      end: new Date("2025-12-15T12:00:00Z"),
      allDay: false,
      color: "#FF5733",
      description: "イベントの説明",
      location: "東京都渋谷区",
      channel: {
        id: "channel-456",
        name: "general",
      },
    };

    expect(event.id).toBe("123e4567-e89b-12d3-a456-426614174000");
    expect(event.title).toBe("テストイベント");
    expect(event.start).toBeInstanceOf(Date);
    expect(event.end).toBeInstanceOf(Date);
    expect(event.allDay).toBe(false);
  });

  it("should allow optional fields to be undefined", () => {
    const event: CalendarEvent = {
      id: "123e4567-e89b-12d3-a456-426614174000",
      title: "シンプルなイベント",
      start: new Date("2025-12-15T10:00:00Z"),
      end: new Date("2025-12-15T12:00:00Z"),
      allDay: false,
      color: "#3788d8",
    };

    expect(event.description).toBeUndefined();
    expect(event.location).toBeUndefined();
    expect(event.channel).toBeUndefined();
  });
});

describe("toCalendarEvent", () => {
  it("should convert EventRecord to CalendarEvent with all fields", () => {
    const record: EventRecord = {
      id: "123e4567-e89b-12d3-a456-426614174000",
      guild_id: "guild-123",
      name: "ミーティング",
      description: "週次ミーティング",
      color: "#FF5733",
      is_all_day: false,
      start_at: "2025-12-15T10:00:00Z",
      end_at: "2025-12-15T12:00:00Z",
      location: "会議室A",
      channel_id: "channel-456",
      channel_name: "meetings",
      created_at: "2025-12-01T00:00:00Z",
      updated_at: "2025-12-01T00:00:00Z",
    };

    const event = toCalendarEvent(record);

    expect(event.id).toBe("123e4567-e89b-12d3-a456-426614174000");
    expect(event.title).toBe("ミーティング");
    expect(event.start).toEqual(new Date("2025-12-15T10:00:00Z"));
    expect(event.end).toEqual(new Date("2025-12-15T12:00:00Z"));
    expect(event.allDay).toBe(false);
    expect(event.color).toBe("#FF5733");
    expect(event.description).toBe("週次ミーティング");
    expect(event.location).toBe("会議室A");
    expect(event.channel).toEqual({ id: "channel-456", name: "meetings" });
  });

  it("should convert null fields to undefined (Req 3.1)", () => {
    const record: EventRecord = {
      id: "123e4567-e89b-12d3-a456-426614174000",
      guild_id: "guild-123",
      name: "シンプルイベント",
      description: null,
      color: "#3788d8",
      is_all_day: false,
      start_at: "2025-12-15T10:00:00Z",
      end_at: "2025-12-15T12:00:00Z",
      location: null,
      channel_id: null,
      channel_name: null,
      created_at: "2025-12-01T00:00:00Z",
      updated_at: "2025-12-01T00:00:00Z",
    };

    const event = toCalendarEvent(record);

    expect(event.description).toBeUndefined();
    expect(event.location).toBeUndefined();
    expect(event.channel).toBeUndefined();
  });

  it("should handle all-day events correctly (Req 9.1)", () => {
    const record: EventRecord = {
      id: "123e4567-e89b-12d3-a456-426614174000",
      guild_id: "guild-123",
      name: "終日イベント",
      description: null,
      color: "#4CAF50",
      is_all_day: true,
      start_at: "2025-12-15T00:00:00Z",
      end_at: "2025-12-16T00:00:00Z",
      location: null,
      channel_id: null,
      channel_name: null,
      created_at: "2025-12-01T00:00:00Z",
      updated_at: "2025-12-01T00:00:00Z",
    };

    const event = toCalendarEvent(record);

    expect(event.allDay).toBe(true);
    expect(event.start).toEqual(new Date("2025-12-15T00:00:00Z"));
    expect(event.end).toEqual(new Date("2025-12-16T00:00:00Z"));
  });

  it("should only include channel when both id and name are present", () => {
    // channel_id is present but channel_name is null
    const recordWithOnlyId: EventRecord = {
      id: "123e4567-e89b-12d3-a456-426614174000",
      guild_id: "guild-123",
      name: "テスト",
      description: null,
      color: "#3788d8",
      is_all_day: false,
      start_at: "2025-12-15T10:00:00Z",
      end_at: "2025-12-15T12:00:00Z",
      location: null,
      channel_id: "channel-456",
      channel_name: null,
      created_at: "2025-12-01T00:00:00Z",
      updated_at: "2025-12-01T00:00:00Z",
    };

    const eventWithOnlyId = toCalendarEvent(recordWithOnlyId);
    expect(eventWithOnlyId.channel).toBeUndefined();

    // channel_name is present but channel_id is null
    const recordWithOnlyName: EventRecord = {
      id: "123e4567-e89b-12d3-a456-426614174001",
      guild_id: "guild-123",
      name: "テスト2",
      description: null,
      color: "#3788d8",
      is_all_day: false,
      start_at: "2025-12-15T10:00:00Z",
      end_at: "2025-12-15T12:00:00Z",
      location: null,
      channel_id: null,
      channel_name: "general",
      created_at: "2025-12-01T00:00:00Z",
      updated_at: "2025-12-01T00:00:00Z",
    };

    const eventWithOnlyName = toCalendarEvent(recordWithOnlyName);
    expect(eventWithOnlyName.channel).toBeUndefined();
  });

  it("should map 'name' field to 'title' for react-big-calendar compatibility", () => {
    const record: EventRecord = {
      id: "123e4567-e89b-12d3-a456-426614174000",
      guild_id: "guild-123",
      name: "イベント名がタイトルになる",
      description: null,
      color: "#3788d8",
      is_all_day: false,
      start_at: "2025-12-15T10:00:00Z",
      end_at: "2025-12-15T12:00:00Z",
      location: null,
      channel_id: null,
      channel_name: null,
      created_at: "2025-12-01T00:00:00Z",
      updated_at: "2025-12-01T00:00:00Z",
    };

    const event = toCalendarEvent(record);

    expect(event.title).toBe("イベント名がタイトルになる");
  });
});

describe("toCalendarEvents", () => {
  it("should convert an array of EventRecords to CalendarEvents", () => {
    const records: EventRecord[] = [
      {
        id: "event-1",
        guild_id: "guild-123",
        name: "イベント1",
        description: "説明1",
        color: "#FF5733",
        is_all_day: false,
        start_at: "2025-12-15T10:00:00Z",
        end_at: "2025-12-15T12:00:00Z",
        location: "場所1",
        channel_id: null,
        channel_name: null,
        created_at: "2025-12-01T00:00:00Z",
        updated_at: "2025-12-01T00:00:00Z",
      },
      {
        id: "event-2",
        guild_id: "guild-123",
        name: "イベント2",
        description: null,
        color: "#4CAF50",
        is_all_day: true,
        start_at: "2025-12-16T00:00:00Z",
        end_at: "2025-12-17T00:00:00Z",
        location: null,
        channel_id: "channel-789",
        channel_name: "announcements",
        created_at: "2025-12-01T00:00:00Z",
        updated_at: "2025-12-01T00:00:00Z",
      },
    ];

    const events = toCalendarEvents(records);

    expect(events).toHaveLength(2);
    expect(events[0].title).toBe("イベント1");
    expect(events[0].allDay).toBe(false);
    expect(events[1].title).toBe("イベント2");
    expect(events[1].allDay).toBe(true);
    expect(events[1].channel).toEqual({ id: "channel-789", name: "announcements" });
  });

  it("should return an empty array for empty input", () => {
    const events = toCalendarEvents([]);

    expect(events).toEqual([]);
    expect(events).toHaveLength(0);
  });
});
