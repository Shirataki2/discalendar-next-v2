/**
 * Discord API連携クライアント
 *
 * Requirements:
 * - 2.1: Supabase Authに保存されたDiscordアクセストークンを使用してDiscord APIからユーザーの所属ギルド一覧を取得する
 * - 2.2: 各ギルドのid, name, iconを取得する
 * - 2.3: Discord APIへのアクセスに失敗した場合、エラーを返す
 * - 2.4: Discordアクセストークンが期限切れの場合、認証エラーを返す
 *
 * Contracts: DiscordApiClient Service Interface (design.md)
 */

import type { DiscordApiResult, DiscordGuild } from "./types";

/** Discord API v10のベースURL */
const DISCORD_API_BASE_URL = "https://discord.com/api/v10";

/**
 * 現在のユーザーが所属するギルド一覧を取得
 *
 * @param accessToken Discord OAuth アクセストークン
 * @returns ギルド一覧またはエラー
 *
 * @example
 * ```typescript
 * const result = await getUserGuilds(providerToken);
 * if (result.success) {
 *   console.log(result.data); // DiscordGuild[]
 * } else {
 *   console.error(result.error);
 * }
 * ```
 */
export async function getUserGuilds(
  accessToken: string
): Promise<DiscordApiResult<DiscordGuild[]>> {
  try {
    const response = await fetch(`${DISCORD_API_BASE_URL}/users/@me/guilds`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    // 成功レスポンス
    if (response.ok) {
      const data = (await response.json()) as DiscordGuild[];
      return { success: true, data };
    }

    // 認証エラー (401 Unauthorized)
    if (response.status === 401) {
      return {
        success: false,
        error: {
          code: "unauthorized",
          message:
            "アクセストークンが無効または期限切れです。再度ログインしてください。",
        },
      };
    }

    // レート制限 (429 Too Many Requests)
    if (response.status === 429) {
      // Retry-Afterヘッダーまたはレスポンスボディから待機時間を取得
      const retryAfterHeader = response.headers.get("Retry-After");
      let retryAfter = 60; // デフォルト60秒

      if (retryAfterHeader) {
        retryAfter = Number.parseInt(retryAfterHeader, 10);
      } else {
        try {
          const body = (await response.json()) as { retry_after?: number };
          if (body.retry_after) {
            retryAfter = body.retry_after;
          }
        } catch {
          // JSONパースに失敗した場合はデフォルト値を使用
        }
      }

      return {
        success: false,
        error: {
          code: "rate_limited",
          message: `リクエスト制限に達しました。${retryAfter}秒後に再試行してください。`,
          retryAfter,
        },
      };
    }

    // その他のエラー
    return {
      success: false,
      error: {
        code: "unknown",
        message: `Discord APIエラーが発生しました。(ステータス: ${response.status})`,
      },
    };
  } catch (error) {
    // ネットワークエラーなど
    return {
      success: false,
      error: {
        code: "network_error",
        message:
          "サーバーに接続できませんでした。ネットワーク接続を確認してください。",
      },
    };
  }
}
