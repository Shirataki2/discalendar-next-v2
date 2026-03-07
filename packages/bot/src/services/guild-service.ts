import type { GuildConfig, GuildCreate, GuildRow } from "../types/guild.js";
import { logger } from "../utils/logger.js";
import { getSupabaseClient } from "./supabase.js";

export async function upsertGuild(data: GuildCreate): Promise<GuildRow> {
  const supabase = getSupabaseClient();

  const { data: guild, error } = await supabase
    .from("guilds")
    .upsert(data, { onConflict: "guild_id" })
    .select()
    .single();

  if (error) {
    logger.error({ error, guildId: data.guild_id }, "Failed to upsert guild");
    throw error;
  }

  return guild as GuildRow;
}

export async function deleteGuild(guildId: string): Promise<void> {
  const supabase = getSupabaseClient();

  const { error } = await supabase
    .from("guilds")
    .delete()
    .eq("guild_id", guildId);

  if (error) {
    logger.error({ error, guildId }, "Failed to delete guild");
    throw error;
  }
}

export async function getGuildConfig(
  guildId: string
): Promise<GuildConfig | null> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from("guild_config")
    .select("*")
    .eq("guild_id", guildId)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return null;
    }
    logger.error({ error, guildId }, "Failed to fetch guild config");
    throw error;
  }

  return data as GuildConfig;
}
