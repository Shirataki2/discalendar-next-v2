import type { SupabaseClient } from "@supabase/supabase-js";

/** PostgREST: .single() でレコードが見つからない場合のエラーコード */
const POSTGREST_NOT_FOUND = "PGRST116";

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

  upsertSingleGuild(
    guild: SyncGuildInput,
  ): Promise<UserGuildsMutationResult<void>>;

  getUserGuildPermissions(
    userId: string,
    guildId: string,
  ): Promise<UserGuildsMutationResult<string | null>>;
}

/**
 * UserGuildsService のファクトリ関数
 */
export function createUserGuildsService(
  supabase: SupabaseClient,
): UserGuildsServiceInterface {
  return {
    async syncUserGuilds(
      _userId: string,
      guilds: SyncGuildInput[],
    ): Promise<
      UserGuildsMutationResult<{ synced: number; removed: number }>
    > {
      try {
        const guildIds = guilds.map((g) => g.guildId);
        const permissions = guilds.map((g) => g.permissions);

        const { data, error } = await supabase.rpc("sync_user_guilds", {
          p_guild_ids: guildIds,
          p_permissions: permissions,
        });

        if (error) {
          return {
            success: false,
            error: {
              code: "SYNC_FAILED",
              message: "メンバーシップの同期に失敗しました。",
              details: error.message,
            },
          };
        }

        const row = Array.isArray(data) ? data[0] : data;
        return {
          success: true,
          data: {
            synced: row?.synced ?? 0,
            removed: row?.removed ?? 0,
          },
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

    async upsertSingleGuild(
      guild: SyncGuildInput,
    ): Promise<UserGuildsMutationResult<void>> {
      try {
        const { error } = await supabase.rpc("upsert_user_guild", {
          p_guild_id: guild.guildId,
          p_permissions: guild.permissions,
        });

        if (error) {
          return {
            success: false,
            error: {
              code: "SYNC_FAILED",
              message: "メンバーシップの書き込みに失敗しました。",
              details: error.message,
            },
          };
        }

        return { success: true, data: undefined };
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Unknown error";
        return {
          success: false,
          error: {
            code: "SYNC_FAILED",
            message: "メンバーシップの書き込みに失敗しました。",
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
        if (error.code === POSTGREST_NOT_FOUND) {
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
