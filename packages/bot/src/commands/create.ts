import {
  type ChatInputCommandInteraction,
  type GuildMember,
  SlashCommandBuilder,
  type SlashCommandOptionsOnlyBuilder,
} from "discord.js";
import { createEvent } from "../services/event-service.js";
import { getGuildConfig } from "../services/guild-service.js";
import type { Command } from "../types/command.js";
import type { NotificationUnit } from "../types/event.js";
import { validateDate } from "../utils/datetime.js";
import { createEventEmbed } from "../utils/embeds.js";
import { logger } from "../utils/logger.js";
import { hasManagementPermission } from "../utils/permissions.js";

const COLOR_CHOICES = [
  { name: "白", value: "white" },
  { name: "黒", value: "black" },
  { name: "赤", value: "red" },
  { name: "青", value: "blue" },
  { name: "緑", value: "green" },
  { name: "黄", value: "yellow" },
  { name: "紫", value: "purple" },
  { name: "灰", value: "gray" },
  { name: "茶", value: "brown" },
  { name: "水色", value: "aqua" },
] as const;

const COLOR_MAP: Record<string, string> = {
  white: "#ffffff",
  black: "#000000",
  red: "#fd4028",
  blue: "#3e44f7",
  green: "#33f54b",
  yellow: "#eaff33",
  purple: "#a31ce0",
  gray: "#808080",
  brown: "#a54f4f",
  aqua: "#44f3f3",
};

const NOTIFICATION_CHOICES = [
  { name: "5分前", value: "5m" },
  { name: "10分前", value: "10m" },
  { name: "15分前", value: "15m" },
  { name: "30分前", value: "30m" },
  { name: "1時間前", value: "1h" },
  { name: "2時間前", value: "2h" },
  { name: "3時間前", value: "3h" },
  { name: "6時間前", value: "6h" },
  { name: "12時間前", value: "12h" },
  { name: "1日前", value: "1d" },
  { name: "2日前", value: "2d" },
  { name: "3日前", value: "3d" },
  { name: "7日前", value: "7d" },
] as const;

const NOTIFY_MAP: Record<string, { num: number; unit: NotificationUnit }> = {
  "5m": { num: 5, unit: "minutes" },
  "10m": { num: 10, unit: "minutes" },
  "15m": { num: 15, unit: "minutes" },
  "30m": { num: 30, unit: "minutes" },
  "1h": { num: 1, unit: "hours" },
  "2h": { num: 2, unit: "hours" },
  "3h": { num: 3, unit: "hours" },
  "6h": { num: 6, unit: "hours" },
  "12h": { num: 12, unit: "hours" },
  "1d": { num: 1, unit: "days" },
  "2d": { num: 2, unit: "days" },
  "3d": { num: 3, unit: "days" },
  "7d": { num: 7, unit: "days" },
};

const MIN_YEAR = 1970;
const MAX_YEAR = 2099;

function addNotifyOption(
  cmd: SlashCommandOptionsOnlyBuilder,
  name: string,
  description: string
): void {
  cmd.addStringOption((opt) =>
    opt
      .setName(name)
      .setDescription(description)
      .addChoices(...NOTIFICATION_CHOICES)
      .setRequired(false)
  );
}

function buildCommandData(): SlashCommandOptionsOnlyBuilder {
  const builder = new SlashCommandBuilder()
    .setName("create")
    .setDescription("予定を新たに作成します（時刻はJST/日本標準時）")
    .addStringOption((opt) =>
      opt
        .setName("name")
        .setDescription("予定の名称")
        .setMaxLength(100)
        .setRequired(true)
    )
    .addIntegerOption((opt) =>
      opt
        .setName("start_year")
        .setDescription("予定開始時間(年)")
        .setMinValue(MIN_YEAR)
        .setMaxValue(MAX_YEAR)
        .setRequired(true)
    )
    .addIntegerOption((opt) =>
      opt
        .setName("start_month")
        .setDescription("予定開始時間(月)")
        .setMinValue(1)
        .setMaxValue(12)
        .setRequired(true)
    )
    .addIntegerOption((opt) =>
      opt
        .setName("start_day")
        .setDescription("予定開始時間(日)")
        .setMinValue(1)
        .setMaxValue(31)
        .setRequired(true)
    )
    .addIntegerOption((opt) =>
      opt
        .setName("start_hour")
        .setDescription("予定開始時間(時)")
        .setMinValue(0)
        .setMaxValue(23)
        .setRequired(true)
    )
    .addIntegerOption((opt) =>
      opt
        .setName("start_minute")
        .setDescription("予定開始時間(分)")
        .setMinValue(0)
        .setMaxValue(59)
        .setRequired(true)
    )
    .addIntegerOption((opt) =>
      opt
        .setName("end_year")
        .setDescription("予定終了時間(年)")
        .setMinValue(MIN_YEAR)
        .setMaxValue(MAX_YEAR)
        .setRequired(true)
    )
    .addIntegerOption((opt) =>
      opt
        .setName("end_month")
        .setDescription("予定終了時間(月)")
        .setMinValue(1)
        .setMaxValue(12)
        .setRequired(true)
    )
    .addIntegerOption((opt) =>
      opt
        .setName("end_day")
        .setDescription("予定終了時間(日)")
        .setMinValue(1)
        .setMaxValue(31)
        .setRequired(true)
    )
    .addIntegerOption((opt) =>
      opt
        .setName("end_hour")
        .setDescription("予定終了時間(時)")
        .setMinValue(0)
        .setMaxValue(23)
        .setRequired(true)
    )
    .addIntegerOption((opt) =>
      opt
        .setName("end_minute")
        .setDescription("予定終了時間(分)")
        .setMinValue(0)
        .setMaxValue(59)
        .setRequired(true)
    )
    .addStringOption((opt) =>
      opt
        .setName("description")
        .setDescription("予定の説明")
        .setMaxLength(1024)
        .setRequired(false)
    )
    .addBooleanOption((opt) =>
      opt
        .setName("is_all_day")
        .setDescription("終日行う予定か")
        .setRequired(false)
    )
    .addStringOption((opt) =>
      opt
        .setName("color")
        .setDescription("予定の配色")
        .addChoices(...COLOR_CHOICES)
        .setRequired(false)
    );

  addNotifyOption(builder, "notify_1", "予定の事前通知");
  addNotifyOption(builder, "notify_2", "予定の事前通知");
  addNotifyOption(builder, "notify_3", "予定の事前通知");
  addNotifyOption(builder, "notify_4", "予定の事前通知");

  return builder;
}

