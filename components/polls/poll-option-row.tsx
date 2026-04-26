"use client";

import { Badge } from "@/components/ui/badge";
import type { PollOptionRecord, PollVoteAggregate } from "@/lib/polls/types";
import { cn } from "@/lib/utils";

const MAX_YES_VOTERS = 20;

type PollOptionRowProps = {
  option: PollOptionRecord;
  aggregate: PollVoteAggregate | undefined;
  isWinner?: boolean;
  onSelect?: (optionId: string) => void;
};

function formatRange(option: PollOptionRecord): string {
  const start = new Date(option.starts_at).toLocaleString("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
  if (!option.ends_at) {
    return start;
  }
  const end = new Date(option.ends_at).toLocaleTimeString("ja-JP", {
    timeZone: "Asia/Tokyo",
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${start} – ${end}`;
}

function VoterList({ voters }: { voters: string[] }) {
  if (voters.length === 0) {
    return null;
  }
  const head = voters.slice(0, MAX_YES_VOTERS);
  const rest = voters.length - head.length;
  return (
    <p className="text-muted-foreground text-xs">
      {head.map((id) => (
        <span
          className="mr-1 inline-block rounded bg-secondary px-1 py-0.5 text-secondary-foreground"
          key={id}
        >
          {id}
        </span>
      ))}
      {rest > 0 ? <span>他 {rest} 名</span> : null}
    </p>
  );
}

export function PollOptionRow({
  option,
  aggregate,
  isWinner,
  onSelect,
}: PollOptionRowProps) {
  const counts = aggregate?.counts ?? { yes: 0, maybe: 0, no: 0 };
  const voters = aggregate?.yesVoters ?? [];

  const content = (
    <>
      <div className="flex items-center justify-between gap-2">
        <div className="font-medium">
          候補 {option.position + 1}: {formatRange(option)}
        </div>
        {isWinner ? <Badge variant="default">確定</Badge> : null}
      </div>
      <div className="mt-1 flex gap-3 text-sm">
        <span>○ {counts.yes}</span>
        <span>△ {counts.maybe}</span>
        <span>× {counts.no}</span>
      </div>
      <VoterList voters={voters} />
    </>
  );

  if (onSelect) {
    return (
      <button
        aria-label={`候補 ${option.position + 1} を選択`}
        className={cn(
          "block w-full rounded border border-border p-3 text-left transition hover:border-primary",
          isWinner ? "border-primary" : ""
        )}
        onClick={() => onSelect(option.id)}
        type="button"
      >
        {content}
      </button>
    );
  }

  return (
    <div
      className={cn(
        "rounded border border-border p-3",
        isWinner ? "border-primary" : ""
      )}
    >
      {content}
    </div>
  );
}
