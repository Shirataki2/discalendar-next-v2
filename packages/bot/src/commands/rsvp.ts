import {
  type ChatInputCommandInteraction,
  EmbedBuilder,
  SlashCommandBuilder,
} from "discord.js";
import {
  type AttendeeSummary,
  deleteRsvp,
  findEventByName,
  getAttendeeSummary,
  getCurrentRsvp,
  type RsvpStatus,
  upsertRsvp,
} from "../services/attendee-service.js";
import { getEventsByGuildId } from "../services/event-service.js";
import type { Command } from "../types/command.js";
import type { EventRecord } from "../types/event.js";
import { formatDateTime } from "../utils/datetime.js";
import { createErrorEmbed } from "../utils/embeds.js";
import { logger } from "../utils/logger.js";

const STATUS_CHOICES = [
  { name: "参加", value: "going" },
  { name: "未定", value: "maybe" },
  { name: "不参加", value: "not_going" },
] as const;

const STATUS_LABELS: Record<RsvpStatus, string> = {
  going: "参加",
  maybe: "未定",
  not_going: "不参加",
};

const EMBED_COLOR_GREEN = 0x22_c5_5e;
const EMBED_COLOR_ORANGE = 0xf5_9e_0b;
const MAX_RECENT_EVENTS = 5;

const data = new SlashCommandBuilder()
  .setName("rsvp")
  .setDescription("イベントへの出欠を回答します")
  .addStringOption((opt) =>
    opt
      .setName("event")
      .setDescription("イベント名（部分一致で検索）")
      .setRequired(true)
  )
  .addStringOption((opt) =>
    opt
      .setName("status")
      .setDescription("出欠ステータス")
      .addChoices(...STATUS_CHOICES)
      .setRequired(true)
  );

/** イベントが見つからない場合のエラーメッセージを構築する */
async function buildEventNotFoundMessage(
  guildId: string,
  eventName: string
): Promise<EmbedBuilder> {
  const recentResult = await getEventsByGuildId(guildId, "future");
  let hint = "";
  if (recentResult.success && recentResult.data.length > 0) {
    const names = recentResult.data
      .slice(0, MAX_RECENT_EVENTS)
      .map((e) => `• ${e.name}`)
      .join("\n");
    hint = `\n\n**直近のイベント:**\n${names}`;
  }

  return createErrorEmbed(
    "イベントが見つかりません",
    `「${eventName}」に一致するイベントが見つかりませんでした。${hint}`
  );
}

/** RSVP のトグル処理（同じステータスなら削除、異なれば upsert） */
async function toggleRsvp(params: {
  guildId: string;
  event: EventRecord;
  discordUserId: string;
  discordUsername: string;
  discordAvatarUrl: string | null;
  status: RsvpStatus;
  currentStatus: RsvpStatus | null | undefined;
}): Promise<
  | { success: true; action: "upserted" | "deleted" }
  | { success: false; message: string }
> {
  if (params.currentStatus === params.status) {
    const deleteResult = await deleteRsvp({
      guildId: params.guildId,
      eventId: params.event.id,
      discordUserId: params.discordUserId,
    });

    if (!deleteResult.success) {
      logger.error(
        { error: deleteResult.error, eventId: params.event.id },
        "Failed to delete RSVP"
      );
      return { success: false, message: "出欠の取り消しに失敗しました" };
    }
    return { success: true, action: "deleted" };
  }

  const upsertResult = await upsertRsvp({
    guildId: params.guildId,
    eventId: params.event.id,
    discordUserId: params.discordUserId,
    discordUsername: params.discordUsername,
    discordAvatarUrl: params.discordAvatarUrl,
    status: params.status,
  });

  if (!upsertResult.success) {
    logger.error(
      { error: upsertResult.error, eventId: params.event.id },
      "Failed to upsert RSVP"
    );
    return { success: false, message: "出欠の登録に失敗しました" };
  }
  return { success: true, action: "upserted" };
}

/** 結果 Embed を構築する */
function buildResultEmbed(
  event: EventRecord,
  action: "upserted" | "deleted",
  status: RsvpStatus,
  summary: AttendeeSummary
): EmbedBuilder {
  const embed = new EmbedBuilder().setTitle(event.name).setTimestamp();

  if (action === "deleted") {
    embed.setDescription("出欠を取り消しました").setColor(EMBED_COLOR_ORANGE);
  } else {
    embed
      .setDescription(`**${STATUS_LABELS[status]}** で回答しました`)
      .setColor(EMBED_COLOR_GREEN);
  }

  if (event.start_at) {
    embed.addFields({
      name: "開始時間",
      value: formatDateTime(new Date(event.start_at)),
      inline: true,
    });
  }

  embed.addFields({
    name: "参加状況",
    value: `参加 ${summary.going} · 未定 ${summary.maybe} · 不参加 ${summary.notGoing}`,
    inline: false,
  });

  return embed;
}

async function execute(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  if (!interaction.guild) {
    await interaction.reply({
      content: "このコマンドはサーバーでのみ実行可能です",
      ephemeral: true,
    });
    return;
  }

  await interaction.deferReply();

  const guildId = interaction.guild.id;
  const eventName = interaction.options.getString("event", true);
  const rawStatus = interaction.options.getString("status", true);
  if (!["going", "maybe", "not_going"].includes(rawStatus)) {
    await interaction.editReply({
      embeds: [createErrorEmbed("エラー", "無効なステータスです")],
    });
    return;
  }
  const status = rawStatus as RsvpStatus;
  const discordUserId = interaction.user.id;
  const discordUsername = interaction.user.username;
  const discordAvatarUrl = interaction.user.avatarURL() ?? null;

  // イベントを名前で検索
  const eventResult = await findEventByName(guildId, eventName);
  if (!eventResult.success) {
    logger.error(
      { error: eventResult.error, guildId },
      "Failed to search event for RSVP"
    );
    await interaction.editReply({
      embeds: [createErrorEmbed("エラー", "イベントの検索に失敗しました")],
    });
    return;
  }

  if (!eventResult.data) {
    const errorEmbed = await buildEventNotFoundMessage(guildId, eventName);
    await interaction.editReply({ embeds: [errorEmbed] });
    return;
  }

  const event = eventResult.data;

  // 現在の RSVP を確認（トグル判定用）
  const currentResult = await getCurrentRsvp(event.id, discordUserId);
  const currentStatus = currentResult.success
    ? currentResult.data?.status
    : null;

  // トグル処理
  const toggleResult = await toggleRsvp({
    guildId,
    event,
    discordUserId,
    discordUsername,
    discordAvatarUrl,
    status,
    currentStatus,
  });

  if (!toggleResult.success) {
    await interaction.editReply({
      embeds: [createErrorEmbed("エラー", toggleResult.message)],
    });
    return;
  }

  // サマリーを取得して結果を返信
  const summaryResult = await getAttendeeSummary(event.id);
  const summary = summaryResult.success
    ? summaryResult.data
    : { going: 0, maybe: 0, notGoing: 0, total: 0 };

  const embed = buildResultEmbed(event, toggleResult.action, status, summary);
  await interaction.editReply({ embeds: [embed] });
}

export default { data, execute } satisfies Command;
