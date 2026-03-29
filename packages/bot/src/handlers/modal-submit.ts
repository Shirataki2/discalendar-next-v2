import type { GuildMember, ModalSubmitInteraction } from "discord.js";
import {
  createEvent,
  getEventById,
  updateEvent,
} from "../services/event-service.js";
import { getGuildConfig } from "../services/guild-service.js";
import { jstPartsToUtcIso, parseDateTimeText } from "../utils/datetime.js";
import { createEventEmbed } from "../utils/embeds.js";
import { logger } from "../utils/logger.js";
import {
  MODAL_CUSTOM_IDS,
  MODAL_FIELD_IDS,
  parseEditCustomId,
} from "../utils/modal.js";
import { hasManagementPermission } from "../utils/permissions.js";

function parseIsAllDay(
  value: string
): { success: true; data: boolean } | { success: false; error: string } {
  const trimmed = value.trim();
  if (trimmed === "" || trimmed === "false") {
    return { success: true, data: false };
  }
  if (trimmed === "true") {
    return { success: true, data: true };
  }
  return {
    success: false,
    error: "終日の値は true または false で入力してください",
  };
}

const MAX_TITLE_LENGTH = 100;
const MAX_DESCRIPTION_LENGTH = 1024;

type ModalFields = {
  title: string;
  description: string | null;
  startIso: string;
  endIso: string;
  isAllDay: boolean;
};

function extractAndValidateFields(
  interaction: ModalSubmitInteraction
): { success: true; data: ModalFields } | { success: false; error: string } {
  const title = interaction.fields
    .getTextInputValue(MODAL_FIELD_IDS.title)
    .trim();
  const description =
    interaction.fields.getTextInputValue(MODAL_FIELD_IDS.description).trim() ||
    null;
  const startAtText = interaction.fields.getTextInputValue(
    MODAL_FIELD_IDS.startAt
  );
  const endAtText = interaction.fields.getTextInputValue(MODAL_FIELD_IDS.endAt);
  const isAllDayText = interaction.fields.getTextInputValue(
    MODAL_FIELD_IDS.isAllDay
  );

  if (!title) {
    return { success: false, error: "タイトルは必須です" };
  }
  if (title.length > MAX_TITLE_LENGTH) {
    return {
      success: false,
      error: `タイトルは${MAX_TITLE_LENGTH}文字以内で入力してください`,
    };
  }
  if (description && description.length > MAX_DESCRIPTION_LENGTH) {
    return {
      success: false,
      error: `説明は${MAX_DESCRIPTION_LENGTH}文字以内で入力してください`,
    };
  }

  const startResult = parseDateTimeText(startAtText);
  if (!startResult.success) {
    return {
      success: false,
      error: "開始日時のフォーマットが不正です。例: 2025/03/29 15:00",
    };
  }

  const endResult = parseDateTimeText(endAtText);
  if (!endResult.success) {
    return {
      success: false,
      error: "終了日時のフォーマットが不正です。例: 2025/03/29 16:00",
    };
  }

  const isAllDayResult = parseIsAllDay(isAllDayText);
  if (!isAllDayResult.success) {
    return { success: false, error: isAllDayResult.error };
  }

  const startIso = jstPartsToUtcIso(startResult.data);
  const endIso = jstPartsToUtcIso(endResult.data);
  const startGteEnd = isAllDayResult.data
    ? startIso > endIso
    : startIso >= endIso;
  if (startGteEnd) {
    return {
      success: false,
      error: "開始時間が終了時間以降になっています",
    };
  }

  return {
    success: true,
    data: {
      title,
      description,
      startIso,
      endIso,
      isAllDay: isAllDayResult.data,
    },
  };
}

async function checkPermission(
  interaction: ModalSubmitInteraction,
  guildId: string
): Promise<boolean> {
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
    return false;
  }

  if (guildConfigResult.data?.restricted) {
    const member = interaction.member as GuildMember | null;
    if (!hasManagementPermission(member)) {
      await interaction.reply({
        content:
          "このコマンドを実行するためには「管理者」「サーバー管理」「ロールの管理」「メッセージの管理」のいずれかの権限が必要です",
        ephemeral: true,
      });
      return false;
    }
  }

  return true;
}

async function handleCreate(
  interaction: ModalSubmitInteraction,
  guildId: string,
  fields: ModalFields
): Promise<void> {
  const result = await createEvent({
    guild_id: guildId,
    name: fields.title,
    description: fields.description,
    start_at: fields.startIso,
    end_at: fields.endIso,
    is_all_day: fields.isAllDay,
  });

  if (!result.success) {
    logger.error(
      { error: result.error, guildId },
      "Failed to create event via modal"
    );
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

async function handleEdit(
  interaction: ModalSubmitInteraction,
  guildId: string,
  eventId: string,
  fields: ModalFields
): Promise<void> {
  const fetchResult = await getEventById(eventId, guildId);
  if (!fetchResult.success) {
    logger.error(
      { error: fetchResult.error, eventId, guildId },
      "Failed to fetch event for modal edit"
    );
    await interaction.reply({
      content: "イベントの取得に失敗しました",
      ephemeral: true,
    });
    return;
  }

  if (!fetchResult.data) {
    await interaction.reply({
      content: "指定されたイベントが見つかりません",
      ephemeral: true,
    });
    return;
  }

  const updateResult = await updateEvent(eventId, guildId, {
    name: fields.title,
    description: fields.description,
    start_at: fields.startIso,
    end_at: fields.endIso,
    is_all_day: fields.isAllDay,
  });

  if (!updateResult.success) {
    logger.error(
      { error: updateResult.error, eventId, guildId },
      "Failed to update event via modal"
    );
    await interaction.reply({
      content: "予定の更新に失敗しました",
      ephemeral: true,
    });
    return;
  }

  const embed = createEventEmbed(updateResult.data);
  await interaction.reply({
    content: "正常に予定を更新しました",
    embeds: [embed],
  });
}

export async function handleModalSubmit(
  interaction: ModalSubmitInteraction
): Promise<void> {
  const { customId } = interaction;

  const isCreate = customId === MODAL_CUSTOM_IDS.create;
  const eventId = parseEditCustomId(customId);
  const isEdit = eventId !== null;

  if (!(isCreate || isEdit)) {
    logger.warn({ customId }, "Unknown modal customId, skipping");
    return;
  }

  if (!interaction.guild) {
    await interaction.reply({
      content: "このコマンドはサーバーでのみ実行可能です",
      ephemeral: true,
    });
    return;
  }

  const guildId = interaction.guild.id;

  const permitted = await checkPermission(interaction, guildId);
  if (!permitted) {
    return;
  }

  const validationResult = extractAndValidateFields(interaction);
  if (!validationResult.success) {
    await interaction.reply({
      content: validationResult.error,
      ephemeral: true,
    });
    return;
  }

  if (isCreate) {
    await handleCreate(interaction, guildId, validationResult.data);
    return;
  }

  // Type narrowing: control flow guarantees non-null but TS cannot infer
  if (!eventId) {
    return;
  }

  await handleEdit(interaction, guildId, eventId, validationResult.data);
}
