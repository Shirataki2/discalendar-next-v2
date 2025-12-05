/**
 * CalendarContainer - カレンダーコンテナコンポーネント
 *
 * タスク3.3: CalendarContainerコンポーネントの実装
 * - ギルドIDを受け取りEventServiceでイベントを取得する
 * - ギルド選択変更時にイベントデータを再取得する
 * - ギルド未選択時は空のカレンダーグリッドを表示する
 * - 子コンポーネント（Toolbar, Grid）にデータとハンドラーを配布する
 *
 * Requirements: 5.1, 5.2
 */
"use client";

import { endOfMonth, endOfWeek, startOfMonth, startOfWeek } from "date-fns";
import { useCallback, useEffect, useRef, useState } from "react";
import type { ViewMode } from "@/hooks/calendar/use-calendar-state";
import { useCalendarState } from "@/hooks/calendar/use-calendar-state";
import { useCalendarUrlSync } from "@/hooks/calendar/use-calendar-url-sync";
import { createEventService } from "@/lib/calendar/event-service";
import { createClient } from "@/lib/supabase/client";
import { CalendarGrid } from "./calendar-grid";
import { CalendarToolbar } from "./calendar-toolbar";

/**
 * CalendarContainerのProps
 */
export type CalendarContainerProps = {
  /** ギルドID（nullまたは空文字列の場合は未選択） */
  guildId: string | null;
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
export function CalendarContainer({ guildId }: CalendarContainerProps) {
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

  /**
   * イベントデータを取得する
   */
  const fetchEvents = useCallback(async () => {
    // ギルドが選択されていない場合は何もしない
    if (!guildId || guildId.trim() === "") {
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

    // 取得期間を計算
    const { startDate, endDate } = getDateRange(viewMode, selectedDate);

    // イベント取得
    const result = await eventServiceRef.current.fetchEvents({
      guildId,
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
   */
  const handleViewChange = useCallback(
    (mode: ViewMode) => {
      setViewMode(mode);
      actions.setViewMode(mode);
    },
    [setViewMode, actions]
  );

  /**
   * ナビゲーションハンドラー
   */
  const handleNavigate = useCallback(
    (action: "PREV" | "NEXT" | "TODAY") => {
      let newDate: Date;

      switch (action) {
        case "TODAY":
          newDate = new Date();
          break;

        case "PREV":
          if (viewMode === "day") {
            newDate = new Date(selectedDate);
            newDate.setDate(newDate.getDate() - 1);
          } else if (viewMode === "week") {
            newDate = new Date(selectedDate);
            newDate.setDate(newDate.getDate() - 7);
          } else {
            // month
            newDate = new Date(selectedDate);
            newDate.setMonth(newDate.getMonth() - 1);
          }
          break;

        case "NEXT":
          if (viewMode === "day") {
            newDate = new Date(selectedDate);
            newDate.setDate(newDate.getDate() + 1);
          } else if (viewMode === "week") {
            newDate = new Date(selectedDate);
            newDate.setDate(newDate.getDate() + 7);
          } else {
            // month
            newDate = new Date(selectedDate);
            newDate.setMonth(newDate.getMonth() + 1);
          }
          break;

        default:
          newDate = selectedDate;
      }

      setSelectedDate(newDate);
      actions.setSelectedDate(newDate);
    },
    [viewMode, selectedDate, setSelectedDate, actions]
  );

  /**
   * イベントクリックハンドラー（将来の拡張用）
   */
  const handleEventClick = useCallback(
    (event: unknown, element: HTMLElement) => {
      // TODO: Task 7.1 - EventPopoverを表示
      console.log("Event clicked:", event, element);
    },
    []
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

  // ギルド未選択時は空のカレンダーを表示 (Req 5.2)
  const shouldShowEmpty = !guildId || guildId.trim() === "";

  return (
    <div className="flex h-full flex-col">
      {/* ツールバー */}
      <CalendarToolbar
        isMobile={isMobile}
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
        <div className="flex flex-col items-center justify-center gap-4 p-8">
          <div className="text-destructive">{state.error.message}</div>
          <button
            className="rounded-md bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90"
            onClick={fetchEvents}
            type="button"
          >
            再試行
          </button>
        </div>
      )}

      {/* カレンダーグリッド */}
      {state.isLoading || state.error ? null : (
        <div className="flex-1">
          <CalendarGrid
            events={shouldShowEmpty ? [] : state.events}
            onDateChange={handleDateChange}
            onEventClick={handleEventClick}
            selectedDate={selectedDate}
            today={new Date()}
            viewMode={viewMode}
          />
        </div>
      )}
    </div>
  );
}
