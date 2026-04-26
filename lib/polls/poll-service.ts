import { captureException } from "@sentry/nextjs";
import type { SupabaseClient } from "@supabase/supabase-js";
import { classifyPollError } from "./classify-error";
import type {
  FinalizePollInput,
  FinalizePollOutput,
  PollOptionRecord,
  PollRecord,
  PollResult,
  PollSnapshot,
  PollVoteAggregate,
  PollVoteRecord,
} from "./types";

const DEFAULT_POLL_DURATION_MS = 60 * 60 * 1000;
const MAX_LIST_LIMIT = 100;

function aggregateVotes(
  options: PollOptionRecord[],
  votes: PollVoteRecord[]
): PollVoteAggregate[] {
  const byOption = new Map<string, PollVoteAggregate>();
  for (const option of options) {
    byOption.set(option.id, {
      optionId: option.id,
      counts: { yes: 0, maybe: 0, no: 0 },
      yesVoters: [],
    });
  }

  const sorted = [...votes].sort((a, b) =>
    a.created_at.localeCompare(b.created_at)
  );
  for (const vote of sorted) {
    const agg = byOption.get(vote.option_id);
    if (!agg) {
      continue;
    }
    agg.counts[vote.choice] += 1;
    if (vote.choice === "yes") {
      agg.yesVoters.push(vote.user_id);
    }
  }

  return options.map(
    (option) =>
      byOption.get(option.id) ?? {
        optionId: option.id,
        counts: { yes: 0, maybe: 0, no: 0 },
        yesVoters: [],
      }
  );
}

export async function listPolls(
  client: SupabaseClient,
  guildId: string
): Promise<PollResult<PollRecord[]>> {
  const { data, error } = await client
    .from("event_polls")
    .select("*")
    .eq("guild_id", guildId)
    .order("created_at", { ascending: false })
    .limit(MAX_LIST_LIMIT);

  if (error) {
    return {
      success: false,
      error: classifyPollError(error, "listPolls"),
    };
  }

  return { success: true, data: (data ?? []) as PollRecord[] };
}

export async function getPollSnapshot(
  client: SupabaseClient,
  guildId: string,
  pollId: string
): Promise<PollResult<PollSnapshot>> {
  const { data: pollRow, error: pollError } = await client
    .from("event_polls")
    .select("*")
    .eq("id", pollId)
    .eq("guild_id", guildId)
    .single();

  if (pollError || !pollRow) {
    return {
      success: false,
      error: classifyPollError(
        pollError ?? { code: "PGRST116", message: "poll not found" },
        "getPollSnapshot"
      ),
    };
  }

  const poll = pollRow as PollRecord;

  const { data: optionRows, error: optionError } = await client
    .from("event_poll_options")
    .select("*")
    .eq("poll_id", poll.id)
    .order("position", { ascending: true });

  if (optionError || !optionRows) {
    return {
      success: false,
      error: classifyPollError(
        optionError ?? { message: "options fetch returned no rows" },
        "getPollSnapshot"
      ),
    };
  }
  const options = optionRows as PollOptionRecord[];

  const { data: voteRows, error: voteError } = await client
    .from("event_poll_votes")
    .select("*")
    .eq("poll_id", poll.id);

  if (voteError) {
    return {
      success: false,
      error: classifyPollError(voteError, "getPollSnapshot"),
    };
  }
  const votes = (voteRows ?? []) as PollVoteRecord[];

  return {
    success: true,
    data: {
      poll,
      options,
      aggregates: aggregateVotes(options, votes),
    },
  };
}

type ConditionalUpdateInput = {
  client: SupabaseClient;
  pollId: string;
  guildId: string;
  nextStatus: "open" | "closed" | "finalized";
  currentStatus: "open" | "closed" | "finalized";
  extra?: Record<string, unknown>;
};

async function conditionalUpdateStatus(
  input: ConditionalUpdateInput
): Promise<PollResult<boolean>> {
  const { data, error } = await input.client
    .from("event_polls")
    .update({ status: input.nextStatus, ...(input.extra ?? {}) })
    .eq("id", input.pollId)
    .eq("guild_id", input.guildId)
    .eq("status", input.currentStatus)
    .select();

  if (error) {
    return {
      success: false,
      error: classifyPollError(error, "conditionalUpdateStatus"),
    };
  }
  return {
    success: true,
    data: Array.isArray(data) && data.length > 0,
  };
}

async function fetchCurrentStatus(
  client: SupabaseClient,
  pollId: string,
  guildId: string
): Promise<
  | { kind: "found"; status: "open" | "closed" | "finalized" }
  | { kind: "not_found" }
  | { kind: "error"; error: ReturnType<typeof classifyPollError> }
