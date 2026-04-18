import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  type ChatInputCommandInteraction,
  type GuildMember,
  type GuildTextBasedChannel,
  SlashCommandBuilder,
  type SlashCommandSubcommandsOnlyBuilder,
} from "discord.js";
import { getEventSettings } from "../services/event-service.js";
import { getGuildConfig } from "../services/guild-service.js";
import { createPoll } from "../services/poll-service.js";
import type { Command } from "../types/command.js";
import type { PollOptionInput, PollSnapshot } from "../types/poll.js";
import { jstPartsToUtcIso, parseDateTimeText } from "../utils/datetime.js";
import { logger } from "../utils/logger.js";
import { hasManagementPermission } from "../utils/permissions.js";
import { buildPollEmbed } from "../utils/poll-embed.js";

const MIN_OPTIONS = 2;
const MAX_OPTIONS = 10;
const DEFAULT_DURATION_MINUTES = 60;
const MIN_DURATION_MINUTES = 15;
const MAX_DURATION_MINUTES = 24 * 60;

function buildCommandData(): SlashCommandSubcommandsOnlyBuilder {
  return new SlashCommandBuilder()
    .setName("poll")
    .setDescription("候補日時を投票で決める投票機能")
    .addSubcommand((sub) =>
      sub
        .setName("create")
        .setDescription("新しい投票を作成します（候補 2〜10 件、JST）")
        .addStringOption((opt) =>
          opt
            .setName("title")
            .setDescription("投票のタイトル")
            .setMaxLength(100)
            .setRequired(true)
        )
        .addStringOption((opt) =>
          opt
            .setName("options")
            .setDescription(
              "候補日時をカンマ区切り (例: 2026/04/20 12:00, 2026/04/21 12:00)"
            )
            .setRequired(true)
        )
        .addStringOption((opt) =>
          opt
            .setName("description")
            .setDescription("投票の補足説明")
            .setMaxLength(1024)
            .setRequired(false)
        )
        .addIntegerOption((opt) =>
          opt
            .setName("duration_minutes")
            .setDescription("候補 1 件あたりの所要時間（分）。既定 60 分")
            .setMinValue(MIN_DURATION_MINUTES)
            .setMaxValue(MAX_DURATION_MINUTES)
            .setRequired(false)
        )
        .addChannelOption((opt) =>
          opt
            .setName("channel")
            .setDescription("投票メッセージを投稿するチャンネル")
            .setRequired(false)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName("close")
        .setDescription("投票を締め切ります（以降の投票を拒否）")
        .addStringOption((opt) =>
          opt.setName("poll_id").setDescription("投票 ID").setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName("finalize")
        .setDescription("投票を確定し、events に昇格させます")
        .addStringOption((opt) =>
          opt.setName("poll_id").setDescription("投票 ID").setRequired(true)
        )
        .addStringOption((opt) =>
          opt
            .setName("option_id")
            .setDescription("確定する候補 ID（未指定で最多得票を自動選択）")
            .setRequired(false)
        )
    );
}

const data = buildCommandData();

function parseOptionsString(
  raw: string,
  durationMinutes: number
): { ok: true; options: PollOptionInput[] } | { ok: false; error: string } {
  const entries = raw
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  if (entries.length < MIN_OPTIONS || entries.length > MAX_OPTIONS) {
    return {
      ok: false,
      error: `候補は ${MIN_OPTIONS}〜${MAX_OPTIONS} 件で指定してください（受信: ${entries.length}）`,
    };
  }

  const seen = new Set<string>();
  const result: PollOptionInput[] = [];
  for (let idx = 0; idx < entries.length; idx += 1) {
    const parsed = parseDateTimeText(entries[idx]);
    if (!parsed.success) {
      return {
        ok: false,
        error: `候補 ${idx + 1} 番目: ${parsed.error}`,
      };
    }
    const startIso = jstPartsToUtcIso(parsed.data);
    if (seen.has(startIso)) {
      return {
        ok: false,
        error: `候補に重複した時刻があります (${entries[idx]})`,
      };
    }
    seen.add(startIso);

    const endIso = new Date(
      Date.parse(startIso) + durationMinutes * 60 * 1000
    ).toISOString();

    result.push({
      startsAt: startIso,
      endsAt: endIso,
      position: idx,
    });
  }

  return { ok: true, options: result };
}

async function resolveTargetChannel(
  interaction: ChatInputCommandInteraction
): Promise<GuildTextBasedChannel | null> {
  const explicit = interaction.options.getChannel("channel");
  if (explicit) {
    const fetched = await interaction.guild?.channels.fetch(explicit.id);
    if (fetched?.isTextBased()) {
      return fetched as GuildTextBasedChannel;
    }
    return null;
  }

  const guildId = interaction.guild?.id;
  if (guildId) {
    const settingsResult = await getEventSettings(guildId);
    if (settingsResult.success && settingsResult.data?.channel_id) {
      const fetched = await interaction.guild?.channels.fetch(
        settingsResult.data.channel_id
      );
      if (fetched?.isTextBased()) {
        return fetched as GuildTextBasedChannel;
      }
    }
  }

  return (interaction.channel ?? null) as GuildTextBasedChannel | null;
}

function buildVoteRows(
  snapshot: PollSnapshot
): ActionRowBuilder<ButtonBuilder>[] {
  const rows: ActionRowBuilder<ButtonBuilder>[] = [];
  for (const option of snapshot.options) {
    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`poll:${snapshot.poll.id}:${option.id}:yes`)
        .setLabel(`○ 候補 ${option.position + 1}`)
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`poll:${snapshot.poll.id}:${option.id}:maybe`)
        .setLabel("△")
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`poll:${snapshot.poll.id}:${option.id}:no`)
        .setLabel("×")
        .setStyle(ButtonStyle.Danger)
    );
    rows.push(row);
    // Discord の ActionRow は最大 5 行まで
    if (rows.length >= 5) {
      break;
    }
  }
  return rows;
}

