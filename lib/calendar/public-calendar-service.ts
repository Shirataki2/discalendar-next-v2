/**
 * PublicCalendarService - 公開カレンダーのデータ取得・スラッグ管理サービス
 *
 * 公開カレンダーの閲覧（匿名アクセス対応）と管理操作を担当する。
 * 読み取り専用の操作（getPublicGuildBySlug, fetchPublicEvents）は
 * anon ロールで動作し、管理操作は認証済みクライアントが必要。
 *
 * Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 3.3, 3.4
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { EventRecord, EventSeriesRecord } from "./types";
import { toCalendarEvents } from "./types";
import { expandOccurrences } from "@discalendar/rrule-utils";

/** 公開ギルド情報（公開ページ用） */
export interface PublicGuildInfo {
  guildId: string;
  name: string;
  avatarUrl: string | null;
  publicSlug: string;
}

/** 公開カレンダーのイベント情報（公開ページ用、チャンネル情報を除外） */
export interface PublicCalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  allDay: boolean;
  color: string;
  description: string | undefined;
  location: string | undefined;
}

/** 公開カレンダーサービスのエラーコード */
export type PublicCalendarErrorCode =
  | "GUILD_NOT_FOUND"
  | "GUILD_NOT_PUBLIC"
  | "FETCH_FAILED"
  | "SLUG_GENERATION_FAILED"
  | "PERMISSION_DENIED";

/** 公開カレンダーサービスのエラー型 */
export interface PublicCalendarError {
  code: PublicCalendarErrorCode;
  message: string;
}

/** Result 型 */
export type PublicCalendarResult<T> =
  | { success: true; data: T }
  | { success: false; error: PublicCalendarError };

export interface PublicCalendarServiceInterface {
  getPublicGuildBySlug(
    slug: string,
  ): Promise<PublicCalendarResult<PublicGuildInfo>>;

  fetchPublicEvents(
    guildId: string,
    startDate: Date,
    endDate: Date,
    signal?: AbortSignal,
  ): Promise<PublicCalendarResult<PublicCalendarEvent[]>>;

  enablePublicCalendar(
    guildId: string,
  ): Promise<PublicCalendarResult<{ slug: string }>>;

  disablePublicCalendar(
    guildId: string,
  ): Promise<PublicCalendarResult<{ slug: string | null }>>;

  regeneratePublicSlug(
    guildId: string,
  ): Promise<PublicCalendarResult<{ slug: string }>>;

  getPublicSettings(
    guildId: string,
  ): Promise<PublicCalendarResult<{ isPublic: boolean; publicSlug: string | null }>>;
}

/** anon ロールで取得可能な events カラム（channel_id, channel_name, notifications を除外） */
const PUBLIC_EVENT_COLUMNS =
  "id, guild_id, name, description, color, is_all_day, start_at, end_at, location, series_id, original_date, created_at, updated_at" as const;

/** anon ロールで取得可能な event_series カラム（channel_id, channel_name, notifications を除外） */
const PUBLIC_SERIES_COLUMNS =
  "id, guild_id, name, description, color, is_all_day, rrule, dtstart, duration_minutes, exdates, location, created_at, updated_at" as const;

/** スラッグ生成のリトライ上限 */
const MAX_SLUG_RETRIES = 3;

/** スラッグの長さ（hex 文字数） */
const SLUG_LENGTH = 12;

/** crypto.randomUUID から12文字の hex スラッグを生成する */
function generateSlug(): string {
  const uuid = crypto.randomUUID();
  return uuid.replace(/-/g, "").slice(0, SLUG_LENGTH);
}

/**
 * PublicCalendarService のファクトリ関数
 *
 * @param supabase - Supabase クライアント（anon / 認証済み共用）
 * @returns PublicCalendarServiceInterface
 */
