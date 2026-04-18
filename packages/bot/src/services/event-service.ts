import type {
  EventCreate,
  EventRecord,
  EventSeriesRecord,
  EventSettings,
  EventUpdate,
} from "../types/event.js";
import type { ServiceResult } from "../types/result.js";
import { logger } from "../utils/logger.js";
import { classifySupabaseError } from "./classify-error.js";
import { getSupabaseClient } from "./supabase.js";

/** /list コマンドで取得する単発イベントの最大件数 */
const MAX_LIST_EVENTS = 100;

export async function getEventsByGuildId(
  guildId: string,
  rangeType: "past" | "future" | "all" = "all"
): Promise<ServiceResult<EventRecord[]>> {
  const supabase = getSupabaseClient();

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

/** /list コマンドで取得するシリーズの最大件数 */
const MAX_LIST_SERIES = 100;

export async function getSeriesByGuildId(
  guildId: string
): Promise<ServiceResult<EventSeriesRecord[]>> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from("event_series")
    .select(
      "id, guild_id, name, description, color, is_all_day, rrule, dtstart, duration_minutes, location, channel_id, channel_name, notifications, exdates, created_at, updated_at"
    )
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

/** 通知タスクで取得するシリーズの最大件数（全ギルド横断のため大きめ） */
const MAX_NOTIFY_SERIES = 500;

export async function getFutureSeriesForAllGuilds(): Promise<
  ServiceResult<EventSeriesRecord[]>
> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from("event_series")
    .select(
      "id, guild_id, name, description, color, is_all_day, rrule, dtstart, duration_minutes, location, channel_id, channel_name, notifications, exdates, created_at, updated_at"
    )
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

export async function getEventById(
  eventId: string,
  guildId: string
): Promise<ServiceResult<EventRecord | null>> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from("events")
    .select("*")
    .eq("id", eventId)
    .eq("guild_id", guildId)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return { success: true, data: null };
    }
    logger.error({ error, eventId, guildId }, "Failed to fetch event by ID");
    return {
      success: false,
      error: classifySupabaseError(error, "fetch"),
    };
  }

  return { success: true, data: data as EventRecord };
}

export async function updateEvent(
  eventId: string,
  guildId: string,
  updateData: EventUpdate
): Promise<ServiceResult<EventRecord>> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from("events")
    .update(updateData)
    .eq("id", eventId)
    .eq("guild_id", guildId)
    .select()
    .single();

  if (error) {
    logger.error({ error, eventId, guildId }, "Failed to update event");
    return {
      success: false,
      error: classifySupabaseError(error, "update"),
    };
  }

  return { success: true, data: data as EventRecord };
}

export async function deleteEvent(
  eventId: string,
  guildId: string
): Promise<ServiceResult<void>> {
  const supabase = getSupabaseClient();

  // guild_id でスコープして IDOR を防ぐ物理削除。
  // .select() で実際に削除された行を返してもらい、0 件削除（レース競合で既に
  // 削除済みなど）を検知して NOT_FOUND として扱う。
  const { data, error } = await supabase
    .from("events")
    .delete()
    .eq("id", eventId)
    .eq("guild_id", guildId)
    .select("id");

  if (error) {
    logger.error({ error, eventId, guildId }, "Failed to delete event");
    return {
      success: false,
      error: classifySupabaseError(error, "delete"),
    };
  }

  if (!data || data.length === 0) {
    logger.warn(
      { eventId, guildId },
      "Event not found or already deleted when attempting delete"
    );
    return {
      success: false,
      error: {
        code: "NOT_FOUND",
        message: "削除対象のイベントが見つかりませんでした",
      },
    };
  }

  return { success: true, data: undefined };
}

/** イベント昇格用入力 (PollSnapshot からの抜粋) */
export type CreateEventFromPollInput = {
  poll: {
    id: string;
    guild_id: string;
    title: string;
    description: string | null;
  };
  option: {
    id: string;
    starts_at: string;
    ends_at: string | null;
  };
  actorUserId: string;
};

/** 投票から昇格された events の ends_at が未指定のときの既定継続時間 (1 時間) */
export const DEFAULT_POLL_EVENT_DURATION_MS = 60 * 60 * 1000;

export async function createEventFromPoll(
  input: CreateEventFromPollInput
): Promise<ServiceResult<EventRecord>> {
  const supabase = getSupabaseClient();

  const endAt =
    input.option.ends_at ??
    new Date(
      Date.parse(input.option.starts_at) + DEFAULT_POLL_EVENT_DURATION_MS
    ).toISOString();

  const payload: EventCreate = {
    guild_id: input.poll.guild_id,
    name: input.poll.title,
    description: input.poll.description,
    start_at: input.option.starts_at,
    end_at: endAt,
    notifications: [],
  };

  const { data, error } = await supabase
    .from("events")
    .insert(payload)
    .select()
    .single();

  if (error || !data) {
    logger.error(
      { error, pollId: input.poll.id },
      "Failed to create event from poll"
    );
    return {
      success: false,
      error: classifySupabaseError(
        error ?? { message: "events insert returned no row" },
        "create"
      ),
    };
  }

  return { success: true, data: data as EventRecord };
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
