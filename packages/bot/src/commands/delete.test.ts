import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ── service mocks ──
const mockFindEventByName = vi.fn();
const mockGetEventsByGuildId = vi.fn();
const mockDeleteEvent = vi.fn();
const mockGetGuildConfig = vi.fn();
const mockHasManagementPermission = vi.fn();
const mockLoggerInfo = vi.fn();
const mockLoggerError = vi.fn();

vi.mock("../services/attendee-service.js", () => ({
  findEventByName: (...args: unknown[]) => mockFindEventByName(...args),
}));

vi.mock("../services/event-service.js", () => ({
  deleteEvent: (...args: unknown[]) => mockDeleteEvent(...args),
  getEventsByGuildId: (...args: unknown[]) => mockGetEventsByGuildId(...args),
}));

vi.mock("../services/guild-service.js", () => ({
  getGuildConfig: (...args: unknown[]) => mockGetGuildConfig(...args),
}));

vi.mock("../utils/permissions.js", () => ({
  hasManagementPermission: (...args: unknown[]) =>
    mockHasManagementPermission(...args),
}));

vi.mock("../utils/logger.js", () => ({
  logger: {
    info: (...args: unknown[]) => mockLoggerInfo(...args),
    warn: vi.fn(),
    error: (...args: unknown[]) => mockLoggerError(...args),
    debug: vi.fn(),
  },
}));

// ── テスト用のイベントデータ ──
const MOCK_EVENT = {
  id: "evt-1",
  guild_id: "guild-1",
  name: "テストイベント",
  description: null,
  color: "#3e44f7",
  is_all_day: false,
  start_at: "2026-03-20T06:00:00.000Z",
  end_at: "2026-03-20T08:00:00.000Z",
  location: null,
  channel_id: null,
  channel_name: null,
  notifications: [],
  created_at: "2026-03-01T00:00:00Z",
  updated_at: "2026-03-01T00:00:00Z",
};

// ── interaction mock builder ──
type MockCollector = {
  on: ReturnType<typeof vi.fn>;
  stop: ReturnType<typeof vi.fn>;
};

function createMockCollector(): MockCollector {
  return {
    on: vi.fn(),
    stop: vi.fn(),
  };
}

type CreateMockInteractionOptions = {
  guildId?: string;
  userId?: string;
  eventQuery?: string;
  collector?: MockCollector;
};

function createMockInteraction(options: CreateMockInteractionOptions) {
  const collector = options.collector ?? createMockCollector();
  const replyMessage = {
    createMessageComponentCollector: vi.fn(() => collector),
  };

  return {
    guild: options.guildId ? { id: options.guildId } : null,
    user: { id: options.userId ?? "user-1" },
    member: {},
    options: {
      getString: (name: string, required?: boolean) => {
        if (name === "event") {
          const value = options.eventQuery ?? null;
          if (required && value === null) {
            throw new Error("Missing required option: event");
          }
          return value;
        }
        return null;
      },
    },
    deferReply: vi.fn(),
    editReply: vi.fn().mockResolvedValue(replyMessage),
    reply: vi.fn(),
    _replyMessage: replyMessage,
    _collector: collector,
  };
}

function createButtonInteraction(opts: { customId: string; userId: string }) {
  return {
    customId: opts.customId,
    user: { id: opts.userId },
    update: vi.fn(),
    reply: vi.fn(),
  };
}

function setupDefaultMocks() {
  mockGetGuildConfig.mockResolvedValue({
    success: true,
    data: { restricted: false },
  });
  mockFindEventByName.mockResolvedValue({
    success: true,
    data: MOCK_EVENT,
  });
  mockGetEventsByGuildId.mockResolvedValue({
    success: true,
    data: [],
  });
  mockDeleteEvent.mockResolvedValue({ success: true, data: undefined });
  mockHasManagementPermission.mockReturnValue(false);
}

function getCollectHandler(
  interaction: ReturnType<typeof createMockInteraction>
): (i: unknown) => Promise<void> {
  const calls = interaction._collector.on.mock.calls as [
    string,
    (i: unknown) => Promise<void>,
  ][];
  const entry = calls.find(([eventName]) => eventName === "collect");
  if (!entry) {
    throw new Error("collect handler was not registered");
  }
  return entry[1];
}

function getEndHandler(
  interaction: ReturnType<typeof createMockInteraction>
): () => Promise<void> {
  const calls = interaction._collector.on.mock.calls as [
    string,
    () => Promise<void>,
  ][];
  const entry = calls.find(([eventName]) => eventName === "end");
  if (!entry) {
    throw new Error("end handler was not registered");
  }
  return entry[1];
}

