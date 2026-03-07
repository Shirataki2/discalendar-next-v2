import type { Guild } from "discord.js";
import { deleteGuild, upsertGuild } from "../services/guild-service.js";
import { logger } from "../utils/logger.js";

export async function onGuildCreate(guild: Guild): Promise<void> {
  logger.info({ guildId: guild.id, guildName: guild.name }, "Joined guild");

  await upsertGuild({
    guild_id: guild.id,
    name: guild.name,
    avatar_url: guild.iconURL(),
    locale: "ja",
  });
}

export async function onGuildDelete(guild: Guild): Promise<void> {
  logger.info({ guildId: guild.id, guildName: guild.name }, "Left guild");

  await deleteGuild(guild.id);
}

export async function onGuildUpdate(
  oldGuild: Guild,
  newGuild: Guild
): Promise<void> {
  if (oldGuild.name === newGuild.name && oldGuild.icon === newGuild.icon) {
    return;
  }

  logger.info(
    {
      guildId: newGuild.id,
      oldName: oldGuild.name,
      newName: newGuild.name,
    },
    "Guild updated"
  );

  await upsertGuild({
    guild_id: newGuild.id,
    name: newGuild.name,
    avatar_url: newGuild.iconURL(),
    locale: "ja",
  });
}
