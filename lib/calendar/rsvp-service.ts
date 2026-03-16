/**
 * RsvpService - RSVP データ取得・登録・削除サービス
 *
 * Task 2.2: RsvpService を実装する
 * - 出欠データ取得: 参加者一覧 + サマリー + 現在ユーザーステータス
 * - 出欠登録: upsert パターンでステータスを挿入または更新
 * - 出欠削除: トグル解除用
 *
 * Requirements: 1.3, 6.3
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { CalendarError, MutationResult } from "./event-service";
import {
  type AttendeeData,
  type AttendeeRecord,
  type RsvpStatus,
  computeAttendeeSummary,
} from "./rsvp-types";

// ──────────────────────────────────────────────
// パラメータ型定義
// ──────────────────────────────────────────────

interface FetchAttendeesParams {
  guildId: string;
  eventId?: string;
  seriesId?: string;
  occurrenceDate?: string;
  currentDiscordUserId: string;
  signal?: AbortSignal;
}

interface UpsertRsvpParams {
  guildId: string;
  eventId?: string;
  seriesId?: string;
  occurrenceDate?: string;
  userId: string;
  discordUserId: string;
  discordUsername: string;
  discordAvatarUrl: string | null;
  status: RsvpStatus;
}

interface DeleteRsvpParams {
  guildId: string;
  eventId?: string;
  seriesId?: string;
  occurrenceDate?: string;
  userId: string;
}

// ──────────────────────────────────────────────
// ファクトリ関数
// ──────────────────────────────────────────────

export function createRsvpService(supabase: SupabaseClient) {
  return {
    /**
     * 出欠データ取得
     *
     * 指定イベントまたはオカレンスの参加者一覧を取得し、
     * ステータス別サマリーと現在ユーザーのステータスを算出する
     */
    async fetchAttendees(
      params: FetchAttendeesParams,
    ): Promise<MutationResult<AttendeeData>> {
      let query = supabase.from("event_attendees").select("*");

      if (params.eventId) {
        query = query.eq("event_id", params.eventId);
      } else if (params.seriesId && params.occurrenceDate) {
        query = query
          .eq("event_series_id", params.seriesId)
          .eq("occurrence_date", params.occurrenceDate);
      }

      const { data, error } = await query;

      if (error) {
        return {
          success: false,
          error: {
            code: "FETCH_FAILED",
            message: "出欠データの取得に失敗しました。",
            details: error.message,
          },
        };
      }

      const attendees = (data ?? []) as AttendeeRecord[];
      const summary = computeAttendeeSummary(attendees);
      const currentUser = attendees.find(
        (a) => a.discord_user_id === params.currentDiscordUserId,
      );

      return {
        success: true,
        data: {
          attendees,
          summary,
          currentUserStatus: currentUser?.status ?? null,
        },
      };
    },

    /**
     * 出欠登録（upsert）
     *
     * event_id + discord_user_id または
     * event_series_id + occurrence_date + discord_user_id のユニーク制約で
     * 既存レコードを更新、なければ挿入する
     */
    async upsertRsvp(
      params: UpsertRsvpParams,
    ): Promise<MutationResult<AttendeeRecord>> {
      const row = {
        event_id: params.eventId ?? null,
        event_series_id: params.seriesId ?? null,
        occurrence_date: params.occurrenceDate ?? null,
        guild_id: params.guildId,
        user_id: params.userId,
        discord_user_id: params.discordUserId,
        discord_username: params.discordUsername,
        discord_avatar_url: params.discordAvatarUrl,
        status: params.status,
        responded_at: new Date().toISOString(),
      };

      // onConflict: 単発イベントまたは繰り返しイベントのユニーク制約に合わせる
      const onConflict = params.eventId
        ? "event_id,discord_user_id"
        : "event_series_id,occurrence_date,discord_user_id";

      const { data, error } = await supabase
        .from("event_attendees")
        .upsert(row, { onConflict })
        .select("*")
        .single();

      if (error) {
        return {
          success: false,
          error: {
            code: "CREATE_FAILED",
            message: "出欠の登録に失敗しました。",
            details: error.message,
          },
        };
      }

      return { success: true, data: data as AttendeeRecord };
    },

    /**
     * 出欠削除（トグル解除用）
     *
     * 現在のユーザーが自分の RSVP レコードを削除する
     */
    async deleteRsvp(
      params: DeleteRsvpParams,
    ): Promise<MutationResult<void>> {
      let query = supabase
        .from("event_attendees")
        .delete()
        .eq("user_id", params.userId);

      if (params.eventId) {
        query = query.eq("event_id", params.eventId);
      } else if (params.seriesId && params.occurrenceDate) {
        query = query
          .eq("event_series_id", params.seriesId)
          .eq("occurrence_date", params.occurrenceDate);
      }

      const { error } = await query;

      if (error) {
        return {
          success: false,
          error: {
            code: "DELETE_FAILED",
            message: "出欠の削除に失敗しました。",
            details: error.message,
          },
        };
      }

      return { success: true, data: undefined };
    },
  };
}
