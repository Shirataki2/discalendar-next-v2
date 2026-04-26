import { EmbedBuilder } from "discord.js";
import type {
  PollOptionRecord,
  PollSnapshot,
  PollVoteAggregate,
} from "../types/poll.js";
import { formatDateTime } from "./datetime.js";

const POLL_COLOR = 0x58_65_f2;
const MAX_YES_VOTERS_DISPLAYED = 20;

export type PollEmbedOptions = {
  /** `/dashboard?event=<id>` を作るためのベース URL (末尾スラッシュなし)。 */
  baseUrl?: string;
};

function formatOptionDateRange(option: PollOptionRecord): string {
  const start = formatDateTime(new Date(option.starts_at));
  if (!option.ends_at) {
    return start;
  }
  const end = formatDateTime(new Date(option.ends_at));
  return `${start} - ${end}`;
}

function formatVoters(yesVoters: string[]): string {
  if (yesVoters.length === 0) {
    return "";
  }
  const head = yesVoters.slice(0, MAX_YES_VOTERS_DISPLAYED);
  const rest = yesVoters.length - head.length;
  const mentions = head.map((id) => `<@${id}>`).join(" ");
  if (rest > 0) {
    return `${mentions} 他 ${rest} 名`;
  }
  return mentions;
}

function formatAggregate(
  option: PollOptionRecord,
  aggregate: PollVoteAggregate | undefined,
  isFinalized: boolean
): { name: string; value: string } {
  const counts = aggregate?.counts ?? { yes: 0, maybe: 0, no: 0 };
  const yesVoters = aggregate?.yesVoters ?? [];

  const header = formatOptionDateRange(option);
  const summary = `○ ${counts.yes}  △ ${counts.maybe}  × ${counts.no}`;
  const voterLine = formatVoters(yesVoters);

  const lines = [summary];
  if (voterLine) {
    lines.push(voterLine);
  }

  const optionLabel = `候補 ${option.position + 1}${
    isFinalized ? " ✓" : ""
  }: ${header}`;
  return { name: optionLabel, value: lines.join("\n") };
}

function buildStatusBadge(
  snapshot: PollSnapshot,
  options: PollEmbedOptions
): string {
  const { poll, options: pollOptions } = snapshot;
  if (poll.status === "closed") {
    return "\n\n**締切済**";
  }
  if (poll.status === "finalized" && poll.finalized_option_id) {
    const finalizedOption = pollOptions.find(
      (o) => o.id === poll.finalized_option_id
    );
    const dateText = finalizedOption
      ? formatOptionDateRange(finalizedOption)
      : "";

    const link =
      poll.finalized_event_id && options.baseUrl
        ? `\n[イベント詳細を開く](${options.baseUrl}/dashboard?event=${poll.finalized_event_id})`
        : "";
    return `\n\n**確定: ${dateText}**${link}`;
  }
  return "";
}

export function buildPollEmbed(
  snapshot: PollSnapshot,
  options: PollEmbedOptions = {}
): EmbedBuilder {
  const aggregatesById = new Map(
    snapshot.aggregates.map((agg) => [agg.optionId, agg])
  );

  const baseDescription = snapshot.poll.description ?? "";
  const badge = buildStatusBadge(snapshot, options);
  const description = `${baseDescription}${badge}`;

  const embed = new EmbedBuilder()
    .setTitle(snapshot.poll.title)
    .setColor(POLL_COLOR)
    .setTimestamp(new Date(snapshot.poll.updated_at));

  if (description) {
    embed.setDescription(description);
  }

  for (const option of snapshot.options) {
    const agg = aggregatesById.get(option.id);
    const isFinalized =
      snapshot.poll.status === "finalized" &&
      snapshot.poll.finalized_option_id === option.id;
    embed.addFields({
      ...formatAggregate(option, agg, isFinalized),
      inline: false,
    });
  }

  return embed;
}
