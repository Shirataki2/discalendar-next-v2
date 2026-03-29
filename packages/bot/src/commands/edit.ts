import {
  type ChatInputCommandInteraction,
  type EmbedBuilder,
  type GuildMember,
  SlashCommandBuilder,
  type SlashCommandOptionsOnlyBuilder,
} from "discord.js";
import { findEventByName } from "../services/attendee-service.js";
import { getEventsByGuildId, updateEvent } from "../services/event-service.js";
import { getGuildConfig } from "../services/guild-service.js";
import type { Command } from "../types/command.js";
import type {
  EventRecord,
  EventUpdate,
  NotificationPayload,
} from "../types/event.js";
import { validateDate } from "../utils/datetime.js";
import { createErrorEmbed, createEventEmbed } from "../utils/embeds.js";
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
  NOTIFY_NONE_VALUE,
} from "./constants.js";

const MAX_RECENT_EVENTS = 5;

type DateTimeParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
};

type DateTimeOverrides = {
  year?: number | null;
  month?: number | null;
  day?: number | null;
  hour?: number | null;
  minute?: number | null;
};

type ParsedEditOptions = {
  newName: string | null;
  newDescription: string | null;
  newIsAllDay: boolean | null;
  newColor: string | null;
  startOverrides: DateTimeOverrides;
  endOverrides: DateTimeOverrides;
  notifyValues: (string | null)[];
  hasStartOverride: boolean;
  hasEndOverride: boolean;
  hasNotifyOverride: boolean;
  hasAnyEdit: boolean;
};

/** UTC ISO文字列をJSTのコンポーネントに分解する */
function isoToJstParts(iso: string): DateTimeParts {
  const date = new Date(iso);
  const jst = new Date(date.getTime() + JST_OFFSET_HOURS * 60 * 60 * 1000);
  return {
    year: jst.getUTCFullYear(),
    month: jst.getUTCMonth() + 1,
    day: jst.getUTCDate(),
    hour: jst.getUTCHours(),
    minute: jst.getUTCMinutes(),
  };
}

/** JSTパーツをUTC ISO文字列に変換する */
function jstPartsToUtcIso(parts: DateTimeParts): string {
  const utc = new Date(
    Date.UTC(
      parts.year,
      parts.month - 1,
      parts.day,
      parts.hour - JST_OFFSET_HOURS,
      parts.minute
    )
  );
  return utc.toISOString();
}

/** 既存日時に対して指定パーツを上書きマージする */
function mergeDateTime(
  existingIso: string,
  overrides: DateTimeOverrides
): { iso: string; valid: boolean; parts: DateTimeParts } {
  const base = isoToJstParts(existingIso);
  const merged: DateTimeParts = {
    year: overrides.year ?? base.year,
    month: overrides.month ?? base.month,
    day: overrides.day ?? base.day,
    hour: overrides.hour ?? base.hour,
    minute: overrides.minute ?? base.minute,
  };
  const valid = validateDate(merged);
  return { iso: jstPartsToUtcIso(merged), valid, parts: merged };
}

function hasAnyValue(...values: unknown[]): boolean {
  return values.some((v) => v !== null);
}

/** interactionから編集オプションをパースする */
function parseEditOptions(
  interaction: ChatInputCommandInteraction
): ParsedEditOptions {
  const newName = interaction.options.getString("name");
  const newDescription = interaction.options.getString("description");
  const newIsAllDay = interaction.options.getBoolean("is_all_day");
  const newColor = interaction.options.getString("color");

  const startOverrides: DateTimeOverrides = {
    year: interaction.options.getInteger("start_year"),
    month: interaction.options.getInteger("start_month"),
    day: interaction.options.getInteger("start_day"),
    hour: interaction.options.getInteger("start_hour"),
    minute: interaction.options.getInteger("start_minute"),
  };

  const endOverrides: DateTimeOverrides = {
    year: interaction.options.getInteger("end_year"),
    month: interaction.options.getInteger("end_month"),
    day: interaction.options.getInteger("end_day"),
    hour: interaction.options.getInteger("end_hour"),
    minute: interaction.options.getInteger("end_minute"),
  };

  const notifyValues = [
    interaction.options.getString("notify_1"),
    interaction.options.getString("notify_2"),
    interaction.options.getString("notify_3"),
    interaction.options.getString("notify_4"),
  ];

  const hasStartOverride = hasAnyValue(
    startOverrides.year,
    startOverrides.month,
    startOverrides.day,
    startOverrides.hour,
    startOverrides.minute
  );
  const hasEndOverride = hasAnyValue(
    endOverrides.year,
    endOverrides.month,
    endOverrides.day,
    endOverrides.hour,
    endOverrides.minute
  );
  const hasNotifyOverride = hasAnyValue(...notifyValues);

  const hasAnyEdit =
    hasAnyValue(newName, newDescription, newIsAllDay, newColor) ||
    hasStartOverride ||
    hasEndOverride ||
    hasNotifyOverride;

  return {
    newName,
    newDescription,
    newIsAllDay,
    newColor,
    startOverrides,
    endOverrides,
    notifyValues,
    hasStartOverride,
    hasEndOverride,
    hasNotifyOverride,
    hasAnyEdit,
  };
}

