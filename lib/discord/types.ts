/**
 * Discord API関連の型定義
 *
 * Requirements:
 * - 6.3: Discord APIレスポンス用の型定義
 * - 2.3: Discord API呼び出しの成功・失敗を表現するResult型
 * - 2.4: トークン期限切れ、レート制限、ネットワークエラーなどのエラー種別
 */

/**
 * Discord API /users/@me/guilds レスポンス型
 * Partial Guild Object (https://discord.com/developers/docs/resources/user#get-current-user-guilds)
 */
export interface DiscordGuild {
  /** ギルドID（snowflake） */
  id: string;
  /** ギルド名 */
  name: string;
  /** アイコンハッシュ（nullable） */
  icon: string | null;
  /** 所有者フラグ */
  owner: boolean;
  /** 権限ビットフィールド */
  permissions: string;
  /** ギルド機能フラグ配列 */
  features: string[];
}

/**
 * Discord APIエラー型
 * design.mdの"DiscordApiError"に基づく
 */
export type DiscordApiError =
  | { code: "unauthorized"; message: string }
  | { code: "rate_limited"; message: string; retryAfter: number }
  | { code: "network_error"; message: string }
  | { code: "unknown"; message: string };

/**
 * Discord API呼び出しの結果型
 * 成功時はdata、失敗時はerrorを返す
 */
export type DiscordApiResult<T> =
  | { success: true; data: T }
  | { success: false; error: DiscordApiError };

/**
 * Discord認証エラー
 *
 * Discord API呼び出し時の認証エラーを表現するクラス
 */
export class DiscordAuthError extends Error {
  code: string;
  constructor(message: string, code: string) {
    super(message);
    this.code = code;
    this.name = "DiscordAuthError";
  }
}

/**
 * Discord CDNからギルドアイコンURLを構築する
 *
 * @param guildId ギルドID
 * @param iconHash アイコンハッシュ（nullの場合はnullを返す）
 * @param size 画像サイズ（デフォルト: 128）
 * @returns ギルドアイコンURL、またはnull
 */
export function getGuildIconUrl(
  guildId: string,
  iconHash: string | null,
  size: 16 | 32 | 64 | 128 | 256 | 512 | 1024 | 2048 = 128
): string | null {
  if (!iconHash) {
    return null;
  }

  // アニメーションアイコンはハッシュが"a_"で始まる
  const extension = iconHash.startsWith("a_") ? "gif" : "png";
  return `https://cdn.discordapp.com/icons/${guildId}/${iconHash}.${extension}?size=${size}`;
}
