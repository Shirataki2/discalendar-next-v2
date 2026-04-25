import { describe, expect, it, vi } from "vitest";
import { closePoll, finalizePoll, getPollSnapshot, listPolls } from "./poll-service";
import type { PollOptionRecord, PollRecord, PollVoteRecord } from "./types";

function buildPoll(overrides: Partial<PollRecord> = {}): PollRecord {
  return {
    id: "poll-1",
    guild_id: "guild-1",
    title: "meetup",
    description: null,
    status: "open",
    channel_id: "c1",
    message_id: null,
    created_by: "u1",
    finalized_by: null,
    finalized_option_id: null,
    finalized_event_id: null,
    created_at: "2026-04-18T00:00:00Z",
    updated_at: "2026-04-18T00:00:00Z",
    ...overrides,
  };
}

function buildOption(
  id: string,
  position: number,
  startsAt = "2026-04-20T03:00:00Z",
  endsAt: string | null = "2026-04-20T04:00:00Z"
): PollOptionRecord {
  return {
    id,
    poll_id: "poll-1",
    starts_at: startsAt,
    ends_at: endsAt,
    position,
    created_at: "2026-04-18T00:00:00Z",
  };
}

function buildVote(
  id: string,
  optionId: string,
  userId: string,
  choice: "yes" | "maybe" | "no"
): PollVoteRecord {
  return {
    id,
    poll_id: "poll-1",
    option_id: optionId,
    user_id: userId,
    choice,
    created_at: "2026-04-18T00:00:00Z",
    updated_at: "2026-04-18T00:00:00Z",
  };
}

function createMockClient(tables: Record<string, unknown>): unknown {
  return {
    from: (table: string) => {
      const impl = tables[table];
      if (!impl) {
        throw new Error(`unexpected table ${table}`);
      }
      return impl;
    },
  };
}

