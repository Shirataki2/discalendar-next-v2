/**
 * CrossGuildEventService - 全参加ギルド横断イベント取得サービス
 *
 * ユーザーが参加している全ギルドから直近の予定を一括取得し、
 * 時系列順にソートして返す。Server Component 内で使用する。
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { expandOccurrences } from "@discalendar/rrule-utils";
import type { EventRecord, EventSeriesRecord } from "./types";
import {
  type GuildInfo,
  type UpcomingEvent,
  UPCOMING_EVENTS_DAYS,
  UPCOMING_EVENTS_LIMIT,
  toUpcomingEventFromOccurrence,
  toUpcomingEventFromRecord,
} from "./cross-guild-event-types";
import { classifySupabaseError, getCalendarErrorMessage } from "./event-service";

/** 横断イベント取得パラメータ */
interface FetchUpcomingEventsParams {
  guilds: ReadonlyArray<GuildInfo>;
  days?: number;
  limit?: number;
  /** リクエストキャンセル用のAbortSignal */
  signal?: AbortSignal;
}

/** 横断イベント取得結果 */
type FetchUpcomingEventsResult =
  | { success: true; data: UpcomingEvent[]; hasMore: boolean }
  | {
      success: false;
      error: { code: "FETCH_FAILED" | "UNAUTHORIZED"; message: string };
    };

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * 全参加ギルドの直近予定を一括取得する
 */
export async function fetchUpcomingEvents(
  supabase: SupabaseClient,
  params: FetchUpcomingEventsParams,
): Promise<FetchUpcomingEventsResult> {
  const { guilds, days = UPCOMING_EVENTS_DAYS, limit = UPCOMING_EVENTS_LIMIT, signal } =
    params;

  // ギルドが空の場合は即座に空配列を返す
  if (guilds.length === 0) {
    return { success: true, data: [], hasMore: false };
  }

  const guildIds = guilds.map((g) => g.guildId);
  const guildMap = new Map<string, GuildInfo>();
  for (const g of guilds) {
    guildMap.set(g.guildId, g);
  }

  const now = new Date();
  const rangeEnd = new Date(now.getTime() + days * MS_PER_DAY);

  // Step 1: 単発イベントを一括取得（series_id IS NULL）
  let singleEventsQuery = supabase
    .from("events")
    .select("*")
    .in("guild_id", guildIds)
    .gte("start_at", now.toISOString())
    .lte("start_at", rangeEnd.toISOString())
    .is("series_id", null);
  if (signal) {
    singleEventsQuery = singleEventsQuery.abortSignal(signal);
  }
  const { data: singleEventsData, error: singleEventsError } = await singleEventsQuery;

  if (singleEventsError) {
    const code = classifySupabaseError(singleEventsError, "fetch");
    return {
      success: false,
      error: {
        code: code === "UNAUTHORIZED" ? "UNAUTHORIZED" : "FETCH_FAILED",
        message: getCalendarErrorMessage(code),
      },
    };
  }

  // Step 2: イベントシリーズを一括取得
  let seriesQuery = supabase
    .from("event_series")
    .select("*")
    .in("guild_id", guildIds);
  if (signal) {
    seriesQuery = seriesQuery.abortSignal(signal);
  }
  const { data: seriesData, error: seriesError } = await seriesQuery;

  if (seriesError) {
    const code = classifySupabaseError(seriesError, "fetch");
    return {
      success: false,
      error: {
        code: code === "UNAUTHORIZED" ? "UNAUTHORIZED" : "FETCH_FAILED",
        message: getCalendarErrorMessage(code),
      },
    };
  }

  // Step 3: 例外レコードを一括取得（series_id IS NOT NULL）
  let exceptionQuery = supabase
    .from("events")
    .select("*")
    .in("guild_id", guildIds)
    .not("series_id", "is", null)
    .or(
      `and(original_date.gte.${now.toISOString()},original_date.lte.${rangeEnd.toISOString()}),and(start_at.gte.${now.toISOString()},start_at.lte.${rangeEnd.toISOString()})`,
    );
  if (signal) {
    exceptionQuery = exceptionQuery.abortSignal(signal);
  }
  const { data: exceptionData, error: exceptionError } = await exceptionQuery;

  if (exceptionError) {
    const code = classifySupabaseError(exceptionError, "fetch");
    return {
      success: false,
      error: {
        code: code === "UNAUTHORIZED" ? "UNAUTHORIZED" : "FETCH_FAILED",
        message: getCalendarErrorMessage(code),
      },
    };
  }

  const singleRecords: EventRecord[] = singleEventsData ?? [];
  const series: EventSeriesRecord[] = seriesData ?? [];
  const exceptions: EventRecord[] = exceptionData ?? [];

  // Step 4: 例外レコードをマップ化
  const exceptionMap = new Map<string, EventRecord>();
  for (const exc of exceptions) {
    if (exc.series_id && exc.original_date) {
      const key = `${exc.series_id}:${new Date(exc.original_date).toISOString()}`;
      exceptionMap.set(key, exc);
    }
  }

  // Step 5: 単発イベントを UpcomingEvent に変換
  const upcomingEvents: UpcomingEvent[] = [];
  for (const record of singleRecords) {
    const guild = guildMap.get(record.guild_id);
    if (guild) {
      upcomingEvents.push(toUpcomingEventFromRecord(record, guild));
    }
  }

  // Step 6: 各シリーズのオカレンスを展開
  for (const s of series) {
    const guild = guildMap.get(s.guild_id);
    if (!guild) continue;

    const dtstart = new Date(s.dtstart);
    const exdates = s.exdates.map((d) => new Date(d));

    const { dates } = expandOccurrences(s.rrule, dtstart, now, rangeEnd, exdates);

    for (const occDate of dates) {
      const exceptionKey = `${s.id}:${occDate.toISOString()}`;
      const exception = exceptionMap.get(exceptionKey);

      if (exception) {
        // 例外レコードで差し替え（ギルド情報を付加）
        upcomingEvents.push(
          toUpcomingEventFromException(exception, guild),
        );
        exceptionMap.delete(exceptionKey);
      } else {
        // 通常のオカレンス
        upcomingEvents.push(toUpcomingEventFromOccurrence(s, occDate, guild));
      }
    }
  }

  // Step 6.5: 残余例外を追加（元のオカレンスが範囲外だが移動後が範囲内）
  for (const [, exc] of exceptionMap) {
    const excStart = new Date(exc.start_at);
    if (excStart >= now && excStart <= rangeEnd && exc.series_id) {
      const guild = guildMap.get(exc.guild_id);
      if (guild) {
        upcomingEvents.push(toUpcomingEventFromException(exc, guild));
      }
    }
  }

  // Step 7: 開始日時昇順でソート
  upcomingEvents.sort(
    (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime(),
  );

  // Step 8: 件数制限
  const hasMore = upcomingEvents.length > limit;
  const trimmed = hasMore ? upcomingEvents.slice(0, limit) : upcomingEvents;

  return { success: true, data: trimmed, hasMore };
}

/**
 * 例外レコード（series_id付きevents）を UpcomingEvent に変換する
 */
function toUpcomingEventFromException(
  record: EventRecord,
  guild: GuildInfo,
): UpcomingEvent {
  return {
    ...toUpcomingEventFromRecord(record, guild),
    isRecurring: true,
  };
}
