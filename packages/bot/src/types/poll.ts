export type PollStatus = "open" | "closed" | "finalized";

export type ChoiceLabel = "yes" | "maybe" | "no";

export type PollRecord = {
  id: string;
  guild_id: string;
  title: string;
  description: string | null;
  status: PollStatus;
  channel_id: string;
  message_id: string | null;
  created_by: string;
  finalized_by: string | null;
  finalized_option_id: string | null;
  finalized_event_id: string | null;
  created_at: string;
  updated_at: string;
};

export type PollOptionRecord = {
  id: string;
  poll_id: string;
  starts_at: string;
  ends_at: string | null;
  position: number;
  created_at: string;
};

export type PollVoteRecord = {
  id: string;
  poll_id: string;
  option_id: string;
  user_id: string;
  choice: ChoiceLabel;
  created_at: string;
  updated_at: string;
};

export type PollVoteAggregate = {
  optionId: string;
  counts: Record<ChoiceLabel, number>;
  yesVoters: string[];
};

export type PollSnapshot = {
  poll: PollRecord;
  options: PollOptionRecord[];
  aggregates: PollVoteAggregate[];
};

export type PollServiceError =
  | { code: "POLL_NOT_FOUND"; message: string }
  | { code: "POLL_ALREADY_FINALIZED"; message: string }
  | { code: "POLL_ALREADY_CLOSED"; message: string }
  | {
      code: "TIE_BREAK_REQUIRED";
      message: string;
      candidateOptionIds: string[];
    }
  | { code: "FORBIDDEN"; message: string }
  | { code: "INVALID_INPUT"; message: string; details?: string }
  | { code: "EVENT_CREATE_FAILED"; message: string; details?: string }
  | { code: "INTERNAL"; message: string; details?: string };

export type PollResult<T> =
  | { success: true; data: T }
  | { success: false; error: PollServiceError };

export type PollOptionInput = {
  startsAt: string;
  endsAt: string | null;
  position: number;
};

export type CreatePollInput = {
  guildId: string;
  channelId: string;
  actorUserId: string;
  title: string;
  description: string | null;
  options: PollOptionInput[];
  messageId: string | null;
};

export type CastVoteInput = {
  pollId: string;
  optionId: string;
  userId: string;
  choice: ChoiceLabel;
};

export type CastVoteOutcome =
  | { kind: "recorded"; previous: ChoiceLabel | null }
  | { kind: "revoked" }
  | { kind: "rejected_closed" };
