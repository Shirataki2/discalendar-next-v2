import {
  ChannelType,
  type ChatInputCommandInteraction,
  type GuildMember,
  SlashCommandBuilder,
} from "discord.js";
import {
  getEventSettings,
  upsertEventSettings,
} from "../services/event-service.js";
import type { Command } from "../types/command.js";
import { logger } from "../utils/logger.js";
import { hasManagementPermission } from "../utils/permissions.js";

const data = new SlashCommandBuilder()
  .setName("init")
  .setDescription("このBotの通知の送信先を設定します")
  .addChannelOption((opt) =>
    opt
      .setName("channel")
      .setDescription(
        "通知先のチャンネル(指定しない場合はこのコマンドを送信したチャンネルになります)"
      )
      .addChannelTypes(ChannelType.GuildText)
      .setRequired(false)
  );

async function execute(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  if (!interaction.guild) {
    await interaction.reply({
      content: "このコマンドはサーバー内で実行してください",
      ephemeral: true,
    });
    return;
  }

  const member = interaction.member as GuildMember | null;
  if (!hasManagementPermission(member)) {
    await interaction.reply({
      content:
        "このコマンドを実行するためには「管理者」「サーバー管理」「ロールの管理」「メッセージの管理」のいずれかの権限が必要です",
      ephemeral: true,
    });
    return;
  }

  const channel = interaction.options.getChannel("channel");
  const targetChannel = channel ?? interaction.channel;
  if (!targetChannel) {
    await interaction.reply({
      content: "チャンネルを指定してください",
      ephemeral: true,
    });
    return;
  }

  const guildId = interaction.guild.id;
  const channelId = targetChannel.id;

  const existingResult = await getEventSettings(guildId);
  if (!existingResult.success) {
    logger.error(
      { error: existingResult.error, guildId },
      "Failed to fetch event settings"
    );
    await interaction.reply({
      content: "設定の取得に失敗しました",
      ephemeral: true,
    });
    return;
  }

  const upsertResult = await upsertEventSettings(guildId, channelId);
  if (!upsertResult.success) {
    logger.error(
      { error: upsertResult.error, guildId },
      "Failed to upsert event settings"
    );
    await interaction.reply({
      content: "設定の保存に失敗しました",
      ephemeral: true,
    });
    return;
  }

  if (existingResult.data) {
    await interaction.reply(
      `イベント通知先を変更しました\n通知先: <#${existingResult.data.channel_id}> → <#${channelId}>`
    );
  } else {
    await interaction.reply(
      `イベント通知を有効にしました\n通知先: <#${channelId}>`
    );
  }
}

export default { data, execute } satisfies Command;
