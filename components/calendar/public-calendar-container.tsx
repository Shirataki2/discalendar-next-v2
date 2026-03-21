"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ViewMode } from "@/hooks/calendar/use-calendar-state";
import { useBreakpoint } from "@/hooks/calendar/use-media-query";
import {
  calculateNavigationDate,
  getDateRange,
} from "@/lib/calendar/calendar-helpers";
import type { PublicCalendarEvent } from "@/lib/calendar/public-calendar-service";
import { createPublicCalendarService } from "@/lib/calendar/public-calendar-service";
import type { CalendarEvent } from "@/lib/calendar/types";
import { createClient } from "@/lib/supabase/client";
import { CalendarGrid } from "./calendar-grid";
import { CalendarToolbar } from "./calendar-toolbar";
import { EventPopover } from "./event-popover";

export type PublicCalendarContainerProps = {
  guildId: string;
  guildName: string;
  initialEvents: PublicCalendarEvent[];
  /** サーバー側で生成したISO 8601文字列。クライアントでのタイムゾーン再解釈を避けるためUTC年月を抽出して使用 */
  initialDateIso: string;
};

function toCalendarEvent(e: PublicCalendarEvent): CalendarEvent {
  return {
    id: e.id,
    title: e.title,
    start: e.start,
    end: e.end,
    allDay: e.allDay,
    color: e.color,
    description: e.description,
    location: e.location,
  };
}

/** サーバーのUTC時刻からクライアントのローカルタイムゾーンでも同じ年月を指す日付を生成 */
function parseServerDate(iso: string): Date {
  const d = new Date(iso);
  // サーバーのUTC年月に合わせたローカル日付を返す（月境界ズレ防止）
  return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

export function PublicCalendarContainer({
  guildId,
  guildName,
  initialEvents,
  initialDateIso,
}: PublicCalendarContainerProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [selectedDate, setSelectedDate] = useState<Date>(() =>
    parseServerDate(initialDateIso)
  );
  const [events, setEvents] = useState<CalendarEvent[]>(
    initialEvents.map(toCalendarEvent)
  );
  const [isLoading, setIsLoading] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(
    null
  );
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const { isMobile } = useBreakpoint();
  const hasNavigated = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const supabaseRef = useRef(createClient());
  const serviceRef = useRef(createPublicCalendarService(supabaseRef.current));

  const fetchEvents = useCallback(async () => {
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsLoading(true);
    const { startDate, endDate } = getDateRange(viewMode, selectedDate);
    const result = await serviceRef.current.fetchPublicEvents(
      guildId,
      startDate,
      endDate,
      controller.signal
    );

    // 中断された旧リクエストは状態更新しない
    if (controller.signal.aborted) {
      return;
    }

    if (result.success) {
      setEvents(result.data.map(toCalendarEvent));
    }
    setIsLoading(false);
  }, [guildId, viewMode, selectedDate]);

  useEffect(() => {
    if (!hasNavigated.current) {
      return;
    }
    fetchEvents();
    return () => {
      abortControllerRef.current?.abort();
    };
  }, [fetchEvents]);

  const handleViewChange = useCallback((mode: ViewMode) => {
    hasNavigated.current = true;
    setViewMode(mode);
  }, []);

  const handleNavigate = useCallback(
    (action: "PREV" | "NEXT" | "TODAY") => {
      hasNavigated.current = true;
      const newDate = calculateNavigationDate(action, viewMode, selectedDate);
      setSelectedDate(newDate);
    },
    [viewMode, selectedDate]
  );

  const handleEventClick = useCallback(
    (event: CalendarEvent, _element: HTMLElement) => {
      setSelectedEvent(event);
      setIsPopoverOpen(true);
    },
    []
  );

  const handleDateChange = useCallback((date: Date) => {
    hasNavigated.current = true;
    setSelectedDate(date);
  }, []);

  const handleClosePopover = useCallback(() => {
    setIsPopoverOpen(false);
    setSelectedEvent(null);
  }, []);

  return (
    <div
      className="flex flex-1 flex-col"
      data-testid="public-calendar-container"
    >
      <div className="border-b bg-background px-4 py-3">
        <h1 className="font-semibold text-lg">{guildName}</h1>
      </div>

      <CalendarToolbar
        isMobile={isMobile}
        onNavigate={handleNavigate}
        onViewChange={handleViewChange}
        selectedDate={selectedDate}
        viewMode={viewMode}
      />

      {/* biome-ignore lint/nursery/noLeakedRender: isLoading is boolean */}
      {isLoading && (
        <div className="flex items-center justify-center p-8">
          <div className="text-muted-foreground">読み込み中...</div>
        </div>
      )}

      {isLoading ? null : (
        <div className="flex flex-1 flex-col">
          <CalendarGrid
            events={events}
            onDateChange={handleDateChange}
            onEventClick={handleEventClick}
            selectedDate={selectedDate}
            today={new Date()}
            viewMode={viewMode}
          />
        </div>
      )}

      <EventPopover
        event={selectedEvent}
        isAuthenticated={false}
        onClose={handleClosePopover}
        open={isPopoverOpen}
      />
    </div>
  );
}
