import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ── attendee-service mocks ──
const mockFindEventByName = vi.fn();
const mockGetCurrentRsvp = vi.fn();
const mockUpsertRsvp = vi.fn();
const mockDeleteRsvp = vi.fn();
const mockGetAttendeeSummary = vi.fn();

vi.mock("../services/attendee-service.js", () => ({
  findEventByName: (...args: unknown[]) => mockFindEventByName(...args),
  getCurrentRsvp: (...args: unknown[]) => mockGetCurrentRsvp(...args),
  upsertRsvp: (...args: unknown[]) => mockUpsertRsvp(...args),
  deleteRsvp: (...args: unknown[]) => mockDeleteRsvp(...args),
  getAttendeeSummary: (...args: unknown[]) => mockGetAttendeeSummary(...args),
}));

vi.mock("../services/event-service.js", () => ({
  getEventsByGuildId: vi.fn().mockResolvedValue({
    success: true,
    data: [],
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

// ── interaction mock builder ──
function createMockInteraction(options: {
  guildId?: string;
  event?: string;
  status?: string;
  userId?: string;
  username?: string;
  avatarURL?: string | null;
}) {
  const optionValues: Record<string, string | null> = {
    event: options.event ?? null,
    status: options.status ?? null,
  };

  return {
    guild: options.guildId ? { id: options.guildId } : null,
    user: {
      id: options.userId ?? "user-1",
      username: options.username ?? "TestUser",
      avatarURL: () => options.avatarURL ?? null,
    },
    options: {
      getString: (name: string, required?: boolean) => {
        const val = optionValues[name];
        if (required && !val) {
          throw new Error(`Missing required option: ${name}`);
        }
        return val;
      },
    },
    deferReply: vi.fn(),
    editReply: vi.fn(),
    reply: vi.fn(),
  };
}

describe("rsvp command", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("replies with error when not in a guild", async () => {
    const interaction = createMockInteraction({
      guildId: undefined,
      event: "test",
      status: "going",
    });

    const rsvpCommand = (await import("./rsvp.js")).default;
    await rsvpCommand.execute(interaction as never);

    expect(interaction.reply).toHaveBeenCalledWith(
      expect.objectContaining({ ephemeral: true })
    );
  });

  it("replies with error when event is not found", async () => {
    const interaction = createMockInteraction({
      guildId: "guild-1",
      event: "Nonexistent",
      status: "going",
    });

    mockFindEventByName.mockResolvedValue({
      success: true,
      data: null,
    });

    const rsvpCommand = (await import("./rsvp.js")).default;
    await rsvpCommand.execute(interaction as never);

    expect(interaction.deferReply).toHaveBeenCalled();
    expect(interaction.editReply).toHaveBeenCalledWith(
      expect.objectContaining({
        embeds: expect.arrayContaining([
          expect.objectContaining({
            data: expect.objectContaining({
              title: expect.stringContaining("❌"),
            }),
          }),
        ]),
      })
    );
  });

  it("upserts RSVP with new status when current is different", async () => {
    const interaction = createMockInteraction({
      guildId: "guild-1",
      event: "Weekly Meeting",
      status: "going",
      userId: "user-1",
      username: "TestUser",
    });

    const mockEvent = {
      id: "evt-1",
      guild_id: "guild-1",
      name: "Weekly Meeting",
      start_at: "2026-03-17T10:00:00Z",
      end_at: "2026-03-17T11:00:00Z",
    };

    mockFindEventByName.mockResolvedValue({ success: true, data: mockEvent });
    mockGetCurrentRsvp.mockResolvedValue({ success: true, data: null });
    mockUpsertRsvp.mockResolvedValue({
      success: true,
      data: { status: "going" },
    });
    mockGetAttendeeSummary.mockResolvedValue({
      success: true,
      data: { going: 1, maybe: 0, notGoing: 0, total: 1 },
    });

    const rsvpCommand = (await import("./rsvp.js")).default;
    await rsvpCommand.execute(interaction as never);

    expect(mockUpsertRsvp).toHaveBeenCalledWith(
      expect.objectContaining({
        eventId: "evt-1",
        status: "going",
      })
    );
    expect(interaction.editReply).toHaveBeenCalledWith(
      expect.objectContaining({
        embeds: expect.arrayContaining([
          expect.objectContaining({
            data: expect.objectContaining({
              title: expect.stringContaining("Weekly Meeting"),
            }),
          }),
        ]),
      })
    );
  });

  it("deletes RSVP when same status (toggle off)", async () => {
    const interaction = createMockInteraction({
      guildId: "guild-1",
      event: "Weekly Meeting",
      status: "going",
      userId: "user-1",
      username: "TestUser",
    });

    const mockEvent = {
      id: "evt-1",
      guild_id: "guild-1",
      name: "Weekly Meeting",
    };

    mockFindEventByName.mockResolvedValue({ success: true, data: mockEvent });
    mockGetCurrentRsvp.mockResolvedValue({
      success: true,
      data: { status: "going" },
    });
    mockDeleteRsvp.mockResolvedValue({ success: true, data: undefined });
    mockGetAttendeeSummary.mockResolvedValue({
      success: true,
      data: { going: 0, maybe: 0, notGoing: 0, total: 0 },
    });

    const rsvpCommand = (await import("./rsvp.js")).default;
    await rsvpCommand.execute(interaction as never);

    expect(mockDeleteRsvp).toHaveBeenCalledWith(
      expect.objectContaining({
        eventId: "evt-1",
        discordUserId: "user-1",
      })
    );
  });

  it("has correct command data", async () => {
    const rsvpCommand = (await import("./rsvp.js")).default;
    expect(rsvpCommand.data.name).toBe("rsvp");
  });
});
