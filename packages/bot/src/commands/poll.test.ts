import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockCreatePoll = vi.fn();
const mockClosePoll = vi.fn();
const mockFinalizePoll = vi.fn();
const mockDeletePoll = vi.fn();
const mockGetGuildConfig = vi.fn();
const mockHasManagementPermission = vi.fn();
const mockGetEventSettings = vi.fn();

vi.mock("../services/poll-service.js", () => ({
  createPoll: (...args: unknown[]) => mockCreatePoll(...args),
  closePoll: (...args: unknown[]) => mockClosePoll(...args),
  finalizePoll: (...args: unknown[]) => mockFinalizePoll(...args),
  deletePoll: (...args: unknown[]) => mockDeletePoll(...args),
}));

vi.mock("../services/guild-service.js", () => ({
  getGuildConfig: (...args: unknown[]) => mockGetGuildConfig(...args),
}));

vi.mock("../services/event-service.js", () => ({
  getEventSettings: (...args: unknown[]) => mockGetEventSettings(...args),
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

type InteractionOptions = {
  subcommand: "create" | "close" | "finalize";
  strings?: Record<string, string | null>;
  integers?: Record<string, number | null>;
  channels?: Record<string, { id: string; name: string } | null>;
};

function buildInteraction(
  guildId: string,
  opts: InteractionOptions,
  extra: { managementPerm?: boolean } = {}
) {
  const strings = opts.strings ?? {};
  const integers = opts.integers ?? {};
  const channels = opts.channels ?? {};

  const channelSend = vi.fn().mockResolvedValue({
    id: "msg-123",
    edit: vi.fn(),
    delete: vi.fn(),
  });
  const defaultChannel = { id: "chan-default", send: channelSend };

  const channelGetter = vi.fn((name: string) => {
    const value = channels[name];
    if (!value) {
      return null;
    }
    return { ...value, send: channelSend };
  });

  return {
    guild: {
      id: guildId,
      channels: {
        fetch: vi.fn().mockResolvedValue(defaultChannel),
      },
    },
    channel: defaultChannel,
    member: extra.managementPerm ? {} : null,
    user: { id: "user-1" },
    options: {
      getSubcommand: () => opts.subcommand,
      getString: (name: string, required?: boolean) => {
        const val = strings[name] ?? null;
        if (required && val === null) {
          throw new Error(`required: ${name}`);
        }
        return val;
      },
      getInteger: (name: string) => integers[name] ?? null,
      getChannel: channelGetter,
    },
    deferReply: vi.fn().mockResolvedValue(undefined),
    editReply: vi.fn().mockResolvedValue(undefined),
    reply: vi.fn().mockResolvedValue(undefined),
    deferred: false,
    replied: false,
    _sendFn: channelSend,
  };
}

const OPTIONS_COUNT_ERROR_REGEX = /候補.*2/;

describe("poll command", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    mockGetGuildConfig.mockResolvedValue({
      success: true,
      data: { restricted: false },
    });
    mockGetEventSettings.mockResolvedValue({ success: true, data: null });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("コマンド定義が poll として登録される", async () => {
    const pollCommand = (await import("./poll.js")).default;
    expect(pollCommand.data.name).toBe("poll");
  });

  describe("/poll create", () => {
    it("options 件数が 2 未満のときは INVALID_INPUT エラー応答", async () => {
      const interaction = buildInteraction("guild-1", {
        subcommand: "create",
        strings: {
          title: "meetup",
          options: "2026/04/20 12:00",
        },
      });

      const pollCommand = (await import("./poll.js")).default;
      await pollCommand.execute(interaction as never);

      expect(interaction.editReply).toHaveBeenCalled();
      const [call] = interaction.editReply.mock.calls[0];
      expect(JSON.stringify(call)).toMatch(OPTIONS_COUNT_ERROR_REGEX);
      expect(mockCreatePoll).not.toHaveBeenCalled();
    });

    it("restricted モードで管理権限が無い場合はエラー応答", async () => {
      mockGetGuildConfig.mockResolvedValue({
        success: true,
        data: { restricted: true },
      });
      mockHasManagementPermission.mockReturnValue(false);

      const interaction = buildInteraction(
        "guild-1",
        {
          subcommand: "create",
          strings: {
            title: "meetup",
            options: "2026/04/20 12:00,2026/04/21 12:00",
          },
        },
        { managementPerm: true }
      );

      const pollCommand = (await import("./poll.js")).default;
      await pollCommand.execute(interaction as never);

      expect(mockCreatePoll).not.toHaveBeenCalled();
      expect(interaction.editReply).toHaveBeenCalled();
    });

    it("成功時は createPoll を呼び、チャンネルに Embed + ボタンを投稿する", async () => {
      mockCreatePoll.mockResolvedValue({
        success: true,
        data: {
          poll: {
            id: "poll-1",
            guild_id: "guild-1",
            title: "meetup",
            description: null,
            status: "open",
            channel_id: "chan-default",
            message_id: null,
            created_by: "user-1",
            finalized_by: null,
            finalized_option_id: null,
            finalized_event_id: null,
            created_at: "2026-04-18T00:00:00Z",
            updated_at: "2026-04-18T00:00:00Z",
          },
          options: [
            {
              id: "opt-1",
              poll_id: "poll-1",
              starts_at: "2026-04-20T03:00:00.000Z",
              ends_at: "2026-04-20T04:00:00.000Z",
              position: 0,
              created_at: "2026-04-18T00:00:00Z",
            },
            {
              id: "opt-2",
              poll_id: "poll-1",
              starts_at: "2026-04-21T03:00:00.000Z",
              ends_at: "2026-04-21T04:00:00.000Z",
              position: 1,
              created_at: "2026-04-18T00:00:00Z",
            },
          ],
          aggregates: [],
        },
      });

      const interaction = buildInteraction("guild-1", {
        subcommand: "create",
        strings: {
          title: "meetup",
          options: "2026/04/20 12:00,2026/04/21 12:00",
        },
      });

      const pollCommand = (await import("./poll.js")).default;
      await pollCommand.execute(interaction as never);

      expect(mockCreatePoll).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "meetup",
          guildId: "guild-1",
          actorUserId: "user-1",
          options: expect.arrayContaining([
            expect.objectContaining({ position: 0 }),
            expect.objectContaining({ position: 1 }),
          ]),
        })
      );

      expect(interaction._sendFn).toHaveBeenCalled();
      const sendArgs = interaction._sendFn.mock.calls[0][0];
      expect(sendArgs.embeds).toHaveLength(1);
      expect(sendArgs.components?.length).toBeGreaterThan(0);
    });

    it("Supabase 失敗時はエラー応答を返す", async () => {
      mockCreatePoll.mockResolvedValue({
        success: false,
        error: { code: "INTERNAL", message: "boom" },
      });

      const interaction = buildInteraction("guild-1", {
        subcommand: "create",
        strings: {
          title: "meetup",
          options: "2026/04/20 12:00,2026/04/21 12:00",
        },
      });

      const pollCommand = (await import("./poll.js")).default;
      await pollCommand.execute(interaction as never);

      expect(interaction.editReply).toHaveBeenCalled();
      expect(interaction._sendFn).not.toHaveBeenCalled();
    });
  });
});
