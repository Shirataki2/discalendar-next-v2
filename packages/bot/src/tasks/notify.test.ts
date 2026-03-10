import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type {
  EventRecord,
  EventSeriesRecord,
  NotificationPayload,
} from "../types/event.js";

const mockSend = vi.fn();
const mockLogger = {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
};

vi.mock("../utils/logger.js", () => ({
  logger: mockLogger,
}));

vi.mock("../utils/embeds.js", () => ({
  createNotificationEmbed: vi.fn(() => ({ title: "test-embed" })),
}));

vi.mock("../services/event-service.js", () => ({
  getFutureEventsForAllGuilds: vi.fn(),
  getFutureSeriesForAllGuilds: vi.fn(),
  getEventSettingsByGuildIds: vi.fn(),
}));

vi.mock("@discalendar/rrule-utils", () => ({
  expandOccurrences: vi.fn(),
}));

vi.mock("../config.js", () => ({
  getConfig: () => ({
    supabaseUrl: "http://localhost",
    supabaseServiceKey: "test-key",
    botToken: "test",
    applicationId: "test",
    invitationUrl: "",
    logLevel: "silent",
    sentryDsn: undefined,
  }),
}));

// Import after mocks
const { startNotifyTask, toEventRecord } = await import("./notify.js");
const {
  getFutureEventsForAllGuilds,
  getFutureSeriesForAllGuilds,
  getEventSettingsByGuildIds,
} = await import("../services/event-service.js");
const { expandOccurrences } = await import("@discalendar/rrule-utils");

const mockGetFutureEvents = vi.mocked(getFutureEventsForAllGuilds);
const mockGetFutureSeries = vi.mocked(getFutureSeriesForAllGuilds);
const mockGetSettings = vi.mocked(getEventSettingsByGuildIds);
const mockExpandOccurrences = vi.mocked(expandOccurrences);

function createMockEvent(overrides: Partial<EventRecord> = {}): EventRecord {
  return {
    id: "event-1",
    guild_id: "guild-1",
    name: "Test Event",
    description: null,
    color: "#3B82F6",
    is_all_day: false,
    start_at: "2024-06-15T12:00:00Z",
    end_at: "2024-06-15T14:00:00Z",
    location: null,
    channel_id: null,
    channel_name: null,
    notifications: [],
    created_at: "2024-06-01T00:00:00Z",
    updated_at: "2024-06-01T00:00:00Z",
    ...overrides,
  };
}

function createMockClient(channelExists = true) {
  const mockChannel = channelExists
    ? {
        isSendable: () => true,
        send: mockSend,
      }
    : undefined;

  return {
    channels: {
      cache: {
        get: vi.fn(() => mockChannel),
      },
    },
  } as unknown;
}

function createMockSeries(
  overrides: Partial<EventSeriesRecord> = {}
): EventSeriesRecord {
  return {
    id: "series-1",
    guild_id: "guild-1",
    name: "Weekly Meeting",
    description: null,
    color: "#3B82F6",
    is_all_day: false,
    rrule: "FREQ=WEEKLY;BYDAY=MO",
    dtstart: "2024-06-10T10:00:00Z",
    duration_minutes: 60,
    location: null,
    channel_id: null,
    channel_name: null,
    notifications: [],
    exdates: [],
    created_at: "2024-06-01T00:00:00Z",
    updated_at: "2024-06-01T00:00:00Z",
    ...overrides,
  };
}

