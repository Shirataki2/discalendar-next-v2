/**
 * getRsvpIdentifiers - イベントから RSVP 用の識別子を抽出する
 *
 * Task 6.2: 繰り返しイベントの RSVP 対応
 */
import { format } from "date-fns";
import type { CalendarEvent } from "@/lib/calendar/types";

export function getRsvpIdentifiers(event: CalendarEvent): {
  eventId: string | null;
  seriesId: string | null;
  occurrenceDate: string | null;
} {
  if (event.isRecurring === true) {
    return {
      eventId: null,
      seriesId: event.seriesId,
      occurrenceDate: format(event.start, "yyyy-MM-dd"),
    };
  }
  return {
    eventId: event.id,
    seriesId: null,
    occurrenceDate: null,
  };
}
