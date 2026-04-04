import type { ServiceResult } from "../types/result.js";
import { logger } from "../utils/logger.js";
import { classifySupabaseError } from "./classify-error.js";
import { getSupabaseClient } from "./supabase.js";

const DUPLICATE_ERROR_CODE = "23505";

/** 指定した通知が送信済みかどうかを確認する */
export async function hasSent(
  eventId: string,
  guildId: string,
  notificationKey: string
): Promise<ServiceResult<boolean>> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from("sent_notifications")
    .select("id")
    .eq("event_id", eventId)
    .eq("guild_id", guildId)
    .eq("notification_key", notificationKey)
    .limit(1);

  if (error) {
    logger.error(
      { error, eventId, guildId, notificationKey },
      "Failed to check sent notification"
    );
    return {
      success: false,
      error: classifySupabaseError(error, "fetch"),
    };
  }

  return { success: true, data: data.length > 0 };
}

/** 送信済みとして記録する。UNIQUE制約違反は成功として扱う */
export async function markSent(
  eventId: string,
  guildId: string,
  notificationKey: string
): Promise<ServiceResult<void>> {
  const supabase = getSupabaseClient();

  const { error } = await supabase.from("sent_notifications").insert({
    event_id: eventId,
    guild_id: guildId,
    notification_key: notificationKey,
  });

  if (error) {
    if (error.code === DUPLICATE_ERROR_CODE) {
      return { success: true, data: undefined };
    }
    logger.warn(
      { error, eventId, guildId, notificationKey },
      "Failed to mark notification as sent"
    );
    return {
      success: false,
      error: classifySupabaseError(error, "insert"),
    };
  }

  return { success: true, data: undefined };
}

/** 指定日数以上前の送信済みレコードを削除し、削除件数を返す */
export async function cleanupOldRecords(
  retentionDays: number
): Promise<ServiceResult<number>> {
  const supabase = getSupabaseClient();

  const threshold = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);

  const { data, error } = await supabase
    .from("sent_notifications")
    .delete()
    .lt("sent_at", threshold.toISOString())
    .select("id");

  if (error) {
    logger.error({ error, retentionDays }, "Failed to cleanup old records");
    return {
      success: false,
      error: classifySupabaseError(error, "delete"),
    };
  }

  return { success: true, data: data.length };
}
