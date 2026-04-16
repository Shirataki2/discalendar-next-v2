import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  type ChatInputCommandInteraction,
  ComponentType,
  type EmbedBuilder,
  type GuildMember,
  type MessageComponentInteraction,
  SlashCommandBuilder,
} from "discord.js";
import { findEventByName } from "../services/attendee-service.js";
import { deleteEvent, getEventsByGuildId } from "../services/event-service.js";
import { getGuildConfig } from "../services/guild-service.js";
import type { Command } from "../types/command.js";
import type { EventRecord } from "../types/event.js";
import { createErrorEmbed, createEventEmbed } from "../utils/embeds.js";
import { logger } from "../utils/logger.js";
import { hasManagementPermission } from "../utils/permissions.js";

const MAX_RECENT_EVENTS = 5;
const CONFIRM_TIMEOUT_MS = 60_000;
const CUSTOM_ID_CONFIRM = "delete-confirm";
const CUSTOM_ID_CANCEL = "delete-cancel";

const data = new SlashCommandBuilder()
  .setName("delete")
  .setDescription("既存の予定を削除します")
  .addStringOption((opt) =>
    opt
      .setName("event")
      .setDescription("削除するイベント名（部分一致で検索）")
      .setMaxLength(100)
      .setRequired(true)
  );

/** 確認ダイアログ用のボタン行を組み立てる */
function buildConfirmRow(disabled: boolean): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(CUSTOM_ID_CONFIRM)
      .setLabel("削除する")
      .setStyle(ButtonStyle.Danger)
      .setDisabled(disabled),
    new ButtonBuilder()
      .setCustomId(CUSTOM_ID_CANCEL)
      .setLabel("キャンセル")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(disabled)
  );
}

/** イベント未発見時のヒント付きエラー埋め込みを構築する */
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

/** 確認 UI 段階に進む前のガード処理（権限・検索）。null を返すとイベント特定済み */
async function resolveTargetEvent(
  interaction: ChatInputCommandInteraction,
  guildId: string,
  eventQuery: string
): Promise<EventRecord | null> {
  const guildConfigResult = await getGuildConfig(guildId);
  if (!guildConfigResult.success) {
    logger.error(
      { error: guildConfigResult.error, guildId },
      "Failed to fetch guild config"
    );
    await interaction.editReply({ content: "ギルド設定の取得に失敗しました" });
    return null;
  }

  if (guildConfigResult.data?.restricted) {
    const member = interaction.member as GuildMember | null;
    if (!hasManagementPermission(member)) {
      await interaction.editReply({
        content:
          "このコマンドを実行するためには「管理者」「サーバー管理」「ロールの管理」「メッセージの管理」のいずれかの権限が必要です",
      });
      return null;
    }
  }

  const eventResult = await findEventByName(guildId, eventQuery);
  if (!eventResult.success) {
    logger.error(
      { error: eventResult.error, guildId },
      "Failed to search event for delete"
    );
    await interaction.editReply({
      embeds: [createErrorEmbed("エラー", "イベントの検索に失敗しました")],
    });
    return null;
  }

  if (!eventResult.data) {
    const errorEmbed = await buildEventNotFoundMessage(guildId, eventQuery);
    await interaction.editReply({ embeds: [errorEmbed] });
    return null;
  }

  return eventResult.data;
}

type CollectHandlerContext = {
  interaction: ChatInputCommandInteraction;
  guildId: string;
  event: EventRecord;
  collector: { stop: (reason?: string) => void };
};

/** 確認ボタン押下時のハンドラを生成する */
function createCollectHandler(
  ctx: CollectHandlerContext
): (i: MessageComponentInteraction) => Promise<void> {
  const { interaction, guildId, event, collector } = ctx;
  return async (buttonInteraction) => {
    if (buttonInteraction.user.id !== interaction.user.id) {
      await buttonInteraction.reply({
        content: "このボタンを操作できるのはコマンド実行者のみです",
        ephemeral: true,
      });
      return;
    }

    if (buttonInteraction.customId === CUSTOM_ID_CANCEL) {
      await buttonInteraction.update({
        content: "削除をキャンセルしました",
        embeds: [],
        components: [buildConfirmRow(true)],
      });
      collector.stop("cancelled");
      return;
    }

    if (buttonInteraction.customId !== CUSTOM_ID_CONFIRM) {
      collector.stop("unknown");
      return;
    }

    // Supabase 呼び出し前に即座にインタラクションを ack する。
    // deleteEvent のレイテンシで Discord の 3 秒インタラクション期限を超過すると
    // 後続の update / editReply が「interaction expired」で失敗するため。
    await buttonInteraction.deferUpdate();

    const result = await deleteEvent(event.id, guildId);
    if (!result.success) {
      logger.error(
        {
          error: result.error,
          eventId: event.id,
          guildId,
        },
        "Failed to delete event from /delete command"
      );
      const errorMessage =
        result.error.code === "NOT_FOUND"
          ? "この予定は既に削除されています"
          : "予定の削除に失敗しました";
      await buttonInteraction.editReply({
        content: "",
        embeds: [createErrorEmbed("エラー", errorMessage)],
        components: [buildConfirmRow(true)],
      });
      collector.stop("error");
      return;
    }

    logger.info(
      {
        guildId,
        userId: interaction.user.id,
        eventId: event.id,
        eventName: event.name,
      },
      "Event deleted via /delete command"
    );
    await buttonInteraction.editReply({
      content: `予定を削除しました: ${event.name}`,
      embeds: [],
      components: [buildConfirmRow(true)],
    });
    collector.stop("done");
  };
}

/** collector の end イベント (タイムアウト) ハンドラを生成する */
function createEndHandler(
  interaction: ChatInputCommandInteraction
): (collected: unknown, reason: string) => Promise<void> {
  return async (_collected, reason) => {
    if (reason === "done" || reason === "cancelled" || reason === "error") {
      return;
    }
    try {
      await interaction.editReply({
        content: "タイムアウトしました。削除はキャンセルされました",
        embeds: [],
        components: [buildConfirmRow(true)],
      });
    } catch (error) {
      logger.error({ error }, "Failed to update message on collector end");
    }
  };
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

  await interaction.deferReply({ ephemeral: true });

  const guildId = interaction.guild.id;
  const eventQuery = interaction.options.getString("event", true);

  const event = await resolveTargetEvent(interaction, guildId, eventQuery);
  if (!event) {
    return;
  }

  const embed = createEventEmbed(event);
  const reply = await interaction.editReply({
    content: "以下の予定を削除します。よろしいですか？",
    embeds: [embed],
    components: [buildConfirmRow(false)],
  });

  const collector = reply.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: CONFIRM_TIMEOUT_MS,
  });

  collector.on(
    "collect",
    createCollectHandler({ interaction, guildId, event, collector })
  );
  collector.on("end", createEndHandler(interaction));
}

export default { data, execute } satisfies Command;
