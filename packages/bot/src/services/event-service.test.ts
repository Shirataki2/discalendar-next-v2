import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { EventRecord } from "../types/event.js";

const mockSelect = vi.fn();
const mockSingle = vi.fn();
const mockEq = vi.fn();
const mockGte = vi.fn();
const mockLt = vi.fn();
const mockOrder = vi.fn();
const mockInsert = vi.fn();
const mockUpdate = vi.fn();
const mockUpsert = vi.fn();
const mockIn = vi.fn();

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
  mockOrder.mockResolvedValue({ data: [], error: null });
  mockInsert.mockReturnValue({ select: mockSelect });
  mockUpdate.mockReturnValue({ eq: mockEq });
  mockUpsert.mockReturnValue({ select: mockSelect });
  mockIn.mockResolvedValue({ data: [], error: null });
}

vi.mock("../services/supabase.js", () => ({
  getSupabaseClient: () => ({
    from: () => ({
      select: mockSelect,
      insert: mockInsert,
      update: mockUpdate,
      upsert: mockUpsert,
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

    mockOrder.mockResolvedValue({ data: mockEvents, error: null });

    const { getEventsByGuildId } = await import("./event-service.js");
    const result = await getEventsByGuildId("guild-1", "all");

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toHaveLength(1);
      expect(result.data[0].name).toBe("Event 1");
    }
  });

  it("getEventsByGuildId returns error on failure", async () => {
    mockOrder.mockResolvedValue({
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
});
