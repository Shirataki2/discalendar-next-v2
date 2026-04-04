import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockSelect = vi.fn();
const mockInsert = vi.fn();
const mockDelete = vi.fn();
const mockEq = vi.fn();
const mockEq2 = vi.fn();
const mockEq3 = vi.fn();
const mockLt = vi.fn();
const mockLimit = vi.fn();
const mockDeleteSelect = vi.fn();

vi.mock("../services/supabase.js", () => ({
  getSupabaseClient: () => ({
    from: (table: string) => {
      if (table === "sent_notifications") {
        return {
          select: mockSelect,
          insert: mockInsert,
          delete: mockDelete,
        };
      }
      return {};
    },
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

describe("sent-notification-service", () => {
  beforeEach(() => {
    vi.resetModules();

    // hasSent chain: select("id").eq().eq().eq().limit(1)
    mockLimit.mockResolvedValue({ data: [], error: null });
    mockEq3.mockReturnValue({ limit: mockLimit });
    mockEq2.mockReturnValue({ eq: mockEq3 });
    mockEq.mockReturnValue({ eq: mockEq2 });
    mockSelect.mockReturnValue({ eq: mockEq });

    // markSent: insert()
    mockInsert.mockResolvedValue({ error: null });

    // cleanupOldRecords chain: delete().lt().select("id")
    mockDeleteSelect.mockResolvedValue({ data: [], error: null });
    mockLt.mockReturnValue({ select: mockDeleteSelect });
    mockDelete.mockReturnValue({ lt: mockLt });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("hasSent", () => {
    it("returns false when no matching record exists", async () => {
      mockLimit.mockResolvedValue({ data: [], error: null });

      const { hasSent } = await import("./sent-notification-service.js");
      const result = await hasSent("event-1", "guild-1", "__start__");

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(false);
      }
    });

    it("returns true when a matching record exists", async () => {
      mockLimit.mockResolvedValue({
        data: [{ id: 1 }],
        error: null,
      });

      const { hasSent } = await import("./sent-notification-service.js");
      const result = await hasSent("event-1", "guild-1", "__start__");

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(true);
      }
    });

    it("returns failure on DB error", async () => {
      mockLimit.mockResolvedValue({
        data: null,
        error: { code: "PGRST000", message: "connection failed" },
      });

      const { hasSent } = await import("./sent-notification-service.js");
      const result = await hasSent("event-1", "guild-1", "__start__");

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe("FETCH_FAILED");
      }
    });

    it("queries with correct parameters", async () => {
      mockLimit.mockResolvedValue({ data: [], error: null });

      const { hasSent } = await import("./sent-notification-service.js");
      await hasSent("event-1", "guild-1", "30m");

      expect(mockSelect).toHaveBeenCalledWith("id");
      expect(mockEq).toHaveBeenCalledWith("event_id", "event-1");
      expect(mockEq2).toHaveBeenCalledWith("guild_id", "guild-1");
      expect(mockEq3).toHaveBeenCalledWith("notification_key", "30m");
      expect(mockLimit).toHaveBeenCalledWith(1);
    });
  });

  describe("markSent", () => {
    it("returns success on normal insert", async () => {
      mockInsert.mockResolvedValue({ error: null });

      const { markSent } = await import("./sent-notification-service.js");
      const result = await markSent("event-1", "guild-1", "__start__");

      expect(result.success).toBe(true);
      expect(mockInsert).toHaveBeenCalledWith({
        event_id: "event-1",
        guild_id: "guild-1",
        notification_key: "__start__",
      });
    });

    it("returns success on UNIQUE constraint violation (already recorded)", async () => {
      mockInsert.mockResolvedValue({
        error: { code: "23505", message: "duplicate key" },
      });

      const { markSent } = await import("./sent-notification-service.js");
      const result = await markSent("event-1", "guild-1", "__start__");

      expect(result.success).toBe(true);
    });

    it("returns failure on other DB errors", async () => {
      mockInsert.mockResolvedValue({
        error: { code: "42501", message: "insufficient privilege" },
      });

      const { markSent } = await import("./sent-notification-service.js");
      const result = await markSent("event-1", "guild-1", "__start__");

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe("INSUFFICIENT_PRIVILEGE");
      }
    });

    it("handles series occurrence pseudo-IDs", async () => {
      mockInsert.mockResolvedValue({ error: null });

      const { markSent } = await import("./sent-notification-service.js");
      const pseudoId = "series:s1:occ:2024-06-17T10:00:00.000Z";
      const result = await markSent(pseudoId, "guild-1", "30m");

      expect(result.success).toBe(true);
      expect(mockInsert).toHaveBeenCalledWith({
        event_id: pseudoId,
        guild_id: "guild-1",
        notification_key: "30m",
      });
    });
  });

  describe("cleanupOldRecords", () => {
    it("deletes records older than specified days and returns count", async () => {
      mockDeleteSelect.mockResolvedValue({
        data: [{ id: 1 }, { id: 2 }, { id: 3 }],
        error: null,
      });

      const { cleanupOldRecords } = await import(
        "./sent-notification-service.js"
      );
      const result = await cleanupOldRecords(7);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(3);
      }
    });

    it("returns 0 when no old records exist", async () => {
      mockDeleteSelect.mockResolvedValue({ data: [], error: null });

      const { cleanupOldRecords } = await import(
        "./sent-notification-service.js"
      );
      const result = await cleanupOldRecords(7);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(0);
      }
    });

    it("returns failure on DB error", async () => {
      mockDeleteSelect.mockResolvedValue({
        data: null,
        error: { code: "PGRST000", message: "delete failed" },
      });

      const { cleanupOldRecords } = await import(
        "./sent-notification-service.js"
      );
      const result = await cleanupOldRecords(7);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe("DELETE_FAILED");
      }
    });

    it("passes correct threshold date to query", async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2024-06-20T12:00:00Z"));

      mockDeleteSelect.mockResolvedValue({ data: [], error: null });

      const { cleanupOldRecords } = await import(
        "./sent-notification-service.js"
      );
      await cleanupOldRecords(7);

      expect(mockLt).toHaveBeenCalledWith(
        "sent_at",
        "2024-06-13T12:00:00.000Z"
      );

      vi.useRealTimers();
    });
  });
});
