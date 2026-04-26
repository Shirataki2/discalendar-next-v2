import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockCastVote = vi.fn();
const mockGetPoll = vi.fn();

vi.mock("../services/poll-service.js", () => ({
  castVote: (...args: unknown[]) => mockCastVote(...args),
  getPoll: (...args: unknown[]) => mockGetPoll(...args),
}));

vi.mock("../utils/logger.js", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
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

type ChoiceLabel = "yes" | "maybe" | "no";

function buildInteraction(
  customId: string,
  extra: { guildId?: string | null } = {}
) {
  const messageEdit = vi.fn().mockResolvedValue(undefined);

  return {
    customId,
    guildId: extra.guildId === undefined ? "guild-1" : extra.guildId,
    user: { id: "user-1" },
    message: {
      id: "msg-123",
      channelId: "chan-default",
      edit: messageEdit,
    },
    reply: vi.fn().mockResolvedValue(undefined),
    deferUpdate: vi.fn().mockResolvedValue(undefined),
    isButton: () => true,
    _edit: messageEdit,
  };
}

describe("poll-vote handler", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("customId の形式が poll: で始まらない場合は何もしない", async () => {
    const interaction = buildInteraction("other:xyz");
    const { handlePollVoteInteraction, isPollVoteInteraction } = await import(
      "./poll-vote.js"
    );
    expect(isPollVoteInteraction(interaction.customId)).toBe(false);

    await handlePollVoteInteraction(interaction as never);
    expect(mockCastVote).not.toHaveBeenCalled();
  });

  it("customId のパーツ数が不正な場合は warn ログを出し何もしない", async () => {
    const interaction = buildInteraction("poll:pollid");
    const { handlePollVoteInteraction } = await import("./poll-vote.js");
    await handlePollVoteInteraction(interaction as never);
    expect(mockCastVote).not.toHaveBeenCalled();
    expect(interaction.reply).toHaveBeenCalled();
  });

  it("choice が yes/maybe/no でない場合は ephemeral エラーを返す", async () => {
    const interaction = buildInteraction("poll:p:o:weird");
    const { handlePollVoteInteraction } = await import("./poll-vote.js");
    await handlePollVoteInteraction(interaction as never);
    expect(mockCastVote).not.toHaveBeenCalled();
    expect(interaction.reply).toHaveBeenCalled();
  });

  it("recorded の場合は castVote を呼びメッセージ更新をスケジュールする", async () => {
    vi.useFakeTimers();

    mockCastVote.mockResolvedValue({
      success: true,
      data: { kind: "recorded", previous: null },
    });

    const snapshot = {
      poll: {
        id: "p1",
        guild_id: "guild-1",
        title: "meetup",
        description: null,
        status: "open" as const,
        channel_id: "chan-default",
        message_id: "msg-123",
        created_by: "u",
        finalized_by: null,
        finalized_option_id: null,
        finalized_event_id: null,
        created_at: "2026-04-18T00:00:00Z",
        updated_at: "2026-04-18T00:00:00Z",
      },
      options: [
        {
          id: "o1",
          poll_id: "p1",
          starts_at: "2026-04-20T03:00:00.000Z",
          ends_at: "2026-04-20T04:00:00.000Z",
          position: 0,
          created_at: "2026-04-18T00:00:00Z",
        },
      ],
      aggregates: [],
    };
    mockGetPoll.mockResolvedValue({ success: true, data: snapshot });

    const interaction = buildInteraction("poll:p1:o1:yes");
    const { handlePollVoteInteraction } = await import("./poll-vote.js");
    await handlePollVoteInteraction(interaction as never);

    expect(mockCastVote).toHaveBeenCalledWith({
      pollId: "p1",
      optionId: "o1",
      userId: "user-1",
      choice: "yes" satisfies ChoiceLabel,
    });

    // 1.5 秒未満ではまだ edit されない
    await vi.advanceTimersByTimeAsync(500);
    expect(interaction._edit).not.toHaveBeenCalled();

    // 1.5 秒経過後に getPoll → edit が発火する
    await vi.advanceTimersByTimeAsync(1100);
    expect(mockGetPoll).toHaveBeenCalledWith("p1", "guild-1");
    expect(interaction._edit).toHaveBeenCalled();
  });

  it("rejected_closed の場合は ephemeral で拒否メッセージを返す", async () => {
    mockCastVote.mockResolvedValue({
      success: true,
      data: { kind: "rejected_closed" },
    });
    const interaction = buildInteraction("poll:p1:o1:no");
    const { handlePollVoteInteraction } = await import("./poll-vote.js");
    await handlePollVoteInteraction(interaction as never);

    expect(interaction.reply).toHaveBeenCalled();
    const [call] = interaction.reply.mock.calls[0];
    expect(JSON.stringify(call)).toContain("締め切");
  });

  it("revoked の場合は ephemeral で取り消しメッセージを返す", async () => {
    vi.useFakeTimers();
    mockCastVote.mockResolvedValue({
      success: true,
      data: { kind: "revoked" },
    });
    mockGetPoll.mockResolvedValue({
      success: false,
      error: { code: "POLL_NOT_FOUND", message: "gone" },
    });

    const interaction = buildInteraction("poll:p1:o1:yes");
    const { handlePollVoteInteraction } = await import("./poll-vote.js");
    await handlePollVoteInteraction(interaction as never);

    expect(interaction.reply).toHaveBeenCalled();
  });
});
