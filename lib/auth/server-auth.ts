/**
 * サーバー側認証・権限解決ヘルパー
 *
 * Server Actions から呼び出し可能な共通ユーティリティ。
 * "use server" を付けないことで、クライアントから RPC 経由で
 * 呼ばれないようにする。
 */

import { captureException } from "@sentry/nextjs";
import { getUserGuilds } from "@/lib/discord/client";
import {
  type DiscordPermissions,
  parsePermissions,
} from "@/lib/discord/permissions";
import { getCachedGuilds } from "@/lib/guilds/cache";
import { createUserGuildsService } from "@/lib/guilds/user-guilds-service";
import { createClient } from "@/lib/supabase/server";

export type ServerAuthErrorCode =
  | "UNAUTHORIZED"
  | "FETCH_FAILED"
  | "PERMISSION_DENIED";

export type ServerAuthError = {
  code: ServerAuthErrorCode;
  message: string;
};

export type ResolvedAuth = {
  supabase: Awaited<ReturnType<typeof createClient>>;
  userId: string;
  permissions: DiscordPermissions;
};

export type ResolveServerAuthResult =
  | { success: true; auth: ResolvedAuth }
  | { success: false; error: ServerAuthError };

const UNAUTHORIZED_ERROR: ServerAuthError = {
  code: "UNAUTHORIZED",
  message: "認証が必要です。再度ログインしてください。",
};

/**
 * サーバー側で Discord 権限を解決する
 *
 * クライアント入力を一切信頼せず、以下の順序で権限を取得する:
 * 1. メモリキャッシュ（getCachedGuilds）からギルド権限を検索
 * 2. user_guilds DB からフォールバック
 * 3. Discord API からフォールバック（成功時は DB に書き戻し）
 */
export async function resolveServerAuth(
  guildId: string
): Promise<ResolveServerAuthResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: UNAUTHORIZED_ERROR };
  }

  const cached = getCachedGuilds(user.id);
  if (cached) {
    const guild = cached.guilds.find((g) => g.guildId === guildId);
    if (guild) {
      return {
        success: true,
        auth: { supabase, userId: user.id, permissions: guild.permissions },
      };
    }
  }

  const userGuildsService = createUserGuildsService(supabase);
  const dbResult = await userGuildsService.getUserGuildPermissions(
    user.id,
    guildId
  );

  if (dbResult.success && dbResult.data !== null) {
    return {
      success: true,
      auth: {
        supabase,
        userId: user.id,
        permissions: parsePermissions(dbResult.data),
      },
    };
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.provider_token) {
    return {
      success: false,
      error: {
        code: "UNAUTHORIZED",
        message:
          "Discordアクセストークンが期限切れです。再度ログインしてください。",
      },
    };
  }

  const discordResult = await getUserGuilds(session.provider_token);
  if (!discordResult.success) {
    return {
      success: false,
      error: { code: "FETCH_FAILED", message: discordResult.error.message },
    };
  }

  const discordGuild = discordResult.data.find((g) => g.id === guildId);
  if (!discordGuild) {
    return {
      success: false,
      error: {
        code: "PERMISSION_DENIED",
        message: "このギルドのメンバーではありません。",
      },
    };
  }

  const syncResult = await userGuildsService.upsertSingleGuild({
    guildId,
    permissions: discordGuild.permissions,
  });
  if (!syncResult.success) {
    captureException(
      new Error(
        `[resolveServerAuth] user_guilds upsert failed: ${syncResult.error.message}`
      )
    );
  }

  return {
    success: true,
    auth: {
      supabase,
      userId: user.id,
      permissions: parsePermissions(discordGuild.permissions),
    },
  };
}