> {
  const { data, error } = await client
    .from("event_polls")
    .select("status")
    .eq("id", pollId)
    .eq("guild_id", guildId)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return { kind: "not_found" };
    }
    return {
      kind: "error",
      error: classifyPollError(error, "fetchCurrentStatus"),
    };
  }
  return { kind: "found", status: (data as { status: PollRecord["status"] }).status };
}

export type ClosePollInput = {
  pollId: string;
  guildId: string;
  actorUserId: string;
};

export async function closePoll(
  client: SupabaseClient,
  input: ClosePollInput
): Promise<PollResult<PollSnapshot>> {
  const update = await conditionalUpdateStatus({
    client,
    pollId: input.pollId,
    guildId: input.guildId,
    nextStatus: "closed",
    currentStatus: "open",
  });

  if (!update.success) {
    return update;
  }

  if (!update.data) {
    const status = await fetchCurrentStatus(client, input.pollId, input.guildId);
    if (status.kind === "not_found") {
      return {
        success: false,
        error: { code: "POLL_NOT_FOUND", message: "poll not found" },
      };
    }
    if (status.kind === "error") {
      return { success: false, error: status.error };
    }
    if (status.status === "closed") {
      return {
        success: false,
        error: {
          code: "POLL_ALREADY_CLOSED",
          message: "poll is already closed",
        },
      };
    }
    if (status.status === "finalized") {
      return {
        success: false,
        error: {
          code: "POLL_ALREADY_FINALIZED",
          message: "poll is already finalized",
        },
      };
    }
  }

  return getPollSnapshot(client, input.guildId, input.pollId);
}

function pickWinningOptionId(
  aggregates: PollVoteAggregate[]
):
  | { kind: "single"; optionId: string }
  | { kind: "tie"; candidateOptionIds: string[] }
  | { kind: "none" } {
  if (aggregates.length === 0) {
    return { kind: "none" };
  }
  let max = 0;
  for (const agg of aggregates) {
    if (agg.counts.yes > max) {
      max = agg.counts.yes;
    }
  }
  if (max === 0) {
    return { kind: "none" };
  }
  const winners = aggregates.filter((agg) => agg.counts.yes === max);
  if (winners.length === 1) {
    return { kind: "single", optionId: winners[0].optionId };
  }
  return { kind: "tie", candidateOptionIds: winners.map((w) => w.optionId) };
}

function resolveTargetOption(
  snapshot: PollSnapshot,
  requestedOptionId: string | null
): PollResult<PollOptionRecord> {
  if (requestedOptionId) {
    const match = snapshot.options.find((o) => o.id === requestedOptionId);
    if (!match) {
      return {
        success: false,
        error: {
          code: "INVALID_INPUT",
          message: "optionId does not belong to this poll",
        },
      };
    }
    return { success: true, data: match };
  }
  const pick = pickWinningOptionId(snapshot.aggregates);
  if (pick.kind === "tie") {
    return {
      success: false,
      error: {
        code: "TIE_BREAK_REQUIRED",
        message: "multiple options tied for most yes votes",
        candidateOptionIds: pick.candidateOptionIds,
      },
    };
  }
  if (pick.kind === "none") {
    return {
      success: false,
      error: {
        code: "INVALID_INPUT",
        message: "no yes votes to determine the winning option",
      },
    };
  }
  const match = snapshot.options.find((o) => o.id === pick.optionId);
  if (!match) {
    return {
      success: false,
      error: { code: "INVALID_INPUT", message: "option not found in snapshot" },
    };
  }
  return { success: true, data: match };
}

async function hasOverlappingEvents(
  client: SupabaseClient,
  guildId: string,
  startAt: string,
  endAt: string
): Promise<boolean> {
  // 半開区間 [startAt, endAt) を使ったオーバーラップ条件:
  //   existing.start_at < endAt AND existing.end_at > startAt
  const { data, error } = await client
    .from("events")
    .select("id")
    .eq("guild_id", guildId)
    .lt("start_at", endAt)
    .gt("end_at", startAt);
  if (error) {
    // 読み取り失敗は警告スキップにとどめつつ Sentry に送り運用で検知できるようにする
    captureException(
      new Error(
        `[hasOverlappingEvents] events read failed: ${error.message ?? "unknown"}`
      ),
      { extra: { guildId, startAt, endAt } }
    );
    return false;
  }
  return Array.isArray(data) && data.length > 0;
}

async function createEventFromOption(
  client: SupabaseClient,
  snapshot: PollSnapshot,
  option: PollOptionRecord
): Promise<
  { success: true; eventId: string } | { success: false; error: string }
