import { describe, expect, it } from "vitest";
import type { EventRecord } from "../types/event.js";
import {
  createErrorEmbed,
  createEventEmbed,
  createHelpEmbed,
  createNotificationEmbed,
} from "./embeds.js";

const DATE_ONLY_RE = /^\d{4}\/\d{2}\/\d{2}$/;
const SAME_DAY_TIME_RE = /^\d{4}\/\d{2}\/\d{2} \d{2}:\d{2} - \d{2}:\d{2}$/;
const MULTI_DAY_TIME_RE =
  /^\d{4}\/\d{2}\/\d{2} \d{2}:\d{2} - \d{4}\/\d{2}\/\d{2} \d{2}:\d{2}$/;

function makeEvent(overrides: Partial<EventRecord> = {}): EventRecord {
  return {
    id: "test-id",
    guild_id: "guild-1",
    name: "Test Event",
    description: null,
    color: "#3B82F6",
    is_all_day: false,
    start_at: "2024-06-15T03:00:00Z",
    end_at: "2024-06-15T05:00:00Z",
    location: null,
    channel_id: null,
    channel_name: null,
    notifications: [],
    created_at: "2024-06-01T00:00:00Z",
    updated_at: "2024-06-01T00:00:00Z",
    ...overrides,
  };
}

describe("createHelpEmbed", () => {
  it("should create help embed with title and description", () => {
    const embed = createHelpEmbed(
      null,
      "https://example.com/invite",
      "https://discord.gg/test"
    );
    const json = embed.toJSON();

    expect(json.title).toBe("DisCalendar - Help");
    expect(json.description).toContain("DisCalendar");
    expect(json.description).toContain("https://example.com/invite");
    expect(json.color).toBe(0x00_00_dd);
  });

  it("should include thumbnail when avatar URL is provided", () => {
    const embed = createHelpEmbed("https://cdn.discord.com/avatar.png", "", "");
    const json = embed.toJSON();

    expect(json.thumbnail?.url).toBe("https://cdn.discord.com/avatar.png");
  });

  it("should not include thumbnail when avatar URL is null", () => {
    const embed = createHelpEmbed(null, "", "");
    const json = embed.toJSON();

    expect(json.thumbnail).toBeUndefined();
  });

  it("should hide support/invite sections when URLs are empty", () => {
    const embed = createHelpEmbed(null, "", "");
    const json = embed.toJSON();

    expect(json.description).not.toContain("サポートサーバー");
    expect(json.description).not.toContain("他のサーバーにも導入する場合");
  });

  it("should show support/invite sections when URLs are provided", () => {
    const embed = createHelpEmbed(
      null,
      "https://example.com/invite",
      "https://discord.gg/test"
    );
    const json = embed.toJSON();

    expect(json.description).toContain("サポートサーバー");
    expect(json.description).toContain("他のサーバーにも導入する場合");
  });
});

describe("createEventEmbed", () => {
  it("should create embed with event details", () => {
    const event = makeEvent({ name: "Meeting", description: "Team sync" });
    const embed = createEventEmbed(event);
    const json = embed.toJSON();

    expect(json.title).toBe("Meeting");
    expect(json.description).toBe("Team sync");
    expect(json.fields).toHaveLength(2);
    expect(json.fields?.[0]?.name).toBe("開始時間");
    expect(json.fields?.[1]?.name).toBe("終了時間");
  });

  it("should add notifications field when present", () => {
    const event = makeEvent({
      notifications: [
        { key: "n1", num: 5, unit: "minutes" },
        { key: "n2", num: 1, unit: "hours" },
      ],
    });
    const embed = createEventEmbed(event);
    const json = embed.toJSON();

    expect(json.fields).toHaveLength(3);
    expect(json.fields?.[2]?.name).toBe("通知");
    expect(json.fields?.[2]?.value).toBe("5分前, 1時間前");
  });

  it("should use date-only format for all-day events", () => {
    const event = makeEvent({
      is_all_day: true,
      start_at: "2024-06-15T00:00:00Z",
      end_at: "2024-06-15T00:00:00Z",
    });
    const embed = createEventEmbed(event);
    const json = embed.toJSON();

    const startField = json.fields?.[0]?.value ?? "";
    // Should be date only (no time component)
    expect(startField).toMatch(DATE_ONLY_RE);
  });
});

describe("createErrorEmbed", () => {
  it("should create error embed with title and description", () => {
    const embed = createErrorEmbed("Error Title", "Something went wrong");
    const json = embed.toJSON();

    expect(json.title).toContain("Error Title");
    expect(json.description).toBe("Something went wrong");
    expect(json.color).toBe(0xff_00_00);
  });
});

describe("createNotificationEmbed", () => {
  it("should create notification embed with label", () => {
    const event = makeEvent({ name: "Game Night" });
    const embed = createNotificationEmbed(event, "以下の予定が開催されます");
    const json = embed.toJSON();

    expect(json.title).toBe("Game Night");
    expect(json.author?.name).toBe("以下の予定が開催されます");
    expect(json.fields?.[0]?.name).toBe("日時");
  });

  it("should show time range for same-day events", () => {
    const event = makeEvent({
      start_at: "2024-06-15T03:00:00Z",
      end_at: "2024-06-15T05:00:00Z",
    });
    const embed = createNotificationEmbed(event, "label");
    const json = embed.toJSON();

    const dateField = json.fields?.[0]?.value ?? "";
    // Same day: "YYYY/MM/DD HH:MM - HH:MM"
    expect(dateField).toMatch(SAME_DAY_TIME_RE);
  });

  it("should show full dates for multi-day events", () => {
    const event = makeEvent({
      start_at: "2024-06-15T03:00:00Z",
      end_at: "2024-06-16T05:00:00Z",
    });
    const embed = createNotificationEmbed(event, "label");
    const json = embed.toJSON();

    const dateField = json.fields?.[0]?.value ?? "";
    // Different days: "YYYY/MM/DD HH:MM - YYYY/MM/DD HH:MM"
    expect(dateField).toMatch(MULTI_DAY_TIME_RE);
  });
});
