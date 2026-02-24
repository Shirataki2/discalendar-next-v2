/**
 * CalendarContainer - カレンダーコンテナコンポーネント
 *
 * タスク3.3: CalendarContainerコンポーネントの実装
 * - ギルドIDを受け取りEventServiceでイベントを取得する
 * - ギルド選択変更時にイベントデータを再取得する
 * - ギルド未選択時は空のカレンダーグリッドを表示する
 * - 子コンポーネント（Toolbar, Grid）にデータとハンドラーを配布する
 *
 * タスク7: イベント詳細ポップオーバーの統合
 * - イベントクリック時にEventPopoverを表示する
 * - ポップオーバーの開閉状態を管理する
 *
 * タスク7.1: 予定作成フローの統合
 * - 新規追加ボタンクリック時にEventDialogを表示する
 * - CalendarGridのonSelectSlotハンドラーで期間選択時にEventDialogを表示する
 * - useEventMutationフックを使用して予定作成を実行する
 * - 予定保存成功時にfetchEvents()を呼び出してカレンダー表示を更新する
 *
 * タスク7.2: 予定編集・削除フローの統合
 * - EventPopoverにonEditとonDeleteコールバックを追加する
 * - 編集ボタンクリック時に既存データを設定してEventDialogを表示する
 * - 予定更新成功時にダイアログを閉じてfetchEvents()でカレンダー表示を更新する
 * - 削除ボタンクリック時にConfirmDialogを表示する
 * - 削除確認後にuseEventMutationで予定を削除してカレンダー表示を更新する
 *
 * タスク8: レスポンシブデザインの実装
 * - デスクトップ/タブレット/モバイルのブレークポイント対応
 * - モバイルでのデフォルトビュー制御
 *
 * Requirements: 1.1, 1.2, 1.4, 1.5, 2.3, 3.1, 3.3, 3.4, 4.1, 4.2, 4.3, 5.1, 5.2, 6.1, 6.2, 6.3, 6.4, 6.5
 */
"use client";

import { useCallback, useEffect, useRef } from "react";
import type { ViewMode } from "@/hooks/calendar/use-calendar-state";
import { useCalendarState } from "@/hooks/calendar/use-calendar-state";
import { useCalendarUrlSync } from "@/hooks/calendar/use-calendar-url-sync";
import { useConfirmDialog } from "@/hooks/calendar/use-confirm-dialog";
import { useEditScopeDialog } from "@/hooks/calendar/use-edit-scope-dialog";
import { useEventDialog } from "@/hooks/calendar/use-event-dialog";
import { useEventMutation } from "@/hooks/calendar/use-event-mutation";
import { useEventPopover } from "@/hooks/calendar/use-event-popover";
import { useBreakpoint } from "@/hooks/calendar/use-media-query";
import { mapNavigationDirection, trackEvent } from "@/lib/analytics/events";
import {
  calculateNavigationDate,
  canInteractWithEvents,
  getDateRange,
  isGuildEmpty,
  isRecurringEvent,
  toDate,
  toEventFormData,
} from "@/lib/calendar/calendar-helpers";
import { createEventService } from "@/lib/calendar/event-service";
import type { CalendarEvent } from "@/lib/calendar/types";
import { createClient } from "@/lib/supabase/client";
import { CalendarErrorDisplay } from "./calendar-error-display";
import { CalendarGrid } from "./calendar-grid";
import { CalendarToolbar } from "./calendar-toolbar";
import { ConfirmDialog } from "./confirm-dialog";
import { EditScopeDialog } from "./edit-scope-dialog";
import { EventDialog } from "./event-dialog";
import { EventPopover } from "./event-popover";

/**
 * CalendarContainerのProps
 */
export type CalendarContainerProps = {
  /** ギルドID（nullまたは空文字列の場合は未選択） */
  guildId: string | null;
  /** イベント編集可否（権限制御）。undefined の場合は true（後方互換性） */
  canEditEvents?: boolean;
  /** サーバー設定ボタンクリックハンドラー */
  onSettingsClick?: () => void;
};

