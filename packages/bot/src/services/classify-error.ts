import type { ServiceError } from "../types/result.js";

type SupabaseError = {
  code?: string;
  message: string;
  details?: string;
};

const ERROR_CODE_MAP: Record<string, string> = {
  "23505": "DUPLICATE",
  "23503": "FOREIGN_KEY_VIOLATION",
  "23502": "NOT_NULL_VIOLATION",
  "42501": "INSUFFICIENT_PRIVILEGE",
  PGRST116: "NOT_FOUND",
  PGRST301: "TOO_MANY_ROWS",
};

export function classifySupabaseError(
  error: SupabaseError,
  operation: string
): ServiceError {
  const code =
    (error.code && ERROR_CODE_MAP[error.code]) ??
    `${operation.toUpperCase()}_FAILED`;

  return {
    code,
    message: error.message,
    details: error.details,
  };
}
