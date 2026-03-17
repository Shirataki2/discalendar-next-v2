import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ── Supabase mock chain ──
const mockSingle = vi.fn();
const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockIlike = vi.fn();
const mockOrder = vi.fn();
const mockLimit = vi.fn();
const mockUpsert = vi.fn();
const mockDelete = vi.fn();

function resetChain() {
  mockSelect.mockReturnValue({
    eq: mockEq,
    single: mockSingle,
  });
  mockEq.mockReturnValue({
    eq: mockEq,
    select: mockSelect,
    single: mockSingle,
    ilike: mockIlike,
    order: mockOrder,
  });
  mockIlike.mockReturnValue({
    order: mockOrder,
  });
  mockOrder.mockReturnValue({
    limit: mockLimit,
  });
  mockLimit.mockResolvedValue({ data: [], error: null });
  mockSingle.mockResolvedValue({ data: null, error: null });
  mockUpsert.mockReturnValue({ select: mockSelect });
  mockDelete.mockReturnValue({ eq: mockEq });
}

vi.mock("../services/supabase.js", () => ({
  getSupabaseClient: () => ({
    from: (table: string) => {
      if (table === "event_attendees") {
        return {
          select: mockSelect,
          upsert: mockUpsert,
          delete: mockDelete,
        };
      }
      if (table === "events") {
        return {
          select: mockSelect,
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

describe("attendee-service", () => {
  beforeEach(() => {
    vi.resetModules();
    resetChain();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ── upsertRsvp ──

  describe("upsertRsvp", () => {
    it("inserts a new RSVP record and returns it", async () => {
      const mockRecord = {
        id: "att-1",
        event_id: "evt-1",
        event_series_id: null,
        occurrence_date: null,
        guild_id: "guild-1",
        user_id: null,
        discord_user_id: "discord-1",
        discord_username: "TestUser",
        discord_avatar_url: "https://cdn.example.com/avatar.png",
        status: "going",
        responded_at: "2026-03-17T00:00:00Z",
      };

      mockSingle.mockResolvedValue({ data: mockRecord, error: null });

      const { upsertRsvp } = await import("./attendee-service.js");
      const result = await upsertRsvp({
        guildId: "guild-1",
        eventId: "evt-1",
        discordUserId: "discord-1",
        discordUsername: "TestUser",
        discordAvatarUrl: "https://cdn.example.com/avatar.png",
        status: "going",
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.status).toBe("going");
        expect(result.data.discord_user_id).toBe("discord-1");
      }
    });

    it("returns error when upsert fails", async () => {
      mockSingle.mockResolvedValue({
        data: null,
        error: { message: "DB error", code: "23505" },
      });

      const { upsertRsvp } = await import("./attendee-service.js");
      const result = await upsertRsvp({
        guildId: "guild-1",
        eventId: "evt-1",
        discordUserId: "discord-1",
        discordUsername: "TestUser",
        discordAvatarUrl: null,
        status: "maybe",
      });

      expect(result.success).toBe(false);
    });
  });

  // ── deleteRsvp ──

  describe("deleteRsvp", () => {
    it("deletes an RSVP record successfully", async () => {
      // delete().eq().eq() returns { error: null }
      mockEq.mockReturnValue({ eq: mockEq, error: null });

      const { deleteRsvp } = await import("./attendee-service.js");
      const result = await deleteRsvp({
        guildId: "guild-1",
        eventId: "evt-1",
        discordUserId: "discord-1",
      });

      expect(result.success).toBe(true);
    });

    it("returns error when delete fails", async () => {
      mockEq.mockReturnValue({
        eq: vi.fn().mockReturnValue({
          error: { message: "Delete failed" },
        }),
      });

      const { deleteRsvp } = await import("./attendee-service.js");
      const result = await deleteRsvp({
        guildId: "guild-1",
        eventId: "evt-1",
        discordUserId: "discord-1",
      });

      expect(result.success).toBe(false);
    });
  });

  // ── getAttendeeSummary ──

  describe("getAttendeeSummary", () => {
    it("returns summary counts grouped by status", async () => {
      const attendees = [
        { status: "going" },
        { status: "going" },
        { status: "maybe" },
        { status: "not_going" },
      ];

      // select().eq() returns data
      mockEq.mockResolvedValue({ data: attendees, error: null });

      const { getAttendeeSummary } = await import("./attendee-service.js");
      const result = await getAttendeeSummary("evt-1");

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.going).toBe(2);
        expect(result.data.maybe).toBe(1);
        expect(result.data.notGoing).toBe(1);
        expect(result.data.total).toBe(4);
      }
    });

    it("returns zeros when no attendees exist", async () => {
      mockEq.mockResolvedValue({ data: [], error: null });

      const { getAttendeeSummary } = await import("./attendee-service.js");
      const result = await getAttendeeSummary("evt-1");

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.going).toBe(0);
        expect(result.data.maybe).toBe(0);
        expect(result.data.notGoing).toBe(0);
        expect(result.data.total).toBe(0);
      }
    });

    it("returns error when fetch fails", async () => {
      mockEq.mockResolvedValue({
        data: null,
        error: { message: "DB error" },
      });

      const { getAttendeeSummary } = await import("./attendee-service.js");
      const result = await getAttendeeSummary("evt-1");

      expect(result.success).toBe(false);
    });
  });

  // ── findEventByName ──

  describe("findEventByName", () => {
    it("returns matching event when found", async () => {
      const mockEvent = {
        id: "evt-1",
        guild_id: "guild-1",
        name: "Weekly Meeting",
        start_at: "2026-03-17T10:00:00Z",
        end_at: "2026-03-17T11:00:00Z",
      };

      mockLimit.mockResolvedValue({ data: [mockEvent], error: null });

      const { findEventByName } = await import("./attendee-service.js");
      const result = await findEventByName("guild-1", "Weekly");

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).not.toBeNull();
        expect(result.data?.name).toBe("Weekly Meeting");
      }
    });

    it("returns null when no events match", async () => {
      mockLimit.mockResolvedValue({ data: [], error: null });

      const { findEventByName } = await import("./attendee-service.js");
      const result = await findEventByName("guild-1", "Nonexistent");

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBeNull();
      }
    });

    it("returns error on DB failure", async () => {
      mockLimit.mockResolvedValue({
        data: null,
        error: { message: "Connection error" },
      });

      const { findEventByName } = await import("./attendee-service.js");
      const result = await findEventByName("guild-1", "test");

      expect(result.success).toBe(false);
    });
  });

  // ── getCurrentRsvp ──

  describe("getCurrentRsvp", () => {
    it("returns existing RSVP for a user", async () => {
      const mockRecord = {
        id: "att-1",
        event_id: "evt-1",
        discord_user_id: "discord-1",
        status: "going",
      };

      mockSingle.mockResolvedValue({ data: mockRecord, error: null });

      const { getCurrentRsvp } = await import("./attendee-service.js");
      const result = await getCurrentRsvp("evt-1", "discord-1");

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data?.status).toBe("going");
      }
    });

    it("returns null when no RSVP exists", async () => {
      mockSingle.mockResolvedValue({
        data: null,
        error: { code: "PGRST116", message: "Not found" },
      });

      const { getCurrentRsvp } = await import("./attendee-service.js");
      const result = await getCurrentRsvp("evt-1", "discord-1");

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBeNull();
      }
    });
  });
});
