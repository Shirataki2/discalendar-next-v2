"use client";

import { useMemo } from "react";
import {
  getHolidaysInRange,
  toHolidayEvents,
} from "@/lib/calendar/holiday-service";
import type { CalendarEvent } from "@/lib/calendar/types";
import type { ViewMode } from "./use-calendar-state";

/**
 * useHolidays フックの戻り値
 */
export interface UseHolidaysReturn {
  /** CalendarEvent 形式の祝日データ（events 配列にマージして使用） */
  holidayEvents: CalendarEvent[];
  /** 日付文字列(YYYY-MM-DD) → 祝日名の Map（dayPropGetter でのルックアップ用） */
  holidayMap: Map<string, string>;
}

const EMPTY_EVENTS: CalendarEvent[] = [];
const EMPTY_MAP = new Map<string, string>();

/**
 * 日付をYYYY-MM-DD形式の文字列に変換する
 */
function formatDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * ビューモードと選択日付から祝日取得用の期間を計算する
 * 月ビューの場合、カレンダーグリッドに表示される前後の日付も含めた拡張期間を返す
 */
function getHolidayDateRange(
  viewMode: ViewMode,
  selectedDate: Date,
): { start: Date; end: Date } {
  const year = selectedDate.getFullYear();
  const month = selectedDate.getMonth();
  const date = selectedDate.getDate();

  switch (viewMode) {
    case "day":
      return {
        start: new Date(year, month, date, 0, 0, 0, 0),
        end: new Date(year, month, date, 23, 59, 59, 999),
      };
    case "week": {
      const day = selectedDate.getDay();
      const start = new Date(year, month, date - day, 0, 0, 0, 0);
      const end = new Date(year, month, date + (6 - day), 23, 59, 59, 999);
      return { start, end };
    }
    case "month": {
      // 月ビュー: カレンダーグリッドに表示される前後の週も含む
      const monthStart = new Date(year, month, 1);
      const monthEnd = new Date(year, month + 1, 0);
      // 月の最初の日が何曜日か（日曜=0）
      const startDay = monthStart.getDay();
      // 月の最後の日が何曜日か
      const endDay = monthEnd.getDay();
      // カレンダー表示の開始日（月初の週の日曜日）
      const start = new Date(year, month, 1 - startDay, 0, 0, 0, 0);
      // カレンダー表示の終了日（月末の週の土曜日）
      const end = new Date(
        year,
        month,
        monthEnd.getDate() + (6 - endDay),
        23,
        59,
        59,
        999,
      );
      return { start, end };
    }
    default:
      return {
        start: new Date(year, month, 1),
        end: new Date(year, month + 1, 0),
      };
  }
}

/**
 * 表示期間に基づいて祝日データを取得し、CalendarEvent 形式に変換するフック
 *
 * @param viewMode - 現在のビューモード
 * @param selectedDate - 選択中の日付
 * @param showHolidays - 祝日表示ON/OFF
 * @returns holidayEvents（CalendarEvent形式）と holidayMap（日付→祝日名のMap）
 *
 * Requirements: 1.1, 2.1, 3.1, 3.2
 */
export function useHolidays(
  viewMode: ViewMode,
  selectedDate: Date,
  showHolidays: boolean,
): UseHolidaysReturn {
  return useMemo(() => {
    if (!showHolidays) {
      return { holidayEvents: EMPTY_EVENTS, holidayMap: EMPTY_MAP };
    }

    const { start, end } = getHolidayDateRange(viewMode, selectedDate);
    const holidays = getHolidaysInRange(start, end);
    const holidayEvents = toHolidayEvents(holidays);

    const holidayMap = new Map<string, string>();
    for (const h of holidays) {
      holidayMap.set(formatDateKey(h.date), h.name);
    }

    return { holidayEvents, holidayMap };
  }, [viewMode, selectedDate.getTime(), showHolidays]);
}
