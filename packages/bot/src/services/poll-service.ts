import type {
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
import { getSupabaseClient } from "./supabase.js";

const MIN_OPTIONS = 2;
const MAX_OPTIONS = 10;

function validateCreateInput(input: CreatePollInput): PollServiceError | null {
  const count = input.options.length;
  if (count < MIN_OPTIONS || count > MAX_OPTIONS) {
    return {
      code: "INVALID_INPUT",
      message: `options must be between ${MIN_OPTIONS} and ${MAX_OPTIONS} (received ${count})`,
    };
  }

  const positions = new Set<number>();
  for (const option of input.options) {
    if (option.position < 0 || option.position > 9) {
      return {
        code: "INVALID_INPUT",
        message: `option.position must be within 0..9 (received ${option.position})`,
      };
    }
    if (positions.has(option.position)) {
      return {
        code: "INVALID_INPUT",
        message: `duplicate option.position ${option.position}`,
      };
    }
    positions.add(option.position);

    const start = Date.parse(option.startsAt);
    if (Number.isNaN(start)) {
      return {
        code: "INVALID_INPUT",
        message: `option.startsAt is not a valid timestamp (${option.startsAt})`,
      };
    }
    if (option.endsAt !== null) {
      const end = Date.parse(option.endsAt);
      if (Number.isNaN(end)) {
        return {
          code: "INVALID_INPUT",
          message: `option.endsAt is not a valid timestamp (${option.endsAt})`,
        };
      }
      if (end <= start) {
        return {
          code: "INVALID_INPUT",
          message: "option.endsAt must be strictly after startsAt",
        };
      }
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
    agg.counts[vote.choice as ChoiceLabel] += 1;
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
