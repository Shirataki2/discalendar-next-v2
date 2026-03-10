import type {
  EventCreate,
  EventRecord,
  EventSeriesRecord,
  EventSettings,
} from "../types/event.js";
import type { ServiceResult } from "../types/result.js";
import { logger } from "../utils/logger.js";
import { classifySupabaseError } from "./classify-error.js";
import { getSupabaseClient } from "./supabase.js";

export async function getEventsByGuildId(
  guildId: string,
  rangeType: "past" | "future" | "all" = "all"
): Promise<ServiceResult<EventRecord[]>> {
  const supabase = getSupabaseClient();
  const MAX_LIST_EVENTS = 100;

  let query = supabase
    .from("events")
    .select("*")
    .eq("guild_id", guildId)
    .order("start_at", { ascending: true })
    .limit(MAX_LIST_EVENTS);

  const now = new Date().toISOString();
  if (rangeType === "future") {
    query = query.gte("end_at", now);
  } else if (rangeType === "past") {
    query = query.lt("end_at", now);
  }

  const { data, error } = await query;

  if (error) {
    logger.error({ error, guildId }, "Failed to fetch events");
    return {
      success: false,
      error: classifySupabaseError(error, "fetch"),
    };
  }

  return { success: true, data: data as EventRecord[] };
}

export async function createEvent(
  data: EventCreate
): Promise<ServiceResult<EventRecord>> {
  const supabase = getSupabaseClient();

  const { data: created, error } = await supabase
    .from("events")
    .insert(data)
    .select()
    .single();

  if (error) {
    logger.error({ error, guildId: data.guild_id }, "Failed to create event");
    return {
      success: false,
      error: classifySupabaseError(error, "create"),
    };
  }

  return { success: true, data: created as EventRecord };
}

// 最大通知オフセット: 7日（weeks=1 の最大値）
const MAX_NOTIFY_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

export async function getFutureEventsForAllGuilds(
  fromTime: Date
): Promise<ServiceResult<EventRecord[]>> {
  const supabase = getSupabaseClient();

  // 通知ウィンドウ内のイベントのみ取得（全件フェッチを回避）
  const upperBound = new Date(fromTime.getTime() + MAX_NOTIFY_WINDOW_MS);

  const MAX_NOTIFY_EVENTS = 1000;

  const { data, error } = await supabase
    .from("events")
    .select("*")
    .gte("start_at", fromTime.toISOString())
    .lte("start_at", upperBound.toISOString())
    .order("start_at", { ascending: true })
    .limit(MAX_NOTIFY_EVENTS);

  if (error) {
    logger.error({ error }, "Failed to fetch future events for all guilds");
    return {
      success: false,
      error: classifySupabaseError(error, "fetch"),
    };
  }

  return { success: true, data: data as EventRecord[] };
}

const MAX_LIST_SERIES = 100;

export async function getSeriesByGuildId(
  guildId: string
): Promise<ServiceResult<EventSeriesRecord[]>> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from("event_series")
    .select("*")
    .eq("guild_id", guildId)
    .order("dtstart", { ascending: true })
    .limit(MAX_LIST_SERIES);

  if (error) {
    logger.error({ error, guildId }, "Failed to fetch event series");
    return {
      success: false,
      error: classifySupabaseError(error, "fetch"),
    };
  }

  return { success: true, data: data as EventSeriesRecord[] };
}

const MAX_NOTIFY_SERIES = 500;

export async function getFutureSeriesForAllGuilds(): Promise<
  ServiceResult<EventSeriesRecord[]>
> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from("event_series")
    .select("*")
    .order("created_at", { ascending: true })
    .limit(MAX_NOTIFY_SERIES);

  if (error) {
    logger.error({ error }, "Failed to fetch event series for all guilds");
    return {
      success: false,
      error: classifySupabaseError(error, "fetch"),
    };
  }

  return { success: true, data: data as EventSeriesRecord[] };
}

export async function getEventSettings(
  guildId: string
): Promise<ServiceResult<EventSettings | null>> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from("event_settings")
    .select("*")
    .eq("guild_id", guildId)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return { success: true, data: null };
    }
    logger.error({ error, guildId }, "Failed to fetch event settings");
    return {
      success: false,
      error: classifySupabaseError(error, "fetch"),
    };
  }

  return { success: true, data: data as EventSettings };
}

export async function upsertEventSettings(
  guildId: string,
  channelId: string
): Promise<ServiceResult<EventSettings>> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from("event_settings")
    .upsert(
      { guild_id: guildId, channel_id: channelId },
      { onConflict: "guild_id" }
    )
    .select()
    .single();

  if (error) {
    logger.error({ error, guildId }, "Failed to upsert event settings");
    return {
      success: false,
      error: classifySupabaseError(error, "upsert"),
    };
  }

  return { success: true, data: data as EventSettings };
}

export async function getEventSettingsByGuildIds(
  guildIds: string[]
): Promise<ServiceResult<Map<string, EventSettings>>> {
  if (guildIds.length === 0) {
    return { success: true, data: new Map() };
  }

  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from("event_settings")
    .select("*")
    .in("guild_id", guildIds);

  if (error) {
    logger.error({ error }, "Failed to fetch event settings by guild IDs");
    return {
      success: false,
      error: classifySupabaseError(error, "fetch"),
    };
  }

  const map = new Map<string, EventSettings>();
  for (const row of data as EventSettings[]) {
    map.set(row.guild_id, row);
  }
  return { success: true, data: map };
}
