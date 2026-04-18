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

const mockLoggerInfo = vi.fn();
const mockLoggerWarn = vi.fn();
const mockLoggerError = vi.fn();

vi.mock("../utils/logger.js", () => ({
  logger: {
    info: (...args: unknown[]) => mockLoggerInfo(...args),
    warn: (...args: unknown[]) => mockLoggerWarn(...args),
    error: (...args: unknown[]) => mockLoggerError(...args),
    debug: vi.fn(),
  },
}));

vi.mock("../config.js", () => ({
  getConfig: () => ({
    botToken: "test",
    applicationId: "test",
    supabaseUrl: "http://localhost",
    supabaseServiceKey: "test-key",
    invitationUrl: "",
    supportServerUrl: "",
    logLevel: "silent",
    sentryDsn: undefined,
    devGuildId: undefined,
    webBaseUrl: "https://discalendar.app",
  }),
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
const CLOSED_MESSAGE_REGEX = /締め切|既に/;

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

  describe("/poll close", () => {
    function snapshotFixture(
      status: "open" | "closed" | "finalized",
      messageId: string | null = "msg-123"
    ) {
      return {
        poll: {
          id: "poll-1",
          guild_id: "guild-1",
          title: "meetup",
          description: null,
          status,
          channel_id: "chan-default",
          message_id: messageId,
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
        ],
        aggregates: [],
      };
    }

    it("成功時にメッセージを編集して締切済に更新する", async () => {
      mockClosePoll.mockResolvedValue({
        success: true,
        data: snapshotFixture("closed"),
      });

      const messageEdit = vi.fn().mockResolvedValue(undefined);
      const messageFetch = vi
        .fn()
        .mockResolvedValue({ id: "msg-123", edit: messageEdit });

      const channelWithMessages = {
        id: "chan-default",
        send: vi.fn(),
        isTextBased: () => true,
        messages: { fetch: messageFetch },
      };

      const interaction = buildInteraction("guild-1", {
        subcommand: "close",
        strings: { poll_id: "poll-1" },
      });
      interaction.guild.channels.fetch = vi
        .fn()
        .mockResolvedValue(channelWithMessages);

      const pollCommand = (await import("./poll.js")).default;
      await pollCommand.execute(interaction as never);

      expect(mockClosePoll).toHaveBeenCalledWith("poll-1", "guild-1", "user-1");
      expect(messageEdit).toHaveBeenCalled();
      expect(interaction.editReply).toHaveBeenCalled();
    });

    it("既に closed の場合は POLL_ALREADY_CLOSED メッセージを表示する", async () => {
      mockClosePoll.mockResolvedValue({
        success: false,
        error: { code: "POLL_ALREADY_CLOSED", message: "closed" },
      });

      const interaction = buildInteraction("guild-1", {
        subcommand: "close",
        strings: { poll_id: "poll-1" },
      });

      const pollCommand = (await import("./poll.js")).default;
      await pollCommand.execute(interaction as never);

      expect(interaction.editReply).toHaveBeenCalled();
      const [call] = interaction.editReply.mock.calls[0];
      expect(JSON.stringify(call)).toMatch(CLOSED_MESSAGE_REGEX);
    });

    it("POLL_NOT_FOUND は not-found メッセージを返す", async () => {
      mockClosePoll.mockResolvedValue({
        success: false,
        error: { code: "POLL_NOT_FOUND", message: "not found" },
      });

      const interaction = buildInteraction("guild-1", {
        subcommand: "close",
        strings: { poll_id: "poll-1" },
      });

      const pollCommand = (await import("./poll.js")).default;
      await pollCommand.execute(interaction as never);

      expect(interaction.editReply).toHaveBeenCalled();
    });
  });

  describe("/poll finalize", () => {
    function finalizedSnapshot() {
      return {
        poll: {
          id: "poll-1",
          guild_id: "guild-1",
          title: "meetup",
          description: null,
          status: "finalized" as const,
          channel_id: "chan-default",
          message_id: "msg-123",
          created_by: "user-1",
          finalized_by: "user-1",
          finalized_option_id: "opt-1",
          finalized_event_id: "evt-1",
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
        ],
        aggregates: [
          {
            optionId: "opt-1",
            counts: { yes: 3, maybe: 0, no: 0 },
            yesVoters: ["u1", "u2", "u3"],
          },
        ],
      };
    }

    it("TIE_BREAK_REQUIRED の場合は候補指定を促すメッセージを返す", async () => {
      mockFinalizePoll.mockResolvedValue({
        success: false,
        error: {
          code: "TIE_BREAK_REQUIRED",
          message: "tie",
          candidateOptionIds: ["opt-1", "opt-2"],
        },
      });

      const interaction = buildInteraction("guild-1", {
        subcommand: "finalize",
        strings: { poll_id: "poll-1", option_id: null },
      });

      const pollCommand = (await import("./poll.js")).default;
      await pollCommand.execute(interaction as never);

      expect(interaction.editReply).toHaveBeenCalled();
      const [call] = interaction.editReply.mock.calls[0];
      expect(JSON.stringify(call)).toContain("opt-1");
      expect(JSON.stringify(call)).toContain("opt-2");
    });

    it("成功時はメッセージを更新し /dashboard リンク付きの応答を返す", async () => {
      mockFinalizePoll.mockResolvedValue({
        success: true,
        data: {
          snapshot: finalizedSnapshot(),
          eventId: "evt-1",
          warnings: [],
        },
      });

      const messageEdit = vi.fn().mockResolvedValue(undefined);
      const messageFetch = vi
        .fn()
        .mockResolvedValue({ id: "msg-123", edit: messageEdit });

      const channelWithMessages = {
        id: "chan-default",
        send: vi.fn(),
        isTextBased: () => true,
        messages: { fetch: messageFetch },
      };

      const interaction = buildInteraction("guild-1", {
        subcommand: "finalize",
        strings: { poll_id: "poll-1", option_id: "opt-1" },
      });
      interaction.guild.channels.fetch = vi
        .fn()
        .mockResolvedValue(channelWithMessages);

      const pollCommand = (await import("./poll.js")).default;
      await pollCommand.execute(interaction as never);

      expect(mockFinalizePoll).toHaveBeenCalledWith(
        expect.objectContaining({
          pollId: "poll-1",
          guildId: "guild-1",
          optionId: "opt-1",
        })
      );
      expect(messageEdit).toHaveBeenCalled();
      const [replyCall] = interaction.editReply.mock.calls[0];
      expect(JSON.stringify(replyCall)).toContain("evt-1");
    });

    it("EVENT_CREATE_FAILED はエラー応答を返す", async () => {
      mockFinalizePoll.mockResolvedValue({
        success: false,
        error: { code: "EVENT_CREATE_FAILED", message: "boom" },
      });

      const interaction = buildInteraction("guild-1", {
        subcommand: "finalize",
        strings: { poll_id: "poll-1", option_id: "opt-1" },
      });

      const pollCommand = (await import("./poll.js")).default;
      await pollCommand.execute(interaction as never);

      expect(interaction.editReply).toHaveBeenCalled();
    });

    it("成功時は構造化ログに pollId / eventId / guildId を含める", async () => {
      mockFinalizePoll.mockResolvedValue({
        success: true,
        data: {
          snapshot: finalizedSnapshot(),
          eventId: "evt-1",
          warnings: [],
        },
      });

      const interaction = buildInteraction("guild-1", {
        subcommand: "finalize",
        strings: { poll_id: "poll-1", option_id: "opt-1" },
      });

      const pollCommand = (await import("./poll.js")).default;
      await pollCommand.execute(interaction as never);

      const logged = mockLoggerInfo.mock.calls.find(
        (call) => call[1] === "poll_finalize success"
      );
      expect(logged).toBeDefined();
      if (logged) {
        expect(logged[0]).toMatchObject({
          guildId: "guild-1",
          pollId: "poll-1",
          eventId: "evt-1",
        });
      }
    });

    it("warnings がある場合はメッセージに含める", async () => {
      mockFinalizePoll.mockResolvedValue({
        success: true,
        data: {
          snapshot: finalizedSnapshot(),
          eventId: "evt-1",
          warnings: ["同時刻の既存イベントあり"],
        },
      });

      const interaction = buildInteraction("guild-1", {
        subcommand: "finalize",
        strings: { poll_id: "poll-1", option_id: "opt-1" },
      });

      const pollCommand = (await import("./poll.js")).default;
      await pollCommand.execute(interaction as never);

      const [replyCall] = interaction.editReply.mock.calls[0];
      expect(JSON.stringify(replyCall)).toContain("同時刻の既存イベント");
    });
  });
});
