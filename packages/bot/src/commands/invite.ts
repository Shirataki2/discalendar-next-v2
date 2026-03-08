import {
  type ChatInputCommandInteraction,
  SlashCommandBuilder,
} from "discord.js";
import { getConfig } from "../config.js";
import type { Command } from "../types/command.js";

const data = new SlashCommandBuilder()
  .setName("invite")
  .setDescription("このBotの招待URLを表示します");

async function execute(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  const url = getConfig().invitationUrl;
  if (!url) {
    await interaction.reply({
      content: "招待URLが設定されていません。Bot管理者にお問い合わせください。",
      ephemeral: true,
    });
    return;
  }
  await interaction.reply(url);
}

export default { data, execute } satisfies Command;
