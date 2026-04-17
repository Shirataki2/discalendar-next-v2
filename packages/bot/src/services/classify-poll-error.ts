import type { PollServiceError } from "../types/poll.js";

type SupabaseLikeError = {
  code?: string;
  message: string;
  details?: string;
};

export function classifyPollError(
  error: SupabaseLikeError,
  operation: string
): PollServiceError {
  const baseMessage = error.message || `${operation} failed`;

  switch (error.code) {
    case "PGRST116":
      return { code: "POLL_NOT_FOUND", message: baseMessage };
    case "42501":
      return { code: "FORBIDDEN", message: baseMessage };
    case "23505":
    case "23503":
    case "23514":
    case "23502":
      return {
        code: "INVALID_INPUT",
        message: baseMessage,
        details: error.details ?? error.message,
      };
    default:
      return {
        code: "INTERNAL",
        message: baseMessage,
        details: error.details,
      };
  }
}
