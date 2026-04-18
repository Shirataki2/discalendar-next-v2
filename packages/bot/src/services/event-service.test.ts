import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { EventRecord } from "../types/event.js";

const mockSelect = vi.fn();
const mockSingle = vi.fn();
const mockEq = vi.fn();
const mockGte = vi.fn();
const mockLt = vi.fn();
const mockOrder = vi.fn();
const mockInsert = vi.fn();
const mockUpsert = vi.fn();
const mockUpdate = vi.fn();
const mockDelete = vi.fn();
const mockIn = vi.fn();
const mockLimit = vi.fn();

function resetChain() {
  mockSelect.mockReturnValue({
    single: mockSingle,
    eq: mockEq,
    order: mockOrder,
    in: mockIn,
  });
  mockSingle.mockResolvedValue({ data: null, error: null });
  mockEq.mockReturnValue({
    select: mockSelect,
    single: mockSingle,
    order: mockOrder,
    eq: mockEq,
  });
  mockGte.mockReturnValue({ order: mockOrder });
  mockLt.mockReturnValue({ order: mockOrder });
  mockOrder.mockReturnValue({ limit: mockLimit, data: [], error: null });
  mockLimit.mockResolvedValue({ data: [], error: null });
  mockInsert.mockReturnValue({ select: mockSelect });
  mockUpsert.mockReturnValue({ select: mockSelect });
  mockUpdate.mockReturnValue({ eq: mockEq });
  mockDelete.mockReturnValue({ eq: mockEq });
  mockIn.mockResolvedValue({ data: [], error: null });
}

