/**
 * カレンダーURL同期フック
 *
 * タスク3.2: URLパラメータとの状態同期
 * - useSearchParamsを使用してビューモードと日付をURL同期する
 * - 不正なURLパラメータは今日の日付にフォールバックする
 * - ビューモード変更時にURLを更新する
 * - ブラウザの戻る/進む操作に対応する
 *
 * Requirements: 1.5, 2.4
 */
"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import type { ViewMode } from "./use-calendar-state";

/**
 * URL同期フックの戻り値の型
 */
export interface UseCalendarUrlSyncReturn {
  /** 現在のビューモード */
  viewMode: ViewMode;
  /** 選択中の日付 */
  selectedDate: Date;
  /** ビューモードを変更しURLを更新 */
  setViewMode: (mode: ViewMode) => void;
  /** 選択日付を変更しURLを更新 */
  setSelectedDate: (date: Date) => void;
}

/**
 * 有効なビューモードかチェック
 */
function isValidViewMode(value: string | null): value is ViewMode {
  return value === "day" || value === "week" || value === "month";
}

/**
 * 日付文字列（YYYY-MM-DD）が有効かチェック
 */
function isValidDateString(value: string | null): boolean {
  if (!value) return false;

  // YYYY-MM-DD形式の正規表現
  const datePattern = /^\d{4}-\d{2}-\d{2}$/;
  if (!datePattern.test(value)) return false;

  // Dateオブジェクトで有効性チェック
  const date = new Date(value);
  return !Number.isNaN(date.getTime());
}

/**
 * Date → YYYY-MM-DD形式の文字列に変換
 */
function formatDateForUrl(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * YYYY-MM-DD形式の文字列 → Dateオブジェクトに変換
 */
function parseDateFromUrl(dateString: string): Date {
  return new Date(dateString);
}

/**
 * URLパラメータからビューモードと日付を解析
 */
function parseUrlParams(searchParams: URLSearchParams): {
  viewMode: ViewMode;
  date: Date;
} {
  const viewParam = searchParams.get("view");
  const dateParam = searchParams.get("date");

  const viewMode: ViewMode = isValidViewMode(viewParam) ? viewParam : "month";

  const date: Date =
    dateParam && isValidDateString(dateParam)
      ? parseDateFromUrl(dateParam)
      : new Date();

  return { viewMode, date };
}

/**
 * カレンダーURL同期フック
 *
 * URLパラメータからビューモードと日付を読み取り、変更時にURLを更新する。
 * ブラウザの戻る/進む操作にも自動で対応する。
 *
 * @returns ビューモード、日付、および更新関数
 *
 * @example
 * ```tsx
 * function CalendarComponent() {
 *   const { viewMode, selectedDate, setViewMode, setSelectedDate } = useCalendarUrlSync();
 *
 *   return (
 *     <div>
 *       <button onClick={() => setViewMode('week')}>週表示</button>
 *       <Calendar view={viewMode} date={selectedDate} />
 *     </div>
 *   );
 * }
 * ```
 */
export function useCalendarUrlSync(): UseCalendarUrlSyncReturn {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // URLパラメータから初期値を読み取る
  const { viewMode: initialViewMode, date: initialDate } =
    parseUrlParams(searchParams);

  // ローカル状態（URLパラメータの変更を反映するため）
  const [viewMode, setViewModeState] = useState<ViewMode>(initialViewMode);
  const [selectedDate, setSelectedDateState] = useState<Date>(initialDate);

  // URLパラメータが変わったら状態を更新（ブラウザの戻る/進む対応）
  useEffect(() => {
    const { viewMode: newViewMode, date: newDate } =
      parseUrlParams(searchParams);

    // 状態が実際に変わった場合のみ更新（無限ループ防止）
    setViewModeState((current) => {
      return current !== newViewMode ? newViewMode : current;
    });

    setSelectedDateState((current) => {
      // 日付の比較は時間部分を無視してYYYY-MM-DDのみで比較
      const currentDateStr = formatDateForUrl(current);
      const newDateStr = formatDateForUrl(newDate);
      return currentDateStr !== newDateStr ? newDate : current;
    });
  }, [searchParams]);

  /**
   * URLパラメータを更新する
   */
  const updateUrl = useCallback(
    (newViewMode: ViewMode, newDate: Date) => {
      // 既存のURLパラメータを保持
      const params = new URLSearchParams(searchParams.toString());
      params.set("view", newViewMode);
      params.set("date", formatDateForUrl(newDate));

      router.push(`${pathname}?${params.toString()}`);
    },
    [pathname, router, searchParams]
  );

  /**
   * ビューモードを変更しURLを更新
   */
  const setViewMode = useCallback(
    (mode: ViewMode) => {
      setViewModeState(mode);
      updateUrl(mode, selectedDate);
    },
    [selectedDate, updateUrl]
  );

  /**
   * 選択日付を変更しURLを更新
   */
  const setSelectedDate = useCallback(
    (date: Date) => {
      setSelectedDateState(date);
      updateUrl(viewMode, date);
    },
    [viewMode, updateUrl]
  );

  return {
    viewMode,
    selectedDate,
    setViewMode,
    setSelectedDate,
  };
}
