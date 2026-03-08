import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { EventRecord, NotificationPayload } from "../types/event.js";

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
  getEventSettingsByGuildIds: vi.fn(),
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
const { startNotifyTask } = await import("./notify.js");
const { getFutureEventsForAllGuilds, getEventSettingsByGuildIds } =
  await import("../services/event-service.js");

const mockGetFutureEvents = vi.mocked(getFutureEventsForAllGuilds);
const mockGetSettings = vi.mocked(getEventSettingsByGuildIds);

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

describe("notify task", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    mockSend.mockResolvedValue(undefined);
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
});
