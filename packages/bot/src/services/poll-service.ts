import type {
  CastVoteInput,
  CastVoteOutcome,
  ChoiceLabel,
  CreatePollInput,
  PollOptionRecord,
  PollRecord,
  PollResult,
  PollServiceError,
  PollSnapshot,
  PollVoteAggregate,
  PollVoteRecord,
} from "../types/poll.js";
import { logger } from "../utils/logger.js";
import { classifyPollError } from "./classify-poll-error.js";
import {
  createEventFromPoll,
  DEFAULT_POLL_EVENT_DURATION_MS,
} from "./event-service.js";
import { getSupabaseClient } from "./supabase.js";

const MIN_OPTIONS = 2;
/**
 * Discord の ActionRow は 1 メッセージあたり最大 5 行であり、1 候補 = 1 行
 * として ButtonBuilder を生成しているため、候補は最大 5 件に制限する。
 * （DB 側のトリガーは互換のため 10 件のままだが、サービス層で先に弾く）
 */
const MAX_OPTIONS = 5;

function invalidInput(message: string): PollServiceError {
  return { code: "INVALID_INPUT", message };
}

function validateOption(
  option: CreatePollInput["options"][number],
  positions: Set<number>
): PollServiceError | null {
  if (option.position < 0 || option.position > MAX_OPTIONS - 1) {
    return invalidInput(
      `option.position must be within 0..${MAX_OPTIONS - 1} (received ${option.position})`
    );
  }
  if (positions.has(option.position)) {
    return invalidInput(`duplicate option.position ${option.position}`);
  }
  positions.add(option.position);

  const start = Date.parse(option.startsAt);
  if (Number.isNaN(start)) {
    return invalidInput(
      `option.startsAt is not a valid timestamp (${option.startsAt})`
    );
  }
  if (option.endsAt === null) {
    return null;
  }
  const end = Date.parse(option.endsAt);
  if (Number.isNaN(end)) {
    return invalidInput(
      `option.endsAt is not a valid timestamp (${option.endsAt})`
    );
  }
  if (end <= start) {
    return invalidInput("option.endsAt must be strictly after startsAt");
  }
  return null;
}

function validateCreateInput(input: CreatePollInput): PollServiceError | null {
  const count = input.options.length;
  if (count < MIN_OPTIONS || count > MAX_OPTIONS) {
    return invalidInput(
      `options must be between ${MIN_OPTIONS} and ${MAX_OPTIONS} (received ${count})`
    );
  }

  const positions = new Set<number>();
  for (const option of input.options) {
    const error = validateOption(option, positions);
    if (error) {
      return error;
    }
  }

  return null;
}

function emptyAggregates(options: PollOptionRecord[]): PollVoteAggregate[] {
  return options.map((option) => ({
    optionId: option.id,
    counts: { yes: 0, maybe: 0, no: 0 },
    yesVoters: [],
  }));
}

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

export async function createPoll(
  input: CreatePollInput
): Promise<PollResult<PollSnapshot>> {
  const validationError = validateCreateInput(input);
  if (validationError) {
    return { success: false, error: validationError };
  }

  const supabase = getSupabaseClient();

  const { data: pollRow, error: pollError } = await supabase
    .from("event_polls")
    .insert({
      guild_id: input.guildId,
      title: input.title,
      description: input.description,
      status: "open",
      channel_id: input.channelId,
      message_id: input.messageId,
      created_by: input.actorUserId,
    })
    .select()
    .single();

  if (pollError || !pollRow) {
    logger.error(
      { error: pollError, guildId: input.guildId },
      "Failed to insert event_polls"
    );
    return {
      success: false,
      error: classifyPollError(
        pollError ?? { message: "event_polls insert returned no row" },
        "createPoll"
      ),
    };
  }

  const poll = pollRow as PollRecord;

  const optionRows = input.options.map((option) => ({
    poll_id: poll.id,
    starts_at: option.startsAt,
    ends_at: option.endsAt,
    position: option.position,
  }));

  const { data: optionsData, error: optionError } = await supabase
    .from("event_poll_options")
    .insert(optionRows)
    .select();

  if (optionError || !optionsData) {
    logger.error(
      { error: optionError, pollId: poll.id },
      "Failed to insert event_poll_options; rolling back poll"
    );
    // compensation: delete the orphan poll so caller can retry cleanly
    await supabase.from("event_polls").delete().eq("id", poll.id);
    return {
      success: false,
      error: classifyPollError(
        optionError ?? {
          message: "event_poll_options insert returned no rows",
        },
        "createPoll"
      ),
    };
  }

  const options = (optionsData as PollOptionRecord[])
    .slice()
    .sort((a, b) => a.position - b.position);

  return {
    success: true,
    data: {
      poll,
      options,
      aggregates: emptyAggregates(options),
    },
  };
}