describe("web poll-service", () => {
  describe("listPolls", () => {
    it("guild_id でフィルタして降順で返す", async () => {
      const poll = buildPoll();
      const limit = vi
        .fn()
        .mockResolvedValue({ data: [poll], error: null });
      const order = vi.fn().mockReturnValue({ limit });
      const eq = vi.fn().mockReturnValue({ order });
      const select = vi.fn().mockReturnValue({ eq });
      const client = createMockClient({ event_polls: { select } });

      const result = await listPolls(client as never, "guild-1");

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(1);
      }
      expect(eq).toHaveBeenCalledWith("guild_id", "guild-1");
    });
  });

  describe("getPollSnapshot", () => {
    it("poll / options / votes を取得して aggregates を計算する", async () => {
      const poll = buildPoll();
      const options = [buildOption("opt-1", 0), buildOption("opt-2", 1)];
      const votes = [
        buildVote("v1", "opt-1", "u1", "yes"),
        buildVote("v2", "opt-1", "u2", "yes"),
      ];

      const pollSingle = vi.fn().mockResolvedValue({ data: poll, error: null });
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

      const client = createMockClient({
        event_polls: { select: pollSelect },
        event_poll_options: { select: optionSelect },
        event_poll_votes: { select: voteSelect },
      });

      const result = await getPollSnapshot(client as never, "guild-1", "poll-1");

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.aggregates[0]).toEqual({
          optionId: "opt-1",
          counts: { yes: 2, maybe: 0, no: 0 },
          yesVoters: ["u1", "u2"],
        });
      }
    });

    it("PGRST116 は POLL_NOT_FOUND を返す", async () => {
      const pollSingle = vi.fn().mockResolvedValue({
        data: null,
        error: { code: "PGRST116", message: "no rows" },
      });
      const pollEqGuild = vi.fn().mockReturnValue({ single: pollSingle });
      const pollEqId = vi.fn().mockReturnValue({ eq: pollEqGuild });
      const pollSelect = vi.fn().mockReturnValue({ eq: pollEqId });
      const client = createMockClient({ event_polls: { select: pollSelect } });

      const result = await getPollSnapshot(
        client as never,
        "guild-1",
        "poll-1"
      );
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe("POLL_NOT_FOUND");
      }
    });
  });

  describe("finalizePoll equivalence with Bot", () => {
    function buildFinalizeChain(opts: {
      pollStatus: "open" | "closed";
      votes: Array<{
        option_id: string;
        user_id: string;
        choice: "yes" | "maybe" | "no";
      }>;
      eventInsertError?: { code?: string; message: string };
      finalizeUpdateRows?: unknown[];
    }) {
      const poll = buildPoll({ status: opts.pollStatus });
      const options = [buildOption("opt-1", 0), buildOption("opt-2", 1)];
      const votes = opts.votes.map((v, idx) =>
        buildVote(`v${idx}`, v.option_id, v.user_id, v.choice)
      );

      // getPollSnapshot chain
      const pollSingle = vi
        .fn()
        .mockResolvedValue({ data: poll, error: null });
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

      // Conditional UPDATEs return a pre-configured list of row sets
      // (one per update call). The test case decides how many updates run.
      const updateResponses = opts.finalizeUpdateRows
        ? [opts.finalizeUpdateRows]
        : [[{ id: "poll-1" }]];
      let updateCall = 0;
      const buildUpdateChain = () => {
        const select = vi.fn().mockImplementation(() => {
          const rows = updateResponses[
            Math.min(updateCall, updateResponses.length - 1)
          ];
          updateCall += 1;
          return Promise.resolve({ data: rows, error: null });
        });
        const eqStatus = vi.fn().mockReturnValue({ select });
        const eqGuild = vi.fn().mockReturnValue({ eq: eqStatus });
        const eqId = vi.fn().mockReturnValue({ eq: eqGuild });
        return { update: vi.fn().mockReturnValue({ eq: eqId }) };
      };
      const updateMethod = buildUpdateChain().update;

      // events table: overlap check and INSERT
      const overlapGt = vi.fn().mockResolvedValue({ data: [], error: null });
      const overlapLt = vi.fn().mockReturnValue({ gt: overlapGt });
      const overlapEq = vi.fn().mockReturnValue({ lt: overlapLt });
      const overlapSelect = vi.fn().mockReturnValue({ eq: overlapEq });

      const insertSingle = vi.fn().mockResolvedValue({
        data: opts.eventInsertError ? null : { id: "evt-new" },
        error: opts.eventInsertError ?? null,
      });
      const insertSelect = vi.fn().mockReturnValue({ single: insertSingle });
      const insertMethod = vi.fn().mockReturnValue({ select: insertSelect });

      const client = createMockClient({
        event_polls: { select: pollSelect, update: updateMethod },
        event_poll_options: { select: optionSelect },
        event_poll_votes: { select: voteSelect },
        events: { select: overlapSelect, insert: insertMethod },
      });

      return { client };
    }

    it("yes 最多を自動選択して events INSERT する", async () => {
      const { client } = buildFinalizeChain({
        pollStatus: "closed",
        votes: [
          { option_id: "opt-1", user_id: "u1", choice: "yes" },
          { option_id: "opt-2", user_id: "u2", choice: "maybe" },
        ],
      });

      const result = await finalizePoll(client as never, {
        pollId: "poll-1",
        guildId: "guild-1",
        actorUserId: "user-1",
        optionId: null,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.eventId).toBe("evt-new");
      }
    });

    it("同数なら TIE_BREAK_REQUIRED", async () => {
      const { client } = buildFinalizeChain({
        pollStatus: "closed",
        votes: [
          { option_id: "opt-1", user_id: "u1", choice: "yes" },
          { option_id: "opt-2", user_id: "u2", choice: "yes" },
        ],
      });

      const result = await finalizePoll(client as never, {
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

    it("events INSERT 失敗時は EVENT_CREATE_FAILED を返す", async () => {
      const { client } = buildFinalizeChain({
        pollStatus: "closed",
        votes: [{ option_id: "opt-1", user_id: "u1", choice: "yes" }],
        eventInsertError: { message: "fk" },
      });

      const result = await finalizePoll(client as never, {
        pollId: "poll-1",
        guildId: "guild-1",
        actorUserId: "user-1",
        optionId: "opt-1",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe("EVENT_CREATE_FAILED");
      }
    });
  });

  describe("closePoll", () => {
    it("open→closed に遷移し snapshot を返す", async () => {
      const poll = buildPoll({ status: "closed" });
      const options = [buildOption("opt-1", 0)];

      const pollSingle = vi.fn().mockResolvedValue({ data: poll, error: null });
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

      const updateSelect = vi
        .fn()
        .mockResolvedValue({ data: [{ id: "poll-1" }], error: null });
      const updateEqStatus = vi.fn().mockReturnValue({ select: updateSelect });
      const updateEqGuild = vi
        .fn()
        .mockReturnValue({ eq: updateEqStatus });
      const updateEqId = vi.fn().mockReturnValue({ eq: updateEqGuild });
      const updateMethod = vi.fn().mockReturnValue({ eq: updateEqId });

      const client = createMockClient({
        event_polls: { select: pollSelect, update: updateMethod },
        event_poll_options: { select: optionSelect },
        event_poll_votes: { select: voteSelect },
      });

      const result = await closePoll(client as never, {
        pollId: "poll-1",
        guildId: "guild-1",
        actorUserId: "u1",
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.poll.status).toBe("closed");
      }
    });
  });
});