/** 通知オプションから重複排除済みペイロードを構築する（"none"指定時は空配列） */
function buildNotifications(
  notifyValues: (string | null)[]
): NotificationPayload[] {
  if (notifyValues.some((v) => v === NOTIFY_NONE_VALUE)) {
    return [];
  }
  const seen = new Set<string>();
  return notifyValues
    .map((value, index) => {
      if (!(value && value in NOTIFY_MAP)) {
        return null;
      }
      if (seen.has(value)) {
        return null;
      }
      seen.add(value);
      const mapped = NOTIFY_MAP[value];
      return { key: `n${index + 1}`, num: mapped.num, unit: mapped.unit };
    })
    .filter((n) => n !== null);
}

// TODO: Reduce cognitive complexity of buildUpdatePayload (currently 21, max 15)
/** パースされたオプションと既存イベントからUpdateペイロードを構築する */
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: refactor planned
function buildUpdatePayload(
  opts: ParsedEditOptions,
  event: EventRecord
):
  | {
      success: true;
      payload: EventUpdate;
      finalStartIso: string;
      finalEndIso: string;
    }
  | { success: false; error: EmbedBuilder } {
  const payload: EventUpdate = {};

  if (opts.newName !== null) {
    payload.name = opts.newName;
  }
  if (opts.newDescription !== null) {
    payload.description =
      opts.newDescription === "" ? null : opts.newDescription;
  }
  if (opts.newIsAllDay !== null) {
    payload.is_all_day = opts.newIsAllDay;
  }
  if (opts.newColor !== null) {
    payload.color = COLOR_MAP[opts.newColor] ?? COLOR_MAP.blue;
  }

  let finalStartIso = event.start_at;
  let finalEndIso = event.end_at;

  if (opts.hasStartOverride) {
    const result = mergeDateTime(event.start_at, opts.startOverrides);
    if (!result.valid) {
      return {
        success: false,
        error: createErrorEmbed(
          "無効な開始日時",
          `無効な開始日時です: ${result.parts.year}/${result.parts.month}/${result.parts.day} ${result.parts.hour}:${result.parts.minute}`
        ),
      };
    }
    finalStartIso = result.iso;
    payload.start_at = result.iso;
  }

  if (opts.hasEndOverride) {
    const result = mergeDateTime(event.end_at, opts.endOverrides);
    if (!result.valid) {
      return {
        success: false,
        error: createErrorEmbed(
          "無効な終了日時",
          `無効な終了日時です: ${result.parts.year}/${result.parts.month}/${result.parts.day} ${result.parts.hour}:${result.parts.minute}`
        ),
      };
    }
    finalEndIso = result.iso;
    payload.end_at = result.iso;
  }

  if (opts.hasStartOverride || opts.hasEndOverride) {
    const effectiveIsAllDay = opts.newIsAllDay ?? event.is_all_day;
    const startGteEnd = effectiveIsAllDay
      ? new Date(finalStartIso) > new Date(finalEndIso)
      : new Date(finalStartIso) >= new Date(finalEndIso);

    if (startGteEnd) {
      return {
        success: false,
        error: createErrorEmbed(
          "日時エラー",
          "開始時間が終了時間以降になっています"
        ),
      };
    }
  }

  if (opts.hasNotifyOverride) {
    payload.notifications = buildNotifications(opts.notifyValues);
  }

  return { success: true, payload, finalStartIso, finalEndIso };
}

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

