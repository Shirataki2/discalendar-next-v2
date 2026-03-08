import type { GuildConfig, GuildCreate, GuildRow } from "../types/guild.js";
import type { ServiceResult } from "../types/result.js";
import { logger } from "../utils/logger.js";
import { classifySupabaseError } from "./classify-error.js";
import { getSupabaseClient } from "./supabase.js";

export async function upsertGuild(
  data: GuildCreate
): Promise<ServiceResult<GuildRow>> {
  const supabase = getSupabaseClient();

  // 再参加時に deleted_at をクリアしてデータを復元する
  const { data: guild, error } = await supabase
    .from("guilds")
    .upsert({ ...data, deleted_at: null }, { onConflict: "guild_id" })
    .select()
    .single();

  if (error) {
    logger.error({ error, guildId: data.guild_id }, "Failed to upsert guild");
    return {
      success: false,
      error: classifySupabaseError(error, "upsert"),
    };
  }

  return { success: true, data: guild as GuildRow };
}

export async function deleteGuild(
  guildId: string
): Promise<ServiceResult<void>> {
  const supabase = getSupabaseClient();

  // ソフトデリート: データを保持し、Bot再参加時に復元可能にする
  const { error } = await supabase
    .from("guilds")
    .update({ deleted_at: new Date().toISOString() })
    .eq("guild_id", guildId);

  if (error) {
    logger.error({ error, guildId }, "Failed to delete guild");
    return {
      success: false,
      error: classifySupabaseError(error, "delete"),
    };
  }

  return { success: true, data: undefined };
}

export async function getGuildConfig(
  guildId: string
): Promise<ServiceResult<GuildConfig | null>> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from("guild_config")
    .select("*")
    .eq("guild_id", guildId)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return { success: true, data: null };
    }
    logger.error({ error, guildId }, "Failed to fetch guild config");
    return {
      success: false,
      error: classifySupabaseError(error, "fetch"),
    };
  }

  return { success: true, data: data as GuildConfig };
}
