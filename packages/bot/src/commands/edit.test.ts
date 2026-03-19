import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ── service mocks ──
const mockFindEventByName = vi.fn();
const mockGetEventsByGuildId = vi.fn();
const mockUpdateEvent = vi.fn();
const mockGetGuildConfig = vi.fn();
const mockHasManagementPermission = vi.fn();

vi.mock("../services/attendee-service.js", () => ({
  findEventByName: (...args: unknown[]) => mockFindEventByName(...args),
}));

vi.mock("../services/event-service.js", () => ({
  getEventsByGuildId: (...args: unknown[]) => mockGetEventsByGuildId(...args),
  updateEvent: (...args: unknown[]) => mockUpdateEvent(...args),
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
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
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
  // JST 2026-03-20 15:00 → UTC 2026-03-20 06:00
  start_at: "2026-03-20T06:00:00.000Z",
  // JST 2026-03-20 17:00 → UTC 2026-03-20 08:00
  end_at: "2026-03-20T08:00:00.000Z",
  location: null,
  channel_id: null,
  channel_name: null,
  notifications: [],
  created_at: "2026-03-01T00:00:00Z",
  updated_at: "2026-03-01T00:00:00Z",
};

// ── interaction mock builder ──
type OptionValues = {
  strings?: Record<string, string | null>;
  integers?: Record<string, number | null>;
  booleans?: Record<string, boolean | null>;
};

function createMockInteraction(options: {
  guildId?: string;
  memberPermissions?: boolean;
  optionValues?: OptionValues;
}) {
  const strings = options.optionValues?.strings ?? {};
  const integers = options.optionValues?.integers ?? {};
  const booleans = options.optionValues?.booleans ?? {};

  return {
    guild: options.guildId ? { id: options.guildId } : null,
    member: options.memberPermissions !== undefined ? {} : null,
    options: {
      getString: (name: string, required?: boolean) => {
        const val = strings[name] ?? null;
        if (required && val === null) {
          throw new Error(`Missing required option: ${name}`);
        }
        return val;
      },
      getInteger: (name: string) => integers[name] ?? null,
      getBoolean: (name: string) => booleans[name] ?? null,
    },
    deferReply: vi.fn(),
    editReply: vi.fn(),
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
}

describe("edit command", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    setupDefaultMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("has correct command data", async () => {
    const editCommand = (await import("./edit.js")).default;
    expect(editCommand.data.name).toBe("edit");
  });

  it("replies with error when not in a guild", async () => {
    const interaction = createMockInteraction({
      optionValues: { strings: { event: "test" } },
    });

    const editCommand = (await import("./edit.js")).default;
    await editCommand.execute(interaction as never);

    expect(interaction.reply).toHaveBeenCalledWith(
      expect.objectContaining({ ephemeral: true })
    );
  });

  it("replies with error when restricted and no permission", async () => {
    mockGetGuildConfig.mockResolvedValue({
      success: true,
      data: { restricted: true },
    });
    mockHasManagementPermission.mockReturnValue(false);

    const interaction = createMockInteraction({
      guildId: "guild-1",
      memberPermissions: false,
      optionValues: { strings: { event: "test" } },
    });

    const editCommand = (await import("./edit.js")).default;
    await editCommand.execute(interaction as never);

    expect(interaction.editReply).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.stringContaining("権限"),
      })
    );
  });

  it("proceeds when restricted and has permission", async () => {
    mockGetGuildConfig.mockResolvedValue({
      success: true,
      data: { restricted: true },
    });
    mockHasManagementPermission.mockReturnValue(true);
    mockUpdateEvent.mockResolvedValue({
      success: true,
      data: { ...MOCK_EVENT, name: "新しい名前" },
    });

    const interaction = createMockInteraction({
      guildId: "guild-1",
      memberPermissions: true,
      optionValues: {
        strings: { event: "テスト", name: "新しい名前" },
      },
    });

    const editCommand = (await import("./edit.js")).default;
    await editCommand.execute(interaction as never);

    expect(mockUpdateEvent).toHaveBeenCalled();
  });

  it("shows error when event is not found", async () => {
    mockFindEventByName.mockResolvedValue({
      success: true,
      data: null,
    });

    const interaction = createMockInteraction({
      guildId: "guild-1",
      optionValues: {
        strings: { event: "存在しない", name: "新しい名前" },
      },
    });

    const editCommand = (await import("./edit.js")).default;
    await editCommand.execute(interaction as never);

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

  it("shows error when no edit options specified", async () => {
    const interaction = createMockInteraction({
      guildId: "guild-1",
      optionValues: { strings: { event: "テスト" } },
    });

    const editCommand = (await import("./edit.js")).default;
    await editCommand.execute(interaction as never);

    expect(interaction.editReply).toHaveBeenCalledWith(
      expect.objectContaining({
        embeds: expect.arrayContaining([
          expect.objectContaining({
            data: expect.objectContaining({
              description: expect.stringContaining("1つ以上指定"),
            }),
          }),
        ]),
      })
    );
  });

  it("updates only name when only name is specified", async () => {
    mockUpdateEvent.mockResolvedValue({
      success: true,
      data: { ...MOCK_EVENT, name: "変更後のイベント名" },
    });

    const interaction = createMockInteraction({
      guildId: "guild-1",
      optionValues: {
        strings: { event: "テスト", name: "変更後のイベント名" },
      },
    });

    const editCommand = (await import("./edit.js")).default;
    await editCommand.execute(interaction as never);

    expect(mockUpdateEvent).toHaveBeenCalledWith("evt-1", "guild-1", {
      name: "変更後のイベント名",
    });
    expect(interaction.editReply).toHaveBeenCalledWith(
      expect.objectContaining({
        content: "正常に予定を更新しました",
      })
    );
  });

  it("merges partial start time with existing event", async () => {
    // 開始時間の時だけを15→16に変更（終了JST17:00より前なのでOK）
    mockUpdateEvent.mockResolvedValue({
      success: true,
      data: { ...MOCK_EVENT, start_at: "2026-03-20T07:00:00.000Z" },
    });

    const interaction = createMockInteraction({
      guildId: "guild-1",
      optionValues: {
        strings: { event: "テスト" },
        integers: { start_hour: 16 },
      },
    });

    const editCommand = (await import("./edit.js")).default;
    await editCommand.execute(interaction as never);

    expect(mockUpdateEvent).toHaveBeenCalledWith("evt-1", "guild-1", {
      // JST 2026-03-20 16:00 → UTC 2026-03-20 07:00
      start_at: "2026-03-20T07:00:00.000Z",
    });
  });

  it("shows error for invalid merged datetime", async () => {
    // 2月30日は無効な日付
    const eventFeb = {
      ...MOCK_EVENT,
      start_at: "2026-02-15T06:00:00.000Z",
    };
    mockFindEventByName.mockResolvedValue({
      success: true,
      data: eventFeb,
    });

    const interaction = createMockInteraction({
      guildId: "guild-1",
      optionValues: {
        strings: { event: "テスト" },
        integers: { start_day: 30 },
      },
    });

    const editCommand = (await import("./edit.js")).default;
    await editCommand.execute(interaction as never);

    expect(interaction.editReply).toHaveBeenCalledWith(
      expect.objectContaining({
        embeds: expect.arrayContaining([
          expect.objectContaining({
            data: expect.objectContaining({
              title: expect.stringContaining("無効な開始日時"),
            }),
          }),
        ]),
      })
    );
    expect(mockUpdateEvent).not.toHaveBeenCalled();
  });

  it("shows error when start >= end after edit", async () => {
    // 終了日を開始日より前に設定
    mockUpdateEvent.mockResolvedValue({
      success: true,
      data: MOCK_EVENT,
    });

    const interaction = createMockInteraction({
      guildId: "guild-1",
      optionValues: {
        strings: { event: "テスト" },
        integers: { end_hour: 14 },
      },
    });

    const editCommand = (await import("./edit.js")).default;
    await editCommand.execute(interaction as never);

    expect(interaction.editReply).toHaveBeenCalledWith(
      expect.objectContaining({
        embeds: expect.arrayContaining([
          expect.objectContaining({
            data: expect.objectContaining({
              description: expect.stringContaining("開始時間が終了時間以降"),
            }),
          }),
        ]),
      })
    );
    expect(mockUpdateEvent).not.toHaveBeenCalled();
  });

  it("maps color choice to hex value", async () => {
    mockUpdateEvent.mockResolvedValue({
      success: true,
      data: { ...MOCK_EVENT, color: "#fd4028" },
    });

    const interaction = createMockInteraction({
      guildId: "guild-1",
      optionValues: {
        strings: { event: "テスト", color: "red" },
      },
    });

    const editCommand = (await import("./edit.js")).default;
    await editCommand.execute(interaction as never);

    expect(mockUpdateEvent).toHaveBeenCalledWith("evt-1", "guild-1", {
      color: "#fd4028",
    });
  });

  it("deduplicates notification values", async () => {
    mockUpdateEvent.mockResolvedValue({
      success: true,
      data: {
        ...MOCK_EVENT,
        notifications: [{ key: "n1", num: 30, unit: "minutes" }],
      },
    });

    const interaction = createMockInteraction({
      guildId: "guild-1",
      optionValues: {
        strings: {
          event: "テスト",
          notify_1: "30m",
          notify_2: "30m",
          notify_3: "1h",
        },
      },
    });

    const editCommand = (await import("./edit.js")).default;
    await editCommand.execute(interaction as never);

    expect(mockUpdateEvent).toHaveBeenCalledWith("evt-1", "guild-1", {
      notifications: [
        { key: "n1", num: 30, unit: "minutes" },
        { key: "n3", num: 1, unit: "hours" },
      ],
    });
  });

  it("allows start === end for all-day events", async () => {
    const allDayEvent = {
      ...MOCK_EVENT,
      is_all_day: true,
      // JST 2026-03-20 00:00 → UTC 2026-03-19 15:00
      start_at: "2026-03-19T15:00:00.000Z",
      end_at: "2026-03-19T15:00:00.000Z",
    };
    mockFindEventByName.mockResolvedValue({
      success: true,
      data: allDayEvent,
    });
    mockUpdateEvent.mockResolvedValue({
      success: true,
      data: {
        ...allDayEvent,
        start_at: "2026-03-20T15:00:00.000Z",
        end_at: "2026-03-20T15:00:00.000Z",
      },
    });

    const interaction = createMockInteraction({
      guildId: "guild-1",
      optionValues: {
        strings: { event: "テスト" },
        integers: { start_day: 21, end_day: 21 },
      },
    });

    const editCommand = (await import("./edit.js")).default;
    await editCommand.execute(interaction as never);

    expect(mockUpdateEvent).toHaveBeenCalled();
  });

  it("clears notifications with none value", async () => {
    mockUpdateEvent.mockResolvedValue({
      success: true,
      data: { ...MOCK_EVENT, notifications: [] },
    });

    const interaction = createMockInteraction({
      guildId: "guild-1",
      optionValues: {
        strings: { event: "テスト", notify_1: "none" },
      },
    });

    const editCommand = (await import("./edit.js")).default;
    await editCommand.execute(interaction as never);

    expect(mockUpdateEvent).toHaveBeenCalledWith("evt-1", "guild-1", {
      notifications: [],
    });
  });

  it("clears description with empty string", async () => {
    mockUpdateEvent.mockResolvedValue({
      success: true,
      data: { ...MOCK_EVENT, description: null },
    });

    const interaction = createMockInteraction({
      guildId: "guild-1",
      optionValues: {
        strings: { event: "テスト", description: "" },
      },
    });

    const editCommand = (await import("./edit.js")).default;
    await editCommand.execute(interaction as never);

    expect(mockUpdateEvent).toHaveBeenCalledWith("evt-1", "guild-1", {
      description: null,
    });
  });

  it("shows success embed on update", async () => {
    const updatedEvent = { ...MOCK_EVENT, name: "更新済み" };
    mockUpdateEvent.mockResolvedValue({
      success: true,
      data: updatedEvent,
    });

    const interaction = createMockInteraction({
      guildId: "guild-1",
      optionValues: {
        strings: { event: "テスト", name: "更新済み" },
      },
    });

    const editCommand = (await import("./edit.js")).default;
    await editCommand.execute(interaction as never);

    expect(interaction.editReply).toHaveBeenCalledWith(
      expect.objectContaining({
        content: "正常に予定を更新しました",
        embeds: expect.arrayContaining([
          expect.objectContaining({
            data: expect.objectContaining({
              title: "更新済み",
            }),
          }),
        ]),
      })
    );
  });

  it("shows error on update failure", async () => {
    mockUpdateEvent.mockResolvedValue({
      success: false,
      error: { code: "UPDATE_FAILED", message: "DB error" },
    });

    const interaction = createMockInteraction({
      guildId: "guild-1",
      optionValues: {
        strings: { event: "テスト", name: "新しい名前" },
      },
    });

    const editCommand = (await import("./edit.js")).default;
    await editCommand.execute(interaction as never);

    expect(interaction.editReply).toHaveBeenCalledWith(
      expect.objectContaining({
        embeds: expect.arrayContaining([
          expect.objectContaining({
            data: expect.objectContaining({
              title: expect.stringContaining("❌"),
              description: expect.stringContaining("更新に失敗"),
            }),
          }),
        ]),
      })
    );
  });
});

describe("mergeDateTime helper", () => {
  it("preserves all parts when no overrides", async () => {
    const { mergeDateTime } = await import("./edit.js");
    // UTC 06:00 → JST 15:00
    const result = mergeDateTime("2026-03-20T06:00:00.000Z", {});
    expect(result.valid).toBe(true);
    expect(result.parts).toEqual({
      year: 2026,
      month: 3,
      day: 20,
      hour: 15,
      minute: 0,
    });
    expect(result.iso).toBe("2026-03-20T06:00:00.000Z");
  });

  it("overrides only specified parts", async () => {
    const { mergeDateTime } = await import("./edit.js");
    const result = mergeDateTime("2026-03-20T06:00:00.000Z", { hour: 18 });
    expect(result.valid).toBe(true);
    expect(result.parts).toEqual({
      year: 2026,
      month: 3,
      day: 20,
      hour: 18,
      minute: 0,
    });
    // JST 18:00 → UTC 09:00
    expect(result.iso).toBe("2026-03-20T09:00:00.000Z");
  });

  it("returns invalid for impossible date", async () => {
    const { mergeDateTime } = await import("./edit.js");
    // 2月30日
    const result = mergeDateTime("2026-02-15T06:00:00.000Z", { day: 30 });
    expect(result.valid).toBe(false);
  });
});