function buildCommandData(): SlashCommandOptionsOnlyBuilder {
  const builder = new SlashCommandBuilder()
    .setName("edit")
    .setDescription("既存の予定を編集します（時刻はJST/日本標準時）")
    .addStringOption((opt) =>
      opt
        .setName("event")
        .setDescription("編集するイベント名（部分一致で検索）")
        .setRequired(true)
    )
    .addStringOption((opt) =>
      opt
        .setName("name")
        .setDescription("新しい予定名称")
        .setMaxLength(100)
        .setRequired(false)
    )
    .addIntegerOption((opt) =>
      opt
        .setName("start_year")
        .setDescription("新しい開始時間(年)")
        .setMinValue(MIN_YEAR)
        .setMaxValue(MAX_YEAR)
        .setRequired(false)
    )
    .addIntegerOption((opt) =>
      opt
        .setName("start_month")
        .setDescription("新しい開始時間(月)")
        .setMinValue(1)
        .setMaxValue(12)
        .setRequired(false)
    )
    .addIntegerOption((opt) =>
      opt
        .setName("start_day")
        .setDescription("新しい開始時間(日)")
        .setMinValue(1)
        .setMaxValue(31)
        .setRequired(false)
    )
    .addIntegerOption((opt) =>
      opt
        .setName("start_hour")
        .setDescription("新しい開始時間(時)")
        .setMinValue(0)
        .setMaxValue(23)
        .setRequired(false)
    )
    .addIntegerOption((opt) =>
      opt
        .setName("start_minute")
        .setDescription("新しい開始時間(分)")
        .setMinValue(0)
        .setMaxValue(59)
        .setRequired(false)
    )
    .addIntegerOption((opt) =>
      opt
        .setName("end_year")
        .setDescription("新しい終了時間(年)")
        .setMinValue(MIN_YEAR)
        .setMaxValue(MAX_YEAR)
        .setRequired(false)
    )
    .addIntegerOption((opt) =>
      opt
        .setName("end_month")
        .setDescription("新しい終了時間(月)")
        .setMinValue(1)
        .setMaxValue(12)
        .setRequired(false)
    )
    .addIntegerOption((opt) =>
      opt
        .setName("end_day")
        .setDescription("新しい終了時間(日)")
        .setMinValue(1)
        .setMaxValue(31)
        .setRequired(false)
    )
    .addIntegerOption((opt) =>
      opt
        .setName("end_hour")
        .setDescription("新しい終了時間(時)")
        .setMinValue(0)
        .setMaxValue(23)
        .setRequired(false)
    )
    .addIntegerOption((opt) =>
      opt
        .setName("end_minute")
        .setDescription("新しい終了時間(分)")
        .setMinValue(0)
        .setMaxValue(59)
        .setRequired(false)
    )
    .addStringOption((opt) =>
      opt
        .setName("description")
        .setDescription("新しい予定の説明（空文字で削除）")
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
        .setDescription("新しい予定の配色")
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

async function handleModalPath(
  interaction: ChatInputCommandInteraction,
  guildId: string,
  eventQuery: string
): Promise<void> {
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

  const eventResult = await findEventByName(guildId, eventQuery);
  if (!eventResult.success) {
    logger.error(
      { error: eventResult.error, guildId },
      "Failed to search event for modal edit"
    );
    await interaction.reply({
      content: "イベントの検索に失敗しました",
      ephemeral: true,
    });
    return;
  }

  if (!eventResult.data) {
    await interaction.reply({
      content: `「${eventQuery}」に一致するイベントが見つかりません`,
      ephemeral: true,
    });
    return;
  }

  const { buildEditModal } = await import("../utils/modal.js");
  const modal = buildEditModal(eventResult.data);
  await interaction.showModal(modal);
}

async function handleInlinePath(
  interaction: ChatInputCommandInteraction,
  guildId: string,
  eventQuery: string,
  opts: ParsedEditOptions
): Promise<void> {
  await interaction.deferReply();

  const guildConfigResult = await getGuildConfig(guildId);
  if (!guildConfigResult.success) {
    logger.error(
      { error: guildConfigResult.error, guildId },
      "Failed to fetch guild config"
    );
    await interaction.editReply({ content: "ギルド設定の取得に失敗しました" });
    return;
  }

  if (guildConfigResult.data?.restricted) {
    const member = interaction.member as GuildMember | null;
    if (!hasManagementPermission(member)) {
      await interaction.editReply({
        content:
          "このコマンドを実行するためには「管理者」「サーバー管理」「ロールの管理」「メッセージの管理」のいずれかの権限が必要です",
      });
      return;
    }
  }

  const eventResult = await findEventByName(guildId, eventQuery);
  if (!eventResult.success) {
    logger.error(
      { error: eventResult.error, guildId },
      "Failed to search event for edit"
    );
    await interaction.editReply({
      embeds: [createErrorEmbed("エラー", "イベントの検索に失敗しました")],
    });
    return;
  }

  if (!eventResult.data) {
    const errorEmbed = await buildEventNotFoundMessage(guildId, eventQuery);
    await interaction.editReply({ embeds: [errorEmbed] });
    return;
  }

  const event = eventResult.data;

  const payloadResult = buildUpdatePayload(opts, event);
  if (!payloadResult.success) {
    await interaction.editReply({ embeds: [payloadResult.error] });
    return;
  }

  const result = await updateEvent(event.id, guildId, payloadResult.payload);
  if (!result.success) {
    logger.error(
      { error: result.error, eventId: event.id, guildId },
      "Failed to update event"
    );
    await interaction.editReply({
      embeds: [createErrorEmbed("エラー", "予定の更新に失敗しました")],
    });
    return;
  }

  const embed = createEventEmbed(result.data);
  await interaction.editReply({
    content: "正常に予定を更新しました",
    embeds: [embed],
  });
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

  const guildId = interaction.guild.id;
  const eventQuery = interaction.options.getString("event", true);
  const opts = parseEditOptions(interaction);

  if (!opts.hasAnyEdit) {
    await handleModalPath(interaction, guildId, eventQuery);
    return;
  }

  await handleInlinePath(interaction, guildId, eventQuery, opts);
}

export default { data, execute } satisfies Command;

export { mergeDateTime };
