/**
 * useConfirmDialog - ConfirmDialog状態管理のカスタムフック
 *
 * Task 7.2: 削除確認ダイアログの開閉状態管理
 */

import { useCallback, useState } from "react";
import { DIALOG_CLOSE_DELAY_MS } from "@/lib/calendar/calendar-helpers";
import type { CalendarEvent } from "@/lib/calendar/types";

export function useConfirmDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [eventToDelete, setEventToDelete] = useState<CalendarEvent | null>(
    null
  );

  const openDialog = useCallback((event: CalendarEvent) => {
    setEventToDelete(event);
    setIsOpen(true);
  }, []);

  const closeDialog = useCallback(() => {
    setIsOpen(false);
    // 遅延してイベントをクリア
    setTimeout(() => setEventToDelete(null), DIALOG_CLOSE_DELAY_MS);
  }, []);

  return {
    isOpen,
    eventToDelete,
    openDialog,
    closeDialog,
    setIsOpen,
  };
}
