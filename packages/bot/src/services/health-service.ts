import type { ServiceResult } from "../types/result.js";
import { logger } from "../utils/logger.js";
import { classifySupabaseError } from "./classify-error.js";
import { getSupabaseClient } from "./supabase.js";

type BotHealthPayload = {
  guildCount: number;
  wsPing: number;
};

export async function upsertHeartbeat(
  payload: BotHealthPayload
): Promise<ServiceResult<void>> {
  const supabase = getSupabaseClient();

  const { error } = await supabase.from("service_health").upsert(
    {
      service_name: "discord-bot",
      last_seen_at: new Date().toISOString(),
      metadata: payload,
    },
    { onConflict: "service_name" }
  );

  if (error) {
    logger.error({ error }, "Failed to upsert heartbeat");
    return {
      success: false,
      error: classifySupabaseError(error, "upsert"),
    };
  }

  return { success: true, data: undefined };
}
