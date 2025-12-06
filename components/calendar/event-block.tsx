/**
 * EventBlock - イベントブロックコンポーネント
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
 * - 同一日の複数終日イベントを縦に積み重ねて表示する
 *
 * Requirements: 3.7, 8.4, 9.1, 9.2, 9.3, 9.4, 9.6
 */
"use client";

import { format } from "date-fns";
import { useCallback } from "react";
import type { CalendarEvent } from "@/lib/calendar/types";

/**
 * EventBlockコンポーネントのProps
 *
 * react-big-calendarのカスタムイベントレンダラーとして使用する
 */
export type EventBlockProps = {
  /** イベントデータ */
  event: CalendarEvent;
  /** イベントタイトル（react-big-calendarから渡される） */
  title: string;
  /** 時刻を表示するかどうか */
  showTime?: boolean;
  /** クリックハンドラー */
  onClick?: () => void;
};

/**
 * 時刻をフォーマットする
 * @param date - 日付オブジェクト
 * @returns フォーマットされた時刻文字列（例: "14:00"）
 */
function formatTime(date: Date): string {
  return format(date, "HH:mm");
}

/**
 * EventBlock コンポーネント
 *
 * カレンダーグリッド内の個別イベントを表示する。
 * react-big-calendarのカスタムイベントレンダラーとして使用される。
 *
 * @param props - コンポーネントのProps
 *
 * @example
 * ```tsx
 * <EventBlock
 *   event={calendarEvent}
 *   title={calendarEvent.title}
 *   showTime
 *   onClick={() => console.log('clicked')}
 * />
 * ```
 */
export function EventBlock({
  event,
  title,
  showTime = false,
  onClick,
}: EventBlockProps) {
  const isAllDay = event.allDay;

  /**
   * キーボードハンドラー
   * EnterキーまたはSpaceキーでクリックと同じ動作をする
   */
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onClick?.();
      }
    },
    [onClick]
  );

  /**
   * クリックハンドラー
   */
  const handleClick = useCallback(() => {
    onClick?.();
  }, [onClick]);

  // スタイルクラスの構築
  const baseClasses =
    "event-block px-2 py-1 rounded text-sm cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-500";

  const allDayClasses = isAllDay
    ? "event-block-all-day event-block-bar"
    : "event-block-timed";

  const combinedClasses = `${baseClasses} ${allDayClasses}`;

  // 時刻を表示するかどうか（終日イベント以外で showTime が true の場合）
  const shouldShowTime = showTime === true && !isAllDay;

  return (
    <button
      aria-label={title}
      className={combinedClasses}
      data-all-day={isAllDay.toString()}
      data-testid="event-block"
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      style={{
        backgroundColor: event.color,
        borderColor: event.color,
        color: "#ffffff",
      }}
      tabIndex={0}
      type="button"
    >
      {/* 時刻表示 */}
      {shouldShowTime ? (
        <span className="mr-1 font-medium">{formatTime(event.start)}</span>
      ) : null}
      {/* イベント名 */}
      <span className="truncate">{title}</span>
    </button>
  );
}

/**
 * react-big-calendar用のカスタムイベントコンポーネント
 *
 * Calendarコンポーネントのcomponents.eventプロパティに渡すためのラッパー。
 * react-big-calendarが提供するpropsをEventBlockに変換する。
 */
export type RBCEventComponentProps = {
  event: CalendarEvent;
  title?: string;
};

/**
 * react-big-calendar用のカスタムイベントラッパーコンポーネント
 *
 * @example
 * ```tsx
 * <Calendar
 *   components={{
 *     event: EventBlockWrapper,
 *   }}
 * />
 * ```
 */
export function EventBlockWrapper({ event, title }: RBCEventComponentProps) {
  return <EventBlock event={event} title={title ?? event.title} />;
}
