/**
 * EventService - イベントデータ取得・作成サービス
 *
 * タスク2.2: EventServiceの実装
 * - ギルドIDと日付範囲に基づくイベント取得クエリ
 * - Result型による成功/失敗の返却
 * - エラーコードの分類 (FETCH_FAILED, NETWORK_ERROR, UNAUTHORIZED)
 * - AbortController対応
 *
 * タスク2.1: EventServiceにイベント作成機能を追加
 * - 予定の新規作成ロジックをSupabaseへのINSERT操作として実装
 * - 必須フィールドとオプションフィールドを処理
 * - Result型パターンに従ったエラーハンドリング
 *
 * Requirements: 1.4, 5.1, 5.3, 5.4
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  type CalendarEvent,
  type EventRecord,
  toCalendarEvent,
  toCalendarEvents,
} from "./types";

/**
 * カレンダーエラーコードの定義
 * 各エラーコードはイベント操作時に発生する特定のエラー状況を表す
 */
export const CALENDAR_ERROR_CODES = [
  "FETCH_FAILED",
  "NETWORK_ERROR",
  "UNAUTHORIZED",
  "PERMISSION_DENIED",
  "CREATE_FAILED",
  "UPDATE_FAILED",
  "DELETE_FAILED",
  "VALIDATION_ERROR",
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
  UNAUTHORIZED: "認証が必要です。再度ログインしてください。",
  PERMISSION_DENIED: "このギルドではイベントの編集権限がありません。",
  CREATE_FAILED: "イベントの作成に失敗しました。",
  UPDATE_FAILED: "イベントの更新に失敗しました。",
  DELETE_FAILED: "イベントの削除に失敗しました。",
  VALIDATION_ERROR: "入力データが不正です。",
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
 * イベント作成入力パラメータ
 */
export interface CreateEventInput {
  /** ギルドID */
  guildId: string;
  /** イベントタイトル */
  title: string;
  /** 開始日時 */
  startAt: Date;
  /** 終了日時 */
  endAt: Date;
  /** イベントの説明 */
  description?: string;
  /** 終日フラグ */
  isAllDay?: boolean;
  /** イベントカラー (HEXコード) */
  color?: string;
  /** 場所情報 */
  location?: string;
  /** DiscordチャンネルID */
  channelId?: string;
  /** Discordチャンネル名 */
  channelName?: string;
}

/**
 * イベント更新入力パラメータ
 * すべてのフィールドがオプショナルで部分更新に対応
 */
export interface UpdateEventInput {
  /** イベントタイトル */
  title?: string;
  /** 開始日時 */
  startAt?: Date;
  /** 終了日時 */
  endAt?: Date;
  /** イベントの説明 */
  description?: string;
  /** 終日フラグ */
  isAllDay?: boolean;
  /** イベントカラー (HEXコード) */
  color?: string;
  /** 場所情報 */
  location?: string;
}

/**
 * ミューテーション結果 (Result型)
 * 成功時はデータ、失敗時はエラー情報を返す
 */
export type MutationResult<T> =
  | { success: true; data: T }
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

  /**
   * 新しいイベントを作成
   * @param input - 作成パラメータ
   * @returns 作成されたイベントまたは エラー
   */
  createEvent(input: CreateEventInput): Promise<MutationResult<CalendarEvent>>;

  /**
   * 既存のイベントを更新
   * @param id - イベントID
   * @param input - 更新パラメータ（部分更新に対応）
   * @returns 更新されたイベントまたは エラー
   */
  updateEvent(id: string, input: UpdateEventInput): Promise<MutationResult<CalendarEvent>>;

  /**
   * イベントを完全に削除
   * @param id - 削除するイベントのID
   * @returns 成功時はvoid、失敗時はエラー
   */
  deleteEvent(id: string): Promise<MutationResult<void>>;
}

/**
 * Supabaseエラーをカレンダーエラーコードに分類する
 *
 * @param error - Supabaseから返されたエラー
 * @param operation - 操作タイプ（fetch/create/update/delete）
 * @returns 適切なカレンダーエラーコード
 */
