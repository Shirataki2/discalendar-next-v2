/**
 * IcsFeedTokenService - ICSフィードアクセストークンの管理サービス
 *
 * トークンの取得・生成・無効化・再生成を担当する。
 * Edge FunctionはService Role Keyで直接DBにアクセスするため、
 * このサービスはWeb UIからのServer Action経由でのみ使用される。
 *
 * Requirements: 4.5, 5.1, 5.2, 5.3, 5.4, 6.3, 6.4, 6.5
 */
import type { SupabaseClient } from "@supabase/supabase-js";

/** トークンの長さ（hex文字数、32バイト = 64文字） */
const TOKEN_HEX_LENGTH = 64;

/** ICSフィードトークンサービスのエラーコード */
export type IcsFeedTokenErrorCode =
  | "UNAUTHORIZED"
  | "GUILD_NOT_FOUND"
  | "INTERNAL_ERROR";

/** ICSフィードトークンサービスのエラー型 */
export interface IcsFeedTokenError {
  code: IcsFeedTokenErrorCode;
  message: string;
  details?: string;
}

/** Result 型 */
export type IcsFeedTokenResult<T> =
  | { success: true; data: T }
  | { success: false; error: IcsFeedTokenError };

/** トークンデータ */
export interface TokenData {
  token: string;
}

/** フィードURL組み立てパラメータ */
export interface BuildFeedUrlParams {
  guildId: string;
  token: string | null;
  isPublic: boolean;
  supabaseProjectUrl: string;
}

export interface IcsFeedTokenServiceInterface {
  getOrCreateToken(guildId: string): Promise<IcsFeedTokenResult<TokenData>>;
  regenerateToken(guildId: string): Promise<IcsFeedTokenResult<TokenData>>;
  buildFeedUrl(params: BuildFeedUrlParams): string;
}

/**
 * 暗号学的に安全なランダムトークンを生成する（32バイト → hex 64文字）
 */
function generateToken(): string {
  const bytes = new Uint8Array(TOKEN_HEX_LENGTH / 2);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * IcsFeedTokenService のファクトリ関数
 */
export function createIcsFeedTokenService(
  supabase: SupabaseClient,
): IcsFeedTokenServiceInterface {
  return {
    async getOrCreateToken(guildId) {
      const newToken = generateToken();
      const { data, error } = await supabase.rpc(
        "get_or_create_ics_feed_token",
        { p_guild_id: guildId, p_new_token: newToken },
      );

      if (error) {
        return {
          success: false,
          error: {
            code: "INTERNAL_ERROR",
            message: "トークンの取得・生成に失敗しました。",
            details: error.message,
          },
        };
      }

      return { success: true, data: { token: data as string } };
    },

    async regenerateToken(guildId) {
      const newToken = generateToken();
      const { data, error } = await supabase.rpc(
        "regenerate_ics_feed_token",
        { p_guild_id: guildId, p_new_token: newToken },
      );

      if (error) {
        return {
          success: false,
          error: {
            code: "INTERNAL_ERROR",
            message: "トークンの再生成に失敗しました。",
            details: error.message,
          },
        };
      }

      return { success: true, data: { token: data as string } };
    },

    buildFeedUrl({ guildId, token, isPublic, supabaseProjectUrl }) {
      const base = `${supabaseProjectUrl}/functions/v1/ics-feed?guild_id=${guildId}`;
      if (isPublic || !token) {
        return base;
      }
      return `${base}&token=${token}`;
    },
  };
}
