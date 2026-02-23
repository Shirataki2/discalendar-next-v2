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

import { endOfMonth, endOfWeek, startOfMonth, startOfWeek } from "date-fns";
import { useCallback, useEffect, useRef, useState } from "react";
import { deleteOccurrenceAction } from "@/app/dashboard/actions";
import type { ViewMode } from "@/hooks/calendar/use-calendar-state";
import { useCalendarState } from "@/hooks/calendar/use-calendar-state";
import { useCalendarUrlSync } from "@/hooks/calendar/use-calendar-url-sync";
import type { EventFormData } from "@/hooks/calendar/use-event-form";
import { useEventMutation } from "@/hooks/calendar/use-event-mutation";
import { mapNavigationDirection, trackEvent } from "@/lib/analytics/events";
import { createEventService } from "@/lib/calendar/event-service";
import type { CalendarEvent, EditScope } from "@/lib/calendar/types";
import { createClient } from "@/lib/supabase/client";
import { CalendarGrid } from "./calendar-grid";
import { CalendarToolbar } from "./calendar-toolbar";
import { ConfirmDialog } from "./confirm-dialog";
import type { EditScopeOptions } from "./edit-scope-dialog";
import { EditScopeDialog } from "./edit-scope-dialog";
import { EventDialog } from "./event-dialog";
import { EventPopover } from "./event-popover";

/**
 * EventDialog状態管理のカスタムフック (Task 7.1, 7.2, 7.4)
 * 新規作成モードと編集モードをサポート
 * Task 7.4: スコープ付き編集のコンテキスト（editScope, seriesId, occurrenceDate, resetExceptions）を管理
 */
function useEventDialog() {
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

/**
 * ConfirmDialog状態管理のカスタムフック (Task 7.2)
 */
function useConfirmDialog() {
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
    setTimeout(() => setEventToDelete(null), 150);
  }, []);

  return {
    isOpen,
    eventToDelete,
    openDialog,
    closeDialog,
    setIsOpen,
  };
}

/**
 * EditScopeDialog状態管理とスコープ操作のカスタムフック (recurring-events Task 7.2, 7.4)
 * 繰り返しイベントの編集・削除時にスコープ選択ダイアログを表示し、
 * スコープ選択後の操作を実行する
 *
 * Task 7.4: 編集モードでスコープ選択後にopenEditDialogWithScopeを呼び出し、
 * EventDialogにスコープコンテキストを渡す
 */