export async function getPoll(
  pollId: string,
  guildId: string
): Promise<PollResult<PollSnapshot>> {
  const supabase = getSupabaseClient();

  const { data: pollRow, error: pollError } = await supabase
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
        "getPoll"
      ),
    };
  }

  const poll = pollRow as PollRecord;

  const { data: optionRows, error: optionError } = await supabase
    .from("event_poll_options")
    .select("*")
    .eq("poll_id", poll.id)
    .order("position", { ascending: true });

  if (optionError || !optionRows) {
    logger.error(
      { error: optionError, pollId },
      "Failed to fetch event_poll_options"
    );
    return {
      success: false,
      error: classifyPollError(
        optionError ?? { message: "options fetch returned no rows" },
        "getPoll"
      ),
    };
  }

  const options = optionRows as PollOptionRecord[];

  const { data: voteRows, error: voteError } = await supabase
    .from("event_poll_votes")
    .select("*")
    .eq("poll_id", poll.id);

  if (voteError) {
    logger.error(
      { error: voteError, pollId },
      "Failed to fetch event_poll_votes"
    );
    return {
      success: false,
      error: classifyPollError(voteError, "getPoll"),
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

export async function updatePollMessageId(
  pollId: string,
  guildId: string,
  messageId: string
): Promise<PollResult<void>> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from("event_polls")
    .update({ message_id: messageId })
    .eq("id", pollId)
    .eq("guild_id", guildId)
    .select("id");

  if (error) {
    logger.error(
      { error, pollId, guildId },
      "Failed to update event_polls.message_id"
    );
    return {
      success: false,
      error: classifyPollError(error, "updatePollMessageId"),
    };
  }

  if (!data || data.length === 0) {
    return {
      success: false,
      error: {
        code: "POLL_NOT_FOUND",
        message: "poll not found while updating message_id",
      },
    };
  }

  return { success: true, data: undefined };
}

export async function deletePoll(
  pollId: string,
  guildId: string
): Promise<PollResult<void>> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from("event_polls")
    .delete()
    .eq("id", pollId)
    .select("id")
    .eq("guild_id", guildId);

  if (error) {
    logger.error({ error, pollId, guildId }, "Failed to delete event_polls");
    return {
      success: false,
      error: classifyPollError(error, "deletePoll"),
    };
  }

  if (!data || data.length === 0) {
    return {
      success: false,
      error: {
        code: "POLL_NOT_FOUND",
        message: "poll not found or already deleted",
      },
    };
  }

  return { success: true, data: undefined };
}

