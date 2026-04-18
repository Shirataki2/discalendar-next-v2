"use server";

import { captureException } from "@sentry/nextjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { resolveServerAuth } from "@/lib/auth/server-auth";
import { canManageGuild } from "@/lib/discord/permissions";
import {
  closePoll as closePollService,
  finalizePoll as finalizePollService,
} from "@/lib/polls/poll-service";
import type {
  PollResult,
  PollServiceError,
  PollSnapshot,
} from "@/lib/polls/types";
import { SNOWFLAKE_PATTERN } from "@/lib/validation/snowflake";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function invalid(message: string): PollServiceError {
  return { code: "INVALID_INPUT", message };
}

function permissionDenied(message: string): PollServiceError {
  return { code: "FORBIDDEN", message };
}

export type SanitizedPollResult<T> = PollResult<T>;

function sanitizeResult<T>(result: PollResult<T>): SanitizedPollResult<T> {
  if (result.success) {
    return result;
  }
  const error = result.error;
  if ("details" in error) {
    const { details: _details, ...rest } = error;
    return { success: false, error: rest as PollServiceError };
  }
  return { success: false, error };
}

/**
 * 認証 + ギルド管理権限の検証を行う共通ヘルパー。
 * UI の canManage フラグを信頼せず、必ずサーバー側で解決する。
 */
async function authorizeManage(guildId: string): Promise<
  | {
      success: true;
      supabase: Awaited<
        ReturnType<typeof import("@/lib/supabase/server").createClient>
      >;
      userId: string;
    }
  | { success: false; error: PollServiceError }
> {
  const authResult = await resolveServerAuth(guildId);
  if (!authResult.success) {
    if (authResult.error.code === "UNAUTHORIZED") {
      redirect("/auth/login");
    }
    return {
      success: false,
      error: permissionDenied(authResult.error.message),
    };
  }

  const { auth } = authResult;
  if (!canManageGuild(auth.permissions)) {
    return {
      success: false,
      error: permissionDenied("この投票を操作するには管理権限が必要です。"),
    };
  }

  return { success: true, supabase: auth.supabase, userId: auth.userId };
}

export type ClosePollActionInput = {
  pollId: string;
  guildId: string;
};

export async function closePollAction(
  input: ClosePollActionInput
): Promise<SanitizedPollResult<PollSnapshot>> {
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

  const authz = await authorizeManage(input.guildId);
  if (!authz.success) {
    return sanitizeResult({ success: false, error: authz.error });
  }

  try {
    const result = await closePollService(authz.supabase, {
      pollId: input.pollId,
      guildId: input.guildId,
      actorUserId: authz.userId,
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

  const authz = await authorizeManage(input.guildId);
  if (!authz.success) {
    return sanitizeResult({ success: false, error: authz.error });
  }

  try {
    const result = await finalizePollService(authz.supabase, {
      pollId: input.pollId,
      guildId: input.guildId,
      actorUserId: authz.userId,
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