vi.mock("../services/supabase.js", () => ({
  getSupabaseClient: () => ({
    from: () => ({
      select: mockSelect,
      insert: mockInsert,
      upsert: mockUpsert,
      update: mockUpdate,
      delete: mockDelete,
      eq: mockEq,
      gte: mockGte,
      lt: mockLt,
      order: mockOrder,
      in: mockIn,
    }),
  }),
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

vi.mock("../utils/logger.js", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

describe("event-service", () => {
  beforeEach(() => {
    vi.resetModules();
    resetChain();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("getEventsByGuildId returns events", async () => {
    const mockEvents: EventRecord[] = [
      {
        id: "1",
        guild_id: "guild-1",
        name: "Event 1",
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
      },
    ];

    mockLimit.mockResolvedValue({ data: mockEvents, error: null });

    const { getEventsByGuildId } = await import("./event-service.js");
    const result = await getEventsByGuildId("guild-1", "all");

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toHaveLength(1);
      expect(result.data[0].name).toBe("Event 1");
    }
  });

  it("getEventsByGuildId returns error on failure", async () => {
    mockLimit.mockResolvedValue({
      data: null,
      error: { message: "DB error" },
    });

    const { getEventsByGuildId } = await import("./event-service.js");
    const result = await getEventsByGuildId("guild-1");

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toBe("DB error");
    }
  });

  describe("getFutureSeriesForAllGuilds", () => {
    it("returns all active series records", async () => {
      const mockSeries = [
        {
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
          notifications: [{ key: "n1", num: 30, unit: "minutes" }],
          exdates: [],
          created_at: "2024-06-01T00:00:00Z",
          updated_at: "2024-06-01T00:00:00Z",
        },
      ];

      mockLimit.mockResolvedValue({ data: mockSeries, error: null });

      const { getFutureSeriesForAllGuilds } = await import(
        "./event-service.js"
      );
      const result = await getFutureSeriesForAllGuilds();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(1);
        expect(result.data[0].name).toBe("Weekly Meeting");
        expect(result.data[0].rrule).toBe("FREQ=WEEKLY;BYDAY=MO");
        expect(result.data[0].duration_minutes).toBe(60);
      }
    });

    it("returns error on Supabase failure", async () => {
      mockLimit.mockResolvedValue({
        data: null,
        error: { message: "Connection refused" },
      });

      const { getFutureSeriesForAllGuilds } = await import(
        "./event-service.js"
      );
      const result = await getFutureSeriesForAllGuilds();

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toBe("Connection refused");
      }
    });

    it("returns empty array when no series exist", async () => {
      mockLimit.mockResolvedValue({ data: [], error: null });

      const { getFutureSeriesForAllGuilds } = await import(
        "./event-service.js"
      );
      const result = await getFutureSeriesForAllGuilds();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(0);
      }
    });
  });

  describe("getEventById", () => {
    it("returns event when found", async () => {
      const mockEvent: EventRecord = {
        id: "evt-1",
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
      };

      mockSingle.mockResolvedValue({ data: mockEvent, error: null });

      const { getEventById } = await import("./event-service.js");
      const result = await getEventById("evt-1", "guild-1");

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data?.name).toBe("Test Event");
      }
    });

    it("returns null when not found (PGRST116)", async () => {
      mockSingle.mockResolvedValue({
        data: null,
        error: { code: "PGRST116", message: "Not found" },
      });

      const { getEventById } = await import("./event-service.js");
      const result = await getEventById("nonexistent", "guild-1");

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBeNull();
      }
    });

    it("returns error on failure", async () => {
      mockSingle.mockResolvedValue({
        data: null,
        error: { message: "DB error" },
      });

      const { getEventById } = await import("./event-service.js");
      const result = await getEventById("evt-1", "guild-1");

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toBe("DB error");
      }
    });
  });

  describe("updateEvent", () => {
    it("returns updated event on success", async () => {
      const updatedEvent: EventRecord = {
        id: "evt-1",
        guild_id: "guild-1",
        name: "Updated Event",
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
        updated_at: "2024-06-02T00:00:00Z",
      };

      mockSingle.mockResolvedValue({ data: updatedEvent, error: null });

      const { updateEvent } = await import("./event-service.js");
      const result = await updateEvent("evt-1", "guild-1", {
        name: "Updated Event",
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe("Updated Event");
      }
    });

    it("returns error on failure", async () => {
      mockSingle.mockResolvedValue({
        data: null,
        error: { message: "Update failed" },
      });

      const { updateEvent } = await import("./event-service.js");
      const result = await updateEvent("evt-1", "guild-1", {
        name: "Updated",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toBe("Update failed");
      }
    });
  });

  describe("deleteEvent", () => {
    /**
     * deleteEvent のチェーンをモック化するヘルパ:
     *   supabase.from("events").delete().eq("id", ...).eq("guild_id", ...).select("id")
     * 2 回目の eq が `.select()` 可能なオブジェクトを返し、select は最終的に Promise を返す。
     */
    function mockDeleteChain(result: {
      data: { id: string }[] | null;
      error: { code?: string; message: string } | null;
    }) {
      const mockSelectForDelete = vi.fn().mockResolvedValue(result);
      mockEq
        .mockReturnValueOnce({ eq: mockEq })
        .mockReturnValueOnce({ select: mockSelectForDelete });
      return { mockSelectForDelete };
    }

    it("returns success with undefined data on successful delete", async () => {
      mockDeleteChain({ data: [{ id: "evt-1" }], error: null });

      const { deleteEvent } = await import("./event-service.js");
      const result = await deleteEvent("evt-1", "guild-1");

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBeUndefined();
      }
    });

    it("calls supabase with id and guild_id eq filters and .select()", async () => {
      // 共有モックの呼び出し履歴をクリアしてから検証
      mockEq.mockClear();
      mockDelete.mockClear();
      const { mockSelectForDelete } = mockDeleteChain({
        data: [{ id: "evt-42" }],
        error: null,
      });

      const { deleteEvent } = await import("./event-service.js");
      await deleteEvent("evt-42", "guild-99");

      expect(mockDelete).toHaveBeenCalled();
      expect(mockEq).toHaveBeenNthCalledWith(1, "id", "evt-42");
      expect(mockEq).toHaveBeenNthCalledWith(2, "guild_id", "guild-99");
      expect(mockSelectForDelete).toHaveBeenCalledWith("id");
    });

    it("returns failure when supabase returns an error", async () => {
      mockDeleteChain({
        data: null,
        error: { message: "DB delete failed" },
      });

      const { deleteEvent } = await import("./event-service.js");
      const result = await deleteEvent("evt-1", "guild-1");

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe("DELETE_FAILED");
        expect(result.error.message).toBe("DB delete failed");
      }
    });

    it("logs an error including eventId and guildId on failure", async () => {
      mockDeleteChain({
        data: null,
        error: { message: "DB delete failed" },
      });

      const { logger } = await import("../utils/logger.js");
      const { deleteEvent } = await import("./event-service.js");
      await deleteEvent("evt-1", "guild-1");

      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({ eventId: "evt-1", guildId: "guild-1" }),
        expect.stringContaining("Failed to delete event")
      );
    });

    it("returns NOT_FOUND when 0 rows are deleted (race condition)", async () => {
      mockDeleteChain({ data: [], error: null });

      const { deleteEvent } = await import("./event-service.js");
      const result = await deleteEvent("evt-1", "guild-1");

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe("NOT_FOUND");
      }
    });

    it("logs a warning when no rows are deleted", async () => {
      mockDeleteChain({ data: [], error: null });

      const { logger } = await import("../utils/logger.js");
      const { deleteEvent } = await import("./event-service.js");
      await deleteEvent("evt-1", "guild-1");

      expect(logger.warn).toHaveBeenCalledWith(
        expect.objectContaining({ eventId: "evt-1", guildId: "guild-1" }),
        expect.stringContaining("Event not found")
      );
    });
  });

  describe("createEventFromPoll", () => {
    beforeEach(() => {
      mockInsert.mockClear();
    });

    it("poll snapshot と optionId から events を INSERT し、series_id は送らない", async () => {
      const created: EventRecord = {
        id: "evt-from-poll",
        guild_id: "guild-1",
        name: "投票確定: 次回ミートアップ",
        description: "decided by poll",
        color: "#3B82F6",
        is_all_day: false,
        start_at: "2026-04-20T12:00:00Z",
        end_at: "2026-04-20T13:00:00Z",
        location: null,
        channel_id: null,
        channel_name: null,
        notifications: [],
        created_at: "2026-04-18T00:00:00Z",
        updated_at: "2026-04-18T00:00:00Z",
      };

      mockSingle.mockResolvedValue({ data: created, error: null });

      const { createEventFromPoll } = await import("./event-service.js");
      const result = await createEventFromPoll({
        poll: {
          id: "poll-1",
          guild_id: "guild-1",
          title: "投票確定: 次回ミートアップ",
          description: "decided by poll",
        },
        option: {
          id: "opt-1",
          starts_at: "2026-04-20T12:00:00Z",
          ends_at: "2026-04-20T13:00:00Z",
        },
        actorUserId: "user-1",
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.id).toBe("evt-from-poll");
      }
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          guild_id: "guild-1",
          name: "投票確定: 次回ミートアップ",
          start_at: "2026-04-20T12:00:00Z",
          end_at: "2026-04-20T13:00:00Z",
          description: "decided by poll",
        })
      );
      const payload = mockInsert.mock.calls[0]?.[0] as Record<string, unknown>;
      expect(payload.series_id).toBeUndefined();
    });

    it("option.ends_at が null の場合は start から 1 時間後を end に設定する", async () => {
      mockSingle.mockResolvedValue({
        data: {
          id: "evt-1",
          guild_id: "guild-1",
          name: "t",
          description: null,
          color: "#3B82F6",
          is_all_day: false,
          start_at: "2026-04-20T12:00:00Z",
          end_at: "2026-04-20T13:00:00Z",
          location: null,
          channel_id: null,
          channel_name: null,
          notifications: [],
          created_at: "2026-04-18T00:00:00Z",
          updated_at: "2026-04-18T00:00:00Z",
        },
        error: null,
      });

      const { createEventFromPoll } = await import("./event-service.js");
      await createEventFromPoll({
        poll: {
          id: "poll-1",
          guild_id: "guild-1",
          title: "t",
          description: null,
        },
        option: {
          id: "opt-1",
          starts_at: "2026-04-20T12:00:00Z",
          ends_at: null,
        },
        actorUserId: "user-1",
      });

      const payload = mockInsert.mock.calls[0]?.[0] as Record<string, unknown>;
      expect(payload.start_at).toBe("2026-04-20T12:00:00Z");
      expect(payload.end_at).toBe("2026-04-20T13:00:00.000Z");
    });

    it("INSERT 失敗時は classifySupabaseError 経由のエラーを返す", async () => {
      mockSingle.mockResolvedValue({
        data: null,
        error: { code: "23503", message: "fk violation" },
      });

      const { createEventFromPoll } = await import("./event-service.js");
      const result = await createEventFromPoll({
        poll: {
          id: "poll-1",
          guild_id: "guild-1",
          title: "t",
          description: null,
        },
        option: {
          id: "opt-1",
          starts_at: "2026-04-20T12:00:00Z",
          ends_at: null,
        },
        actorUserId: "user-1",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe("FOREIGN_KEY_VIOLATION");
      }
    });
  });
});