export async function castVote(
  input: CastVoteInput
): Promise<PollResult<CastVoteOutcome>> {
  const supabase = getSupabaseClient();

  const { data: pollRow, error: pollError } = await supabase
    .from("event_polls")
    .select("status")
    .eq("id", input.pollId)
    .single();

  if (pollError || !pollRow) {
    return {
      success: false,
      error: classifyPollError(
        pollError ?? { code: "PGRST116", message: "poll not found" },
        "castVote"
      ),
    };
  }

  const status = (pollRow as { status: string }).status;
  if (status !== "open") {
    return {
      success: true,
      data: { kind: "rejected_closed" },
    };
  }

  const { data: existing, error: existingError } = await supabase
    .from("event_poll_votes")
    .select("id, choice")
    .eq("poll_id", input.pollId)
    .eq("option_id", input.optionId)
    .eq("user_id", input.userId)
    .maybeSingle();

  if (existingError) {
    logger.error(
      { error: existingError, pollId: input.pollId },
      "Failed to fetch existing vote"
    );
    return {
      success: false,
      error: classifyPollError(existingError, "castVote"),
    };
  }

  const existingRow = existing as { id: string; choice: ChoiceLabel } | null;

  if (existingRow && existingRow.choice === input.choice) {
    const { error: deleteError } = await supabase
      .from("event_poll_votes")
      .delete()
      .eq("id", existingRow.id);

    if (deleteError) {
      logger.error(
        { error: deleteError, pollId: input.pollId },
        "Failed to delete event_poll_votes row"
      );
      return {
        success: false,
        error: classifyPollError(deleteError, "castVote"),
      };
    }

    return { success: true, data: { kind: "revoked" } };
  }

  const { error: upsertError } = await supabase.from("event_poll_votes").upsert(
    {
      poll_id: input.pollId,
      option_id: input.optionId,
      user_id: input.userId,
      choice: input.choice,
    },
    { onConflict: "option_id,user_id" }
  );

  if (upsertError) {
    logger.error(
      { error: upsertError, pollId: input.pollId },
      "Failed to upsert event_poll_votes"
    );
    return {
      success: false,
      error: classifyPollError(upsertError, "castVote"),
    };
  }

  return {
    success: true,
    data: {
      kind: "recorded",
      previous: existingRow?.choice ?? null,
    },
  };
}

type UpdatePollStatusInput = {
  pollId: string;
  guildId: string;
  nextStatus: "open" | "closed" | "finalized";
  currentStatus: "open" | "closed" | "finalized";
  extra?: Record<string, unknown>;
};

async function updatePollStatus(
  input: UpdatePollStatusInput
): Promise<{ updated: boolean; error: PollServiceError | null }> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("event_polls")
    .update({ status: input.nextStatus, ...(input.extra ?? {}) })
    .eq("id", input.pollId)
    .eq("guild_id", input.guildId)
    .eq("status", input.currentStatus)
    .select();

  if (error) {
    return {
      updated: false,
      error: classifyPollError(error, "updatePollStatus"),
    };
  }

  return {
    updated: Array.isArray(data) && data.length > 0,
    error: null,
  };
}

async function fetchPollStatus(
  pollId: string,
  guildId: string
): Promise<
  | { kind: "found"; status: "open" | "closed" | "finalized" }
  | { kind: "not_found" }
  | { kind: "error"; error: PollServiceError }
> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
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
      error: classifyPollError(error, "fetchPollStatus"),
    };
  }

  const row = data as { status: "open" | "closed" | "finalized" } | null;
  if (!row) {
    return { kind: "not_found" };
  }

  return { kind: "found", status: row.status };
}

export async function closePoll(
  pollId: string,
  guildId: string,
  _actorUserId: string
): Promise<PollResult<PollSnapshot>> {
  const update = await updatePollStatus({
    pollId,
    guildId,
    nextStatus: "closed",
    currentStatus: "open",
  });

  if (update.error) {
    return { success: false, error: update.error };
  }

  if (!update.updated) {
    const status = await fetchPollStatus(pollId, guildId);
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

  return getPoll(pollId, guildId);
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

  return {
    kind: "tie",
    candidateOptionIds: winners.map((w) => w.optionId),
  };
}

async function hasOverlappingEvents(
  guildId: string,
  startAt: string,
  endAt: string
): Promise<boolean> {
  const supabase = getSupabaseClient();
  // 半開区間 [startAt, endAt) を使ったオーバーラップ条件:
  //   existing.start_at < endAt AND existing.end_at > startAt
  // これにより候補開始前から実行中のイベントも検出できる。
  const { data, error } = await supabase
    .from("events")
    .select("id")
    .eq("guild_id", guildId)
    .lt("start_at", endAt)
    .gt("end_at", startAt);

  if (error) {
    logger.warn(
      { error, guildId },
      "Failed to check overlapping events; skipping warning"
    );
    return false;
  }

  return Array.isArray(data) && data.length > 0;
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
        error: invalidInput("optionId does not belong to this poll"),
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
      error: invalidInput("no yes votes to determine the winning option"),
    };
  }

  const match = snapshot.options.find((o) => o.id === pick.optionId);
  if (!match) {
    return {
      success: false,
      error: invalidInput("option not found in snapshot"),
    };
  }
  return { success: true, data: match };
}

