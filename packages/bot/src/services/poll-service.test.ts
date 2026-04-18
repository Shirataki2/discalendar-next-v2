import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type {
  PollOptionRecord,
  PollRecord,
  PollVoteRecord,
} from "../types/poll.js";

const mockFrom = vi.fn();

vi.mock("./supabase.js", () => ({
  getSupabaseClient: () => ({
    from: mockFrom,
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

function buildPollRecord(overrides: Partial<PollRecord> = {}): PollRecord {
  return {
    id: "poll-1",
    guild_id: "guild-1",
    title: "next meetup",
    description: null,
    status: "open",
    channel_id: "chan-1",
    message_id: null,
    created_by: "user-1",
    finalized_by: null,
    finalized_option_id: null,
    finalized_event_id: null,
    created_at: "2026-04-18T00:00:00Z",
    updated_at: "2026-04-18T00:00:00Z",
    ...overrides,
  };
}

function buildOption(
  overrides: Partial<PollOptionRecord> & { id: string; position: number }
): PollOptionRecord {
  return {
    id: overrides.id,
    poll_id: "poll-1",
    starts_at: "2026-04-20T12:00:00Z",
    ends_at: "2026-04-20T13:00:00Z",
    position: overrides.position,
    created_at: "2026-04-18T00:00:00Z",
    ...overrides,
  };
}

function buildVote(
  overrides: Partial<PollVoteRecord> & {
    id: string;
    option_id: string;
    user_id: string;
    choice: PollVoteRecord["choice"];
  }
): PollVoteRecord {
  return {
    poll_id: "poll-1",
    created_at: "2026-04-18T00:00:00Z",
    updated_at: "2026-04-18T00:00:00Z",
    ...overrides,
  };
}

describe("poll-service", () => {
  beforeEach(() => {
    vi.resetModules();
    mockFrom.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("createPoll", () => {
    it("2〜10 件の options 範囲外は INVALID_INPUT を返し DB を呼ばない", async () => {
      const { createPoll } = await import("./poll-service.js");

      const resultTooFew = await createPoll({
        guildId: "guild-1",
        channelId: "chan-1",
        actorUserId: "user-1",
        title: "t",
        description: null,
        messageId: null,
        options: [
          {
            startsAt: "2026-04-20T12:00:00Z",
            endsAt: null,
            position: 0,
          },
        ],
      });
      expect(resultTooFew.success).toBe(false);
      if (!resultTooFew.success) {
        expect(resultTooFew.error.code).toBe("INVALID_INPUT");
      }

      const manyOptions = Array.from({ length: 11 }, (_, idx) => ({
        startsAt: `2026-04-2${idx % 10}T12:00:00Z`,
        endsAt: null,
        position: idx,
      }));
      const resultTooMany = await createPoll({
        guildId: "guild-1",
        channelId: "chan-1",
        actorUserId: "user-1",
        title: "t",
        description: null,
        messageId: null,
        options: manyOptions,
      });
      expect(resultTooMany.success).toBe(false);
      if (!resultTooMany.success) {
        expect(resultTooMany.error.code).toBe("INVALID_INPUT");
      }

      expect(mockFrom).not.toHaveBeenCalled();
    });

    it("poll と options を挿入して snapshot を返す", async () => {
      const pollRecord = buildPollRecord();
      const optionsRecords = [
        buildOption({ id: "opt-1", position: 0 }),
        buildOption({ id: "opt-2", position: 1 }),
      ];

      // event_polls への insert → select().single()
      const pollSingle = vi
        .fn()
        .mockResolvedValue({ data: pollRecord, error: null });
      const pollSelect = vi.fn().mockReturnValue({ single: pollSingle });
      const pollInsert = vi.fn().mockReturnValue({ select: pollSelect });

      // event_poll_options への insert → select()
      const optionSelect = vi
        .fn()
        .mockResolvedValue({ data: optionsRecords, error: null });
      const optionInsert = vi.fn().mockReturnValue({ select: optionSelect });

      // event_poll_votes の select (aggregates)
      const voteEqSecond = vi.fn().mockResolvedValue({ data: [], error: null });
      const voteSelect = vi.fn().mockReturnValue({ eq: voteEqSecond });

      mockFrom.mockImplementation((table: string) => {
        if (table === "event_polls") {
          return { insert: pollInsert };
        }
        if (table === "event_poll_options") {
          return { insert: optionInsert };
        }
        if (table === "event_poll_votes") {
          return { select: voteSelect };
        }
        throw new Error(`unexpected table ${table}`);
      });

      const { createPoll } = await import("./poll-service.js");
      const result = await createPoll({
        guildId: "guild-1",
        channelId: "chan-1",
        actorUserId: "user-1",
        title: "next meetup",
        description: null,
        messageId: null,
        options: [
          {
            startsAt: "2026-04-20T12:00:00Z",
            endsAt: "2026-04-20T13:00:00Z",
            position: 0,
          },
          {
            startsAt: "2026-04-21T12:00:00Z",
            endsAt: null,
            position: 1,
          },
        ],
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.poll.id).toBe("poll-1");
        expect(result.data.options).toHaveLength(2);
        expect(result.data.aggregates).toHaveLength(2);
        expect(result.data.aggregates[0]).toEqual({
          optionId: "opt-1",
          counts: { yes: 0, maybe: 0, no: 0 },
          yesVoters: [],
        });
      }

      expect(pollInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          guild_id: "guild-1",
          channel_id: "chan-1",
          title: "next meetup",
          status: "open",
          created_by: "user-1",
        })
      );
      expect(optionInsert).toHaveBeenCalledWith([
        expect.objectContaining({
          poll_id: "poll-1",
          position: 0,
          starts_at: "2026-04-20T12:00:00Z",
        }),
        expect.objectContaining({
          poll_id: "poll-1",
          position: 1,
          starts_at: "2026-04-21T12:00:00Z",
        }),
      ]);
    });

    it("options 挿入失敗時は poll を削除してロールバックする", async () => {
      const pollRecord = buildPollRecord();

      const pollSingle = vi
        .fn()
        .mockResolvedValue({ data: pollRecord, error: null });
      const pollSelect = vi.fn().mockReturnValue({ single: pollSingle });
      const pollInsert = vi.fn().mockReturnValue({ select: pollSelect });

      const optionSelect = vi.fn().mockResolvedValue({
        data: null,
        error: { code: "23514", message: "check violation" },
      });
      const optionInsert = vi.fn().mockReturnValue({ select: optionSelect });

      const deleteEqSecond = vi.fn().mockResolvedValue({ error: null });
      const deleteEqFirst = vi.fn().mockReturnValue({ eq: deleteEqSecond });
      const pollDelete = vi.fn().mockReturnValue({ eq: deleteEqFirst });

      mockFrom.mockImplementation((table: string) => {
        if (table === "event_polls") {
          return { insert: pollInsert, delete: pollDelete };
        }
        if (table === "event_poll_options") {
          return { insert: optionInsert };
        }
        throw new Error(`unexpected ${table}`);
      });

      const { createPoll } = await import("./poll-service.js");
      const result = await createPoll({
        guildId: "guild-1",
        channelId: "chan-1",
        actorUserId: "user-1",
        title: "t",
        description: null,
        messageId: null,
        options: [
          {
            startsAt: "2026-04-20T12:00:00Z",
            endsAt: null,
            position: 0,
          },
          {
            startsAt: "2026-04-21T12:00:00Z",
            endsAt: null,
            position: 1,
          },
        ],
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe("INVALID_INPUT");
      }
      expect(pollDelete).toHaveBeenCalled();
      expect(deleteEqFirst).toHaveBeenCalledWith("id", "poll-1");
    });
  });

  describe("getPoll", () => {
    it("poll / options / votes を集計した snapshot を返す", async () => {
      const pollRecord = buildPollRecord();
      const options = [
        buildOption({ id: "opt-1", position: 0 }),
        buildOption({ id: "opt-2", position: 1 }),
      ];
      const votes = [
        buildVote({
          id: "v1",
          option_id: "opt-1",
          user_id: "u1",
          choice: "yes",
        }),
        buildVote({
          id: "v2",
          option_id: "opt-1",
          user_id: "u2",
          choice: "yes",
        }),
        buildVote({
          id: "v3",
          option_id: "opt-1",
          user_id: "u3",
          choice: "no",
        }),
        buildVote({
          id: "v4",
          option_id: "opt-2",
          user_id: "u1",
          choice: "maybe",
        }),
      ];

      const pollSingle = vi
        .fn()
        .mockResolvedValue({ data: pollRecord, error: null });
      const pollEqGuild = vi.fn().mockReturnValue({ single: pollSingle });
      const pollEqId = vi.fn().mockReturnValue({ eq: pollEqGuild });
      const pollSelect = vi.fn().mockReturnValue({ eq: pollEqId });

      const optionOrder = vi
        .fn()
        .mockResolvedValue({ data: options, error: null });
      const optionEq = vi.fn().mockReturnValue({ order: optionOrder });
      const optionSelect = vi.fn().mockReturnValue({ eq: optionEq });

      const voteEq = vi.fn().mockResolvedValue({ data: votes, error: null });
      const voteSelect = vi.fn().mockReturnValue({ eq: voteEq });

      mockFrom.mockImplementation((table: string) => {
        if (table === "event_polls") {
          return { select: pollSelect };
        }
        if (table === "event_poll_options") {
          return { select: optionSelect };
        }
        if (table === "event_poll_votes") {
          return { select: voteSelect };
        }
        throw new Error(`unexpected ${table}`);
      });

      const { getPoll } = await import("./poll-service.js");
      const result = await getPoll("poll-1", "guild-1");

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.aggregates).toEqual([
          {
            optionId: "opt-1",
            counts: { yes: 2, maybe: 0, no: 1 },
            yesVoters: ["u1", "u2"],
          },
          {
            optionId: "opt-2",
            counts: { yes: 0, maybe: 1, no: 0 },
            yesVoters: [],
          },
        ]);
      }

      expect(pollEqId).toHaveBeenCalledWith("id", "poll-1");
      expect(pollEqGuild).toHaveBeenCalledWith("guild_id", "guild-1");
    });

    it("PGRST116 は POLL_NOT_FOUND を返す", async () => {
      const pollSingle = vi.fn().mockResolvedValue({
        data: null,
        error: { code: "PGRST116", message: "no rows" },
      });
      const pollEqGuild = vi.fn().mockReturnValue({ single: pollSingle });
      const pollEqId = vi.fn().mockReturnValue({ eq: pollEqGuild });
      const pollSelect = vi.fn().mockReturnValue({ eq: pollEqId });

      mockFrom.mockImplementation((table: string) => {
        if (table === "event_polls") {
          return { select: pollSelect };
        }
        throw new Error(`unexpected ${table}`);
      });

      const { getPoll } = await import("./poll-service.js");
      const result = await getPoll("poll-missing", "guild-1");

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe("POLL_NOT_FOUND");
      }
    });
  });

  describe("deletePoll", () => {
    it("CASCADE 削除前提で event_polls を DELETE する", async () => {
      const deleteEqGuild = vi
        .fn()
        .mockResolvedValue({ data: [{ id: "poll-1" }], error: null });
      const deleteSelect = vi.fn().mockReturnValue({ eq: deleteEqGuild });
      const deleteEqId = vi.fn().mockReturnValue({ select: deleteSelect });
      const pollDelete = vi.fn().mockReturnValue({ eq: deleteEqId });

      mockFrom.mockImplementation((table: string) => {
        if (table === "event_polls") {
          return { delete: pollDelete };
        }
        throw new Error(`unexpected ${table}`);
      });

      const { deletePoll } = await import("./poll-service.js");
      const result = await deletePoll("poll-1", "guild-1");

      expect(result.success).toBe(true);
      expect(deleteEqId).toHaveBeenCalledWith("id", "poll-1");
      expect(deleteEqGuild).toHaveBeenCalledWith("guild_id", "guild-1");
    });

    it("0 件削除は POLL_NOT_FOUND を返す", async () => {
      const deleteEqGuild = vi
        .fn()
        .mockResolvedValue({ data: [], error: null });
      const deleteSelect = vi.fn().mockReturnValue({ eq: deleteEqGuild });
      const deleteEqId = vi.fn().mockReturnValue({ select: deleteSelect });
      const pollDelete = vi.fn().mockReturnValue({ eq: deleteEqId });

      mockFrom.mockImplementation((table: string) => {
        if (table === "event_polls") {
          return { delete: pollDelete };
        }
        throw new Error(`unexpected ${table}`);
      });

      const { deletePoll } = await import("./poll-service.js");
      const result = await deletePoll("poll-1", "guild-1");

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe("POLL_NOT_FOUND");
      }
    });
  });
});