function classifySupabaseError(
  error: { message: string; code?: string; details?: string; hint?: string },
  operation: "fetch" | "create" | "update" | "delete" = "fetch"
): CalendarErrorCode {
  // デバッグ用: エラー情報をログに出力
  if (typeof window !== "undefined") {
    console.error("[EventService] Supabase error:", {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
      operation,
    });
  }

  // PostgreSQL permission denied error (42501)
  // PostgREST RLS policy violation (PGRST116)
  // PostgREST schema cache error (PGRST301) - 認証関連の可能性
  if (
    error.code === "42501" ||
    error.code === "PGRST116" ||
    error.code === "PGRST301" ||
    error.message.toLowerCase().includes("permission denied") ||
    error.message.toLowerCase().includes("new row violates row-level security policy") ||
    error.message.toLowerCase().includes("row-level security policy violation")
  ) {
    return "UNAUTHORIZED";
  }

  // Validation errors (constraint violations, check violations)
  if (
    error.code === "23505" || // unique_violation
    error.code === "23514" || // check_violation
    error.code === "23502" || // not_null_violation
    error.message.toLowerCase().includes("violates") ||
    error.message.toLowerCase().includes("constraint")
  ) {
    return "VALIDATION_ERROR";
  }

  // Operation-specific error codes
  if (operation === "create") {
    return "CREATE_FAILED";
  }
  if (operation === "update") {
    return "UPDATE_FAILED";
  }
  if (operation === "delete") {
    return "DELETE_FAILED";
  }

  // Default to FETCH_FAILED for database errors
  return "FETCH_FAILED";
}

/**
 * 例外をカレンダーエラーコードに分類する
 *
 * @param error - 発生した例外
 * @param operation - 操作タイプ（fetch/create/update/delete）
 * @returns 適切なカレンダーエラーコード
 */