function useEditScopeDialog(
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
    setTimeout(() => setTargetEvent(null), 150);
  }, []);

  const handleSelect = useCallback(
    async (scope: EditScope, options: EditScopeOptions) => {
      if (!(targetEvent && guildId)) {
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
          seriesId: targetEvent.seriesId as string,
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
        seriesId: targetEvent.seriesId as string,
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

/**
 * ナビゲーションアクションに基づいて新しい日付を計算する
 */
function calculateNavigationDate(
  action: "PREV" | "NEXT" | "TODAY",
  currentViewMode: ViewMode,
  currentDate: Date
): Date {
  if (action === "TODAY") {
    return new Date();
  }

  const newDate = new Date(currentDate);
  const direction = action === "NEXT" ? 1 : -1;

  if (currentViewMode === "day") {
    newDate.setDate(newDate.getDate() + direction);
  } else if (currentViewMode === "week") {
    newDate.setDate(newDate.getDate() + 7 * direction);
  } else {
    newDate.setMonth(newDate.getMonth() + direction);
  }

  return newDate;
}

/**
 * Date | string を Date に変換するヘルパー
 */
function toDate(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value);
}

/**
 * ギルドが未選択かどうかを判定する
 */
function isGuildEmpty(guildId: string | null): boolean {
  return !guildId || guildId.trim() === "";
}

/**
 * イベントが繰り返しイベントかどうかを判定するヘルパー
 */
function isRecurringEvent(event: CalendarEvent): boolean {
  return event.isRecurring === true && !!event.seriesId;
}

/**
 * CalendarEventからEventFormData（部分）に変換するヘルパー
 */
function toEventFormData(event: CalendarEvent): Partial<EventFormData> {
  return {
    title: event.title,
    startAt: event.start,
    endAt: event.end,
    isAllDay: event.allDay,
    color: event.color,
    description: event.description ?? "",
    location: event.location ?? "",
    notifications: event.notifications ?? [],
  };
}

/**
 * 編集操作が有効かどうかを判定するヘルパー
 *
 * guild-permissions 5.2: ギルド選択済みかつ編集権限がある場合のみ true
 */
function canInteractWithEvents(
  shouldShowEmpty: boolean,
  canEditEvents: boolean
): boolean {
  return !shouldShowEmpty && canEditEvents;
}

/**
 * カレンダーエラー表示コンポーネント
 *
 * エラーメッセージとリトライボタンを表示する。
 * 開発環境ではエラー詳細も表示する。
 */
function CalendarErrorDisplay({
  error,
  onRetry,
}: {
  error: { message: string; details?: string };
  onRetry: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 p-8">
      <div className="flex flex-col items-center gap-2">
        <div className="text-destructive">{error.message}</div>
        {process.env.NODE_ENV === "development" && error.details && (
          <div className="text-muted-foreground text-xs">
            詳細: {error.details}
          </div>
        )}
      </div>
      <button
        className="rounded-md bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90"
        onClick={onRetry}
        type="button"
      >
        再試行
      </button>
    </div>
  );
}

/**
 * CalendarContainerのProps
 */
export type CalendarContainerProps = {
  /** ギルドID（nullまたは空文字列の場合は未選択） */
  guildId: string | null;
  /** イベント編集可否（権限制御）。undefined の場合は true（後方互換性） */
  canEditEvents?: boolean;
};

/**
 * 画面幅がモバイルサイズかどうかを判定するフック
 */
function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkIsMobile();
    window.addEventListener("resize", checkIsMobile);

    return () => {
      window.removeEventListener("resize", checkIsMobile);
    };
  }, []);

  return isMobile;
}

/**
 * ビューモードと日付から取得期間を計算
 */
function getDateRange(
  viewMode: ViewMode,
  selectedDate: Date
): {
  startDate: Date;
  endDate: Date;
} {
  switch (viewMode) {
    case "day":
      // 日ビュー: 選択された日のみ
      return {
        startDate: new Date(
          selectedDate.getFullYear(),
          selectedDate.getMonth(),
          selectedDate.getDate(),
          0,
          0,
          0,
          0
        ),
        endDate: new Date(
          selectedDate.getFullYear(),
          selectedDate.getMonth(),
          selectedDate.getDate(),
          23,
          59,
          59,
          999
        ),
      };

    case "week":
      // 週ビュー: 選択された日を含む週
      return {
        startDate: startOfWeek(selectedDate, { weekStartsOn: 0 }),
        endDate: endOfWeek(selectedDate, { weekStartsOn: 0 }),
      };

    case "month":
      // 月ビュー: 選択された日を含む月
      return {
        startDate: startOfMonth(selectedDate),
        endDate: endOfMonth(selectedDate),
      };

    default:
      // デフォルトは月ビュー
      return {
        startDate: startOfMonth(selectedDate),
        endDate: endOfMonth(selectedDate),
      };
  }
}

/**
 * ポップオーバー状態管理のカスタムフック
 */
function useEventPopover() {
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
    setTimeout(() => setSelectedEvent(null), 150);
  }, []);

  return {
    selectedEvent,
    isOpen,
    openPopover,
    closePopover,
  };
}

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
  const isMobile = useIsMobile();

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
  } = useEventMutation(eventServiceRef.current);

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

    // 認証状態を確認し、必要に応じてセッションを再取得
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
      guildId: guildId as string,
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
          eventService={eventServiceRef.current}
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
