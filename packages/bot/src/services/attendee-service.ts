import type { EventRecord } from "../types/event.js";
import type { ServiceResult } from "../types/result.js";
import { logger } from "../utils/logger.js";
import { classifySupabaseError } from "./classify-error.js";
import { getSupabaseClient } from "./supabase.js";

// ──────────────────────────────────────────────
// 型定義
// ──────────────────────────────────────────────

export type RsvpStatus = "going" | "maybe" | "not_going";

export type AttendeeRecord = {
  id: string;
  event_id: string | null;
  event_series_id: string | null;
  occurrence_date: string | null;
  guild_id: string;
  user_id: string | null;
  discord_user_id: string;
  discord_username: string;
  discord_avatar_url: string | null;
  status: RsvpStatus;
  responded_at: string;
};

export type AttendeeSummary = {
  going: number;
  maybe: number;
  notGoing: number;
  total: number;
};

type UpsertRsvpParams = {
  guildId: string;
  eventId: string;
  discordUserId: string;
  discordUsername: string;
  discordAvatarUrl: string | null;
  status: RsvpStatus;
};

type DeleteRsvpParams = {
  guildId: string;
  eventId: string;
  discordUserId: string;
};

// ──────────────────────────────────────────────
// イベント検索の最大件数
// ──────────────────────────────────────────────

const MAX_SEARCH_RESULTS = 10;

function escapeIlike(value: string): string {
  return value.replace(/[%_\\]/g, "\\$&");
}

// ──────────────────────────────────────────────
// 関数
// ──────────────────────────────────────────────

/**
 * RSVP を upsert する（Bot 経由、user_id は NULL）
 */
export async function upsertRsvp(
  params: UpsertRsvpParams
): Promise<ServiceResult<AttendeeRecord>> {
  const supabase = getSupabaseClient();

  const row = {
    event_id: params.eventId,
    event_series_id: null,
    occurrence_date: null,
    guild_id: params.guildId,
    user_id: null,
    discord_user_id: params.discordUserId,
    discord_username: params.discordUsername,
    discord_avatar_url: params.discordAvatarUrl,
    status: params.status,
    responded_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("event_attendees")
    .upsert(row, { onConflict: "event_id,discord_user_id" })
    .select("*")
    .single();

  if (error) {
    logger.error({ error, eventId: params.eventId }, "Failed to upsert RSVP");
    return {
      success: false,
      error: classifySupabaseError(error, "upsert"),
    };
  }

  return { success: true, data: data as AttendeeRecord };
}

/**
 * RSVP を削除する（トグル解除用）
 */
export async function deleteRsvp(
  params: DeleteRsvpParams
): Promise<ServiceResult<void>> {
  const supabase = getSupabaseClient();

  const { error } = await supabase
    .from("event_attendees")
    .delete()
    .eq("event_id", params.eventId)
    .eq("discord_user_id", params.discordUserId);

  if (error) {
    logger.error({ error, eventId: params.eventId }, "Failed to delete RSVP");
    return {
      success: false,
      error: classifySupabaseError(error, "delete"),
    };
  }

  return { success: true, data: undefined };
}

/** ステータス別カウントを集計する */
function countByStatus(attendees: { status: RsvpStatus }[]): AttendeeSummary {
  let going = 0;
  let maybe = 0;
  let notGoing = 0;

  for (const a of attendees) {
    switch (a.status) {
      case "going":
        going += 1;
        break;
      case "maybe":
        maybe += 1;
        break;
      case "not_going":
        notGoing += 1;
        break;
      default:
        break;
    }
  }

  return { going, maybe, notGoing, total: attendees.length };
}

/**
 * イベントの出欠サマリーを取得する
 */
export async function getAttendeeSummary(
  eventId: string
): Promise<ServiceResult<AttendeeSummary>> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from("event_attendees")
    .select("status")
    .eq("event_id", eventId);

  if (error) {
    logger.error({ error, eventId }, "Failed to fetch attendee summary");
    return {
      success: false,
      error: classifySupabaseError(error, "fetch"),
    };
  }

  const attendees = (data ?? []) as { status: RsvpStatus }[];
  return { success: true, data: countByStatus(attendees) };
}

/**
 * ギルド内のイベントを名前で検索する
 *
 * 部分一致（ILIKE）で検索し、最初にマッチしたイベントを返す
 */
export async function findEventByName(
  guildId: string,
  eventName: string
): Promise<ServiceResult<EventRecord | null>> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from("events")
    .select("*")
    .eq("guild_id", guildId)
    .ilike("name", `%${escapeIlike(eventName)}%`)
    .order("start_at", { ascending: false })
    .limit(MAX_SEARCH_RESULTS);

  if (error) {
    logger.error(
      { error, guildId, eventName },
      "Failed to search events by name"
    );
    return {
      success: false,
      error: classifySupabaseError(error, "fetch"),
    };
  }

  const events = (data ?? []) as EventRecord[];
  return { success: true, data: events.length > 0 ? events[0] : null };
}

/**
 * 特定イベントに対する Discord ユーザーの現在の RSVP を取得する
 */
export async function getCurrentRsvp(
  eventId: string,
  discordUserId: string
): Promise<ServiceResult<AttendeeRecord | null>> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from("event_attendees")
    .select("*")
    .eq("event_id", eventId)
    .eq("discord_user_id", discordUserId)
    .single();

  if (error) {
    // NOT_FOUND は正常（まだ RSVP していない）
    if (error.code === "PGRST116") {
      return { success: true, data: null };
    }
    logger.error(
      { error, eventId, discordUserId },
      "Failed to fetch current RSVP"
    );
    return {
      success: false,
      error: classifySupabaseError(error, "fetch"),
    };
  }

  return { success: true, data: data as AttendeeRecord };
}