function classifyException(
  error: unknown,
  operation: "fetch" | "create" | "update" | "delete" = "fetch"
): CalendarErrorCode {
  // AbortError or network-related errors
  if (error instanceof DOMException && error.name === "AbortError") {
    return "NETWORK_ERROR";
  }

  if (error instanceof TypeError && error.message.includes("fetch")) {
    return "NETWORK_ERROR";
  }

  // Operation-specific error codes
  if (operation === "create") {
    return "CREATE_FAILED";
  }
  if (operation === "update") {
    return "UPDATE_FAILED";
  }
  if (operation === "delete") {
    return "DELETE_FAILED";
  }

  // Default to FETCH_FAILED for fetch operations
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
          const errorCode = classifySupabaseError(error, "fetch");
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

    async createEvent(input: CreateEventInput): Promise<MutationResult<CalendarEvent>> {
      const {
        guildId,
        title,
        startAt,
        endAt,
        description,
        isAllDay = false,
        color = "#3B82F6",
        location,
        channelId,
        channelName,
      } = input;

      try {
        // 認証状態を確認し、必要に応じてセッションを再取得
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (!session) {
          // セッションがない場合は、ユーザーに再取得を試みる
          const {
            data: { session: refreshedSession },
            error: refreshError,
          } = await supabase.auth.refreshSession();

          if (!refreshedSession) {
            console.error(
              "[EventService] No active session found for createEvent",
              sessionError || refreshError,
            );
            return {
              success: false,
              error: {
                code: "UNAUTHORIZED",
                message: "セッションが無効です。再度ログインしてください。",
                details:
                  sessionError?.message ||
                  refreshError?.message ||
                  "No active session found",
              },
            };
          }

          console.log("[EventService] Session refreshed for createEvent:", {
            userId: refreshedSession.user.id,
            expiresAt: refreshedSession.expires_at,
          });
        } else {
          console.log("[EventService] Session found for createEvent:", {
            userId: session.user.id,
            expiresAt: session.expires_at,
          });
        }

        // バリデーション: 必須フィールドのチェック
        if (!title || title.trim().length === 0) {
          return {
            success: false,
            error: {
              code: "VALIDATION_ERROR",
              message: getCalendarErrorMessage("VALIDATION_ERROR"),
              details: "タイトルは必須です。",
            },
          };
        }

        if (title.length > 255) {
          return {
            success: false,
            error: {
              code: "VALIDATION_ERROR",
              message: getCalendarErrorMessage("VALIDATION_ERROR"),
              details: "タイトルは255文字以内で入力してください。",
            },
          };
        }

        // バリデーション: 日時のチェック
        if (startAt >= endAt) {
          return {
            success: false,
            error: {
              code: "VALIDATION_ERROR",
              message: getCalendarErrorMessage("VALIDATION_ERROR"),
              details: "終了日時は開始日時より後である必要があります。",
            },
          };
        }

        // SupabaseへのINSERT操作
        const insertData: Omit<EventRecord, "id" | "created_at" | "updated_at"> = {
          guild_id: guildId,
          name: title.trim(),
          description: description?.trim() || null,
          color,
          is_all_day: isAllDay,
          start_at: startAt.toISOString(),
          end_at: endAt.toISOString(),
          location: location?.trim() || null,
          channel_id: channelId || null,
          channel_name: channelName || null,
        };

        // 認証状態を確認するために、ユーザー情報を取得
        const { data: { user }, error: userError } = await supabase.auth.getUser();

        // ユーザーが認証されていない場合はエラーを返す
        if (!user) {
          return {
            success: false,
            error: {
              code: "UNAUTHORIZED",
              message: "認証が必要です。再度ログインしてください。",
              details: userError?.message || "User not authenticated",
            },
          };
        }

        const { data, error } = await supabase
          .from("events")
          .insert(insertData)
          .select()
          .single();

        // Supabaseエラーの処理
        if (error) {
          const errorCode = classifySupabaseError(error, "create");
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
        const event = toCalendarEvent(data as EventRecord);

        return {
          success: true,
          data: event,
        };
      } catch (error) {
        // 例外の処理 (ネットワークエラーなど)
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

    async updateEvent(id: string, input: UpdateEventInput): Promise<MutationResult<CalendarEvent>> {
      const {
        title,
        startAt,
        endAt,
        description,
        isAllDay,
        color,
        location,
      } = input;

      try {
        // バリデーション: タイトルが指定されている場合のチェック
        if (title !== undefined) {
          if (!title || title.trim().length === 0) {
            return {
              success: false,
              error: {
                code: "VALIDATION_ERROR",
                message: getCalendarErrorMessage("VALIDATION_ERROR"),
                details: "タイトルは必須です。",
              },
            };
          }

          if (title.length > 255) {
            return {
              success: false,
              error: {
                code: "VALIDATION_ERROR",
                message: getCalendarErrorMessage("VALIDATION_ERROR"),
                details: "タイトルは255文字以内で入力してください。",
              },
            };
          }
        }

        // バリデーション: 両方の日時が指定されている場合のチェック
        if (startAt !== undefined && endAt !== undefined) {
          if (startAt >= endAt) {
            return {
              success: false,
              error: {
                code: "VALIDATION_ERROR",
                message: getCalendarErrorMessage("VALIDATION_ERROR"),
                details: "終了日時は開始日時より後である必要があります。",
              },
            };
          }
        }

        // SupabaseへのUPDATE操作用のデータを構築（指定されたフィールドのみ）
        const updateData: Partial<Omit<EventRecord, "id" | "guild_id" | "created_at" | "updated_at" | "channel_id" | "channel_name">> = {};

        if (title !== undefined) {
          updateData.name = title.trim();
        }
        if (startAt !== undefined) {
          updateData.start_at = startAt.toISOString();
        }
        if (endAt !== undefined) {
          updateData.end_at = endAt.toISOString();
        }
        if (description !== undefined) {
          updateData.description = description.trim() || null;
        }
        if (isAllDay !== undefined) {
          updateData.is_all_day = isAllDay;
        }
        if (color !== undefined) {
          updateData.color = color;
        }
        if (location !== undefined) {
          updateData.location = location.trim() || null;
        }

        // SupabaseへのUPDATE操作
        const { data, error } = await supabase
          .from("events")
          .update(updateData)
          .eq("id", id)
          .select()
          .single();

        // Supabaseエラーの処理
        if (error) {
          const errorCode = classifySupabaseError(error, "update");
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
        const event = toCalendarEvent(data as EventRecord);

        return {
          success: true,
          data: event,
        };
      } catch (error) {
        // 例外の処理 (ネットワークエラーなど)
        const errorCode = classifyException(error, "update");
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

    async deleteEvent(id: string): Promise<MutationResult<void>> {
      try {
        // SupabaseへのDELETE操作
        const { error } = await supabase
          .from("events")
          .delete()
          .eq("id", id);

        // Supabaseエラーの処理
        if (error) {
          const errorCode = classifySupabaseError(error, "delete");
          return {
            success: false,
            error: {
              code: errorCode,
              message: getCalendarErrorMessage(errorCode),
              details: error.message,
            },
          };
        }

        // 削除成功（復元不可能な完全削除）
        return {
          success: true,
          data: undefined,
        };
      } catch (error) {
        // 例外の処理 (ネットワークエラーなど)
        const errorCode = classifyException(error, "delete");
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