describe("notify task", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    mockSend.mockResolvedValue(undefined);
    mockGetFutureSeries.mockResolvedValue({ success: true, data: [] });
    mockExpandOccurrences.mockReturnValue({ dates: [], truncated: false });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("processNotifications", () => {
    it("sends notification when event starts at current time (sentinel)", async () => {
      // setInterval fires after 60s, so set time 60s before target
      const now = new Date("2024-06-15T11:59:00Z");
      vi.setSystemTime(now);

      const event = createMockEvent({
        start_at: "2024-06-15T12:00:00Z",
        notifications: [],
      });

      mockGetFutureEvents.mockResolvedValue({
        success: true,
        data: [event],
      });
      mockGetSettings.mockResolvedValue({
        success: true,
        data: new Map([
          ["guild-1", { id: 1, guild_id: "guild-1", channel_id: "ch-1" }],
        ]),
      });

      const client = createMockClient();
      const timer = startNotifyTask(client as never);
      await vi.advanceTimersByTimeAsync(60_000);
      clearInterval(timer);

      expect(mockSend).toHaveBeenCalled();
    });

    it("sends notification when offset matches (30 minutes before)", async () => {
      const now = new Date("2024-06-15T11:29:00Z");
      vi.setSystemTime(now);

      const notification: NotificationPayload = {
        key: "n1",
        num: 30,
        unit: "minutes",
      };
      const event = createMockEvent({
        start_at: "2024-06-15T12:00:00Z",
        notifications: [notification],
      });

      mockGetFutureEvents.mockResolvedValue({
        success: true,
        data: [event],
      });
      mockGetSettings.mockResolvedValue({
        success: true,
        data: new Map([
          ["guild-1", { id: 1, guild_id: "guild-1", channel_id: "ch-1" }],
        ]),
      });

      const client = createMockClient();
      const timer = startNotifyTask(client as never);
      await vi.advanceTimersByTimeAsync(60_000);
      clearInterval(timer);

      expect(mockSend).toHaveBeenCalled();
    });

    it("sends notification for hours unit (1 hour before)", async () => {
      const now = new Date("2024-06-15T10:59:00Z");
      vi.setSystemTime(now);

      const notification: NotificationPayload = {
        key: "n1",
        num: 1,
        unit: "hours",
      };
      const event = createMockEvent({
        start_at: "2024-06-15T12:00:00Z",
        notifications: [notification],
      });

      mockGetFutureEvents.mockResolvedValue({
        success: true,
        data: [event],
      });
      mockGetSettings.mockResolvedValue({
        success: true,
        data: new Map([
          ["guild-1", { id: 1, guild_id: "guild-1", channel_id: "ch-1" }],
        ]),
      });

      const client = createMockClient();
      const timer = startNotifyTask(client as never);
      await vi.advanceTimersByTimeAsync(60_000);
      clearInterval(timer);

      expect(mockSend).toHaveBeenCalled();
    });

    it("sends notification for days unit (1 day before)", async () => {
      const now = new Date("2024-06-14T11:59:00Z");
      vi.setSystemTime(now);

      const notification: NotificationPayload = {
        key: "n1",
        num: 1,
        unit: "days",
      };
      const event = createMockEvent({
        start_at: "2024-06-15T12:00:00Z",
        notifications: [notification],
      });

      mockGetFutureEvents.mockResolvedValue({
        success: true,
        data: [event],
      });
      mockGetSettings.mockResolvedValue({
        success: true,
        data: new Map([
          ["guild-1", { id: 1, guild_id: "guild-1", channel_id: "ch-1" }],
        ]),
      });

      const client = createMockClient();
      const timer = startNotifyTask(client as never);
      await vi.advanceTimersByTimeAsync(60_000);
      clearInterval(timer);

      expect(mockSend).toHaveBeenCalled();
    });

    it("sends notification for weeks unit (1 week before)", async () => {
      const now = new Date("2024-06-08T11:59:00Z");
      vi.setSystemTime(now);

      const notification: NotificationPayload = {
        key: "n1",
        num: 1,
        unit: "weeks",
      };
      const event = createMockEvent({
        start_at: "2024-06-15T12:00:00Z",
        notifications: [notification],
      });

      mockGetFutureEvents.mockResolvedValue({
        success: true,
        data: [event],
      });
      mockGetSettings.mockResolvedValue({
        success: true,
        data: new Map([
          ["guild-1", { id: 1, guild_id: "guild-1", channel_id: "ch-1" }],
        ]),
      });

      const client = createMockClient();
      const timer = startNotifyTask(client as never);
      await vi.advanceTimersByTimeAsync(60_000);
      clearInterval(timer);

      expect(mockSend).toHaveBeenCalled();
    });

    it("does not send notification when time does not match", async () => {
      const now = new Date("2024-06-15T10:00:00Z");
      vi.setSystemTime(now);

      const notification: NotificationPayload = {
        key: "n1",
        num: 30,
        unit: "minutes",
      };
      const event = createMockEvent({
        start_at: "2024-06-15T12:00:00Z",
        notifications: [notification],
      });

      mockGetFutureEvents.mockResolvedValue({
        success: true,
        data: [event],
      });
      mockGetSettings.mockResolvedValue({
        success: true,
        data: new Map([
          ["guild-1", { id: 1, guild_id: "guild-1", channel_id: "ch-1" }],
        ]),
      });

      const client = createMockClient();
      const timer = startNotifyTask(client as never);
      await vi.advanceTimersByTimeAsync(60_000);
      clearInterval(timer);

      expect(mockSend).not.toHaveBeenCalled();
    });

    it("logs warning when no event settings found for guild", async () => {
      const now = new Date("2024-06-15T12:00:00Z");
      vi.setSystemTime(now);

      const event = createMockEvent();

      mockGetFutureEvents.mockResolvedValue({
        success: true,
        data: [event],
      });
      mockGetSettings.mockResolvedValue({
        success: true,
        data: new Map(),
      });

      const client = createMockClient();
      const timer = startNotifyTask(client as never);
      await vi.advanceTimersByTimeAsync(60_000);
      clearInterval(timer);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        { guildId: "guild-1" },
        "No event settings found for guild, skipping notifications"
      );
    });

    it("logs warning when channel is not sendable", async () => {
      const now = new Date("2024-06-15T12:00:00Z");
      vi.setSystemTime(now);

      const event = createMockEvent();

      mockGetFutureEvents.mockResolvedValue({
        success: true,
        data: [event],
      });
      mockGetSettings.mockResolvedValue({
        success: true,
        data: new Map([
          ["guild-1", { id: 1, guild_id: "guild-1", channel_id: "ch-1" }],
        ]),
      });

      const client = createMockClient(false);
      const timer = startNotifyTask(client as never);
      await vi.advanceTimersByTimeAsync(60_000);
      clearInterval(timer);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        { guildId: "guild-1", channelId: "ch-1" },
        "Notification channel not found or not sendable"
      );
    });

    it("handles all-day events with JST offset", async () => {
      // All-day event on June 15 JST = June 14 15:00 UTC (midnight JST = UTC-9h)
      // setInterval fires after 60s, so set time 60s before target
      const now = new Date("2024-06-14T14:59:00Z");
      vi.setSystemTime(now);

      const event = createMockEvent({
        is_all_day: true,
        start_at: "2024-06-15T00:00:00Z",
        notifications: [],
      });

      mockGetFutureEvents.mockResolvedValue({
        success: true,
        data: [event],
      });
      mockGetSettings.mockResolvedValue({
        success: true,
        data: new Map([
          ["guild-1", { id: 1, guild_id: "guild-1", channel_id: "ch-1" }],
        ]),
      });

      const client = createMockClient();
      const timer = startNotifyTask(client as never);
      await vi.advanceTimersByTimeAsync(60_000);
      clearInterval(timer);

      // Sentinel notification should fire at JST midnight (UTC 15:00 previous day)
      expect(mockSend).toHaveBeenCalled();
    });

    it("sends notification for series occurrence at matching time (sentinel)", async () => {
      const now = new Date("2024-06-17T09:59:00Z");
      vi.setSystemTime(now);

      const series = createMockSeries({
        dtstart: "2024-06-10T10:00:00Z",
        rrule: "FREQ=WEEKLY;BYDAY=MO",
        duration_minutes: 60,
        notifications: [],
      });

      mockGetFutureEvents.mockResolvedValue({ success: true, data: [] });
      mockGetFutureSeries.mockResolvedValue({
        success: true,
        data: [series],
      });
      mockGetSettings.mockResolvedValue({
        success: true,
        data: new Map([
          ["guild-1", { id: 1, guild_id: "guild-1", channel_id: "ch-1" }],
        ]),
      });
      mockExpandOccurrences.mockReturnValue({
        dates: [new Date("2024-06-17T10:00:00Z")],
        truncated: false,
      });

      const client = createMockClient();
      const timer = startNotifyTask(client as never);
      await vi.advanceTimersByTimeAsync(60_000);
      clearInterval(timer);

      expect(mockSend).toHaveBeenCalled();
    });

    it("sends notification for series occurrence with offset (30 minutes before)", async () => {
      const now = new Date("2024-06-17T09:29:00Z");
      vi.setSystemTime(now);

      const notification: NotificationPayload = {
        key: "n1",
        num: 30,
        unit: "minutes",
      };
      const series = createMockSeries({
        notifications: [notification],
      });

      mockGetFutureEvents.mockResolvedValue({ success: true, data: [] });
      mockGetFutureSeries.mockResolvedValue({
        success: true,
        data: [series],
      });
      mockGetSettings.mockResolvedValue({
        success: true,
        data: new Map([
          ["guild-1", { id: 1, guild_id: "guild-1", channel_id: "ch-1" }],
        ]),
      });
      mockExpandOccurrences.mockReturnValue({
        dates: [new Date("2024-06-17T10:00:00Z")],
        truncated: false,
      });

      const client = createMockClient();
      const timer = startNotifyTask(client as never);
      await vi.advanceTimersByTimeAsync(60_000);
      clearInterval(timer);

      expect(mockSend).toHaveBeenCalled();
    });

    it("does not notify for EXDATE-excluded occurrence", async () => {
      const now = new Date("2024-06-17T09:59:00Z");
      vi.setSystemTime(now);

      const series = createMockSeries({
        exdates: ["2024-06-17T10:00:00Z"],
      });

      mockGetFutureEvents.mockResolvedValue({ success: true, data: [] });
      mockGetFutureSeries.mockResolvedValue({
        success: true,
        data: [series],
      });
      mockGetSettings.mockResolvedValue({
        success: true,
        data: new Map([
          ["guild-1", { id: 1, guild_id: "guild-1", channel_id: "ch-1" }],
        ]),
      });
      // expandOccurrences returns empty when exdate excludes the occurrence
      mockExpandOccurrences.mockReturnValue({
        dates: [],
        truncated: false,
      });

      const client = createMockClient();
      const timer = startNotifyTask(client as never);
      await vi.advanceTimersByTimeAsync(60_000);
      clearInterval(timer);

      expect(mockSend).not.toHaveBeenCalled();
    });

    it("continues event notifications when series fetch fails", async () => {
      const now = new Date("2024-06-15T11:59:00Z");
      vi.setSystemTime(now);

      const event = createMockEvent({
        start_at: "2024-06-15T12:00:00Z",
        notifications: [],
      });

      mockGetFutureEvents.mockResolvedValue({
        success: true,
        data: [event],
      });
      mockGetFutureSeries.mockResolvedValue({
        success: false,
        error: { code: "FETCH_ERROR", message: "Series DB error" },
      });
      mockGetSettings.mockResolvedValue({
        success: true,
        data: new Map([
          ["guild-1", { id: 1, guild_id: "guild-1", channel_id: "ch-1" }],
        ]),
      });

      const client = createMockClient();
      const timer = startNotifyTask(client as never);
      await vi.advanceTimersByTimeAsync(60_000);
      clearInterval(timer);

      // Event notification still sent
      expect(mockSend).toHaveBeenCalled();
      // Series error logged
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.anything() }),
        "Failed to fetch event series for notifications"
      );
    });

    it("handles all-day series occurrence with JST offset", async () => {
      // All-day on June 17 JST: JST midnight = UTC June 16 15:00
      const now = new Date("2024-06-16T14:59:00Z");
      vi.setSystemTime(now);

      const series = createMockSeries({
        is_all_day: true,
        dtstart: "2024-06-10T00:00:00Z",
        duration_minutes: 1440,
        notifications: [],
      });

      mockGetFutureEvents.mockResolvedValue({ success: true, data: [] });
      mockGetFutureSeries.mockResolvedValue({
        success: true,
        data: [series],
      });
      mockGetSettings.mockResolvedValue({
        success: true,
        data: new Map([
          ["guild-1", { id: 1, guild_id: "guild-1", channel_id: "ch-1" }],
        ]),
      });
      mockExpandOccurrences.mockReturnValue({
        dates: [new Date("2024-06-17T00:00:00Z")],
        truncated: false,
      });

      const client = createMockClient();
      const timer = startNotifyTask(client as never);
      await vi.advanceTimersByTimeAsync(60_000);
      clearInterval(timer);

      expect(mockSend).toHaveBeenCalled();
    });

    it("includes series guild IDs when fetching event settings", async () => {
      const now = new Date("2024-06-17T09:59:00Z");
      vi.setSystemTime(now);

      const series = createMockSeries({ guild_id: "guild-2" });

      mockGetFutureEvents.mockResolvedValue({ success: true, data: [] });
      mockGetFutureSeries.mockResolvedValue({
        success: true,
        data: [series],
      });
      mockGetSettings.mockResolvedValue({
        success: true,
        data: new Map(),
      });
      mockExpandOccurrences.mockReturnValue({
        dates: [new Date("2024-06-17T10:00:00Z")],
        truncated: false,
      });

      const client = createMockClient();
      const timer = startNotifyTask(client as never);
      await vi.advanceTimersByTimeAsync(60_000);
      clearInterval(timer);

      expect(mockGetSettings).toHaveBeenCalledWith(["guild-2"]);
    });

    it("handles fetch events failure gracefully", async () => {
      const now = new Date("2024-06-15T12:00:00Z");
      vi.setSystemTime(now);

      mockGetFutureEvents.mockResolvedValue({
        success: false,
        error: { code: "FETCH_ERROR", message: "DB error" },
      });

      const client = createMockClient();
      const timer = startNotifyTask(client as never);
      await vi.advanceTimersByTimeAsync(60_000);
      clearInterval(timer);

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.anything() }),
        "Failed to fetch events for notifications"
      );
      expect(mockSend).not.toHaveBeenCalled();
    });
  });

  describe("toEventRecord", () => {
    it("converts series and occurrence date to EventRecord", () => {
      const series = createMockSeries({
        id: "s1",
        guild_id: "guild-1",
        name: "Weekly Standup",
        description: "Team sync",
        color: "#22C55E",
        duration_minutes: 30,
        location: "Room A",
        channel_id: "ch-1",
        channel_name: "events",
        notifications: [{ key: "n1", num: 10, unit: "minutes" }],
      });
      const occDate = new Date("2024-06-17T10:00:00Z");

      const result = toEventRecord(series, occDate);

      expect(result.id).toBe("series:s1:occ:2024-06-17T10:00:00.000Z");
      expect(result.guild_id).toBe("guild-1");
      expect(result.name).toBe("Weekly Standup");
      expect(result.description).toBe("Team sync");
      expect(result.color).toBe("#22C55E");
      expect(result.is_all_day).toBe(false);
      expect(result.start_at).toBe("2024-06-17T10:00:00.000Z");
      expect(result.end_at).toBe("2024-06-17T10:30:00.000Z");
      expect(result.location).toBe("Room A");
      expect(result.channel_id).toBe("ch-1");
      expect(result.channel_name).toBe("events");
      expect(result.notifications).toEqual([
        { key: "n1", num: 10, unit: "minutes" },
      ]);
    });

    it("handles all-day series with correct end_at calculation", () => {
      const series = createMockSeries({
        is_all_day: true,
        duration_minutes: 1440,
      });
      const occDate = new Date("2024-06-17T00:00:00Z");

      const result = toEventRecord(series, occDate);

      expect(result.is_all_day).toBe(true);
      expect(result.start_at).toBe("2024-06-17T00:00:00.000Z");
      expect(result.end_at).toBe("2024-06-18T00:00:00.000Z");
    });
  });
});