/**
 * CalendarContainer コンポーネント
 *
 * カレンダー全体の状態管理、データフェッチ、子コンポーネントへのデータ配布を担当する。
 *
 * @param props - コンポーネントのProps
 *
 * @example
 * ```tsx
 * <CalendarContainer guildId="123456789" />
 * ```
 */
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: CalendarContainer is the top-level orchestrator managing multiple dialog flows (event/confirm/edit-scope), recurring event routing adds minimal branching
export function CalendarContainer({
  guildId,
  canEditEvents = true,
  onSettingsClick,
}: CalendarContainerProps) {
  // URL同期されたビューモードと日付
  const { viewMode, selectedDate, setViewMode, setSelectedDate } =
    useCalendarUrlSync();

  // カレンダー状態管理
  const { state, actions } = useCalendarState({
    initialViewMode: viewMode,
    initialDate: selectedDate,
  });

  // モバイル判定
  const { isMobile } = useBreakpoint();

  // Supabaseクライアントの初期化
  const supabaseRef = useRef(createClient());
  const eventServiceRef = useRef(createEventService(supabaseRef.current));

  // AbortController for cancelling requests
  const abortControllerRef = useRef<AbortController | null>(null);

  // 最新のfetchEventsを保持するref（DnDハンドラーのstale closure回避用）
  const fetchEventsRef = useRef<() => Promise<void>>(() => Promise.resolve());

  // Task 7: ポップオーバーの状態管理
  const {
    selectedEvent,
    isOpen: isPopoverOpen,
    openPopover,
    closePopover,
  } = useEventPopover();

  // Task 7.1, 7.2, 7.4: EventDialog状態管理（新規作成・編集モード・スコープ付き編集対応）
  const {
    isOpen: isEventDialogOpen,
    mode: eventDialogMode,
    eventId: editEventId,
    initialData: eventDialogInitialData,
    editScope: eventDialogEditScope,
    seriesId: eventDialogSeriesId,
    occurrenceDate: eventDialogOccurrenceDate,
    resetExceptions: eventDialogResetExceptions,
    openCreateDialog: openEventDialog,
    openEditDialog,
    openEditDialogWithScope,
    closeDialog: closeEventDialog,
  } = useEventDialog();

  // Task 7.2: ConfirmDialog状態管理
  const {
    isOpen: isConfirmDialogOpen,
    eventToDelete,
    openDialog: openConfirmDialog,
    closeDialog: closeConfirmDialog,
    setIsOpen: setConfirmDialogOpen,
  } = useConfirmDialog();

  // recurring-events Task 7.4: openEditDialogWithScopeのrefを保持（stale closure回避）
  const openEditDialogWithScopeRef = useRef(openEditDialogWithScope);
  openEditDialogWithScopeRef.current = openEditDialogWithScope;

  // recurring-events Task 7.2, 7.4: EditScopeDialog状態管理
  const {
    isOpen: isEditScopeDialogOpen,
    mode: editScopeMode,
    targetEvent: editScopeTargetEvent,
    isDeleting: isScopeDeleting,
    openDialog: openEditScopeDialog,
    setIsOpen: setEditScopeDialogOpen,
    handleSelect: handleEditScopeSelect,
  } = useEditScopeDialog(guildId, openEditDialogWithScopeRef, fetchEventsRef);

  // Task 7.2: useEventMutation for CRUD operations
  const {
    state: mutationState,
    updateEvent,
    deleteEvent,
  } = useEventMutation(guildId ?? "");

  /**
   * イベントデータを取得する
   */
  const fetchEvents = useCallback(async () => {
    // ギルドが選択されていない場合は何もしない
    if (isGuildEmpty(guildId)) {
      actions.clearEvents();
      return;
    }

    // 前回のリクエストをキャンセル
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // 新しいAbortControllerを作成
    abortControllerRef.current = new AbortController();

    // ローディング開始
    actions.startFetching();

    // クライアントサイド専用: document.cookie からセッション情報を読み取る
    const {
      data: { session },
    } = await supabaseRef.current.auth.getSession();
    if (!session) {
      // セッションがない場合は、ユーザーに再ログインを促す
      actions.completeFetchingError({
        code: "UNAUTHORIZED",
        message: "セッションが無効です。再度ログインしてください。",
        details: "No active session found",
      });
      return;
    }

    // 取得期間を計算
    const { startDate, endDate } = getDateRange(viewMode, selectedDate);

    // イベント取得（単発 + 繰り返しオカレンスの統合取得）
    const result = await eventServiceRef.current.fetchEventsWithSeries({
      guildId: guildId ?? "",
      startDate,
      endDate,
      signal: abortControllerRef.current.signal,
    });

    // 結果を反映
    if (result.success) {
      actions.completeFetchingSuccess(result.data);
    } else {
      actions.completeFetchingError(result.error);
    }
  }, [guildId, viewMode, selectedDate, actions]);

  // fetchEventsの最新参照をrefに同期（stale closure回避）
  fetchEventsRef.current = fetchEvents;

  /**
   * ギルドIDまたは表示期間が変更されたらイベントを再取得
   */
  useEffect(() => {
    fetchEvents();

    // クリーンアップ: コンポーネントがアンマウントされたらリクエストをキャンセル
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchEvents]);

  /**
   * ビューモード変更ハンドラー
   * Analytics: view_changed イベントをトラッキング
   */
  const handleViewChange = useCallback(
    (mode: ViewMode) => {
      setViewMode(mode);
      actions.setViewMode(mode);
      trackEvent("view_changed", { view_type: mode });
    },
    [setViewMode, actions]
  );

  /**
   * ナビゲーションハンドラー
   * Analytics: calendar_navigated イベントをトラッキング
   */
  const handleNavigate = useCallback(
    (action: "PREV" | "NEXT" | "TODAY") => {
      const newDate = calculateNavigationDate(action, viewMode, selectedDate);
      setSelectedDate(newDate);
      actions.setSelectedDate(newDate);
      trackEvent("calendar_navigated", {
        direction: mapNavigationDirection(action),
      });
    },
    [viewMode, selectedDate, setSelectedDate, actions]
  );

  /**
   * イベントクリックハンドラー (Task 7: EventPopoverを表示)
   */
  const handleEventClick = useCallback(
    (event: CalendarEvent, _element: HTMLElement) => {
      openPopover(event);
    },
    [openPopover]
  );

  /**
   * 日付変更ハンドラー
   */
  const handleDateChange = useCallback(
    (date: Date) => {
      setSelectedDate(date);
      actions.setSelectedDate(date);
    },
    [setSelectedDate, actions]
  );

  /**
   * Task 7.1: 新規追加ボタンクリックハンドラー (Req 1.2)
   */
  const handleAddClick = useCallback(() => {
    openEventDialog();
  }, [openEventDialog]);

  /**
   * Task 7.1: スロット選択ハンドラー (Req 1.1)
   * CalendarGridで期間選択時に選択期間を初期値としてEventDialogを表示する
   */
  const handleSlotSelect = useCallback(
    (slotInfo: { start: Date; end: Date }) => {
      openEventDialog({
        startAt: slotInfo.start,
        endAt: slotInfo.end,
      });
    },
    [openEventDialog]
  );

  /**
   * Task 7.1: イベントダイアログ成功ハンドラー (Req 1.4, 1.5)
   * 予定保存成功時にfetchEventsを呼び出してカレンダー表示を更新する
   */
  const handleEventDialogSuccess = useCallback(() => {
    closeEventDialog();
    closePopover();
    fetchEvents();
  }, [closeEventDialog, closePopover, fetchEvents]);

  /**
   * Task 7.2: 編集ボタンクリックハンドラー (Req 2.3, 3.1, 5.1)
   * 繰り返しイベントの場合はEditScopeDialogを経由する
   */
  const handleEditEvent = useCallback(
    (event: CalendarEvent) => {
      closePopover();
      if (isRecurringEvent(event)) {
        openEditScopeDialog(event, "edit");
        return;
      }
      openEditDialog(event.id, toEventFormData(event));
    },
    [openEditDialog, closePopover, openEditScopeDialog]
  );

  /**
   * Task 7.2: 削除ボタンクリックハンドラー (Req 4.1, 5.3)
   * 繰り返しイベントの場合はEditScopeDialogを経由する
   */
  const handleDeleteEvent = useCallback(
    (event: CalendarEvent) => {
      closePopover();
      if (isRecurringEvent(event)) {
        openEditScopeDialog(event, "delete");
        return;
      }
      openConfirmDialog(event);
    },
    [openConfirmDialog, closePopover, openEditScopeDialog]
  );

  /**
   * Task 7.2: 削除確認ハンドラー (Req 4.2, 4.3)
   * ConfirmDialogの確認ボタンクリック時に呼ばれる（単発イベント用）
   * Analytics: event_deleted イベントをトラッキング
   */
  const handleConfirmDelete = useCallback(async () => {
    if (!eventToDelete) {
      return;
    }

    const result = await deleteEvent(eventToDelete.id);

    if (result.success) {
      trackEvent("event_deleted", {});
      closeConfirmDialog();
      fetchEvents();
    }
  }, [eventToDelete, deleteEvent, closeConfirmDialog, fetchEvents]);

  /**
   * イベントドロップ（日時変更）ハンドラー
   * ドラッグ＆ドロップでイベントの日時を変更する
   * Analytics: event_moved イベントをトラッキング（成功時のみ）
   */
  const handleEventDrop = useCallback(
    async (args: {
      event: CalendarEvent;
      start: Date | string;
      end: Date | string;
      isAllDay?: boolean;
    }) => {
      const { event, start, end, isAllDay } = args;
      const newStart = toDate(start);
      const newEnd = toDate(end);

      // オプティミスティック更新: ローカル状態を即座に更新
      const updatedEvents = state.events.map((e) =>
        e.id === event.id
          ? { ...e, start: newStart, end: newEnd, allDay: isAllDay ?? e.allDay }
          : e
      );
      actions.setEvents(updatedEvents);

      // Supabaseに永続化
      const result = await updateEvent(event.id, {
        startAt: newStart,
        endAt: newEnd,
        isAllDay: isAllDay ?? event.allDay,
      });

      if (result.success) {
        trackEvent("event_moved", { method: "drag_and_drop" });
      } else {
        fetchEventsRef.current();
      }
    },
    [state.events, actions, updateEvent]
  );

  /**
   * イベントリサイズ（期間変更）ハンドラー
   * ドラッグでイベントの開始時刻・終了時刻を変更する
   * Analytics: event_resized イベントをトラッキング（成功時のみ）
   */
  const handleEventResize = useCallback(
    async (args: {
      event: CalendarEvent;
      start: Date | string;
      end: Date | string;
    }) => {
      const { event, start, end } = args;
      const newStart = toDate(start);
      const newEnd = toDate(end);

      // オプティミスティック更新: ローカル状態を即座に更新
      const updatedEvents = state.events.map((e) =>
        e.id === event.id ? { ...e, start: newStart, end: newEnd } : e
      );
      actions.setEvents(updatedEvents);

      // Supabaseに永続化
      const result = await updateEvent(event.id, {
        startAt: newStart,
        endAt: newEnd,
      });

      if (result.success) {
        trackEvent("event_resized", {});
      } else {
        fetchEventsRef.current();
      }
    },
    [state.events, actions, updateEvent]
  );

  // ギルド未選択時は空のカレンダーを表示 (Req 5.2)
  const shouldShowEmpty = isGuildEmpty(guildId);
  const canInteract = canInteractWithEvents(shouldShowEmpty, canEditEvents);

  // Task 7.1: ギルド選択時のみ追加ボタンを有効化
  const toolbarAddClickHandler = shouldShowEmpty ? undefined : handleAddClick;
  // guild-permissions 5.1: 権限不足時は追加ボタンを disabled にする
  const isAddDisabled = canEditEvents ? undefined : true;

  // guild-permissions 5.2: 編集・削除・DnD・スロット選択は選択済みかつ権限がある場合のみ有効化
  const popoverEditHandler = canInteract ? handleEditEvent : undefined;
  const popoverDeleteHandler = canInteract ? handleDeleteEvent : undefined;
  const gridEventDropHandler = canInteract ? handleEventDrop : undefined;
  const gridEventResizeHandler = canInteract ? handleEventResize : undefined;
  const gridSlotSelectHandler = canInteract ? handleSlotSelect : undefined;

  return (
    <div className="flex flex-1 flex-col" data-testid="calendar-container">
      {/* ツールバー */}
      <CalendarToolbar
        isAddDisabled={isAddDisabled}
        isMobile={isMobile}
        onAddClick={toolbarAddClickHandler}
        onNavigate={handleNavigate}
        onSettingsClick={onSettingsClick}
        onViewChange={handleViewChange}
        selectedDate={selectedDate}
        viewMode={viewMode}
      />

      {/* ローディング状態 (Req 5.3) */}
      {/* biome-ignore lint/nursery/noLeakedRender: isLoading is boolean */}
      {state.isLoading && !shouldShowEmpty && (
        <div className="flex items-center justify-center p-8">
          <div className="text-muted-foreground">読み込み中...</div>
        </div>
      )}

      {/* エラー状態 (Req 5.4) */}
      {/* biome-ignore lint/nursery/noLeakedRender: error is CalendarError | null */}
      {state.error && !state.isLoading && (
        <CalendarErrorDisplay error={state.error} onRetry={fetchEvents} />
      )}

      {/* カレンダーグリッド */}
      {state.isLoading || state.error ? null : (
        <div className="flex flex-1 flex-col">
          <CalendarGrid
            events={shouldShowEmpty ? [] : state.events}
            onDateChange={handleDateChange}
            onEventClick={handleEventClick}
            onEventDrop={gridEventDropHandler}
            onEventResize={gridEventResizeHandler}
            onSlotSelect={gridSlotSelectHandler}
            selectedDate={selectedDate}
            today={new Date()}
            viewMode={viewMode}
          />
        </div>
      )}

      {/* Task 7: イベント詳細ポップオーバー */}
      {/* Task 7.2: onEditとonDeleteコールバックを追加 */}
      <EventPopover
        event={selectedEvent}
        onClose={closePopover}
        onDelete={popoverDeleteHandler}
        onEdit={popoverEditHandler}
        open={isPopoverOpen}
      />

      {/* Task 7.1, 7.2, 7.4: イベント作成・編集ダイアログ */}
      {guildId ? (
        <EventDialog
          editScope={eventDialogEditScope}
          eventId={editEventId}
          guildId={guildId}
          initialData={eventDialogInitialData}
          mode={eventDialogMode}
          occurrenceDate={eventDialogOccurrenceDate}
          onClose={closeEventDialog}
          onSuccess={handleEventDialogSuccess}
          open={isEventDialogOpen}
          resetExceptions={eventDialogResetExceptions}
          seriesId={eventDialogSeriesId}
        />
      ) : null}

      {/* Task 7.2: 削除確認ダイアログ（単発イベント用） */}
      <ConfirmDialog
        eventTitle={eventToDelete?.title ?? ""}
        isLoading={mutationState.isDeleting}
        onConfirm={handleConfirmDelete}
        onOpenChange={setConfirmDialogOpen}
        open={isConfirmDialogOpen}
      />

      {/* recurring-events Task 7.2: 繰り返しイベント編集・削除スコープ選択ダイアログ */}
      <EditScopeDialog
        eventTitle={editScopeTargetEvent?.title ?? ""}
        isLoading={isScopeDeleting}
        mode={editScopeMode}
        onOpenChange={setEditScopeDialogOpen}
        onSelect={handleEditScopeSelect}
        open={isEditScopeDialogOpen}
      />
    </div>
  );
}
