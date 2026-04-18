"use server";

import { captureException } from "@sentry/nextjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  closePoll as closePollService,
  finalizePoll as finalizePollService,
} from "@/lib/polls/poll-service";
import type {
  PollResult,
  PollServiceError,
  PollSnapshot,
} from "@/lib/polls/types";
import { createClient } from "@/lib/supabase/server";
import { SNOWFLAKE_PATTERN } from "@/lib/validation/snowflake";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function invalid(message: string): PollServiceError {
  return { code: "INVALID_INPUT", message };
}

type SanitizedError = Omit<PollServiceError, "details"> & {
  details?: never;
};

export type SanitizedPollResult<T> =
  | { success: true; data: T }
  | { success: false; error: SanitizedError };

function sanitizeResult<T>(result: PollResult<T>): SanitizedPollResult<T> {
  if (result.success) {
    return result;
  }
  const error = result.error;
  if ("details" in error) {
    const { details: _details, ...rest } = error;
    return { success: false, error: rest as SanitizedError };
  }
  return { success: false, error: error as SanitizedError };
}

type ServerContext = {
  supabase: Awaited<ReturnType<typeof createClient>>;
  userId: string;
};

async function resolveUser(): Promise<ServerContext | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return null;
  }
  return { supabase, userId: user.id };
}

export type ClosePollActionInput = {
  pollId: string;
  guildId: string;
};

export async function closePollAction(
  input: ClosePollActionInput
): Promise<SanitizedPollResult<PollSnapshot>> {
  const ctx = await resolveUser();
  if (!ctx) {
    redirect("/auth/login");
  }

  if (!UUID_PATTERN.test(input.pollId)) {
    return sanitizeResult({
      success: false,
      error: invalid("pollId is not a valid UUID"),
    });
  }
  if (!SNOWFLAKE_PATTERN.test(input.guildId)) {
    return sanitizeResult({
      success: false,
      error: invalid("guildId is not a valid Discord snowflake"),
    });
  }

  try {
    const result = await closePollService(ctx.supabase, {
      pollId: input.pollId,
      guildId: input.guildId,
      actorUserId: ctx.userId,
    });

    if (result.success) {
      revalidatePath("/dashboard/polls");
      revalidatePath(`/dashboard/polls/${input.pollId}`);
    } else {
      captureException(
        new Error(`closePollAction failed: ${result.error.code}`),
        {
          extra: {
            pollId: input.pollId,
            guildId: input.guildId,
            code: result.error.code,
          },
        }
      );
    }

    return sanitizeResult(result);
  } catch (error) {
    captureException(error, {
      extra: { pollId: input.pollId, guildId: input.guildId },
    });
    return sanitizeResult({
      success: false,
      error: { code: "INTERNAL", message: "unexpected server error" },
    });
  }
}

export type FinalizePollActionInput = {
  pollId: string;
  guildId: string;
  optionId: string | null;
};

export type FinalizePollActionData = {
  snapshot: PollSnapshot;
  eventId: string;
  warnings: string[];
};

export async function finalizePollAction(
  input: FinalizePollActionInput
): Promise<SanitizedPollResult<FinalizePollActionData>> {
  const ctx = await resolveUser();
  if (!ctx) {
    redirect("/auth/login");
  }

  if (!UUID_PATTERN.test(input.pollId)) {
    return sanitizeResult({
      success: false,
      error: invalid("pollId is not a valid UUID"),
    });
  }
  if (!SNOWFLAKE_PATTERN.test(input.guildId)) {
    return sanitizeResult({
      success: false,
      error: invalid("guildId is not a valid Discord snowflake"),
    });
  }
  if (input.optionId !== null && !UUID_PATTERN.test(input.optionId)) {
    return sanitizeResult({
      success: false,
      error: invalid("optionId is not a valid UUID"),
    });
  }

  try {
    const result = await finalizePollService(ctx.supabase, {
      pollId: input.pollId,
      guildId: input.guildId,
      actorUserId: ctx.userId,
      optionId: input.optionId,
    });

    if (!result.success) {
      captureException(
        new Error(`finalizePollAction failed: ${result.error.code}`),
        {
          extra: {
            pollId: input.pollId,
            guildId: input.guildId,
            code: result.error.code,
          },
        }
      );
      return sanitizeResult(result);
    }

    revalidatePath("/dashboard/polls");
    revalidatePath(`/dashboard/polls/${input.pollId}`);
    return sanitizeResult(result);
  } catch (error) {
    captureException(error, {
      extra: { pollId: input.pollId, guildId: input.guildId },
    });
    return sanitizeResult({
      success: false,
      error: { code: "INTERNAL", message: "unexpected server error" },
    });
  }
}
