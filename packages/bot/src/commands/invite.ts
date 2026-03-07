import {
  type ChatInputCommandInteraction,
  SlashCommandBuilder,
} from "discord.js";
import type { Command } from "../bot.js";
import { getConfig } from "../config.js";

const data = new SlashCommandBuilder()
  .setName("invite")
  .setDescription("このBotの招待URLを表示します");

async function execute(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  await interaction.reply(getConfig().invitationUrl);
}

export default { data, execute } satisfies Command;
