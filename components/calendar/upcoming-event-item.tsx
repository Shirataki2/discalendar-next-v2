"use client";

import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { Repeat } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { UpcomingEvent } from "@/lib/calendar/cross-guild-event-types";

export type UpcomingEventItemProps = {
  event: UpcomingEvent;
};

function getGuildInitial(name: string): string {
  if (!name || name.length === 0) {
    return "?";
  }
  return name.charAt(0).toUpperCase();
}

function formatEventDate(isoString: string): string {
  const date = new Date(isoString);
  return format(date, "M月d日(E)", { locale: ja });
}

function formatEventTime(isoString: string): string {
  const date = new Date(isoString);
  return format(date, "HH:mm");
}

function getDateParam(isoString: string): string {
  return isoString.slice(0, 10);
}

export function UpcomingEventItem({ event }: UpcomingEventItemProps) {
  const dateParam = getDateParam(event.start);
  const href = `/dashboard?guild=${event.guildId}&date=${dateParam}`;

  return (
    <Link
      className="group flex items-center gap-3 rounded-lg border-l-4 bg-card px-3 py-2.5 transition-colors hover:bg-accent/50"
      data-testid="upcoming-event-item"
      href={href}
      style={{ borderLeftColor: event.color }}
    >
      {/* ギルドアイコン */}
      <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted">
        {event.guildAvatarUrl ? (
          <Image
            alt={`${event.guildName}のアイコン`}
            className="h-full w-full object-cover"
            height={32}
            src={event.guildAvatarUrl}
            width={32}
          />
        ) : (
          <span className="font-semibold text-muted-foreground text-xs">
            {getGuildInitial(event.guildName)}
          </span>
        )}
      </div>

      {/* イベント情報 */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1">
          {event.isRecurring ? (
            <Repeat
              className="h-3.5 w-3.5 shrink-0 text-muted-foreground"
              data-testid="recurring-indicator"
            />
          ) : null}
          <p className="truncate font-medium text-sm">{event.title}</p>
        </div>
        <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
          <span>{formatEventDate(event.start)}</span>
          {event.allDay ? (
            <span>終日</span>
          ) : (
            <span>{formatEventTime(event.start)}</span>
          )}
          <span>·</span>
          <span className="truncate">{event.guildName}</span>
        </div>
      </div>
    </Link>
  );
}