const data = buildCommandData();

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

  const guildId = interaction.guild.id;

  const guildConfigResult = await getGuildConfig(guildId);
  if (!guildConfigResult.success) {
    logger.error(
      { error: guildConfigResult.error, guildId },
      "Failed to fetch guild config"
    );
    await interaction.reply({
      content: "ギルド設定の取得に失敗しました",
      ephemeral: true,
    });
    return;
  }

  if (guildConfigResult.data?.restricted) {
    const member = interaction.member as GuildMember | null;
    if (!hasManagementPermission(member)) {
      await interaction.reply({
        content:
          "このコマンドを実行するためには「管理者」「サーバー管理」「ロールの管理」「メッセージの管理」のいずれかの権限が必要です",
        ephemeral: true,
      });
      return;
    }
  }

  const name = interaction.options.getString("name", true);
  const startYear = interaction.options.getInteger("start_year", true);
  const startMonth = interaction.options.getInteger("start_month", true);
  const startDay = interaction.options.getInteger("start_day", true);
  const startHour = interaction.options.getInteger("start_hour", true);
  const startMinute = interaction.options.getInteger("start_minute", true);
  const endYear = interaction.options.getInteger("end_year", true);
  const endMonth = interaction.options.getInteger("end_month", true);
  const endDay = interaction.options.getInteger("end_day", true);
  const endHour = interaction.options.getInteger("end_hour", true);
  const endMinute = interaction.options.getInteger("end_minute", true);
  const description = interaction.options.getString("description") ?? null;
  const isAllDay = interaction.options.getBoolean("is_all_day") ?? false;
  const color = interaction.options.getString("color") ?? "blue";

  if (
    !validateDate({
      year: startYear,
      month: startMonth,
      day: startDay,
      hour: startHour,
      minute: startMinute,
    })
  ) {
    await interaction.reply({
      content: `無効な開始日時です: ${startYear}/${startMonth}/${startDay} ${startHour}:${startMinute}`,
      ephemeral: true,
    });
    return;
  }

  if (
    !validateDate({
      year: endYear,
      month: endMonth,
      day: endDay,
      hour: endHour,
      minute: endMinute,
    })
  ) {
    await interaction.reply({
      content: `無効な終了日時です: ${endYear}/${endMonth}/${endDay} ${endHour}:${endMinute}`,
      ephemeral: true,
    });
    return;
  }

  // ユーザー入力はJSTとして扱い、UTC に変換する (JST = UTC+9)
  const JST_OFFSET_HOURS = 9;
  const startAt = new Date(
    Date.UTC(
      startYear,
      startMonth - 1,
      startDay,
      startHour - JST_OFFSET_HOURS,
      startMinute
    )
  );
  const endAt = new Date(
    Date.UTC(
      endYear,
      endMonth - 1,
      endDay,
      endHour - JST_OFFSET_HOURS,
      endMinute
    )
  );

  if (startAt >= endAt) {
    await interaction.reply({
      content: "開始時間が終了時間以降になっています",
      ephemeral: true,
    });
    return;
  }

  const colorHex = COLOR_MAP[color] ?? "#3e44f7";

  const seenNotifications = new Set<string>();
  const notifications = [
    interaction.options.getString("notify_1"),
    interaction.options.getString("notify_2"),
    interaction.options.getString("notify_3"),
    interaction.options.getString("notify_4"),
  ]
    .map((value, index) => {
      if (!(value && value in NOTIFY_MAP)) {
        return null;
      }
      if (seenNotifications.has(value)) {
        return null;
      }
      seenNotifications.add(value);
      const mapped = NOTIFY_MAP[value];
      return { key: `n${index + 1}`, num: mapped.num, unit: mapped.unit };
    })
    .filter((n) => n !== null);

  const result = await createEvent({
    guild_id: guildId,
    name,
    description,
    start_at: startAt.toISOString(),
    end_at: endAt.toISOString(),
    is_all_day: isAllDay,
    color: colorHex,
    notifications,
  });

  if (!result.success) {
    logger.error({ error: result.error, guildId }, "Failed to create event");
    await interaction.reply({
      content: "予定の作成に失敗しました",
      ephemeral: true,
    });
    return;
  }

  const embed = createEventEmbed(result.data);
  await interaction.reply({
    content: "正常に予定を作成しました",
    embeds: [embed],
  });
}

export default { data, execute } satisfies Command;
