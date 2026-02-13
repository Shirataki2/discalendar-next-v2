"use client";

import { format } from "date-fns";
import { useCallback } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { CalendarEvent } from "@/lib/calendar/types";
import { cn } from "@/lib/utils";

export type EventBlockProps = {
  event: CalendarEvent;
  title: string;
  showTime?: boolean;
  onClick?: () => void;
};

function formatTime(date: Date): string {
  return format(date, "HH:mm");
}

function getAccessibleLabel(title: string, isAllDay: boolean): string {
  return isAllDay ? `${title} (終日)` : title;
}

export function EventBlock({
  event,
  title,
  showTime = false,
  onClick,
}: EventBlockProps) {
  const isAllDay = event.allDay;

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onClick?.();
      }
    },
    [onClick]
  );

  const handleClick = useCallback(() => {
    onClick?.();
  }, [onClick]);

  const combinedClasses = cn(
    "event-block cursor-pointer rounded px-1.5 py-0.5 text-xs",
    "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1",
    isAllDay ? "event-block-all-day event-block-bar" : "event-block-timed"
  );

  const shouldShowTime = showTime === true && !isAllDay;

  const accessibleLabel = getAccessibleLabel(title, isAllDay);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          aria-label={accessibleLabel}
          className={combinedClasses}
          data-all-day={isAllDay.toString()}
          data-testid="event-block"
          onClick={handleClick}
          onKeyDown={handleKeyDown}
          style={{
            backgroundColor: event.color,
            borderColor: event.color,
            color: "#ffffff",
          }}
          tabIndex={0}
          type="button"
        >
          {shouldShowTime ? (
            <span className="mr-1 opacity-80">{formatTime(event.start)}</span>
          ) : null}
          <span className="truncate">{title}</span>
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom" sideOffset={4}>
        <p className="font-medium">{title}</p>
        {isAllDay ? (
          <p className="text-muted-foreground">終日</p>
        ) : (
          <p className="text-muted-foreground">
            {formatTime(event.start)} - {formatTime(event.end)}
          </p>
        )}
      </TooltipContent>
    </Tooltip>
  );
}

export type RBCEventComponentProps = {
  event: CalendarEvent;
  title?: string;
};

export function EventBlockWrapper({ event, title }: RBCEventComponentProps) {
  return <EventBlock event={event} title={title ?? event.title} />;
}

/** 月表示専用ラッパー: 開始時刻を表示する */
export function MonthEventBlockWrapper({
  event,
  title,
}: RBCEventComponentProps) {
  return <EventBlock event={event} showTime title={title ?? event.title} />;
}
