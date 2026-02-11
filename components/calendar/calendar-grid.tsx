/**
 * CalendarGrid - カレンダーグリッド
 *
 * タスク5.1: react-big-calendarのラッパーコンポーネント作成
 * - dateFnsLocalizerを使用してreact-big-calendarを初期化する
 * - ビューモードと選択日付をpropsから受け取り反映する
 * - イベントクリック時のハンドラーを設定する
 * - 日付セル選択時のハンドラーを設定する
 *
 * タスク5.2: イベント配置と表示の設定
 * - イベントを開始日時に基づいてグリッド上に配置する
 * - 日/週ビューでイベントの継続時間に応じた高さを設定する
 * - 月ビューでイベントをコンパクトなバー形式で表示する
 * - 同一時間帯の複数イベントを横並びで表示する
 *
 * タスク5.3: 月ビューの表示制限と追加イベント表示
 * - 月ビューの日付セルあたりの表示イベント数を制限する
 * - 表示しきれないイベントは「+N件」形式で残数を表示する
 * - 表示月外の日付セルを視覚的に区別する
 *
 * タスク5.4: 今日の日付ハイライト機能の実装
 * - dayPropGetterを使用して今日の日付セルをハイライトする
 * - 月ビューで今日の日付番号を強調表示する
 * - 週ビューで今日の列ヘッダーを強調表示する
 * - 日ビューで今日表示時にヘッダーを強調する
 *
 * タスク6.1: EventBlockカスタムレンダラーの作成
 * - react-big-calendarのcomponents.eventでカスタムレンダラーを設定する
 * - イベント名を表示し、長いテキストは省略する
 * - イベントカラーを背景色として適用する
 * - クリックとキーボード操作でのイベント選択に対応する
 *
 * タスク6.2: 終日イベントの視覚的区別
 * - 終日イベントと時間指定イベントを異なるスタイルで表示する
 * - 月ビューで終日イベントを日付セル上部にバー形式で配置する
 * - 週/日ビューで終日イベントを時間軸上部の専用エリアに表示する
 *
 * Requirements: 1.1, 1.2, 1.3, 2.5, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 7.1, 7.2, 7.3, 7.4, 8.4, 9.1, 9.2, 9.3, 9.4, 9.6
 */
"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import {
  Calendar,
  type Event as RBCEvent,
  type SlotInfo,
  type View,
} from "react-big-calendar";
import type { EventInteractionArgs } from "react-big-calendar/lib/addons/dragAndDrop";
import withDragAndDrop from "react-big-calendar/lib/addons/dragAndDrop";
import "react-big-calendar/lib/addons/dragAndDrop/styles.css";
import "react-big-calendar/lib/css/react-big-calendar.css";
import type { ViewMode } from "@/hooks/calendar/use-calendar-state";
import {
  calendarFormats,
  calendarLocalizer,
  calendarMessages,
} from "@/lib/calendar/localizer";
import type { CalendarEvent } from "@/lib/calendar/types";
import { EventBlockWrapper } from "./event-block";

export type { EventInteractionArgs } from "react-big-calendar/lib/addons/dragAndDrop";

/**
 * DnD対応カレンダーコンポーネント
 * withDragAndDrop HOCをモジュールレベルで適用（レンダー中にHOCを呼ばない）
 */
const DnDCalendar = withDragAndDrop<CalendarEvent>(Calendar);

/**
 * react-big-calendarのカスタムコンポーネント設定
 * Task 6.1, 6.2: EventBlockカスタムレンダラーを使用
 * ツールバーは非表示（手動で作成したCalendarToolbarを使用するため）
 */
const calendarComponents = {
  event: EventBlockWrapper,
  toolbar: () => null, // Big Calendarのツールバーを非表示
};

/**
 * スロット選択情報
 * Task 6.3: ドラッグ選択時の期間情報を親に通知
 */
export type SlotSelectInfo = {
  /** 選択開始日時 */
  start: Date;
  /** 選択終了日時 */
  end: Date;
};

