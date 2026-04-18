import {
  ActionRowBuilder,
  ButtonBuilder,
  type ButtonInteraction,
  ButtonStyle,
} from "discord.js";
import { getConfig } from "../config.js";
import { castVote, getPoll } from "../services/poll-service.js";
import type { ChoiceLabel, PollSnapshot } from "../types/poll.js";
import { logger } from "../utils/logger.js";
import { buildPollEmbed } from "../utils/poll-embed.js";

export const POLL_VOTE_CUSTOM_ID_PREFIX = "poll:";

const REFRESH_DEBOUNCE_MS = 1500;
/** Discord の ActionRow は 1 メッセージあたり最大 5 行 */
const MAX_ACTION_ROWS = 5;
const refreshTimers = new Map<string, NodeJS.Timeout>();

type CustomIdParts = {
  pollId: string;
  optionId: string;
  choice: ChoiceLabel;
};

export function isPollVoteInteraction(customId: string): boolean {
  return customId.startsWith(POLL_VOTE_CUSTOM_ID_PREFIX);
}

function parseCustomId(
  customId: string
):
  | { ok: true; data: CustomIdParts }
  | { ok: false; reason: "shape" | "choice" } {
  const parts = customId.split(":");
  if (parts.length !== 4) {
    return { ok: false, reason: "shape" };
  }
  const [prefix, pollId, optionId, rawChoice] = parts;
  if (prefix !== "poll" || !pollId || !optionId) {
    return { ok: false, reason: "shape" };
  }
  if (rawChoice !== "yes" && rawChoice !== "maybe" && rawChoice !== "no") {
    return { ok: false, reason: "choice" };
  }
  return {
    ok: true,
    data: { pollId, optionId, choice: rawChoice },
  };
}

function buildVoteRows(
  snapshot: PollSnapshot,
  disabled: boolean
): ActionRowBuilder<ButtonBuilder>[] {
  const rows: ActionRowBuilder<ButtonBuilder>[] = [];
  for (const option of snapshot.options) {
    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`poll:${snapshot.poll.id}:${option.id}:yes`)
        .setLabel(`○ 候補 ${option.position + 1}`)
        .setStyle(ButtonStyle.Success)
        .setDisabled(disabled),
      new ButtonBuilder()
        .setCustomId(`poll:${snapshot.poll.id}:${option.id}:maybe`)
        .setLabel("△")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(disabled),
      new ButtonBuilder()
        .setCustomId(`poll:${snapshot.poll.id}:${option.id}:no`)
        .setLabel("×")
        .setStyle(ButtonStyle.Danger)
        .setDisabled(disabled)
    );
    rows.push(row);
    if (rows.length >= MAX_ACTION_ROWS) {
      break;
    }
  }
  return rows;
}

async function refreshPollMessage(
  interaction: ButtonInteraction,
  pollId: string
): Promise<void> {
  if (!interaction.guildId) {
    return;
  }

  const snapshotResult = await getPoll(pollId, interaction.guildId);
  if (!snapshotResult.success) {
    logger.warn(
      { pollId, error: snapshotResult.error },
      "Poll snapshot fetch failed; skipping message refresh"
    );
    return;
  }

  const snapshot = snapshotResult.data;
  const isClosed = snapshot.poll.status !== "open";
  const embed = buildPollEmbed(snapshot, {
    baseUrl: getConfig().webBaseUrl,
  });
  const components = buildVoteRows(snapshot, isClosed);

  try {
    await interaction.message.edit({ embeds: [embed], components });
  } catch (editError) {
    // メッセージが Discord 側で削除された場合
    logger.warn(
      { error: editError, pollId, messageId: interaction.message.id },
      "Failed to edit poll message; it may have been deleted"
    );
  }
}

function scheduleRefresh(interaction: ButtonInteraction, pollId: string): void {
  const key = interaction.message.id;
  const existing = refreshTimers.get(key);
  if (existing) {
    clearTimeout(existing);
  }
  const timer = setTimeout(async () => {
    refreshTimers.delete(key);
    try {
      await refreshPollMessage(interaction, pollId);
    } catch (error) {
      logger.warn({ error, pollId }, "Poll message refresh failed");
    }
  }, REFRESH_DEBOUNCE_MS);
  refreshTimers.set(key, timer);
}

export async function handlePollVoteInteraction(
  interaction: ButtonInteraction
): Promise<void> {
  if (!isPollVoteInteraction(interaction.customId)) {
    return;
  }

  if (!interaction.guildId) {
    await interaction.reply({
      content: "このボタンはサーバー内でのみ使用できます",
      ephemeral: true,
    });
    return;
  }

  const parsed = parseCustomId(interaction.customId);
  if (!parsed.ok) {
    logger.warn(
      { customId: interaction.customId, reason: parsed.reason },
      "Invalid poll vote customId"
    );
    await interaction.reply({
      content: "無効な投票ボタンです",
      ephemeral: true,
    });
    return;
  }

  const { pollId, optionId, choice } = parsed.data;

  const result = await castVote({
    pollId,
    optionId,
    userId: interaction.user.id,
    choice,
  });

  if (!result.success) {
    logger.warn(
      {
        pollId,
        optionId,
        userId: interaction.user.id,
        resultCode: result.error.code,
      },
      "poll_vote rejected"
    );
    await interaction.reply({
      content: `投票に失敗しました: ${result.error.message}`,
      ephemeral: true,
    });
    return;
  }

  const choiceLabel = { yes: "○", maybe: "△", no: "×" }[choice];

  if (result.data.kind === "rejected_closed") {
    await interaction.reply({
      content: "この投票は既に締め切られています",
      ephemeral: true,
    });
    return;
  }

  if (result.data.kind === "revoked") {
    await interaction.reply({
      content: `${choiceLabel} 投票を取り消しました`,
      ephemeral: true,
    });
    scheduleRefresh(interaction, pollId);
    return;
  }

  await interaction.reply({
    content: `${choiceLabel} で投票を記録しました`,
    ephemeral: true,
  });
  scheduleRefresh(interaction, pollId);
}
