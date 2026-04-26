import { describe, expect, it } from "vitest";
import type {
  PollOptionRecord,
  PollRecord,
  PollSnapshot,
  PollVoteAggregate,
} from "../types/poll.js";
import { buildPollEmbed } from "./poll-embed.js";

function poll(overrides: Partial<PollRecord> = {}): PollRecord {
  return {
    id: "poll-1",
    guild_id: "guild-1",
    title: "次回ミートアップ",
    description: "候補日時を選んでください",
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

function option(
  overrides: Partial<PollOptionRecord> & { id: string; position: number }
): PollOptionRecord {
  return {
    poll_id: "poll-1",
    starts_at: "2026-04-20T12:00:00Z",
    ends_at: "2026-04-20T13:00:00Z",
    created_at: "2026-04-18T00:00:00Z",
    ...overrides,
  };
}

function aggregate(
  optionId: string,
  counts: Partial<Record<"yes" | "maybe" | "no", number>> = {},
  yesVoters: string[] = []
): PollVoteAggregate {
  return {
    optionId,
    counts: {
      yes: counts.yes ?? 0,
      maybe: counts.maybe ?? 0,
      no: counts.no ?? 0,
    },
    yesVoters,
  };
}

function snapshot(
  p: PollRecord,
  options: PollOptionRecord[],
  aggregates: PollVoteAggregate[]
): PollSnapshot {
  return { poll: p, options, aggregates };
}

const CLOSED_BADGE_REGEX = /締切済/;
const FINALIZED_BADGE_REGEX = /確定/;

describe("buildPollEmbed", () => {
  it("open ポールでは候補ごとの ○/△/× 件数と yes 投票者を表示する", () => {
    const embed = buildPollEmbed(
      snapshot(
        poll(),
        [
          option({ id: "opt-1", position: 0 }),
          option({
            id: "opt-2",
            position: 1,
            starts_at: "2026-04-21T12:00:00Z",
            ends_at: "2026-04-21T13:00:00Z",
          }),
        ],
        [
          aggregate("opt-1", { yes: 2, maybe: 1, no: 0 }, ["u1", "u2"]),
          aggregate("opt-2", { yes: 0, maybe: 0, no: 3 }, []),
        ]
      )
    );
    const data = embed.toJSON();

    expect(data.title).toBe("次回ミートアップ");
    expect(data.description).toContain("候補日時を選んでください");
    const fields = data.fields ?? [];
    const first = fields[0];
    expect(first.value).toContain("○");
    expect(first.value).toContain("2");
    expect(first.value).toContain("<@u1>");
    expect(first.value).toContain("<@u2>");
  });

  it("yes が 20 名を超える場合は先頭 20 名 + 他 N 名を表示する", () => {
    const voters = Array.from({ length: 25 }, (_, idx) => `u${idx + 1}`);
    const embed = buildPollEmbed(
      snapshot(
        poll(),
        [option({ id: "opt-1", position: 0 })],
        [aggregate("opt-1", { yes: 25 }, voters)]
      )
    );
    const fields = embed.toJSON().fields ?? [];
    const [first] = fields;

    expect(first.value).toContain("<@u1>");
    expect(first.value).toContain("<@u20>");
    expect(first.value).not.toContain("<@u21>");
    expect(first.value).toContain("他 5 名");
  });

  it("closed ポールは 締切済 バッジを付与する", () => {
    const embed = buildPollEmbed(
      snapshot(
        poll({ status: "closed" }),
        [option({ id: "opt-1", position: 0 })],
        [aggregate("opt-1")]
      )
    );
    const data = embed.toJSON();
    expect(data.description).toMatch(CLOSED_BADGE_REGEX);
  });

  it("finalized ポールは 確定 バッジと /dashboard イベントリンクを付与する", () => {
    const embed = buildPollEmbed(
      snapshot(
        poll({
          status: "finalized",
          finalized_option_id: "opt-1",
          finalized_event_id: "evt-1",
        }),
        [option({ id: "opt-1", position: 0 })],
        [aggregate("opt-1", { yes: 5 }, ["u1"])]
      ),
      { baseUrl: "https://discalendar.app" }
    );
    const data = embed.toJSON();
    expect(data.description).toMatch(FINALIZED_BADGE_REGEX);
    expect(data.description).toContain(
      "https://discalendar.app/dashboard?event=evt-1"
    );
  });
});
