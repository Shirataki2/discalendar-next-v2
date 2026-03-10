import { expandOccurrences, toSummaryText } from "@discalendar/rrule-utils";
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  type ChatInputCommandInteraction,
  ComponentType,
  EmbedBuilder,
  SlashCommandBuilder,
} from "discord.js";
import {
  getEventsByGuildId,
  getSeriesByGuildId,
} from "../services/event-service.js";
import type { Command } from "../types/command.js";
import type { EventRecord, EventSeriesRecord } from "../types/event.js";
import { NOTIFICATION_UNIT_LABELS } from "../types/event.js";
import { formatDateTime } from "../utils/datetime.js";
import { logger } from "../utils/logger.js";

const PER_PAGE = 4;
const COLLECTOR_TIMEOUT_MS = 180_000;
const MS_PER_MINUTE = 60_000;

/** オカレンス展開の最大範囲（90日） */
const EXPANSION_RANGE_MS = 90 * 24 * 60 * 60 * 1000;

const VALID_RANGES = ["past", "future", "all"] as const;
type Range = (typeof VALID_RANGES)[number];

/** 表示用イベント（繰り返し情報を含む） */
type ListEvent = EventRecord & {
  recurrence?: string;
};

/** シリーズのオカレンスを展開し EventRecord に変換する */
export function expandSeriesToEvents(
  seriesList: EventSeriesRecord[],
  rangeStart: Date,
  rangeEnd: Date
): ListEvent[] {
  const events: ListEvent[] = [];

  for (const series of seriesList) {
    const dtstart = new Date(series.dtstart);
    const exdates = series.exdates.map((d) => new Date(d));
    const result = expandOccurrences(
      series.rrule,
      dtstart,
      rangeStart,
      rangeEnd,
      exdates
    );

    const summary = toSummaryText(series.rrule, dtstart);

    for (const occDate of result.dates) {
      events.push({
        id: `series:${series.id}:occ:${occDate.toISOString()}`,
        guild_id: series.guild_id,
        name: series.name,
        description: series.description,
        color: series.color,
        is_all_day: series.is_all_day,
        start_at: occDate.toISOString(),
        end_at: new Date(
          occDate.getTime() + series.duration_minutes * MS_PER_MINUTE
        ).toISOString(),
        location: series.location,
        channel_id: series.channel_id,
        channel_name: series.channel_name,
        notifications: series.notifications,
        created_at: series.created_at,
        updated_at: series.updated_at,
        recurrence: summary,
      });
    }
  }

  return events;
}

/** 範囲に応じたオカレンス展開の開始・終了日を算出する */
export function getExpansionRange(
  range: Range,
  now: Date
): { rangeStart: Date; rangeEnd: Date } {
  switch (range) {
    case "future":
      return {
        rangeStart: now,
        rangeEnd: new Date(now.getTime() + EXPANSION_RANGE_MS),
      };
    case "past":
      return {
        rangeStart: new Date(now.getTime() - EXPANSION_RANGE_MS),
        rangeEnd: now,
      };
    default:
      return {
        rangeStart: new Date(now.getTime() - EXPANSION_RANGE_MS),
        rangeEnd: new Date(now.getTime() + EXPANSION_RANGE_MS),
      };
  }
}

function buildEmbed(
  events: ListEvent[],
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

    const lines = [
      `\`開始時刻\`: ${formatDateTime(new Date(event.start_at))}`,
      `\`終了時刻\`: ${formatDateTime(new Date(event.end_at))}`,
      `\`　通知　\`: ${notificationsStr}`,
    ];

    if (event.recurrence) {
      lines.push(`\`繰り返し\`: ${event.recurrence}`);
    }

    embed.addFields({
      name: event.recurrence ? `${event.name}` : event.name,
      value: lines.join("\n"),
      inline: false,
    });
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

  const [eventsResult, seriesResult] = await Promise.all([
    getEventsByGuildId(guildId, range),
    getSeriesByGuildId(guildId),
  ]);

  if (!eventsResult.success) {
    logger.error(
      { error: eventsResult.error, guildId },
      "Failed to fetch events for list"
    );
    await interaction.editReply("予定の取得に失敗しました");
    return;
  }

  const singleEvents: ListEvent[] = eventsResult.data;

  // シリーズ取得に失敗しても単発イベントは表示する
  let seriesEvents: ListEvent[] = [];
  if (seriesResult.success) {
    const now = new Date();
    const { rangeStart, rangeEnd } = getExpansionRange(range, now);
    seriesEvents = expandSeriesToEvents(
      seriesResult.data,
      rangeStart,
      rangeEnd
    );
  } else {
    logger.error(
      { error: seriesResult.error, guildId },
      "Failed to fetch event series for list"
    );
  }

  // マージしてstart_atでソート
  const events = [...singleEvents, ...seriesEvents].sort(
    (a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime()
  );

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
