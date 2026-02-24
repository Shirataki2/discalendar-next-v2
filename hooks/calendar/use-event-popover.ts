/**
 * useEventPopover - ポップオーバー状態管理のカスタムフック
 *
 * Task 7: イベント詳細ポップオーバーの開閉状態管理
 */

import { useCallback, useState } from "react";
import { DIALOG_CLOSE_DELAY_MS } from "@/lib/calendar/calendar-helpers";
import type { CalendarEvent } from "@/lib/calendar/types";

export function useEventPopover() {
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(
    null
  );
  const [isOpen, setIsOpen] = useState(false);

  const openPopover = useCallback((event: CalendarEvent) => {
    setSelectedEvent(event);
    setIsOpen(true);
  }, []);

  const closePopover = useCallback(() => {
    setIsOpen(false);
    // ポップオーバーが閉じた後に選択イベントをクリア
    setTimeout(() => setSelectedEvent(null), DIALOG_CLOSE_DELAY_MS);
  }, []);

  return {
    selectedEvent,
    isOpen,
    openPopover,
    closePopover,
  };
}
