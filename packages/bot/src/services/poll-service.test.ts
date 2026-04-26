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

const OVERLAP_WARNING_REGEX = /重複/;

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
    it("2〜5 件の options 範囲外は INVALID_INPUT を返し DB を呼ばない", async () => {
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

  describe("castVote", () => {
    /**
     * castVote では次の順序で DB を呼ぶ:
     *   1) event_polls.select("status").eq("id").single()   — closed ガード
     *   2) event_poll_options.select("id").eq("id").eq("poll_id").maybeSingle()
     *      — option が当該 poll に属することの整合性検証
     *   3) event_poll_votes.select("id, choice").eq("poll_id").eq("option_id").eq("user_id").maybeSingle()
     *   4) upsert / delete いずれか
     */
    function buildPollStatusChain(status: "open" | "closed" | "finalized") {
      const single = vi
        .fn()
        .mockResolvedValue({ data: { status }, error: null });
      const eqId = vi.fn().mockReturnValue({ single });
      const select = vi.fn().mockReturnValue({ eq: eqId });
      return { select, eqId };
    }

    function buildOptionOwnershipChain(found: boolean) {
      const maybeSingle = vi.fn().mockResolvedValue({
        data: found ? { id: "opt-1" } : null,
        error: null,
      });
      const eqPoll = vi.fn().mockReturnValue({ maybeSingle });
      const eqId = vi.fn().mockReturnValue({ eq: eqPoll });
      const select = vi.fn().mockReturnValue({ eq: eqId });
      return { select };
    }

    function buildExistingVoteChain(
      existing: { id: string; choice: "yes" | "maybe" | "no" } | null
    ) {
      const maybeSingle = vi
        .fn()
        .mockResolvedValue({ data: existing, error: null });
      const eqUser = vi.fn().mockReturnValue({ maybeSingle });
      const eqOption = vi.fn().mockReturnValue({ eq: eqUser });
      const eqPoll = vi.fn().mockReturnValue({ eq: eqOption });
      const select = vi.fn().mockReturnValue({ eq: eqPoll });
      return { select, eqPoll, eqOption, eqUser };
    }

    it("closed ポールでは rejected_closed を返し votes テーブルを触らない", async () => {
      const pollChain = buildPollStatusChain("closed");
      const voteSelect = vi.fn();

      mockFrom.mockImplementation((table: string) => {
        if (table === "event_polls") {
          return { select: pollChain.select };
        }
        if (table === "event_poll_votes") {
          return { select: voteSelect };
        }
        throw new Error(`unexpected ${table}`);
      });

      const { castVote } = await import("./poll-service.js");
      const result = await castVote({
        pollId: "poll-1",
        optionId: "opt-1",
        userId: "u1",
        choice: "yes",
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.kind).toBe("rejected_closed");
      }
      expect(voteSelect).not.toHaveBeenCalled();
    });

    it("既存 vote がない場合は upsert して recorded(previous=null) を返す", async () => {
      const pollChain = buildPollStatusChain("open");
      const optionChain = buildOptionOwnershipChain(true);
      const existingChain = buildExistingVoteChain(null);

      const upsertResolved = vi
        .fn()
        .mockResolvedValue({ data: null, error: null });
      const upsert = vi.fn().mockReturnValue(upsertResolved);

      mockFrom.mockImplementation((table: string) => {
        if (table === "event_polls") {
          return { select: pollChain.select };
        }
        if (table === "event_poll_options") {
          return { select: optionChain.select };
        }
        if (table === "event_poll_votes") {
          return { select: existingChain.select, upsert };
        }
        throw new Error(`unexpected ${table}`);
      });

      const { castVote } = await import("./poll-service.js");
      const result = await castVote({
        pollId: "poll-1",
        optionId: "opt-1",
        userId: "u1",
        choice: "yes",
      });

      expect(result.success).toBe(true);
      if (result.success && result.data.kind === "recorded") {
        expect(result.data.previous).toBeNull();
      }
      expect(upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          poll_id: "poll-1",
          option_id: "opt-1",
          user_id: "u1",
          choice: "yes",
        }),
        expect.objectContaining({ onConflict: "option_id,user_id" })
      );
    });

    it("既存 vote と異なる choice で upsert し previous を返す", async () => {
      const pollChain = buildPollStatusChain("open");
      const optionChain = buildOptionOwnershipChain(true);
      const existingChain = buildExistingVoteChain({
        id: "vote-1",
        choice: "maybe",
      });

      const upsertResolved = vi
        .fn()
        .mockResolvedValue({ data: null, error: null });
      const upsert = vi.fn().mockReturnValue(upsertResolved);

      mockFrom.mockImplementation((table: string) => {
        if (table === "event_polls") {
          return { select: pollChain.select };
        }
        if (table === "event_poll_options") {
          return { select: optionChain.select };
        }
        if (table === "event_poll_votes") {
          return { select: existingChain.select, upsert };
        }
        throw new Error(`unexpected ${table}`);
      });

      const { castVote } = await import("./poll-service.js");
      const result = await castVote({
        pollId: "poll-1",
        optionId: "opt-1",
        userId: "u1",
        choice: "no",
      });

      expect(result.success).toBe(true);
      if (result.success && result.data.kind === "recorded") {
        expect(result.data.previous).toBe("maybe");
      }
      expect(upsert).toHaveBeenCalled();
    });

    it("同一 choice の再送信は vote を削除し revoked を返す", async () => {
      const pollChain = buildPollStatusChain("open");
      const optionChain = buildOptionOwnershipChain(true);
      const existingChain = buildExistingVoteChain({
        id: "vote-1",
        choice: "yes",
      });

      const deleteEq = vi.fn().mockResolvedValue({ error: null });
      const pollVotesDelete = vi.fn().mockReturnValue({ eq: deleteEq });
      const upsert = vi.fn();

      mockFrom.mockImplementation((table: string) => {
        if (table === "event_polls") {
          return { select: pollChain.select };
        }
        if (table === "event_poll_options") {
          return { select: optionChain.select };
        }
        if (table === "event_poll_votes") {
          return {
            select: existingChain.select,
            delete: pollVotesDelete,
            upsert,
          };
        }
        throw new Error(`unexpected ${table}`);
      });

      const { castVote } = await import("./poll-service.js");
      const result = await castVote({
        pollId: "poll-1",
        optionId: "opt-1",
        userId: "u1",
        choice: "yes",
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.kind).toBe("revoked");
      }
      expect(upsert).not.toHaveBeenCalled();
      expect(deleteEq).toHaveBeenCalledWith("id", "vote-1");
    });

    it("option_id が当該 poll に属さない場合は INVALID_INPUT を返す", async () => {
      const pollChain = buildPollStatusChain("open");
      const optionChain = buildOptionOwnershipChain(false);
      const existingSelect = vi.fn();
      const upsert = vi.fn();

      mockFrom.mockImplementation((table: string) => {
        if (table === "event_polls") {
          return { select: pollChain.select };
        }
        if (table === "event_poll_options") {
          return { select: optionChain.select };
        }
        if (table === "event_poll_votes") {
          return { select: existingSelect, upsert };
        }
        throw new Error(`unexpected ${table}`);
      });

      const { castVote } = await import("./poll-service.js");
      const result = await castVote({
        pollId: "poll-1",
        optionId: "opt-foreign",
        userId: "u1",
        choice: "yes",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe("INVALID_INPUT");
      }
      expect(existingSelect).not.toHaveBeenCalled();
      expect(upsert).not.toHaveBeenCalled();
    });

    it("poll が存在しない場合は POLL_NOT_FOUND を返す", async () => {
      const pollSingle = vi.fn().mockResolvedValue({
        data: null,
        error: { code: "PGRST116", message: "no rows" },
      });
      const pollEqId = vi.fn().mockReturnValue({ single: pollSingle });
      const pollSelect = vi.fn().mockReturnValue({ eq: pollEqId });

      mockFrom.mockImplementation((table: string) => {
        if (table === "event_polls") {
          return { select: pollSelect };
        }
        throw new Error(`unexpected ${table}`);
      });

      const { castVote } = await import("./poll-service.js");
      const result = await castVote({
        pollId: "poll-missing",
        optionId: "opt-1",
        userId: "u1",
        choice: "yes",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe("POLL_NOT_FOUND");
      }
    });
  });

  describe("closePoll", () => {
    /**
     * closePoll の DB 呼び出し順:
     *   supabase.from("event_polls")
     *     .update({ status: "closed" })
     *     .eq("id", ...)
     *     .eq("guild_id", ...)
     *     .eq("status", "open")
     *     .select()
     */
    function mockConditionalUpdate(data: unknown[] | null, error: unknown) {
      const select = vi.fn().mockResolvedValue({ data, error });
      const eqStatus = vi.fn().mockReturnValue({ select });
      const eqGuild = vi.fn().mockReturnValue({ eq: eqStatus });
      const eqId = vi.fn().mockReturnValue({ eq: eqGuild });
      const update = vi.fn().mockReturnValue({ eq: eqId });
      return { update, eqId, eqGuild, eqStatus, select };
    }

    function mockStatusFetch(status: "open" | "closed" | "finalized" | null) {
      const single = vi.fn().mockResolvedValue({
        data: status ? { status } : null,
        error: status
          ? null
          : { code: "PGRST116", message: "no rows returned" },
      });
      const eqGuild = vi.fn().mockReturnValue({ single });
      const eqId = vi.fn().mockReturnValue({ eq: eqGuild });
      const select = vi.fn().mockReturnValue({ eq: eqId });
      return { select, eqId, eqGuild, single };
    }

    function mockGetPollSnapshotChain(
      status: "open" | "closed" | "finalized" = "closed"
    ) {
      const pollRecord = buildPollRecord({ status });
      const options = [
        buildOption({ id: "opt-1", position: 0 }),
        buildOption({ id: "opt-2", position: 1 }),
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

      const voteEq = vi.fn().mockResolvedValue({ data: [], error: null });
      const voteSelect = vi.fn().mockReturnValue({ eq: voteEq });

      return { pollSelect, optionSelect, voteSelect, pollRecord, options };
    }

    it("open なポールを closed に条件付き UPDATE し snapshot を返す", async () => {
      const update = mockConditionalUpdate(
        [{ id: "poll-1", status: "closed" }],
        null
      );
      const snapshotChain = mockGetPollSnapshotChain("closed");

      let pollCall = 0;
      mockFrom.mockImplementation((table: string) => {
        if (table === "event_polls") {
          pollCall += 1;
          return pollCall === 1
            ? { update: update.update }
            : { select: snapshotChain.pollSelect };
        }
        if (table === "event_poll_options") {
          return { select: snapshotChain.optionSelect };
        }
        if (table === "event_poll_votes") {
          return { select: snapshotChain.voteSelect };
        }
        throw new Error(`unexpected ${table}`);
      });

      const { closePoll } = await import("./poll-service.js");
      const result = await closePoll("poll-1", "guild-1", "user-1");

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.poll.status).toBe("closed");
      }
      expect(update.update).toHaveBeenCalledWith(
        expect.objectContaining({ status: "closed" })
      );
      expect(update.eqStatus).toHaveBeenCalledWith("status", "open");
    });

    it("既に closed の場合は POLL_ALREADY_CLOSED を返す", async () => {
      const update = mockConditionalUpdate([], null);
      const statusChain = mockStatusFetch("closed");

      let pollCall = 0;
      mockFrom.mockImplementation((table: string) => {
        if (table === "event_polls") {
          pollCall += 1;
          return pollCall === 1
            ? { update: update.update }
            : { select: statusChain.select };
        }
        throw new Error(`unexpected ${table}`);
      });

      const { closePoll } = await import("./poll-service.js");
      const result = await closePoll("poll-1", "guild-1", "user-1");

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe("POLL_ALREADY_CLOSED");
      }
    });

    it("既に finalized の場合は POLL_ALREADY_FINALIZED を返す", async () => {
      const update = mockConditionalUpdate([], null);
      const statusChain = mockStatusFetch("finalized");

      let pollCall = 0;
      mockFrom.mockImplementation((table: string) => {
        if (table === "event_polls") {
          pollCall += 1;
          return pollCall === 1
            ? { update: update.update }
            : { select: statusChain.select };
        }
        throw new Error(`unexpected ${table}`);
      });

      const { closePoll } = await import("./poll-service.js");
      const result = await closePoll("poll-1", "guild-1", "user-1");

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe("POLL_ALREADY_FINALIZED");
      }
    });

    it("poll が存在しない場合は POLL_NOT_FOUND を返す", async () => {
      const update = mockConditionalUpdate([], null);
      const statusChain = mockStatusFetch(null);

      let pollCall = 0;
      mockFrom.mockImplementation((table: string) => {
        if (table === "event_polls") {
          pollCall += 1;
          return pollCall === 1
            ? { update: update.update }
            : { select: statusChain.select };
        }
        throw new Error(`unexpected ${table}`);
      });

      const { closePoll } = await import("./poll-service.js");
      const result = await closePoll("poll-1", "guild-1", "user-1");

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe("POLL_NOT_FOUND");
      }
    });
  });

  describe("finalizePoll", () => {
    /**
     * finalizePoll は createEventFromPoll を呼ぶため、そちらをモックする。
     */
    function buildSnapshotFetchers(opts: {
      pollStatus: "open" | "closed" | "finalized";
      votes: Array<{
        option_id: string;
        user_id: string;
        choice: "yes" | "maybe" | "no";
        ts?: string;
      }>;
      options?: Array<{ id: string; position: number }>;
    }) {
      const pollRecord = buildPollRecord({ status: opts.pollStatus });
      const optionsArr = (
        opts.options ?? [
          { id: "opt-1", position: 0 },
          { id: "opt-2", position: 1 },
        ]
      ).map((o) => buildOption(o));

      const votes = opts.votes.map((v, idx) =>
        buildVote({
          id: `vote-${idx}`,
          option_id: v.option_id,
          user_id: v.user_id,
          choice: v.choice,
          created_at: v.ts ?? `2026-04-18T00:00:0${idx}Z`,
        })
      );

      const pollSingle = vi
        .fn()
        .mockResolvedValue({ data: pollRecord, error: null });
      const pollEqGuild = vi.fn().mockReturnValue({ single: pollSingle });
      const pollEqId = vi.fn().mockReturnValue({ eq: pollEqGuild });
      const pollSelect = vi.fn().mockReturnValue({ eq: pollEqId });

      const optionOrder = vi
        .fn()
        .mockResolvedValue({ data: optionsArr, error: null });
      const optionEq = vi.fn().mockReturnValue({ order: optionOrder });
      const optionSelect = vi.fn().mockReturnValue({ eq: optionEq });

      const voteEq = vi.fn().mockResolvedValue({ data: votes, error: null });
      const voteSelect = vi.fn().mockReturnValue({ eq: voteEq });

      return {
        pollSelect,
        optionSelect,
        voteSelect,
        pollRecord,
        options: optionsArr,
        votes,
      };
    }

    function mockFinalizeUpdate(data: unknown[] | null = [{ id: "poll-1" }]) {
      const select = vi.fn().mockResolvedValue({ data, error: null });
      const eqStatusCurrent = vi.fn().mockReturnValue({ select });
      const eqGuild = vi.fn().mockReturnValue({ eq: eqStatusCurrent });
      const eqId = vi.fn().mockReturnValue({ eq: eqGuild });
      const update = vi.fn().mockReturnValue({ eq: eqId });
      return { update, eqId, eqGuild, eqStatusCurrent, select };
    }

    function mockExistingEventsForDupCheck(rows: Array<{ id: string }>) {
      const gt = vi.fn().mockResolvedValue({ data: rows, error: null });
      const lt = vi.fn().mockReturnValue({ gt });
      const eq = vi.fn().mockReturnValue({ lt });
      const select = vi.fn().mockReturnValue({ eq });
      return { select };
    }

    it("optionId 未指定で yes 最多候補を自動選択して finalize する", async () => {
      const snapshot = buildSnapshotFetchers({
        pollStatus: "closed",
        votes: [
          { option_id: "opt-1", user_id: "u1", choice: "yes" },
          { option_id: "opt-1", user_id: "u2", choice: "yes" },
          { option_id: "opt-2", user_id: "u3", choice: "yes" },
        ],
      });

      // closed→finalized の conditional update
      const finalizeUpdate = mockFinalizeUpdate();
      // events INSERT のモック
      const eventSingle = vi.fn().mockResolvedValue({
        data: {
          id: "evt-new",
          guild_id: "guild-1",
          name: "next meetup",
          description: null,
          color: "#3B82F6",
          is_all_day: false,
          start_at: "2026-04-20T12:00:00Z",
          end_at: "2026-04-20T13:00:00Z",
          location: null,
          channel_id: null,
          channel_name: null,
          notifications: [],
          created_at: "2026-04-18T00:00:00Z",
          updated_at: "2026-04-18T00:00:00Z",
        },
        error: null,
      });
      const eventSelect = vi.fn().mockReturnValue({ single: eventSingle });
      const eventInsert = vi.fn().mockReturnValue({ select: eventSelect });

      const dupCheck = mockExistingEventsForDupCheck([]);

      let pollCall = 0;
      mockFrom.mockImplementation((table: string) => {
        if (table === "event_polls") {
          pollCall += 1;
          if (pollCall === 1) {
            return { select: snapshot.pollSelect };
          }
          return { update: finalizeUpdate.update };
        }
        if (table === "event_poll_options") {
          return { select: snapshot.optionSelect };
        }
        if (table === "event_poll_votes") {
          return { select: snapshot.voteSelect };
        }
        if (table === "events") {
          return { select: dupCheck.select, insert: eventInsert };
        }
        throw new Error(`unexpected ${table}`);
      });

      const { finalizePoll } = await import("./poll-service.js");
      const result = await finalizePoll({
        pollId: "poll-1",
        guildId: "guild-1",
        actorUserId: "user-1",
        optionId: null,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.eventId).toBe("evt-new");
        expect(result.data.warnings).toEqual([]);
      }
      // finalized への update は closed 状態から遷移する
      expect(finalizeUpdate.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: "finalized",
          finalized_event_id: "evt-new",
          finalized_option_id: "opt-1",
          finalized_by: "user-1",
        })
      );
    });

    it("yes 同数の候補が複数あるときは TIE_BREAK_REQUIRED を返す", async () => {
      const snapshot = buildSnapshotFetchers({
        pollStatus: "closed",
        votes: [
          { option_id: "opt-1", user_id: "u1", choice: "yes" },
          { option_id: "opt-2", user_id: "u2", choice: "yes" },
        ],
      });

      mockFrom.mockImplementation((table: string) => {
        if (table === "event_polls") {
          return { select: snapshot.pollSelect };
        }
        if (table === "event_poll_options") {
          return { select: snapshot.optionSelect };
        }
        if (table === "event_poll_votes") {
          return { select: snapshot.voteSelect };
        }
        throw new Error(`unexpected ${table}`);
      });

      const { finalizePoll } = await import("./poll-service.js");
      const result = await finalizePoll({
        pollId: "poll-1",
        guildId: "guild-1",
        actorUserId: "user-1",
        optionId: null,
      });

      expect(result.success).toBe(false);
      if (!result.success && result.error.code === "TIE_BREAK_REQUIRED") {
        expect(result.error.candidateOptionIds).toEqual(
          expect.arrayContaining(["opt-1", "opt-2"])
        );
      } else {
        throw new Error("expected TIE_BREAK_REQUIRED");
      }
    });

    it("既に finalized なら POLL_ALREADY_FINALIZED を返す", async () => {
      const snapshot = buildSnapshotFetchers({
        pollStatus: "finalized",
        votes: [],
      });

      mockFrom.mockImplementation((table: string) => {
        if (table === "event_polls") {
          return { select: snapshot.pollSelect };
        }
        if (table === "event_poll_options") {
          return { select: snapshot.optionSelect };
        }
        if (table === "event_poll_votes") {
          return { select: snapshot.voteSelect };
        }
        throw new Error(`unexpected ${table}`);
      });

      const { finalizePoll } = await import("./poll-service.js");
      const result = await finalizePoll({
        pollId: "poll-1",
        guildId: "guild-1",
        actorUserId: "user-1",
        optionId: "opt-1",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe("POLL_ALREADY_FINALIZED");
      }
    });

    it("events INSERT 失敗時は status を closed に戻し EVENT_CREATE_FAILED を返す", async () => {
      const snapshot = buildSnapshotFetchers({
        pollStatus: "open",
        votes: [{ option_id: "opt-1", user_id: "u1", choice: "yes" }],
      });

      // open→closed の先行遷移
      const preCloseUpdate = mockFinalizeUpdate();
      // ロールバック用 closed→open の UPDATE
      const rollbackUpdate = mockFinalizeUpdate();

      const eventSingle = vi.fn().mockResolvedValue({
        data: null,
        error: { code: "23503", message: "fk violation" },
      });
      const eventSelect = vi.fn().mockReturnValue({ single: eventSingle });
      const eventInsert = vi.fn().mockReturnValue({ select: eventSelect });

      const dupCheck = mockExistingEventsForDupCheck([]);

      let pollCall = 0;
      mockFrom.mockImplementation((table: string) => {
        if (table === "event_polls") {
          pollCall += 1;
          if (pollCall === 1) {
            return { select: snapshot.pollSelect };
          }
          if (pollCall === 2) {
            // open→closed
            return { update: preCloseUpdate.update };
          }
          // rollback: closed→open
          return { update: rollbackUpdate.update };
        }
        if (table === "event_poll_options") {
          return { select: snapshot.optionSelect };
        }
        if (table === "event_poll_votes") {
          return { select: snapshot.voteSelect };
        }
        if (table === "events") {
          return { select: dupCheck.select, insert: eventInsert };
        }
        throw new Error(`unexpected ${table}`);
      });

      const { finalizePoll } = await import("./poll-service.js");
      const result = await finalizePoll({
        pollId: "poll-1",
        guildId: "guild-1",
        actorUserId: "user-1",
        optionId: "opt-1",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe("EVENT_CREATE_FAILED");
      }
      expect(rollbackUpdate.update).toHaveBeenCalledWith(
        expect.objectContaining({ status: "open" })
      );
    });

    it("既存 events と時間帯が重複する場合は warnings を付与する", async () => {
      const snapshot = buildSnapshotFetchers({
        pollStatus: "closed",
        votes: [{ option_id: "opt-1", user_id: "u1", choice: "yes" }],
      });

      const finalizeUpdate = mockFinalizeUpdate();
      const eventSingle = vi.fn().mockResolvedValue({
        data: {
          id: "evt-new",
          guild_id: "guild-1",
          name: "next meetup",
          description: null,
          color: "#3B82F6",
          is_all_day: false,
          start_at: "2026-04-20T12:00:00Z",
          end_at: "2026-04-20T13:00:00Z",
          location: null,
          channel_id: null,
          channel_name: null,
          notifications: [],
          created_at: "2026-04-18T00:00:00Z",
          updated_at: "2026-04-18T00:00:00Z",
        },
        error: null,
      });
      const eventSelect = vi.fn().mockReturnValue({ single: eventSingle });
      const eventInsert = vi.fn().mockReturnValue({ select: eventSelect });

      const dupCheck = mockExistingEventsForDupCheck([{ id: "evt-existing" }]);

      let pollCall = 0;
      mockFrom.mockImplementation((table: string) => {
        if (table === "event_polls") {
          pollCall += 1;
          return pollCall === 1
            ? { select: snapshot.pollSelect }
            : { update: finalizeUpdate.update };
        }
        if (table === "event_poll_options") {
          return { select: snapshot.optionSelect };
        }
        if (table === "event_poll_votes") {
          return { select: snapshot.voteSelect };
        }
        if (table === "events") {
          return { select: dupCheck.select, insert: eventInsert };
        }
        throw new Error(`unexpected ${table}`);
      });

      const { finalizePoll } = await import("./poll-service.js");
      const result = await finalizePoll({
        pollId: "poll-1",
        guildId: "guild-1",
        actorUserId: "user-1",
        optionId: "opt-1",
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.warnings.length).toBeGreaterThan(0);
        expect(result.data.warnings[0]).toMatch(OVERLAP_WARNING_REGEX);
      }
    });
  });
});
