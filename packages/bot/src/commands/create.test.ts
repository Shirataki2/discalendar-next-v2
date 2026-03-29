import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ── service mocks ──
const mockCreateEvent = vi.fn();
const mockGetGuildConfig = vi.fn();
const mockHasManagementPermission = vi.fn();

vi.mock("../services/event-service.js", () => ({
  createEvent: (...args: unknown[]) => mockCreateEvent(...args),
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
const MOCK_CREATED_EVENT = {
  id: "evt-new",
  guild_id: "guild-1",
  name: "新しいイベント",
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
      getInteger: (name: string, required?: boolean) => {
        const val = integers[name] ?? null;
        if (required && val === null) {
          throw new Error(`Missing required option: ${name}`);
        }
        return val;
      },
      getBoolean: (name: string) => booleans[name] ?? null,
    },
    reply: vi.fn(),
    showModal: vi.fn(),
  };
}

function setupDefaultMocks() {
  mockGetGuildConfig.mockResolvedValue({
    success: true,
    data: { restricted: false },
  });
}

describe("create command", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    setupDefaultMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("has correct command data", async () => {
    const createCommand = (await import("./create.js")).default;
    expect(createCommand.data.name).toBe("create");
  });

  describe("modal path (name未指定)", () => {
    it("shows modal when name option is not provided", async () => {
      const interaction = createMockInteraction({
        guildId: "guild-1",
        optionValues: {},
      });

      const createCommand = (await import("./create.js")).default;
      await createCommand.execute(interaction as never);

      expect(interaction.showModal).toHaveBeenCalledTimes(1);
      expect(interaction.reply).not.toHaveBeenCalled();
    });

    it("returns guild-only error when not in guild", async () => {
      const interaction = createMockInteraction({
        optionValues: {},
      });

      const createCommand = (await import("./create.js")).default;
      await createCommand.execute(interaction as never);

      expect(interaction.reply).toHaveBeenCalledWith(
        expect.objectContaining({ ephemeral: true })
      );
      expect(interaction.showModal).not.toHaveBeenCalled();
    });

    it("returns permission error for restricted guild without permission", async () => {
      mockGetGuildConfig.mockResolvedValue({
        success: true,
        data: { restricted: true },
      });
      mockHasManagementPermission.mockReturnValue(false);

      const interaction = createMockInteraction({
        guildId: "guild-1",
        memberPermissions: false,
        optionValues: {},
      });

      const createCommand = (await import("./create.js")).default;
      await createCommand.execute(interaction as never);

      expect(interaction.reply).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining("権限"),
          ephemeral: true,
        })
      );
      expect(interaction.showModal).not.toHaveBeenCalled();
    });

    it("shows modal for restricted guild with permission", async () => {
      mockGetGuildConfig.mockResolvedValue({
        success: true,
        data: { restricted: true },
      });
      mockHasManagementPermission.mockReturnValue(true);

      const interaction = createMockInteraction({
        guildId: "guild-1",
        memberPermissions: true,
        optionValues: {},
      });

      const createCommand = (await import("./create.js")).default;
      await createCommand.execute(interaction as never);

      expect(interaction.showModal).toHaveBeenCalledTimes(1);
    });

    it("returns error when guild config fetch fails", async () => {
      mockGetGuildConfig.mockResolvedValue({
        success: false,
        error: { code: "FETCH_FAILED" },
      });

      const interaction = createMockInteraction({
        guildId: "guild-1",
        optionValues: {},
      });

      const createCommand = (await import("./create.js")).default;
      await createCommand.execute(interaction as never);

      expect(interaction.reply).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining("ギルド設定"),
          ephemeral: true,
        })
      );
      expect(interaction.showModal).not.toHaveBeenCalled();
    });
  });

  describe("inline path (name指定あり - 後方互換性)", () => {
    it("creates event with full inline options", async () => {
      mockCreateEvent.mockResolvedValue({
        success: true,
        data: MOCK_CREATED_EVENT,
      });

      const interaction = createMockInteraction({
        guildId: "guild-1",
        optionValues: {
          strings: { name: "新しいイベント" },
          integers: {
            start_year: 2026,
            start_month: 3,
            start_day: 20,
            start_hour: 15,
            start_minute: 0,
            end_year: 2026,
            end_month: 3,
            end_day: 20,
            end_hour: 17,
            end_minute: 0,
          },
        },
      });

      const createCommand = (await import("./create.js")).default;
      await createCommand.execute(interaction as never);

      expect(mockCreateEvent).toHaveBeenCalled();
      expect(interaction.reply).toHaveBeenCalledWith(
        expect.objectContaining({
          content: "正常に予定を作成しました",
        })
      );
      expect(interaction.showModal).not.toHaveBeenCalled();
    });

    it("returns error for invalid start datetime", async () => {
      const interaction = createMockInteraction({
        guildId: "guild-1",
        optionValues: {
          strings: { name: "イベント" },
          integers: {
            start_year: 2026,
            start_month: 2,
            start_day: 30,
            start_hour: 15,
            start_minute: 0,
            end_year: 2026,
            end_month: 3,
            end_day: 20,
            end_hour: 17,
            end_minute: 0,
          },
        },
      });

      const createCommand = (await import("./create.js")).default;
      await createCommand.execute(interaction as never);

      expect(interaction.reply).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining("無効な開始日時"),
          ephemeral: true,
        })
      );
    });

    it("returns error when start >= end", async () => {
      const interaction = createMockInteraction({
        guildId: "guild-1",
        optionValues: {
          strings: { name: "イベント" },
          integers: {
            start_year: 2026,
            start_month: 3,
            start_day: 20,
            start_hour: 18,
            start_minute: 0,
            end_year: 2026,
            end_month: 3,
            end_day: 20,
            end_hour: 17,
            end_minute: 0,
          },
        },
      });

      const createCommand = (await import("./create.js")).default;
      await createCommand.execute(interaction as never);

      expect(interaction.reply).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining("開始時間が終了時間以降"),
          ephemeral: true,
        })
      );
    });
  });
});
