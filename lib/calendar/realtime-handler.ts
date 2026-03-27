/**
 * Realtime差分更新ハンドラー
 *
 * 単発イベント（series_id が null）のRealtime変更ペイロードを
 * CalendarEvent配列の差分に変換する純粋関数群。
 *
 * Requirements: 3.1, 3.2, 3.3, 4.2
 */

import type {
  CalendarEvent,
  EventRecord,
  EventSeriesRecord,
} from "./types";
import { toCalendarEvent } from "./types";

// ─── Realtime ペイロード型定義 ───────────────────────────

/** Supabase Realtime Postgres Changes ペイロードの判別共用体 */
export type RealtimePostgresChangesPayload<
  T extends Record<string, unknown>,
> =
  | { eventType: "INSERT"; new: T; old: Record<string, never> }
  | { eventType: "UPDATE"; new: T; old: Partial<T> }
  | { eventType: "DELETE"; new: Record<string, never>; old: { id: string } };

/** events テーブルの Realtime ペイロード */
export type EventRealtimePayload =
  RealtimePostgresChangesPayload<EventRecord>;

/** event_series テーブルの Realtime ペイロード */
export type SeriesRealtimePayload =
  RealtimePostgresChangesPayload<EventSeriesRecord>;

// ─── 差分更新ハンドラー ─────────────────────────────────

/**
 * INSERT: 新規イベントを追加した配列を返す。
 * 重複ID（楽観的更新で既に存在）の場合はUPDATEとして処理する。
 */
export function handleRealtimeInsert(
  currentEvents: CalendarEvent[],
  newRecord: EventRecord,
): CalendarEvent[] {
  const converted = toCalendarEvent(newRecord);
  const existingIndex = currentEvents.findIndex((e) => e.id === newRecord.id);

  if (existingIndex !== -1) {
    return currentEvents.map((e) => (e.id === newRecord.id ? converted : e));
  }

  return [...currentEvents, converted];
}

/**
 * UPDATE: 該当IDのイベントを新データで置換した配列を返す。
 * 該当IDが存在しない場合は配列をそのままコピーして返す。
 */
export function handleRealtimeUpdate(
  currentEvents: CalendarEvent[],
  updatedRecord: EventRecord,
): CalendarEvent[] {
  const converted = toCalendarEvent(updatedRecord);
  return currentEvents.map((e) =>
    e.id === updatedRecord.id ? converted : e,
  );
}

/**
 * DELETE: 該当IDのイベントを配列から除外した配列を返す。
 */
export function handleRealtimeDelete(
  currentEvents: CalendarEvent[],
  oldRecord: { id: string },
): CalendarEvent[] {
  return currentEvents.filter((e) => e.id !== oldRecord.id);
}