export type CalendarGridProps = {
  /** 表示するイベント一覧 */
  events: CalendarEvent[];
  /** 現在のビューモード */
  viewMode: ViewMode;
  /** 選択中の日付 */
  selectedDate: Date;
  /** イベントクリックハンドラー */
  onEventClick: (event: CalendarEvent, element: HTMLElement) => void;
  /** 日付変更ハンドラー */
  onDateChange: (date: Date) => void;
  /** 今日の日付 */
  today: Date;
  /**
   * スロット選択ハンドラー
   * Task 6.3: ドラッグ選択完了時に選択期間を通知
   */
  onSlotSelect?: (slotInfo: SlotSelectInfo) => void;
  /** イベントドロップ（移動）ハンドラー */
  onEventDrop?: (args: EventInteractionArgs<CalendarEvent>) => void;
  /** イベントリサイズハンドラー */
  onEventResize?: (args: EventInteractionArgs<CalendarEvent>) => void;
  /** リサイズ可能かどうか（デフォルト: true） */
  resizable?: boolean;
};

/**
 * ViewModeをreact-big-calendarのView型に変換
 */
function viewModeToRBCView(viewMode: ViewMode): View {
  switch (viewMode) {
    case "day":
      return "day";
    case "week":
      return "week";
    case "month":
      return "month";
    default:
      return "month";
  }
}

/**
 * CalendarGrid コンポーネント
 *
 * react-big-calendarをラップし、カレンダーグリッドを表示する。
 *
 * @param props - コンポーネントのProps
 *
 * @example
 * ```tsx
 * <CalendarGrid
 *   events={events}
 *   viewMode="month"
 *   selectedDate={new Date()}
 *   onEventClick={(event, element) => console.log(event)}
 *   onDateChange={(date) => console.log(date)}
 *   today={new Date()}
 * />
 * ```
 */
/**
 * 2つの日付が同じ日かどうかを判定
 */
function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

/**
 * 2つの日付が同じ月かどうかを判定
 */
function isSameMonth(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth()
  );
}