> {
  const endAt =
    option.ends_at ??
    new Date(Date.parse(option.starts_at) + DEFAULT_POLL_DURATION_MS).toISOString();

  const { data, error } = await client
    .from("events")
    .insert({
      guild_id: snapshot.poll.guild_id,
      name: snapshot.poll.title,
      description: snapshot.poll.description,
      start_at: option.starts_at,
      end_at: endAt,
      notifications: [],
    })
    .select("id")
    .single();

  if (error || !data) {
    // Supabase の生メッセージはクライアントに漏らさず、Sentry へ詳細を送る
    captureException(
      new Error(
        `[createEventFromOption] events insert failed: ${
          error?.message ?? "no row returned"
        }`
      ),
      {
        extra: {
          guildId: snapshot.poll.guild_id,
          pollId: snapshot.poll.id,
          optionId: option.id,
        },
      }
    );
    return { success: false, error: "events insert failed" };
  }
  return { success: true, eventId: (data as { id: string }).id };
}

export async function finalizePoll(
  client: SupabaseClient,
  input: FinalizePollInput
): Promise<PollResult<FinalizePollOutput>> {
  const snapshotResult = await getPollSnapshot(
    client,
    input.guildId,
    input.pollId
  );
  if (!snapshotResult.success) {
    return snapshotResult;
  }
  const snapshot = snapshotResult.data;
  const originalStatus = snapshot.poll.status;

  if (originalStatus === "finalized") {
    return {
      success: false,
      error: {
        code: "POLL_ALREADY_FINALIZED",
        message: "poll is already finalized",
      },
    };
  }

  if (originalStatus === "open") {
    const pre = await conditionalUpdateStatus({
      client,
      pollId: input.pollId,
      guildId: input.guildId,
      nextStatus: "closed",
      currentStatus: "open",
    });
    if (!pre.success) {
      return pre;
    }
  }

  const resolved = resolveTargetOption(snapshot, input.optionId);
  if (!resolved.success) {
    // open→closed の先行遷移後に resolve が失敗するケース (例: yes 票 0 件)
    // ではユーザー操作で復旧する手段がなくなるため open に戻す。
    if (originalStatus === "open") {
      await conditionalUpdateStatus({
        client,
        pollId: input.pollId,
        guildId: input.guildId,
        nextStatus: "open",
        currentStatus: "closed",
      });
    }
    return resolved;
  }
  const targetOption = resolved.data;
  const targetOptionId = targetOption.id;

  const warnings: string[] = [];
  const fallbackEnd =
    targetOption.ends_at ??
    new Date(
      Date.parse(targetOption.starts_at) + DEFAULT_POLL_DURATION_MS
    ).toISOString();
  if (
    await hasOverlappingEvents(
      client,
      input.guildId,
      targetOption.starts_at,
      fallbackEnd
    )
  ) {
    warnings.push(
      `同ギルド内に開始時刻が重複する既存イベントがあります (候補: ${targetOption.starts_at}).`
    );
  }

  const eventCreate = await createEventFromOption(client, snapshot, targetOption);

  if (!eventCreate.success) {
    if (originalStatus === "open") {
      await conditionalUpdateStatus({
        client,
        pollId: input.pollId,
        guildId: input.guildId,
        nextStatus: "open",
        currentStatus: "closed",
      });
    }
    return {
      success: false,
      error: {
        code: "EVENT_CREATE_FAILED",
        message: "イベントの作成に失敗しました。しばらくしてから再試行してください。",
      },
    };
  }

  const eventId = eventCreate.eventId;

  const finalize = await conditionalUpdateStatus({
    client,
    pollId: input.pollId,
    guildId: input.guildId,
    nextStatus: "finalized",
    currentStatus: "closed",
    extra: {
      finalized_event_id: eventId,
      finalized_option_id: targetOptionId,
      finalized_by: input.actorUserId,
    },
  });

  if (!finalize.success) {
    captureException(
      new Error(
        `[finalizePoll] finalize update failed after event creation: ${finalize.error.code}`
      ),
      {
        extra: {
          pollId: input.pollId,
          guildId: input.guildId,
          eventId,
        },
      }
    );
    return finalize;
  }

  // 楽観的排他: status="closed" の行が他のアクターによって変更され
  // 0 行更新となった場合は conflict として扱う。events は作成済みのため
  // 孤立するが、補償ロジックは reconciliation 側に委ねる（現状はログ出力のみ）。
  if (!finalize.data) {
    captureException(
      new Error(
        "[finalizePoll] poll status changed concurrently; finalize updated zero rows"
      ),
      {
        extra: {
          pollId: input.pollId,
          guildId: input.guildId,
          eventId,
        },
      }
    );
    return {
      success: false,
      error: {
        code: "POLL_ALREADY_FINALIZED",
        message:
          "他の操作によって投票の状態が変更されました。最新の状態を確認してください。",
      },
    };
  }

  const finalizedSnapshot: PollSnapshot = {
    ...snapshot,
    poll: {
      ...snapshot.poll,
      status: "finalized",
      finalized_event_id: eventId,
      finalized_option_id: targetOptionId,
      finalized_by: input.actorUserId,
    },
  };

  return {
    success: true,
    data: {
      snapshot: finalizedSnapshot,
      eventId,
      warnings,
    },
  };
}
