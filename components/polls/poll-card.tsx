"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { PollRecord } from "@/lib/polls/types";

const STATUS_LABELS: Record<
  PollRecord["status"],
  { label: string; variant: "default" | "secondary" | "destructive" }
> = {
  open: { label: "受付中", variant: "default" },
  closed: { label: "締切済", variant: "secondary" },
  finalized: { label: "確定済", variant: "secondary" },
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function PollCard({ poll }: { poll: PollRecord }) {
  const status = STATUS_LABELS[poll.status];
  return (
    <Link
      aria-label={`${poll.title} の詳細ページへ`}
      className="block"
      href={`/dashboard/polls/${poll.id}`}
    >
      <Card className="transition hover:border-primary">
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="truncate text-base">{poll.title}</CardTitle>
            <Badge variant={status.variant}>{status.label}</Badge>
          </div>
          {poll.description ? (
            <CardDescription className="line-clamp-2">
              {poll.description}
            </CardDescription>
          ) : null}
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-xs">
            作成: {formatDate(poll.created_at)}
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}