async function ensurePermission(
  interaction: ChatInputCommandInteraction
): Promise<boolean> {
  const guildId = interaction.guild?.id;
  if (!guildId) {
    return false;
  }

  const config = await getGuildConfig(guildId);
  if (!config.success) {
    logger.error(
      { error: config.error, guildId },
      "Failed to fetch guild config for /poll"
    );
    return false;
  }
  if (!config.data?.restricted) {
    return true;
  }
  const member = interaction.member as GuildMember | null;
  return hasManagementPermission(member);
}

async function executeCreate(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  const guildId = interaction.guild?.id;
  if (!guildId) {
    return;
  }

  const permitted = await ensurePermission(interaction);
  if (!permitted) {
    await interaction.editReply({
      content:
        "このコマンドを実行するには管理権限（管理者 / サーバー管理 / ロール管理 / メッセージ管理）が必要です",
    });
    return;
  }

  const title = interaction.options.getString("title", true);
  const rawOptions = interaction.options.getString("options", true);
  const description = interaction.options.getString("description");
  const durationMinutes =
    interaction.options.getInteger("duration_minutes") ??
    DEFAULT_DURATION_MINUTES;

  const parsed = parseOptionsString(rawOptions, durationMinutes);
  if (!parsed.ok) {
    await interaction.editReply({ content: parsed.error });
    return;
  }

  const channel = await resolveTargetChannel(interaction);
  if (!(channel && "send" in channel)) {
    await interaction.editReply({
      content: "投稿先のチャンネルが見つかりません",
    });
    return;
  }

  const result = await createPoll({
    guildId,
    channelId: channel.id,
    actorUserId: interaction.user.id,
    title,
    description: description ?? null,
    messageId: null,
    options: parsed.options,
  });

  if (!result.success) {
    logger.error({ error: result.error, guildId }, "Failed to create poll");
    await interaction.editReply({
      content: `投票の作成に失敗しました: ${result.error.message}`,
    });
    return;
  }

  const embed = buildPollEmbed(result.data);
  const components = buildVoteRows(result.data);

  try {
    const sent = await channel.send({
      embeds: [embed],
      components,
    });
    logger.info(
      {
        guildId,
        pollId: result.data.poll.id,
        channelId: channel.id,
        messageId: sent.id,
      },
      "poll_create success"
    );
    await interaction.editReply({
      content: `投票を作成しました (ID: ${result.data.poll.id})`,
    });
  } catch (sendError) {
    logger.error(
      { error: sendError, pollId: result.data.poll.id },
      "Failed to post poll message; attempting rollback"
    );
    const { deletePoll } = await import("../services/poll-service.js");
    await deletePoll(result.data.poll.id, guildId);
    await interaction.editReply({
      content: "投票メッセージの投稿に失敗しました。投票を取り消しました",
    });
  }
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

  const subcommand = interaction.options.getSubcommand();

  if (subcommand === "create") {
    await executeCreate(interaction);
    return;
  }

  await interaction.editReply({
    content: `未実装のサブコマンドです: ${subcommand}`,
  });
}

export default { data, execute } satisfies Command;