describe("delete command", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    setupDefaultMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("has correct command data", async () => {
    const deleteCommand = (await import("./delete.js")).default;
    expect(deleteCommand.data.name).toBe("delete");
  });

  it("replies with error when not in a guild", async () => {
    const interaction = createMockInteraction({
      eventQuery: "テスト",
    });

    const deleteCommand = (await import("./delete.js")).default;
    await deleteCommand.execute(interaction as never);

    expect(interaction.reply).toHaveBeenCalledWith(
      expect.objectContaining({ ephemeral: true })
    );
    expect(mockDeleteEvent).not.toHaveBeenCalled();
  });

  it("aborts and replies with error when guild config fetch fails", async () => {
    mockGetGuildConfig.mockResolvedValue({
      success: false,
      error: { code: "FETCH_FAILED", message: "Boom" },
    });

    const interaction = createMockInteraction({
      guildId: "guild-1",
      eventQuery: "テスト",
    });

    const deleteCommand = (await import("./delete.js")).default;
    await deleteCommand.execute(interaction as never);

    expect(interaction.editReply).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.stringContaining("ギルド設定"),
      })
    );
    expect(mockFindEventByName).not.toHaveBeenCalled();
    expect(mockDeleteEvent).not.toHaveBeenCalled();
  });

  it("rejects restricted-mode users without management permission", async () => {
    mockGetGuildConfig.mockResolvedValue({
      success: true,
      data: { restricted: true },
    });
    mockHasManagementPermission.mockReturnValue(false);

    const interaction = createMockInteraction({
      guildId: "guild-1",
      eventQuery: "テスト",
    });

    const deleteCommand = (await import("./delete.js")).default;
    await deleteCommand.execute(interaction as never);

    expect(interaction.editReply).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.stringContaining("権限"),
      })
    );
    expect(mockFindEventByName).not.toHaveBeenCalled();
    expect(mockDeleteEvent).not.toHaveBeenCalled();
  });

  it("proceeds to confirmation UI in restricted mode when user has permission", async () => {
    mockGetGuildConfig.mockResolvedValue({
      success: true,
      data: { restricted: true },
    });
    mockHasManagementPermission.mockReturnValue(true);

    const interaction = createMockInteraction({
      guildId: "guild-1",
      eventQuery: "テスト",
    });

    const deleteCommand = (await import("./delete.js")).default;
    await deleteCommand.execute(interaction as never);

    expect(interaction.editReply).toHaveBeenCalledWith(
      expect.objectContaining({
        components: expect.any(Array),
        embeds: expect.any(Array),
      })
    );
    expect(mockHasManagementPermission).toHaveBeenCalledTimes(1);
  });

  it("skips permission check when restricted mode is disabled", async () => {
    mockGetGuildConfig.mockResolvedValue({
      success: true,
      data: { restricted: false },
    });

    const interaction = createMockInteraction({
      guildId: "guild-1",
      eventQuery: "テスト",
    });

    const deleteCommand = (await import("./delete.js")).default;
    await deleteCommand.execute(interaction as never);

    expect(mockHasManagementPermission).not.toHaveBeenCalled();
    expect(mockFindEventByName).toHaveBeenCalled();
  });

  it("shows hint with recent events when target event is not found", async () => {
    mockFindEventByName.mockResolvedValue({ success: true, data: null });
    mockGetEventsByGuildId.mockResolvedValue({
      success: true,
      data: [
        { ...MOCK_EVENT, name: "近日イベントA" },
        { ...MOCK_EVENT, name: "近日イベントB" },
      ],
    });

    const interaction = createMockInteraction({
      guildId: "guild-1",
      eventQuery: "存在しない",
    });

    const deleteCommand = (await import("./delete.js")).default;
    await deleteCommand.execute(interaction as never);

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
    expect(mockGetEventsByGuildId).toHaveBeenCalledWith("guild-1", "future");
    expect(mockDeleteEvent).not.toHaveBeenCalled();
  });

  it("logs error and shows generic message when search fails", async () => {
    mockFindEventByName.mockResolvedValue({
      success: false,
      error: { code: "FETCH_FAILED", message: "DB down" },
    });

    const interaction = createMockInteraction({
      guildId: "guild-1",
      eventQuery: "テスト",
    });

    const deleteCommand = (await import("./delete.js")).default;
    await deleteCommand.execute(interaction as never);

    expect(mockLoggerError).toHaveBeenCalled();
    expect(interaction.editReply).toHaveBeenCalledWith(
      expect.objectContaining({
        embeds: expect.arrayContaining([
          expect.objectContaining({
            data: expect.objectContaining({
              description: expect.stringContaining("検索に失敗"),
            }),
          }),
        ]),
      })
    );
    expect(mockDeleteEvent).not.toHaveBeenCalled();
  });

  it("calls deleteEvent and updates message on confirm button press", async () => {
    const interaction = createMockInteraction({
      guildId: "guild-1",
      userId: "user-1",
      eventQuery: "テスト",
    });

    const deleteCommand = (await import("./delete.js")).default;
    await deleteCommand.execute(interaction as never);

    const handler = getCollectHandler(interaction);
    const buttonInteraction = createButtonInteraction({
      customId: "delete-confirm",
      userId: "user-1",
    });

    await handler(buttonInteraction);

    expect(mockDeleteEvent).toHaveBeenCalledWith("evt-1", "guild-1");
    expect(buttonInteraction.update).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.stringContaining("削除しました"),
      })
    );
    expect(mockLoggerInfo).toHaveBeenCalledWith(
      expect.objectContaining({
        guildId: "guild-1",
        userId: "user-1",
        eventId: "evt-1",
        eventName: "テストイベント",
      }),
      expect.any(String)
    );
    expect(interaction._collector.stop).toHaveBeenCalled();
  });

  it("does not call deleteEvent and updates message on cancel button press", async () => {
    const interaction = createMockInteraction({
      guildId: "guild-1",
      userId: "user-1",
      eventQuery: "テスト",
    });

    const deleteCommand = (await import("./delete.js")).default;
    await deleteCommand.execute(interaction as never);

    const handler = getCollectHandler(interaction);
    const buttonInteraction = createButtonInteraction({
      customId: "delete-cancel",
      userId: "user-1",
    });

    await handler(buttonInteraction);

    expect(mockDeleteEvent).not.toHaveBeenCalled();
    expect(buttonInteraction.update).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.stringContaining("キャンセル"),
      })
    );
    expect(interaction._collector.stop).toHaveBeenCalled();
  });

  it("rejects button presses from other users", async () => {
    const interaction = createMockInteraction({
      guildId: "guild-1",
      userId: "user-1",
      eventQuery: "テスト",
    });

    const deleteCommand = (await import("./delete.js")).default;
    await deleteCommand.execute(interaction as never);

    const handler = getCollectHandler(interaction);
    const buttonInteraction = createButtonInteraction({
      customId: "delete-confirm",
      userId: "user-2",
    });

    await handler(buttonInteraction);

    expect(mockDeleteEvent).not.toHaveBeenCalled();
    expect(buttonInteraction.reply).toHaveBeenCalledWith(
      expect.objectContaining({
        ephemeral: true,
        content: expect.stringContaining("コマンド実行者"),
      })
    );
    expect(interaction._collector.stop).not.toHaveBeenCalled();
  });

  it("logs error and shows error embed when deleteEvent fails", async () => {
    mockDeleteEvent.mockResolvedValue({
      success: false,
      error: { code: "DELETE_FAILED", message: "Boom" },
    });

    const interaction = createMockInteraction({
      guildId: "guild-1",
      userId: "user-1",
      eventQuery: "テスト",
    });

    const deleteCommand = (await import("./delete.js")).default;
    await deleteCommand.execute(interaction as never);

    const handler = getCollectHandler(interaction);
    const buttonInteraction = createButtonInteraction({
      customId: "delete-confirm",
      userId: "user-1",
    });

    await handler(buttonInteraction);

    expect(mockLoggerError).toHaveBeenCalled();
    expect(buttonInteraction.update).toHaveBeenCalledWith(
      expect.objectContaining({
        embeds: expect.arrayContaining([
          expect.objectContaining({
            data: expect.objectContaining({
              description: expect.stringContaining("削除に失敗"),
            }),
          }),
        ]),
      })
    );
  });

  it("handles collector timeout via end handler", async () => {
    const interaction = createMockInteraction({
      guildId: "guild-1",
      userId: "user-1",
      eventQuery: "テスト",
    });

    const deleteCommand = (await import("./delete.js")).default;
    await deleteCommand.execute(interaction as never);

    // 確認 UI の editReply を1回消費したあとに end ハンドラを呼ぶ
    interaction.editReply.mockResolvedValueOnce(undefined);

    const endHandler = getEndHandler(interaction);
    await endHandler();

    // タイムアウト時には editReply で非活性化メッセージが返る
    const lastCall = interaction.editReply.mock.calls.at(-1)?.[0] as
      | { content?: string }
      | undefined;
    expect(lastCall?.content).toEqual(expect.stringContaining("タイムアウト"));
  });
});
