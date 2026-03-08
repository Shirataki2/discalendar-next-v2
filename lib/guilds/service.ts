/**
 * ギルドサービス - DB操作の抽象化
 *
 * Requirements:
 * - 3.1: Discord APIから取得したギルドIDリストを使用してSupabaseのguildsテーブルを検索する
 * - 3.2: guild_idがANY(取得したギルドIDリスト)に一致するレコードを取得する
 * - 3.3: 照合結果として、DBに登録済みかつユーザーが所属しているギルドのみを返す
 *
 * Contracts: GuildService Service Interface (design.md)
 */

import { captureException } from "@sentry/nextjs";
import { createClient } from "@/lib/supabase/server";
import type { Guild, GuildRow } from "./types";
import { toGuild } from "./types";

/**
 * Discord APIから取得したギルド情報をguildsテーブルに登録する
 *
 * SECURITY DEFINER関数 ensure_guilds を使用してRLSをバイパスし、
 * Botが未起動でもWeb側からギルドを登録できるようにする。
 * ON CONFLICT DO UPDATE で名前・アバターを最新化する。
 *
 * NOTE: この関数はfire-and-forget で呼び出される。エラー時は captureException で
 * 記録するのみで例外をスローしないため、呼び出し元の処理は中断されない。
 *
 * @param guilds Discord APIから取得したギルド情報の配列
 */
export async function ensureGuilds(
  guilds: { guildId: string; name: string; avatarUrl: string | null }[]
): Promise<void> {
  if (guilds.length === 0) {
    return;
  }

  const supabase = await createClient();

  const guildIds = guilds.map((g) => g.guildId);
  const names = guilds.map((g) => g.name);
  const avatarUrls = guilds.map((g) => g.avatarUrl);

  const { error } = await supabase.rpc("ensure_guilds", {
    p_guild_ids: guildIds,
    p_names: names,
    p_avatar_urls: avatarUrls,
  });

  if (error) {
    captureException(
      new Error(`[ensureGuilds] Failed to ensure guilds: ${error.message}`)
    );
  }
}

/**
 * ユーザーが所属するギルドIDリストでDB照合を行う
 *
 * @param guildIds Discord APIから取得したギルドIDリスト
 * @returns Discalendar登録済みギルドの配列
 *
 * @precondition guildIdsは文字列配列（空配列も可）
 * @postcondition DBに存在するギルドのみ返却
 * @invariant RLSにより認証済みユーザーのみアクセス可能
 *
 * @example
 * ```typescript
 * const discordGuildIds = ["123456789012345678", "234567890123456789"];
 * const guilds = await getJoinedGuilds(discordGuildIds);
 * // guilds: DBに登録済みのギルドのみ返却
 * ```
 */
export async function getJoinedGuilds(guildIds: string[]): Promise<Guild[]> {
  // 空配列の場合は即座に空配列を返却（DBクエリ不要）
  if (guildIds.length === 0) {
    return [];
  }

  const supabase = await createClient();

  // ANY演算子相当のクエリで一括検索（N+1回避）
  const { data, error } = await supabase
    .from("guilds")
    .select("*")
    .in("guild_id", guildIds);

  if (error) {
    throw new Error(error.message);
  }

  // GuildRowからGuildへ変換
  const rows = data as GuildRow[];
  return rows.map(toGuild);
}
