import type {
  EventCreate,
  EventRecord,
  EventSettings,
} from "../types/event.js";
import { logger } from "../utils/logger.js";
import { getSupabaseClient } from "./supabase.js";

export async function getEventsByGuildId(
  guildId: string,
  rangeType: "past" | "future" | "all" = "all"
): Promise<EventRecord[]> {
  const supabase = getSupabaseClient();
  let query = supabase
    .from("events")
    .select("*")
    .eq("guild_id", guildId)
    .order("start_at", { ascending: true });

  const now = new Date().toISOString();
  if (rangeType === "future") {
    query = query.gte("end_at", now);
  } else if (rangeType === "past") {
    query = query.lt("end_at", now);
  }

  const { data, error } = await query;

  if (error) {
    logger.error({ error, guildId }, "Failed to fetch events");
    throw error;
  }

  return data as EventRecord[];
}

export async function createEvent(data: EventCreate): Promise<EventRecord> {
  const supabase = getSupabaseClient();

  const { data: created, error } = await supabase
    .from("events")
    .insert(data)
    .select()
    .single();

  if (error) {
    logger.error({ error, guildId: data.guild_id }, "Failed to create event");
    throw error;
  }

  return created as EventRecord;
}

export async function getFutureEventsForAllGuilds(
  fromTime: Date
): Promise<EventRecord[]> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from("events")
    .select("*")
    .gte("start_at", fromTime.toISOString())
    .order("start_at", { ascending: true });

  if (error) {
    logger.error({ error }, "Failed to fetch future events for all guilds");
    throw error;
  }

  return data as EventRecord[];
}

export async function getEventSettings(
  guildId: string
): Promise<EventSettings | null> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from("event_settings")
    .select("*")
    .eq("guild_id", guildId)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return null;
    }
    logger.error({ error, guildId }, "Failed to fetch event settings");
    throw error;
  }

  return data as EventSettings;
}

export async function upsertEventSettings(
  guildId: string,
  channelId: string
): Promise<EventSettings> {
  const supabase = getSupabaseClient();

  const existing = await getEventSettings(guildId);

  if (existing) {
    const { data: updated, error: updateError } = await supabase
      .from("event_settings")
      .update({ channel_id: channelId })
      .eq("guild_id", guildId)
      .select()
      .single();

    if (updateError) {
      logger.error(
        { error: updateError, guildId },
        "Failed to update event settings"
      );
      throw updateError;
    }

    return updated as EventSettings;
  }

  const { data: created, error: insertError } = await supabase
    .from("event_settings")
    .insert({ guild_id: guildId, channel_id: channelId })
    .select()
    .single();

  if (insertError) {
    logger.error(
      { error: insertError, guildId },
      "Failed to create event settings"
    );
    throw insertError;
  }

  return created as EventSettings;
}
