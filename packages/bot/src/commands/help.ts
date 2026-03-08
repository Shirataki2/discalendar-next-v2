import {
  type ChatInputCommandInteraction,
  SlashCommandBuilder,
} from "discord.js";
import { getConfig } from "../config.js";
import type { Command } from "../types/command.js";
import { createHelpEmbed } from "../utils/embeds.js";

const data = new SlashCommandBuilder()
  .setName("help")
  .setDescription("このBotの使い方を表示します");

async function execute(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  const config = getConfig();
  const botAvatarUrl = interaction.client.user?.displayAvatarURL() ?? null;
  const embed = createHelpEmbed(
    botAvatarUrl,
    config.invitationUrl,
    config.supportServerUrl
  );
  await interaction.reply({ embeds: [embed], ephemeral: true });
}

export default { data, execute } satisfies Command;
