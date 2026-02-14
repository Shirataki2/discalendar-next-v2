/**
 * GuildConfigService - ギルド設定（guild_config テーブル）の CRUD 操作
 *
 * Task 2.1: GuildConfigService を作成する
 * - ファクトリ関数 createGuildConfigService でサービスを生成
 * - getGuildConfig: restricted フラグの取得（不在時はデフォルト値）
 * - upsertGuildConfig: restricted フラグの挿入/更新
 * - MutationResult<T> パターンに従ったエラーハンドリング
 *
 * Requirements: 3.1, 3.2, 3.3
 */
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * ギルド設定の型定義（アプリケーション層）
 */
export interface GuildConfig {
  guildId: string;
  restricted: boolean;
}

/**
 * ギルド設定の DB Row 型（snake_case）
 */
interface GuildConfigRow {
  guild_id: string;
  restricted: boolean;
}

/**
 * ギルド設定エラーの型定義
 */
export interface GuildConfigError {
  code: string;
  message: string;
  details?: string;
}

/**
 * ミューテーション結果（Result 型）
 */
export type GuildConfigMutationResult<T> =
  | { success: true; data: T }
  | { success: false; error: GuildConfigError };

/**
 * GuildConfigService インターフェース
 */
export interface GuildConfigServiceInterface {
  /** ギルド設定を取得（不在時はデフォルト値を返す） */
  getGuildConfig(guildId: string): Promise<GuildConfig>;

  /** ギルド設定を更新（不在時は新規作成） */
  upsertGuildConfig(
    guildId: string,
    config: { restricted: boolean },
  ): Promise<GuildConfigMutationResult<GuildConfig>>;
}

/**
 * GuildConfigRow から GuildConfig への変換
 */
function toGuildConfig(row: GuildConfigRow): GuildConfig {
  return {
    guildId: row.guild_id,
    restricted: row.restricted,
  };
}

/**
 * GuildConfigService のファクトリ関数
 *
 * @param supabase - Supabase クライアントインスタンス
 * @returns GuildConfigService インスタンス
 */
export function createGuildConfigService(
  supabase: SupabaseClient,
): GuildConfigServiceInterface {
  return {
    async getGuildConfig(guildId: string): Promise<GuildConfig> {
      const { data, error } = await supabase
        .from("guild_config")
        .select("*")
        .eq("guild_id", guildId)
        .single();

      // レコードが存在しない場合、またはエラーの場合はデフォルト値を返す（フェイルセーフ）
      if (error || !data) {
        return { guildId, restricted: false };
      }

      return toGuildConfig(data as GuildConfigRow);
    },

    async upsertGuildConfig(
      guildId: string,
      config: { restricted: boolean },
    ): Promise<GuildConfigMutationResult<GuildConfig>> {
      try {
        const { data, error } = await supabase
          .from("guild_config")
          .upsert({
            guild_id: guildId,
            restricted: config.restricted,
          })
          .select()
          .single();

        if (error) {
          return {
            success: false,
            error: {
              code: "UPDATE_FAILED",
              message: "ギルド設定の更新に失敗しました。",
              details: error.message,
            },
          };
        }

        return {
          success: true,
          data: toGuildConfig(data as GuildConfigRow),
        };
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Unknown error";
        return {
          success: false,
          error: {
            code: "UPDATE_FAILED",
            message: "ギルド設定の更新に失敗しました。",
            details: errorMessage,
          },
        };
      }
    },
  };
}