export type FinalizePollInput = {
  pollId: string;
  guildId: string;
  actorUserId: string;
  optionId: string | null;
};

export type FinalizePollOutput = {
  snapshot: PollSnapshot;
  eventId: string;
  warnings: string[];
};

async function rollbackToOpenIfNeeded(
  pollId: string,
  guildId: string,
  originalStatus: PollRecord["status"]
): Promise<void> {
  if (originalStatus !== "open") {
    return;
  }
  const rollback = await updatePollStatus({
    pollId,
    guildId,
    nextStatus: "open",
    currentStatus: "closed",
  });
  if (rollback.error) {
    logger.error(
      { error: rollback.error, pollId },
      "Failed to roll back poll status after events INSERT failure"
    );
  }
}

function buildOverlapWarnings(
  overlapping: boolean,
  targetOption: PollOptionRecord
): string[] {
  if (!overlapping) {
    return [];
  }
  return [
    `同ギルド内に開始時刻が重複する既存イベントがあります (候補: ${targetOption.starts_at}).`,
  ];
}

export async function finalizePoll(
  input: FinalizePollInput
): Promise<PollResult<FinalizePollOutput>> {
  const snapshotResult = await getPoll(input.pollId, input.guildId);
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

  // open → closed に先行遷移 (冪等)
  if (originalStatus === "open") {
    const pre = await updatePollStatus({
      pollId: input.pollId,
      guildId: input.guildId,
      nextStatus: "closed",
      currentStatus: "open",
    });
    if (pre.error) {
      return { success: false, error: pre.error };
    }
  }

  const resolved = resolveTargetOption(snapshot, input.optionId);
  if (!resolved.success) {
    return resolved;
  }
  const targetOption = resolved.data;
  const targetOptionId = targetOption.id;

  const fallbackEnd =
    targetOption.ends_at ??
    new Date(
      Date.parse(targetOption.starts_at) + DEFAULT_POLL_EVENT_DURATION_MS
    ).toISOString();
  const overlapping = await hasOverlappingEvents(
    input.guildId,
    targetOption.starts_at,
    fallbackEnd
  );
  const warnings = buildOverlapWarnings(overlapping, targetOption);

  const eventCreate = await createEventFromPoll({
    poll: {
      id: snapshot.poll.id,
      guild_id: snapshot.poll.guild_id,
      title: snapshot.poll.title,
      description: snapshot.poll.description,
    },
    option: {
      id: targetOption.id,
      starts_at: targetOption.starts_at,
      ends_at: targetOption.ends_at,
    },
    actorUserId: input.actorUserId,
  });

  if (!eventCreate.success) {
    await rollbackToOpenIfNeeded(input.pollId, input.guildId, originalStatus);
    // Supabase の生メッセージは Bot の返信にも乗せず、固定メッセージに統一する
    logger.error(
      {
        error: eventCreate.error,
        pollId: input.pollId,
        guildId: input.guildId,
      },
      "events INSERT failed during poll finalize"
    );
    return {
      success: false,
      error: {
        code: "EVENT_CREATE_FAILED",
        message:
          "イベントの作成に失敗しました。しばらくしてから再試行してください。",
      },
    };
  }

  const eventId = eventCreate.data.id;

  // closed → finalized
  const finalize = await updatePollStatus({
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

  if (finalize.error) {
    logger.error(
      { error: finalize.error, pollId: input.pollId, eventId },
      "events INSERT succeeded but poll finalize UPDATE failed; events row is orphaned until reconciliation"
    );
    return { success: false, error: finalize.error };
  }

  if (!finalize.updated) {
    // 楽観的排他: 他のアクターが status を変更したため 0 行更新となった
    logger.error(
      { pollId: input.pollId, eventId },
      "events INSERT succeeded but poll finalize UPDATE matched zero rows (concurrent state change); events row is orphaned until reconciliation"
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
