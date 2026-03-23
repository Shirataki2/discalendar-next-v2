/**
 * 横断イベント表示用の型定義と変換ユーティリティ
 *
 * 全参加サーバーの予定を一覧表示するための UpcomingEvent 型と、
 * EventRecord / EventSeriesRecord からの変換関数を提供する。
 */
import type { EventRecord, EventSeriesRecord } from "./types";

/** 一覧に表示する予定の最大件数 */
export const UPCOMING_EVENTS_LIMIT = 20;

/** 取得対象の日数範囲（デフォルト） */
export const UPCOMING_EVENTS_DAYS = 30;

/** ギルド情報（変換時に付加する） */
export interface GuildInfo {
  guildId: string;
  name: string;
  avatarUrl: string | null;
}

/**
 * 直近予定の表示用型（JSON シリアライズ可能）
 *
 * Server Component → Client Component のシリアライゼーション互換性のため、
 * 日時フィールドは ISO 8601 文字列で保持する。
 */
export interface UpcomingEvent {
  /** イベントID（単発: events.id、オカレンス: "{seriesId}:{YYYY-MM-DD}"） */
  id: string;
  /** イベント名 */
  title: string;
  /** 開始日時（ISO 8601 文字列） */
  start: string;
  /** 終了日時（ISO 8601 文字列） */
  end: string;
  /** 終日イベントフラグ */
  allDay: boolean;
  /** イベントカラー（HEX） */
  color: string;
  /** 繰り返しイベントかどうか */
  isRecurring: boolean;
  /** 所属ギルドの Discord ID */
  guildId: string;
  /** 所属ギルド名 */
  guildName: string;
  /** 所属ギルドのアイコンURL */
  guildAvatarUrl: string | null;
}

/**
 * EventRecord（単発イベント）を UpcomingEvent に変換する
 */
export function toUpcomingEventFromRecord(
  record: EventRecord,
  guild: GuildInfo,
): UpcomingEvent {
  return {
    id: record.id,
    title: record.name,
    start: record.start_at,
    end: record.end_at,
    allDay: record.is_all_day,
    color: record.color,
    isRecurring: false,
    guildId: guild.guildId,
    guildName: guild.name,
    guildAvatarUrl: guild.avatarUrl,
  };
}

/**
 * オカレンスの日付から YYYY-MM-DD 形式の文字列を生成する
 */
function formatDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

const MINUTES_TO_MS = 60 * 1000;

/**
 * EventSeriesRecord のオカレンスを UpcomingEvent に変換する
 */
export function toUpcomingEventFromOccurrence(
  series: EventSeriesRecord,
  occurrenceDate: Date,
  guild: GuildInfo,
): UpcomingEvent {
  const endDate = new Date(
    occurrenceDate.getTime() + series.duration_minutes * MINUTES_TO_MS,
  );

  return {
    id: `${series.id}:${formatDateKey(occurrenceDate)}`,
    title: series.name,
    start: occurrenceDate.toISOString(),
    end: endDate.toISOString(),
    allDay: series.is_all_day,
    color: series.color,
    isRecurring: true,
    guildId: guild.guildId,
    guildName: guild.name,
    guildAvatarUrl: guild.avatarUrl,
  };
}
