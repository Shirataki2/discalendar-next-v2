/**
 * CalendarGrid - カレンダーグリッド（プレースホルダー）
 *
 * タスク5.1で本実装予定
 * 現在はTask 3.3のテストを通すためのプレースホルダー
 */
"use client";

import type { ViewMode } from "@/hooks/calendar/use-calendar-state";
import type { CalendarEvent } from "@/lib/calendar/types";

export type CalendarGridProps = {
  events: CalendarEvent[];
  viewMode: ViewMode;
  selectedDate: Date;
  onEventClick: (event: CalendarEvent, element: HTMLElement) => void;
  onDateChange: (date: Date) => void;
  today: Date;
};

export function CalendarGrid({
  events,
  viewMode,
  selectedDate,
  onEventClick,
  onDateChange: _onDateChange,
  today,
}: CalendarGridProps) {
  return (
    <div className="h-full border p-4" data-testid="calendar-grid">
      <div className="mb-2 text-muted-foreground text-sm">
        Grid: {viewMode} - {events.length} events
      </div>
      <div className="text-xs">
        Selected: {selectedDate.toLocaleDateString("ja-JP")}
      </div>
      <div className="text-xs">Today: {today.toLocaleDateString("ja-JP")}</div>

      {events.length > 0 && (
        <div className="mt-4">
          {events.map((event) => (
            <button
              className="w-full cursor-pointer border-b py-2 text-left"
              key={event.id}
              onClick={(e) => onEventClick(event, e.currentTarget)}
              type="button"
            >
              {event.title}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
