import {
  type ChatInputCommandInteraction,
  type GuildMember,
  SlashCommandBuilder,
  type SlashCommandOptionsOnlyBuilder,
} from "discord.js";
import { createEvent } from "../services/event-service.js";
import { getGuildConfig } from "../services/guild-service.js";
import type { Command } from "../types/command.js";
import { validateDate } from "../utils/datetime.js";
import { createEventEmbed } from "../utils/embeds.js";
import { logger } from "../utils/logger.js";
import { hasManagementPermission } from "../utils/permissions.js";
import {
  addNotifyOption,
  COLOR_CHOICES,
  COLOR_MAP,
  JST_OFFSET_HOURS,
  MAX_YEAR,
  MIN_YEAR,
  NOTIFY_MAP,
} from "./constants.js";

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

  addNotifyOption(builder, "notify_1", "事前通知1");
  addNotifyOption(builder, "notify_2", "事前通知2");
  addNotifyOption(builder, "notify_3", "事前通知3");
  addNotifyOption(builder, "notify_4", "事前通知4");

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
