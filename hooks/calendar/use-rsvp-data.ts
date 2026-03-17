/**
 * useRsvpData - EventPopover 用 RSVP データフェッチフック
 *
 * Task 6.1: RsvpButtons と AttendeeList のデータ管理
 */
import { useCallback, useEffect, useState } from "react";
import { fetchAttendeesAction } from "@/app/dashboard/actions";
import type { AttendeeData } from "@/lib/calendar/rsvp-types";
import type { CalendarEvent } from "@/lib/calendar/types";
import { getRsvpIdentifiers } from "./use-rsvp-identifiers";

export function useRsvpData(
  event: CalendarEvent | null,
  guildId: string | null | undefined,
  open: boolean
) {
  const [attendeeData, setAttendeeData] = useState<AttendeeData | null>(null);

  const showRsvp = Boolean(guildId) && Boolean(event);

  const rsvpIds = event ? getRsvpIdentifiers(event) : null;
  const rsvpEventId = rsvpIds?.eventId ?? null;
  const rsvpSeriesId = rsvpIds?.seriesId ?? null;
  const rsvpOccurrenceDate = rsvpIds?.occurrenceDate ?? null;

  const fetchAttendees = useCallback(async () => {
    if (!(guildId && event)) {
      return;
    }

    const result = await fetchAttendeesAction({
      guildId,
      eventId: rsvpEventId,
      seriesId: rsvpSeriesId,
      occurrenceDate: rsvpOccurrenceDate,
    });

    if (result.success) {
      setAttendeeData(result.data);
    }
  }, [guildId, event, rsvpEventId, rsvpSeriesId, rsvpOccurrenceDate]);

  useEffect(() => {
    if (open && showRsvp) {
      fetchAttendees();
    }
    if (!open) {
      setAttendeeData(null);
    }
  }, [open, showRsvp, fetchAttendees]);

  const handleRsvpStatusChange = useCallback(() => {
    fetchAttendees();
  }, [fetchAttendees]);

  return { attendeeData, showRsvp, rsvpIds, handleRsvpStatusChange };
}
