/**
 * useEditScopeDialog - EditScopeDialog状態管理とスコープ操作のカスタムフック
 *
 * recurring-events Task 7.2, 7.4:
 * 繰り返しイベントの編集・削除時にスコープ選択ダイアログを表示し、
 * スコープ選択後の操作を実行する
 *
 * Task 7.4: 編集モードでスコープ選択後にopenEditDialogWithScopeを呼び出し、
 * EventDialogにスコープコンテキストを渡す
 */

import { useCallback, useState } from "react";
import { deleteOccurrenceAction } from "@/app/dashboard/actions";
import type { EditScopeOptions } from "@/components/calendar/edit-scope-dialog";
import type { EventFormData } from "@/hooks/calendar/use-event-form";
import { trackEvent } from "@/lib/analytics/events";
import {
  DIALOG_CLOSE_DELAY_MS,
  isRecurringEvent,
  toEventFormData,
} from "@/lib/calendar/calendar-helpers";
import type { CalendarEvent, EditScope } from "@/lib/calendar/types";

export function useEditScopeDialog(
  guildId: string | null,
  openEditDialogWithScopeRef: React.RefObject<
    (opts: {
      id: string;
      data: Partial<EventFormData>;
      scope: EditScope;
      seriesId: string;
      occurrenceDate: Date;
      resetExceptions: boolean;
    }) => void
  >,
  fetchEventsRef: React.RefObject<() => Promise<void>>
) {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<"edit" | "delete">("edit");
  const [targetEvent, setTargetEvent] = useState<CalendarEvent | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const openDialog = useCallback(
    (event: CalendarEvent, dialogMode: "edit" | "delete") => {
      setTargetEvent(event);
      setMode(dialogMode);
      setDeleteError(null);
      setIsOpen(true);
    },
    []
  );

  const closeDialog = useCallback(() => {
    setIsOpen(false);
    setDeleteError(null);
    setTimeout(() => setTargetEvent(null), DIALOG_CLOSE_DELAY_MS);
  }, []);

  const handleSelect = useCallback(
    async (scope: EditScope, options: EditScopeOptions) => {
      if (!(targetEvent && guildId)) {
        return;
      }
      // EditScopeDialog は繰り返しイベントにのみ表示されるため、
      // この時点で targetEvent は必ず isRecurring: true
      if (!isRecurringEvent(targetEvent)) {
        return;
      }

      // Task 7.4: 編集モード — スコープ情報を渡してEventDialogを開く
      if (mode === "edit") {
        const eventOccurrenceDate =
          targetEvent.originalDate ?? targetEvent.start;
        openEditDialogWithScopeRef.current({
          id: targetEvent.id,
          data: toEventFormData(targetEvent),
          scope,
          seriesId: targetEvent.seriesId,
          occurrenceDate: eventOccurrenceDate,
          resetExceptions: options.resetExceptions,
        });
        closeDialog();
        return;
      }

      // 削除: スコープに応じてdeleteOccurrenceActionを呼び出す
      setIsDeleting(true);
      setDeleteError(null);
      const result = await deleteOccurrenceAction({
        guildId,
        seriesId: targetEvent.seriesId,
        scope,
        occurrenceDate: targetEvent.originalDate ?? targetEvent.start,
      });

      setIsDeleting(false);

      if (result.success) {
        trackEvent("event_deleted", { scope });
        closeDialog();
        fetchEventsRef.current();
      } else {
        setDeleteError(result.error?.message ?? "削除に失敗しました。");
      }
    },
    [
      targetEvent,
      mode,
      guildId,
      openEditDialogWithScopeRef,
      fetchEventsRef,
      closeDialog,
    ]
  );

  return {
    isOpen,
    mode,
    targetEvent,
    isDeleting,
    deleteError,
    openDialog,
    closeDialog,
    setIsOpen,
    handleSelect,
  };
}
