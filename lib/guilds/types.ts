/**
 * ギルド関連の型定義
 *
 * Requirements:
 * - 6.1: Guild型を定義 (id, guildId, name, avatarUrl, locale)
 * - 6.2: Supabaseの自動生成型と互換性のある型定義
 * - 2.3/2.4: ギルド一覧UIで使用するエラー型
 * - guild-permissions 2.1/2.4: GuildWithPermissions型を定義
 */

import type { DiscordPermissions } from "@/lib/discord/permissions";

/**
 * アプリケーション内部のギルド型
 * design.mdの"Internal Guild Type"に基づく
 */
export interface Guild {
  /** サロゲートキー */
  id: number;
  /** Discordギルドの一意識別子 */
  guildId: string;
  /** ギルド表示名 */
  name: string;
  /** アイコンURL（Discord CDN形式） */
  avatarUrl: string | null;
  /** ロケール設定 */
  locale: string;
}

/**
 * Supabase guildsテーブルのRow型
 * snake_caseでDBスキーマと互換性を保つ
 */
export interface GuildRow {
  /** サロゲートキー */
  id: number;
  /** Discordギルドの一意識別子 */
  guild_id: string;
  /** ギルド表示名 */
  name: string;
  /** アイコンURL（Discord CDN形式） */
  avatar_url: string | null;
  /** ロケール設定 */
  locale: string;
}

/**
 * 権限情報付きギルド型
 *
 * Guild を拡張し、Discord API から取得した権限ビットフィールドの解析結果を含む。
 * fetchGuilds() の戻り値として使用される。
 *
 * Requirements: guild-permissions 2.1, 2.4
 */
export interface GuildWithPermissions extends Guild {
  /** 解析済み Discord 権限 */
  permissions: DiscordPermissions;
}

/**
 * ギルド一覧UIで使用するエラー型
 * design.mdの"GuildListError"に基づく
 */
export type GuildListError =
  | { type: "api_error"; message: string }
  | { type: "token_expired" }
  | { type: "no_token" };

/**
 * GuildRowからGuildへの変換関数
 *
 * @param row Supabaseから取得したGuildRow
 * @returns アプリケーション内部で使用するGuild型
 */
export function toGuild(row: GuildRow): Guild {
  return {
    id: row.id,
    guildId: row.guild_id,
    name: row.name,
    avatarUrl: row.avatar_url,
    locale: row.locale,
  };
}
