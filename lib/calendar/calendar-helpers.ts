/**
 * カレンダーヘルパー関数群
 *
 * CalendarContainerで使用されるユーティリティ関数と定数を集約する。
 */

import { endOfMonth, endOfWeek, startOfMonth, startOfWeek } from "date-fns";
import type { ViewMode } from "@/hooks/calendar/use-calendar-state";
import type { EventFormData } from "@/hooks/calendar/use-event-form";
import type { CalendarEvent } from "@/lib/calendar/types";

/**
 * ダイアログ閉じアニメーション後にステートをクリアするまでの遅延時間（ミリ秒）
 */
export const DIALOG_CLOSE_DELAY_MS = 150;

/**
 * ナビゲーションアクションに基づいて新しい日付を計算する
 */
export function calculateNavigationDate(
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
export function toDate(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value);
}

/**
 * ギルドが未選択かどうかを判定する
 */
export function isGuildEmpty(guildId: string | null): boolean {
  return !guildId || guildId.trim() === "";
}

/**
 * イベントが繰り返しイベントかどうかを判定するタイプガード
 */
export function isRecurringEvent(
  event: CalendarEvent
): event is CalendarEvent & { isRecurring: true; seriesId: string } {
  return event.isRecurring === true;
}

/**
 * CalendarEventからEventFormData（部分）に変換するヘルパー
 */
export function toEventFormData(event: CalendarEvent): Partial<EventFormData> {
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
export function canInteractWithEvents(
  shouldShowEmpty: boolean,
  canEditEvents: boolean
): boolean {
  return !shouldShowEmpty && canEditEvents;
}

/**
 * ビューモードと日付から取得期間を計算
 */
export function getDateRange(
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
