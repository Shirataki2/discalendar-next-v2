import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  type ChatInputCommandInteraction,
  ComponentType,
  EmbedBuilder,
  SlashCommandBuilder,
} from "discord.js";
import { getEventsByGuildId } from "../services/event-service.js";
import type { Command } from "../types/command.js";
import type { EventRecord } from "../types/event.js";
import { NOTIFICATION_UNIT_LABELS } from "../types/event.js";
import { formatDateTime } from "../utils/datetime.js";
import { logger } from "../utils/logger.js";

const PER_PAGE = 4;
const COLLECTOR_TIMEOUT_MS = 180_000;

const VALID_RANGES = ["past", "future", "all"] as const;
type Range = (typeof VALID_RANGES)[number];

function buildEmbed(
  events: EventRecord[],
  page: number,
  maxPages: number
): EmbedBuilder {
  const embed = new EmbedBuilder().setTitle("予定一覧").setColor(0x00_00_ff);

  const start = page * PER_PAGE;
  const end = start + PER_PAGE;
  const pageEvents = events.slice(start, end);

  for (const event of pageEvents) {
    const notificationsStr =
      event.notifications
        .map((n) => `${n.num}${NOTIFICATION_UNIT_LABELS[n.unit]}`)
        .join(", ") || "なし";

    const value = [
      `\`開始時刻\`: ${formatDateTime(new Date(event.start_at))}`,
      `\`終了時刻\`: ${formatDateTime(new Date(event.end_at))}`,
      `\`　通知　\`: ${notificationsStr}`,
    ].join("\n");

    embed.addFields({ name: event.name, value, inline: false });
  }

  embed.setFooter({ text: `ページ ${page + 1}/${maxPages}` });
  return embed;
}

function buildRow(
  page: number,
  maxPages: number
): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId("prev")
      .setLabel("◀")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(page === 0),
    new ButtonBuilder()
      .setCustomId("next")
      .setLabel("▶")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(page >= maxPages - 1)
  );
}

const data = new SlashCommandBuilder()
  .setName("list")
  .setDescription("予定の一覧を表示します")
  .addStringOption((opt) =>
    opt
      .setName("range")
      .setDescription("表示する予定の範囲")
      .addChoices(
        { name: "過去", value: "past" },
        { name: "未来", value: "future" },
        { name: "全て", value: "all" }
      )
      .setRequired(false)
  );

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

  const rawRange = interaction.options.getString("range") ?? "future";
  const range: Range = (VALID_RANGES as readonly string[]).includes(rawRange)
    ? (rawRange as Range)
    : "future";
  const guildId = interaction.guild.id;
  const result = await getEventsByGuildId(guildId, range);

  if (!result.success) {
    logger.error(
      { error: result.error, guildId },
      "Failed to fetch events for list"
    );
    await interaction.editReply("予定の取得に失敗しました");
    return;
  }

  const events = result.data;

  if (events.length === 0) {
    await interaction.editReply("現在登録されている予定はありません");
    return;
  }

  let currentPage = 0;
  const maxPages = Math.ceil(events.length / PER_PAGE);

  const reply = await interaction.editReply({
    embeds: [buildEmbed(events, currentPage, maxPages)],
    components: maxPages > 1 ? [buildRow(currentPage, maxPages)] : [],
  });

  if (maxPages <= 1) {
    return;
  }

  const collector = reply.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: COLLECTOR_TIMEOUT_MS,
  });

  collector.on("collect", async (i) => {
    if (i.user.id !== interaction.user.id) {
      await i.reply({
        content: "このボタンは使用できません",
        ephemeral: true,
      });
      return;
    }

    if (i.customId === "prev") {
      currentPage = Math.max(0, currentPage - 1);
    } else if (i.customId === "next") {
      currentPage = Math.min(maxPages - 1, currentPage + 1);
    }

    await i.update({
      embeds: [buildEmbed(events, currentPage, maxPages)],
      components: [buildRow(currentPage, maxPages)],
    });
  });

  collector.on("end", async () => {
    try {
      await interaction.editReply({ components: [] });
    } catch {
      // Message might have been deleted
    }
  });
}

export default { data, execute } satisfies Command;
