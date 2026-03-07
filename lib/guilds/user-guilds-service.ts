import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * user_guilds の DB Row 型（snake_case）
 */
interface UserGuildRow {
  user_id: string;
  guild_id: string;
  permissions: string; // BIGINT は string として返却される
  updated_at: string;
}

/**
 * user_guilds のドメイン型（camelCase）
 */
export interface UserGuild {
  userId: string;
  guildId: string;
  permissions: string;
  updatedAt: string;
}

/**
 * UserGuildsService エラー型
 */
export interface UserGuildsError {
  code: "SYNC_FAILED" | "FETCH_FAILED" | "DELETE_FAILED";
  message: string;
  details?: string;
}

/**
 * Result 型
 */
export type UserGuildsMutationResult<T> =
  | { success: true; data: T }
  | { success: false; error: UserGuildsError };

/**
 * syncUserGuilds の入力型
 */
export interface SyncGuildInput {
  guildId: string;
  permissions: string; // Discord API の permissions_new ビットフィールド文字列
}

/**
 * UserGuildsService インターフェース
 */
export interface UserGuildsServiceInterface {
  syncUserGuilds(
    userId: string,
    guilds: SyncGuildInput[],
  ): Promise<UserGuildsMutationResult<{ synced: number; removed: number }>>;

  getUserGuildPermissions(
    userId: string,
    guildId: string,
  ): Promise<UserGuildsMutationResult<string | null>>;
}

function toUserGuild(row: UserGuildRow): UserGuild {
  return {
    userId: row.user_id,
    guildId: row.guild_id,
    permissions: row.permissions,
    updatedAt: row.updated_at,
  };
}

/**
 * UserGuildsService のファクトリ関数
 */
export function createUserGuildsService(
  supabase: SupabaseClient,
): UserGuildsServiceInterface {
  return {
    async syncUserGuilds(
      userId: string,
      guilds: SyncGuildInput[],
    ): Promise<
      UserGuildsMutationResult<{ synced: number; removed: number }>
    > {
      try {
        // Upsert: Discord API の結果を一括挿入/更新
        const upsertRows = guilds.map((g) => ({
          user_id: userId,
          guild_id: g.guildId,
          permissions: g.permissions,
        }));

        let synced = 0;
        if (upsertRows.length > 0) {
          const { error: upsertError } = await supabase
            .from("user_guilds")
            .upsert(upsertRows, { onConflict: "user_id,guild_id" });

          if (upsertError) {
            return {
              success: false,
              error: {
                code: "SYNC_FAILED",
                message: "メンバーシップの同期に失敗しました。",
                details: upsertError.message,
              },
            };
          }
          synced = upsertRows.length;
        }

        // Delete: API 結果に含まれないギルドのレコードを削除
        const guildIds = guilds.map((g) => g.guildId);
        let query = supabase
          .from("user_guilds")
          .delete()
          .eq("user_id", userId);

        if (guildIds.length > 0) {
          query = query.not("guild_id", "in", `(${guildIds.join(",")})`);
        }

        const { data: deletedRows, error: deleteError } =
          await query.select("guild_id");

        if (deleteError) {
          return {
            success: false,
            error: {
              code: "DELETE_FAILED",
              message: "脱退ギルドの削除に失敗しました。",
              details: deleteError.message,
            },
          };
        }

        const removed = deletedRows?.length ?? 0;

        return {
          success: true,
          data: { synced, removed },
        };
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Unknown error";
        return {
          success: false,
          error: {
            code: "SYNC_FAILED",
            message: "メンバーシップの同期に失敗しました。",
            details: errorMessage,
          },
        };
      }
    },

    async getUserGuildPermissions(
      userId: string,
      guildId: string,
    ): Promise<UserGuildsMutationResult<string | null>> {
      const { data, error } = await supabase
        .from("user_guilds")
        .select("permissions")
        .eq("user_id", userId)
        .eq("guild_id", guildId)
        .single();

      if (error) {
        // PGRST116: not found → レコード不在（null を返す）
        if (error.code === "PGRST116") {
          return { success: true, data: null };
        }
        return {
          success: false,
          error: {
            code: "FETCH_FAILED",
            message: "権限情報の取得に失敗しました。",
            details: error.message,
          },
        };
      }

      return {
        success: true,
        data: (data as Pick<UserGuildRow, "permissions">).permissions,
      };
    },
  };
}
