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

import { useCallback, useMemo } from "react";
import {
  Calendar,
  type Event as RBCEvent,
  type SlotInfo,
  type View,
} from "react-big-calendar";
import "react-big-calendar/lib/css/react-big-calendar.css";
import type { ViewMode } from "@/hooks/calendar/use-calendar-state";
import {
  calendarFormats,
  calendarLocalizer,
  calendarMessages,
} from "@/lib/calendar/localizer";
import type { CalendarEvent } from "@/lib/calendar/types";
import { EventBlockWrapper } from "./event-block";

/**
 * react-big-calendarのカスタムコンポーネント設定
 * Task 6.1, 6.2: EventBlockカスタムレンダラーを使用
 */
const calendarComponents = {
  event: EventBlockWrapper,
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
}: CalendarGridProps) {
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
   */
  const handleSelectSlot = useCallback(
    (slotInfo: SlotInfo) => {
      // スロット情報から開始日を取得
      onDateChange(slotInfo.start);
    },
    [onDateChange]
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

  return (
    <section
      aria-label="calendar"
      className="h-full"
      data-testid="calendar-grid"
    >
      <Calendar
        components={calendarComponents}
        date={selectedDate}
        dayPropGetter={dayPropGetter}
        eventPropGetter={eventStyleGetter}
        events={events}
        formats={calendarFormats}
        localizer={calendarLocalizer}
        messages={calendarMessages}
        onNavigate={handleNavigate}
        onSelectEvent={handleSelectEvent}
        onSelectSlot={handleSelectSlot}
        onView={() => {
          // ビュー変更は親コンポーネントで管理
        }}
        popup
        selectable
        style={{ height: "100%" }}
        view={rbcView}
      />
    </section>
  );
}