export function CalendarGrid({
  events,
  viewMode,
  selectedDate,
  onEventClick,
  onDateChange,
  today,
  onSlotSelect,
  onEventDrop,
  onEventResize,
  resizable = true,
}: CalendarGridProps) {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    // 月ビューが画面外にある場合は、スクロールして表示
    const getMonthView = (): HTMLElement | null => {
      if (!sectionRef.current) {
        return null;
      }
      const sectionEl = sectionRef.current;
      const rbcCalendar = sectionEl.querySelector(".rbc-calendar");
      if (!rbcCalendar) {
        return null;
      }
      return rbcCalendar.querySelector(".rbc-month-view") as HTMLElement | null;
    };

    const isFirstCellVisible = (
      monthView: HTMLElement,
      viewportHeight: number
    ): boolean => {
      const firstDateCell = monthView.querySelector(
        ".rbc-date-cell"
      ) as HTMLElement | null;
      if (!firstDateCell) {
        return false;
      }
      const firstCellRect = firstDateCell.getBoundingClientRect();
      return firstCellRect.top >= 0 && firstCellRect.top < viewportHeight;
    };

    const scrollToMonthViewIfNeeded = () => {
      const monthView = getMonthView();
      if (!monthView) {
        return;
      }

      const viewportHeight = window.innerHeight;
      if (!isFirstCellVisible(monthView, viewportHeight)) {
        monthView.scrollIntoView({ behavior: "auto", block: "start" });
      }
    };

    const timeoutId = setTimeout(scrollToMonthViewIfNeeded, 100);

    return () => clearTimeout(timeoutId);
  }, []);

  // ViewModeをreact-big-calendarのView型に変換
  const rbcView = useMemo(() => viewModeToRBCView(viewMode), [viewMode]);

  /**
   * イベントクリックハンドラー
   * react-big-calendarのイベントからCalendarEventに変換して呼び出す
   */
  const handleSelectEvent = useCallback(
    (event: RBCEvent, e: React.SyntheticEvent<HTMLElement>) => {
      // react-big-calendarのイベントをCalendarEventとして扱う
      const calendarEvent = event as CalendarEvent;
      onEventClick(calendarEvent, e.currentTarget as HTMLElement);
    },
    [onEventClick]
  );

  /**
   * 日付セル選択ハンドラー
   * react-big-calendarのスロット情報から日付を抽出して呼び出す
   * Task 6.3: ドラッグ選択時に選択期間を親に通知
   */
  const handleSelectSlot = useCallback(
    (slotInfo: SlotInfo) => {
      // スロット情報から開始日を取得
      onDateChange(slotInfo.start);

      // Task 6.3: 選択期間を親に通知
      if (onSlotSelect) {
        onSlotSelect({
          start: slotInfo.start,
          end: slotInfo.end,
        });
      }
    },
    [onDateChange, onSlotSelect]
  );

  /**
   * ナビゲーションハンドラー
   * カレンダーの日付が変更されたときに呼ばれる
   */
  const handleNavigate = useCallback(
    (date: Date) => {
      onDateChange(date);
    },
    [onDateChange]
  );

  /**
   * イベントのスタイルをカスタマイズ
   * Task 5.2: イベントにカスタムカラーを適用
   */
  const eventStyleGetter = useCallback((event: RBCEvent) => {
    const calendarEvent = event as CalendarEvent;
    return {
      style: {
        backgroundColor: calendarEvent.color,
        borderColor: calendarEvent.color,
        color: "#ffffff",
      },
    };
  }, []);

  /**
   * 日付セルのスタイルをカスタマイズ
   * Task 5.3: 表示月外の日付セルを視覚的に区別する (Req 2.5)
   * Task 5.4: 今日の日付セルをハイライトする (Req 7.1, 7.2, 7.3, 7.4)
   */
  const dayPropGetter = useCallback(
    (date: Date) => {
      const classNames: string[] = [];
      const style: React.CSSProperties = {};

      // Task 5.4: 今日の日付をハイライト
      if (isSameDay(date, today)) {
        classNames.push("rbc-today-highlight");
        style.backgroundColor = "rgba(59, 130, 246, 0.1)"; // 青色の薄い背景
      }

      // Task 5.3: 表示月外の日付セルを視覚的に区別
      if (!isSameMonth(date, selectedDate)) {
        classNames.push("rbc-off-range");
        style.backgroundColor = style.backgroundColor || "rgba(0, 0, 0, 0.02)";
        style.color = "rgba(0, 0, 0, 0.4)";
      }

      return {
        className: classNames.join(" "),
        style,
      };
    },
    [today, selectedDate]
  );

  /**
   * 時間スロットのスタイルをカスタマイズ
   * Task 6.3: ドラッグ選択時のハイライト表示を強化 (Req 1.1, 5.3)
   */
  const slotPropGetter = useCallback(
    () => ({
      className: "rbc-slot-selectable",
      style: {
        cursor: "pointer",
      } as React.CSSProperties,
    }),
    []
  );

  return (
    <section
      aria-label="カレンダー"
      className="flex h-full flex-1 flex-col"
      data-testid="calendar-grid"
      ref={sectionRef}
    >
      <div className="flex h-full flex-1 flex-col">
        <DnDCalendar
          components={calendarComponents}
          date={selectedDate}
          dayPropGetter={dayPropGetter}
          eventPropGetter={eventStyleGetter}
          events={events}
          formats={calendarFormats}
          localizer={calendarLocalizer}
          messages={calendarMessages}
          onEventDrop={onEventDrop}
          onEventResize={onEventResize}
          onNavigate={handleNavigate}
          onSelectEvent={handleSelectEvent}
          onSelectSlot={handleSelectSlot}
          onView={() => {
            // ビュー変更は親コンポーネントで管理
          }}
          popup
          resizable={resizable}
          selectable
          slotPropGetter={slotPropGetter}
          style={{ flex: "1 1 0%", height: "100%", width: "100%" }}
          view={rbcView}
        />
      </div>
    </section>
  );
}
