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

import { createClient } from "@/lib/supabase/server";
import type { Guild, GuildRow } from "./types";
import { toGuild } from "./types";

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
