/**
 * useEventDialog - EventDialog状態管理のカスタムフック
 *
 * Task 7.1, 7.2, 7.4: 新規作成モードと編集モードをサポート
 * Task 7.4: スコープ付き編集のコンテキスト（editScope, seriesId, occurrenceDate, resetExceptions）を管理
 */

import { useCallback, useState } from "react";
import type { EventFormData } from "@/hooks/calendar/use-event-form";
import type { EditScope } from "@/lib/calendar/types";

export function useEventDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<"create" | "edit">("create");
  const [eventId, setEventId] = useState<string | undefined>(undefined);
  const [initialData, setInitialData] = useState<Partial<EventFormData>>({});
  // Task 7.4: スコープ付き編集コンテキスト
  const [editScope, setEditScope] = useState<EditScope | undefined>(undefined);
  const [seriesId, setSeriesId] = useState<string | undefined>(undefined);
  const [occurrenceDate, setOccurrenceDate] = useState<Date | undefined>(
    undefined
  );
  const [resetExceptions, setResetExceptions] = useState(false);

  // Task 7.1: 新規作成モードでダイアログを開く
  const openCreateDialog = useCallback((data?: Partial<EventFormData>) => {
    setMode("create");
    setEventId(undefined);
    setInitialData(data ?? {});
    setEditScope(undefined);
    setSeriesId(undefined);
    setOccurrenceDate(undefined);
    setResetExceptions(false);
    setIsOpen(true);
  }, []);

  // Task 7.2: 編集モードでダイアログを開く（単発イベント用）
  const openEditDialog = useCallback(
    (id: string, data: Partial<EventFormData>) => {
      setMode("edit");
      setEventId(id);
      setInitialData(data);
      setEditScope(undefined);
      setSeriesId(undefined);
      setOccurrenceDate(undefined);
      setResetExceptions(false);
      setIsOpen(true);
    },
    []
  );

  // Task 7.4: スコープ付き編集モードでダイアログを開く（繰り返しイベント用）
  const openEditDialogWithScope = useCallback(
    (opts: {
      id: string;
      data: Partial<EventFormData>;
      scope: EditScope;
      seriesId: string;
      occurrenceDate: Date;
      resetExceptions: boolean;
    }) => {
      setMode("edit");
      setEventId(opts.id);
      setInitialData(opts.data);
      setEditScope(opts.scope);
      setSeriesId(opts.seriesId);
      setOccurrenceDate(opts.occurrenceDate);
      setResetExceptions(opts.resetExceptions);
      setIsOpen(true);
    },
    []
  );

  const closeDialog = useCallback(() => {
    setIsOpen(false);
    setInitialData({});
    setEventId(undefined);
    setEditScope(undefined);
    setSeriesId(undefined);
    setOccurrenceDate(undefined);
    setResetExceptions(false);
  }, []);

  return {
    isOpen,
    mode,
    eventId,
    initialData,
    editScope,
    seriesId,
    occurrenceDate,
    resetExceptions,
    openCreateDialog,
    openEditDialog,
    openEditDialogWithScope,
    closeDialog,
  };
}