export function createPublicCalendarService(
  supabase: SupabaseClient,
): PublicCalendarServiceInterface {
  return {
    async getPublicGuildBySlug(slug) {
      const { data, error } = await supabase
        .from("guilds")
        .select("guild_id, name, avatar_url, public_slug")
        .eq("public_slug", slug)
        .eq("is_public", true)
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          return {
            success: false,
            error: { code: "GUILD_NOT_FOUND", message: "指定されたギルドが見つかりません。" },
          };
        }
        return {
          success: false,
          error: { code: "FETCH_FAILED", message: "ギルド情報の取得に失敗しました。" },
        };
      }

      return {
        success: true,
        data: {
          guildId: data.guild_id,
          name: data.name,
          avatarUrl: data.avatar_url,
          publicSlug: data.public_slug,
        },
      };
    },

    async fetchPublicEvents(guildId, startDate, endDate, signal) {
      try {
        // Step 0: ギルドが公開状態であることを確認（多層防御）
        let guildQuery = supabase
          .from("guilds")
          .select("is_public")
          .eq("guild_id", guildId);
        if (signal) guildQuery = guildQuery.abortSignal(signal);
        const { data: guildData, error: guildError } = await guildQuery.single();

        if (guildError || !guildData?.is_public) {
          return {
            success: false,
            error: { code: "GUILD_NOT_PUBLIC" as const, message: "このギルドのカレンダーは公開されていません。" },
          };
        }

        // Step 1: 単発イベントを取得（series_id IS NULL）
        let singleEventsQuery = supabase
          .from("events")
          .select(PUBLIC_EVENT_COLUMNS)
          .eq("guild_id", guildId)
          .lte("start_at", endDate.toISOString())
          .gte("end_at", startDate.toISOString())
          .is("series_id", null);
        if (signal) singleEventsQuery = singleEventsQuery.abortSignal(signal);
        const { data: singleEventsData, error: singleEventsError } = await singleEventsQuery;

        if (singleEventsError) {
          return {
            success: false,
            error: { code: "FETCH_FAILED", message: "イベントの取得に失敗しました。" },
          };
        }

        // Step 2: イベントシリーズを取得
        let seriesQuery = supabase
          .from("event_series")
          .select(PUBLIC_SERIES_COLUMNS)
          .eq("guild_id", guildId);
        if (signal) seriesQuery = seriesQuery.abortSignal(signal);
        const { data: seriesData, error: seriesError } = await seriesQuery;

        if (seriesError) {
          return {
            success: false,
            error: { code: "FETCH_FAILED", message: "イベントシリーズの取得に失敗しました。" },
          };
        }

        // Step 3: 例外レコードを取得（series_id IS NOT NULL）
        let exceptionQuery = supabase
          .from("events")
          .select(PUBLIC_EVENT_COLUMNS)
          .eq("guild_id", guildId)
          .not("series_id", "is", null)
          .or(
            `and(original_date.gte.${startDate.toISOString()},original_date.lte.${endDate.toISOString()}),and(start_at.lte.${endDate.toISOString()},end_at.gte.${startDate.toISOString()})`,
          );
        if (signal) exceptionQuery = exceptionQuery.abortSignal(signal);
        const { data: exceptionData, error: exceptionError } = await exceptionQuery;

        if (exceptionError) {
          return {
            success: false,
            error: { code: "FETCH_FAILED", message: "例外イベントの取得に失敗しました。" },
          };
        }

        const singleEvents = toCalendarEvents((singleEventsData ?? []) as EventRecord[]);
        const series = (seriesData ?? []) as EventSeriesRecord[];
        const exceptions = (exceptionData ?? []) as EventRecord[];

        // Step 4: 例外をマップ化
        const exceptionMap = new Map<string, EventRecord>();
        for (const exc of exceptions) {
          if (exc.series_id && exc.original_date) {
            const key = `${exc.series_id}:${new Date(exc.original_date).toISOString()}`;
            exceptionMap.set(key, exc);
          }
        }

        // Step 5: シリーズのオカレンス展開
        const recurringEvents: PublicCalendarEvent[] = [];
        for (const s of series) {
          const dtstart = new Date(s.dtstart);
          const exdates = s.exdates.map((d) => new Date(d));

          const { dates } = expandOccurrences(
            s.rrule,
            dtstart,
            startDate,
            endDate,
            exdates,
          );

          for (const occDate of dates) {
            const occEnd = new Date(occDate.getTime() + s.duration_minutes * 60 * 1000);
            const exceptionKey = `${s.id}:${occDate.toISOString()}`;
            const exception = exceptionMap.get(exceptionKey);

            if (exception) {
              recurringEvents.push({
                id: exception.id,
                title: exception.name,
                start: new Date(exception.start_at),
                end: new Date(exception.end_at),
                allDay: exception.is_all_day,
                color: exception.color,
                description: exception.description ?? undefined,
                location: exception.location ?? undefined,
              });
              exceptionMap.delete(exceptionKey);
            } else {
              recurringEvents.push({
                id: `${s.id}:${occDate.toISOString()}`,
                title: s.name,
                start: occDate,
                end: occEnd,
                allDay: s.is_all_day,
                color: s.color,
                description: s.description ?? undefined,
                location: s.location ?? undefined,
              });
            }
          }
        }

        // Step 5.5: 残余例外（元のオカレンスが範囲外だが移動後が範囲内）
        for (const [, exc] of exceptionMap) {
          const excStartAt = new Date(exc.start_at);
          if (excStartAt >= startDate && excStartAt <= endDate) {
            recurringEvents.push({
              id: exc.id,
              title: exc.name,
              start: excStartAt,
              end: new Date(exc.end_at),
              allDay: exc.is_all_day,
              color: exc.color,
              description: exc.description ?? undefined,
              location: exc.location ?? undefined,
            });
          }
        }

        // Step 6: 統合（チャンネル情報を除外して PublicCalendarEvent に変換）
        const publicSingleEvents: PublicCalendarEvent[] = singleEvents.map((e) => ({
          id: e.id,
          title: e.title,
          start: e.start,
          end: e.end,
          allDay: e.allDay,
          color: e.color,
          description: e.description,
          location: e.location,
        }));

        return {
          success: true,
          data: [...publicSingleEvents, ...recurringEvents],
        };
      } catch {
        return {
          success: false,
          error: { code: "FETCH_FAILED", message: "イベントの取得に失敗しました。" },
        };
      }
    },

    async enablePublicCalendar(guildId) {
      // 既存スラッグを確認（再有効化時はスラッグを保持）
      const { data: existing } = await supabase
        .from("guilds")
        .select("public_slug")
        .eq("guild_id", guildId)
        .single();

      if (existing?.public_slug) {
        // 既存スラッグがあれば is_public のみ更新
        const { data, error } = await supabase
          .from("guilds")
          .update({ is_public: true })
          .eq("guild_id", guildId)
          .select("guild_id, is_public, public_slug")
          .single();

        if (error) {
          return {
            success: false,
            error: { code: "FETCH_FAILED" as const, message: "公開カレンダーの有効化に失敗しました。" },
          };
        }

        return {
          success: true,
          data: { slug: data.public_slug },
        };
      }

      // 既存スラッグがなければ新規生成
      for (let attempt = 0; attempt < MAX_SLUG_RETRIES; attempt++) {
        const slug = generateSlug();

        const { data, error } = await supabase
          .from("guilds")
          .update({ is_public: true, public_slug: slug })
          .eq("guild_id", guildId)
          .select("guild_id, is_public, public_slug")
          .single();

        if (error) {
          // UNIQUE 制約違反の場合はリトライ
          if (error.code === "23505") {
            continue;
          }
          return {
            success: false,
            error: { code: "FETCH_FAILED" as const, message: "公開カレンダーの有効化に失敗しました。" },
          };
        }

        return {
          success: true,
          data: { slug: data.public_slug },
        };
      }

      return {
        success: false,
        error: {
          code: "SLUG_GENERATION_FAILED",
          message: "スラッグの生成に失敗しました。再度お試しください。",
        },
      };
    },

    async disablePublicCalendar(guildId) {
      const { data, error } = await supabase
        .from("guilds")
        .update({ is_public: false })
        .eq("guild_id", guildId)
        .select("public_slug")
        .single();

      if (error) {
        return {
          success: false,
          error: { code: "FETCH_FAILED", message: "公開カレンダーの無効化に失敗しました。" },
        };
      }

      return { success: true, data: { slug: data.public_slug } };
    },

    async regeneratePublicSlug(guildId) {
      for (let attempt = 0; attempt < MAX_SLUG_RETRIES; attempt++) {
        const slug = generateSlug();

        const { data, error } = await supabase
          .from("guilds")
          .update({ public_slug: slug })
          .eq("guild_id", guildId)
          .select("guild_id, is_public, public_slug")
          .single();

        if (error) {
          if (error.code === "23505") {
            continue;
          }
          return {
            success: false,
            error: { code: "FETCH_FAILED" as const, message: "スラッグの再生成に失敗しました。" },
          };
        }

        return {
          success: true,
          data: { slug: data.public_slug },
        };
      }

      return {
        success: false,
        error: {
          code: "SLUG_GENERATION_FAILED",
          message: "スラッグの生成に失敗しました。再度お試しください。",
        },
      };
    },

    async getPublicSettings(guildId) {
      const { data, error } = await supabase
        .from("guilds")
        .select("is_public, public_slug")
        .eq("guild_id", guildId)
        .single();

      if (error) {
        return {
          success: false,
          error: { code: "FETCH_FAILED", message: "公開設定の取得に失敗しました。" },
        };
      }

      return {
        success: true,
        data: {
          isPublic: data.is_public,
          publicSlug: data.public_slug,
        },
      };
    },
  };
}
