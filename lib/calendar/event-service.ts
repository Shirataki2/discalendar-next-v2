/**
 * EventService - イベントデータ取得サービス
 *
 * タスク2.2: EventServiceの実装
 * - ギルドIDと日付範囲に基づくイベント取得クエリ
 * - Result型による成功/失敗の返却
 * - エラーコードの分類 (FETCH_FAILED, NETWORK_ERROR, UNAUTHORIZED)
 * - AbortController対応
 *
 * Requirements: 5.1, 5.3, 5.4
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { type CalendarEvent, type EventRecord, toCalendarEvents } from "./types";

/**
 * カレンダーエラーコードの定義
 * 各エラーコードはイベント取得時に発生する特定のエラー状況を表す
 */
export const CALENDAR_ERROR_CODES = [
  "FETCH_FAILED",
  "NETWORK_ERROR",
  "UNAUTHORIZED",
] as const;

/**
 * カレンダーエラーコードの型
 */
export type CalendarErrorCode = (typeof CALENDAR_ERROR_CODES)[number];

/**
 * カレンダーエラーオブジェクトの型定義
 */
export interface CalendarError {
  /** エラーコード */
  code: CalendarErrorCode;
  /** ユーザーに表示するメッセージ */
  message: string;
  /** デバッグ用の詳細情報（オプション） */
  details?: string;
}

/**
 * エラーコードからユーザーフレンドリーなメッセージへのマッピング
 */
export const CALENDAR_ERROR_MESSAGES: Record<CalendarErrorCode, string> = {
  FETCH_FAILED: "イベントの取得に失敗しました。",
  NETWORK_ERROR: "ネットワークエラーが発生しました。接続を確認してください。",
  UNAUTHORIZED: "このギルドのイベントを表示する権限がありません。",
};

/**
 * エラーコードからユーザーフレンドリーなメッセージを取得する
 *
 * @param code - カレンダーエラーコード
 * @returns ユーザーに表示するメッセージ
 */
export function getCalendarErrorMessage(code: CalendarErrorCode): string {
  return CALENDAR_ERROR_MESSAGES[code];
}

/**
 * イベント取得パラメータ
 */
export interface FetchEventsParams {
  /** ギルドID */
  guildId: string;
  /** 取得開始日 */
  startDate: Date;
  /** 取得終了日 */
  endDate: Date;
  /** リクエストキャンセル用のAbortSignal */
  signal?: AbortSignal;
}

/**
 * イベント取得結果 (Result型)
 * 成功時はイベント配列、失敗時はエラー情報を返す
 */
export type FetchEventsResult =
  | { success: true; data: CalendarEvent[] }
  | { success: false; error: CalendarError };

/**
 * EventServiceインターフェース
 */
export interface EventServiceInterface {
  /**
   * 指定ギルドのイベントを取得
   * @param params - 取得パラメータ
   * @returns イベント一覧または エラー
   */
  fetchEvents(params: FetchEventsParams): Promise<FetchEventsResult>;
}

/**
 * Supabaseエラーをカレンダーエラーコードに分類する
 *
 * @param error - Supabaseから返されたエラー
 * @returns 適切なカレンダーエラーコード
 */
function classifySupabaseError(error: { message: string; code?: string }): CalendarErrorCode {
  // PostgreSQL permission denied error
  if (error.code === "42501" || error.message.toLowerCase().includes("permission denied")) {
    return "UNAUTHORIZED";
  }

  // Default to FETCH_FAILED for database errors
  return "FETCH_FAILED";
}

/**
 * 例外をカレンダーエラーコードに分類する
 *
 * @param error - 発生した例外
 * @returns 適切なカレンダーエラーコード
 */
function classifyException(error: unknown): CalendarErrorCode {
  // AbortError or network-related errors
  if (error instanceof DOMException && error.name === "AbortError") {
    return "NETWORK_ERROR";
  }

  if (error instanceof TypeError && error.message.includes("fetch")) {
    return "NETWORK_ERROR";
  }

  // Default to FETCH_FAILED
  return "FETCH_FAILED";
}

/**
 * EventServiceのファクトリ関数
 *
 * @param supabase - Supabaseクライアントインスタンス
 * @returns EventServiceインスタンス
 */
export function createEventService(
  supabase: SupabaseClient
): EventServiceInterface {
  return {
    async fetchEvents(params: FetchEventsParams): Promise<FetchEventsResult> {
      const { guildId, startDate, endDate, signal } = params;

      try {
        // Supabaseクエリを構築
        let query = supabase
          .from("events")
          .select("*")
          .eq("guild_id", guildId)
          .gte("start_at", startDate.toISOString())
          .lte("start_at", endDate.toISOString());

        // AbortSignalが提供されている場合は設定
        if (signal) {
          query = query.abortSignal(signal);
        }

        const { data, error } = await query;

        // Supabaseエラーの処理
        if (error) {
          const errorCode = classifySupabaseError(error);
          return {
            success: false,
            error: {
              code: errorCode,
              message: getCalendarErrorMessage(errorCode),
              details: error.message,
            },
          };
        }

        // EventRecordからCalendarEventへ変換
        const events = toCalendarEvents(data as EventRecord[]);

        return {
          success: true,
          data: events,
        };
      } catch (error) {
        // 例外の処理 (ネットワークエラー、AbortErrorなど)
        const errorCode = classifyException(error);
        const errorMessage = error instanceof Error ? error.message : "Unknown error";

        return {
          success: false,
          error: {
            code: errorCode,
            message: getCalendarErrorMessage(errorCode),
            details: errorMessage,
          },
        };
      }
    },
  };
}
