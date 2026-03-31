/**
 * AttachmentService - Supabase Storage操作（Signed URL生成・ファイル削除）
 *
 * Task 2.2: attachment-serviceの実装
 * - createAttachmentService ファクトリ関数パターン
 * - Result型パターンでエラーハンドリング
 *
 * Requirements: 2.2, 3.1, 3.2, 3.3, 7.2
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { AttachmentMeta } from "./attachment-types";
import type { CalendarError, MutationResult } from "./event-service";

const BUCKET_NAME = "event-attachments";
const SIGNED_URL_EXPIRY_SECONDS = 3600; // 1時間

/** Signed URL生成結果 */
export interface SignedUrlResult {
  path: string;
  signedUrl: string;
}

/** AttachmentServiceインターフェース */
export interface AttachmentServiceInterface {
  getSignedUrls(
    attachments: AttachmentMeta[],
    signal?: AbortSignal,
  ): Promise<MutationResult<SignedUrlResult[]>>;
  deleteFiles(
    paths: string[],
    signal?: AbortSignal,
  ): Promise<MutationResult<void>>;
}

/**
 * アップロード用Storageパスを生成する
 *
 * @param guildId - ギルドID（RLSポリシーのメンバーシップチェック用）
 * @param eventId - イベントID（イベント単位のファイル整理用）
 * @param fileName - 元のファイル名
 * @returns {guild_id}/{event_id}/{uuid}_{filename} 形式のパス
 */
export function buildStoragePath(
  guildId: string,
  eventId: string,
  fileName: string,
): string {
  const uuid = crypto.randomUUID();
  const sanitized = fileName.replace(/[/\\]/g, "_").replace(/\.\./g, "_");
  return `${guildId}/${eventId}/${uuid}_${sanitized}`;
}

/**
 * AttachmentServiceファクトリ関数
 *
 * @param supabase - Supabaseクライアント（認証済み）
 * @returns AttachmentServiceインスタンス
 */
export function createAttachmentService(
  supabase: SupabaseClient,
): AttachmentServiceInterface {
  return {
    async getSignedUrls(
      attachments: AttachmentMeta[],
      _signal?: AbortSignal,
    ): Promise<MutationResult<SignedUrlResult[]>> {
      if (attachments.length === 0) {
        return { success: true, data: [] };
      }

      const paths = attachments.map((a) => a.path);
      const { data, error } = await supabase.storage
        .from(BUCKET_NAME)
        .createSignedUrls(paths, SIGNED_URL_EXPIRY_SECONDS);

      if (error || !data) {
        const calendarError: CalendarError = {
          code: "FETCH_FAILED",
          message: "添付ファイルのURLを取得できませんでした。",
          details: error?.message,
        };
        return { success: false, error: calendarError };
      }

      const results: SignedUrlResult[] = data
        .filter((item): item is typeof item & { path: string } => Boolean(item.path))
        .map((item) => ({
          path: item.path,
          signedUrl: item.signedUrl,
        }));

      return { success: true, data: results };
    },

    async deleteFiles(paths: string[], _signal?: AbortSignal): Promise<MutationResult<void>> {
      if (paths.length === 0) {
        return { success: true, data: undefined };
      }

      const { error } = await supabase.storage
        .from(BUCKET_NAME)
        .remove(paths);

      if (error) {
        const calendarError: CalendarError = {
          code: "DELETE_FAILED",
          message: "添付ファイルの削除に失敗しました。",
          details: error.message,
        };
        return { success: false, error: calendarError };
      }

      return { success: true, data: undefined };
    },
  };
}
