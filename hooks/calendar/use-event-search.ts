"use client";

/**
 * イベント検索フック
 *
 * タスク1.1: イベント検索カスタムフックの作成
 * - タイトルによるケースインセンシティブ部分一致検索
 * - 300msデバウンス（設定可能）
 * - 祝日イベントはフィルタリングから除外（常に表示）
 * - 空文字・空白のみの入力は検索非アクティブとして元のイベントを返す
 */
import { useEffect, useMemo, useState } from "react";
import { isHolidayEvent } from "@/lib/calendar/holiday-service";
import type { CalendarEvent } from "@/lib/calendar/types";

const DEFAULT_DEBOUNCE_MS = 300;

/**
 * イベント検索フックのオプション
 */
export type UseEventSearchOptions = {
  /** 検索対象のイベント一覧 */
  events: CalendarEvent[];
  /** デバウンス時間（ミリ秒、デフォルト: 300） */
  debounceMs?: number;
};

/**
 * イベント検索フックの戻り値
 */
export type UseEventSearchReturn = {
  /** 現在の検索クエリ（入力フィールド用、即座に更新される） */
  searchQuery: string;
  /** 検索クエリを設定する関数 */
  setSearchQuery: (query: string) => void;
  /** フィルタリング済みのイベント一覧（デバウンス後に更新される） */
  filteredEvents: CalendarEvent[];
  /** マッチしたイベント数（検索非アクティブ時はnull） */
  matchCount: number | null;
  /** 検索がアクティブかどうか */
  isSearchActive: boolean;
};

/**
 * イベント検索フック
 *
 * カレンダーイベントをタイトルで検索・フィルタリングする。
 * 入力値は即座に反映され、フィルタリングはデバウンス後に実行される。
 * 祝日イベントは検索対象外で常に表示される。
 *
 * @param options - 検索対象イベントとデバウンス設定
 * @returns 検索状態とフィルタリング結果
 *
 * @example
 * ```tsx
 * const { searchQuery, setSearchQuery, filteredEvents, matchCount, isSearchActive } =
 *   useEventSearch({ events: calendarEvents });
 *
 * return (
 *   <div>
 *     <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
 *     {isSearchActive && <span>{matchCount}件</span>}
 *     <Calendar events={filteredEvents} />
 *   </div>
 * );
 * ```
 */
export function useEventSearch(
  options: UseEventSearchOptions,
): UseEventSearchReturn {
  const { events, debounceMs = DEFAULT_DEBOUNCE_MS } = options;

  // 入力フィールド用の即座に更新されるクエリ
  const [searchQuery, setSearchQueryState] = useState("");
  // デバウンス後のクエリ（フィルタリングに使用）
  const [debouncedQuery, setDebouncedQuery] = useState("");

  // デバウンス処理
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, debounceMs);

    return () => {
      clearTimeout(timer);
    };
  }, [searchQuery, debounceMs]);

  // フィルタリング結果の計算
  const { filteredEvents, matchCount, isSearchActive } = useMemo(() => {
    const active = debouncedQuery.trim().length > 0;
    if (!active) {
      return {
        filteredEvents: events,
        matchCount: null,
        isSearchActive: false,
      };
    }

    const normalizedQuery = debouncedQuery.trim().toLowerCase();
    let count = 0;

    const filtered = events.filter((event) => {
      // 祝日イベントは常に表示（現在のCalendarContainerではstate.eventsに祝日は含まれないが、
      // フックの汎用性のために保持）
      if (isHolidayEvent(event)) {
        return true;
      }

      const matches = event.title.toLowerCase().includes(normalizedQuery);
      if (matches) {
        count++;
      }
      return matches;
    });

    return { filteredEvents: filtered, matchCount: count, isSearchActive: true };
  }, [events, debouncedQuery]);

  return {
    searchQuery,
    setSearchQuery: setSearchQueryState,
    filteredEvents,
    matchCount,
    isSearchActive,
  };
}
