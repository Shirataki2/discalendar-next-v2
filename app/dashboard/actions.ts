"use server";

/**
 * ダッシュボード関連の Server Actions
 *
 * Task 6.1: ギルド設定更新の Server Action
 * Task 6.2: イベント操作の Server Actions に権限チェックを追加
 *
 * セキュリティ: クライアントから送信された permissionsBitfield を信頼せず、
 * サーバー側で Discord API / キャッシュから権限を解決する。
 *
 * Requirements: 3.3, 3.4, 4.1, 4.2, 4.3
 */

import { revalidatePath } from "next/cache";
import {
  type CalendarError,
  type CreateEventInput,
  createEventService,
  type MutationResult,
  type UpdateEventInput,
} from "@/lib/calendar/event-service";
import { checkEventPermission } from "@/lib/calendar/permission-check";
import type { CalendarEvent } from "@/lib/calendar/types";
import { getUserGuilds } from "@/lib/discord/client";
import {
  canManageGuild,
  type DiscordPermissions,
  parsePermissions,
} from "@/lib/discord/permissions";
import { getCachedGuilds } from "@/lib/guilds/cache";
import {
  createGuildConfigService,
  type GuildConfig,
  type GuildConfigMutationResult,
} from "@/lib/guilds/guild-config-service";
import { createClient } from "@/lib/supabase/server";

/** 共通の未認証エラー */
const UNAUTHORIZED_ERROR: CalendarError = {
  code: "UNAUTHORIZED",
  message: "認証が必要です。再度ログインしてください。",
};

// ──────────────────────────────────────────────
// サーバー側権限解決ヘルパー
// ──────────────────────────────────────────────

type ResolvedAuth = {
  supabase: Awaited<ReturnType<typeof createClient>>;
  userId: string;
  permissions: DiscordPermissions;
};

type AuthResult =
  | { success: true; auth: ResolvedAuth }
  | { success: false; error: CalendarError };

/**
 * サーバー側で Discord 権限を解決する
 *
 * クライアント入力を一切信頼せず、以下の順序で権限を取得する:
 * 1. メモリキャッシュ（getCachedGuilds）からギルド権限を検索
 * 2. キャッシュミス時は Discord API から取得
 *
 * @param guildId 対象ギルドID
 */
async function resolveServerAuth(guildId: string): Promise<AuthResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      success: false,
      error: UNAUTHORIZED_ERROR,
    };
  }

  // 1. キャッシュから権限を検索
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

  // 2. Discord API から取得
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
      error: {
        code: "FETCH_FAILED",
        message: discordResult.error.message,
      },
    };
  }

  // TODO: Discord API 結果をキャッシュに反映する
  // setCachedGuilds は GuildWithPermissions[]（DB結合済み）を要求するため、
  // ここでは直接利用できない。user_guilds テーブル導入時にキャッシュ更新を追加する。

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

  return {
    success: true,
    auth: {
      supabase,
      userId: user.id,
      permissions: parsePermissions(discordGuild.permissions),
    },
  };
}

// ──────────────────────────────────────────────
// Task 6.1: ギルド設定更新
// ──────────────────────────────────────────────

type UpdateGuildConfigInput = {
  guildId: string;
  restricted: boolean;
};

/**
 * ギルド設定を更新する Server Action
 *
 * 認証チェック → サーバー側権限解決 → DB 更新の順に実行する。
 * 管理権限がない場合は PERMISSION_DENIED エラーを返す。
 */
export async function updateGuildConfig(
  input: UpdateGuildConfigInput
): Promise<GuildConfigMutationResult<GuildConfig>> {
  const result = await resolveServerAuth(input.guildId);

  if (!result.success) {
    return {
      success: false,
      error: {
        code: result.error.code,
        message: result.error.message,
      },
    };
  }

  const { auth } = result;

  if (!canManageGuild(auth.permissions)) {
    return {
      success: false,
      error: {
        code: "PERMISSION_DENIED",
        message: "ギルドの設定を変更するには管理権限が必要です。",
      },
    };
  }

  const service = createGuildConfigService(auth.supabase);
  const upsertResult = await service.upsertGuildConfig(input.guildId, {
    restricted: input.restricted,
  });

  if (upsertResult.success) {
    revalidatePath("/dashboard");
  }

  return upsertResult;
}

// ──────────────────────────────────────────────
// Task 6.2: イベント操作に権限チェックを追加
// ──────────────────────────────────────────────

type CreateEventActionInput = {
  guildId: string;
  eventData: CreateEventInput;
};

type UpdateEventActionInput = {
  eventId: string;
  guildId: string;
  eventData: UpdateEventInput;
};

type DeleteEventActionInput = {
  eventId: string;
  guildId: string;
};

/**
 * 認証 + 権限チェックを行う共通ヘルパー
 *
 * サーバー側で権限を解決し、guild_config の restricted フラグと組み合わせて
 * イベント操作の可否を判定する。
 */
async function authorizeEventOperation(
  guildId: string,
  operation: "create" | "update" | "delete"
): Promise<
  | { authorized: true; supabase: Awaited<ReturnType<typeof createClient>> }
  | { authorized: false; error: MutationResult<never> }
> {
  const result = await resolveServerAuth(guildId);

  if (!result.success) {
    return {
      authorized: false,
      error: {
        success: false,
        error: {
          code: result.error.code,
          message: result.error.message,
        },
      },
    };
  }

  const { auth } = result;

  const configService = createGuildConfigService(auth.supabase);
  const configResult = await configService.getGuildConfig(guildId);

  if (!configResult.success) {
    return {
      authorized: false,
      error: {
        success: false,
        error: {
          code: "FETCH_FAILED",
          message: configResult.error.message,
        },
      },
    };
  }

  const permCheck = checkEventPermission(
    operation,
    configResult.data,
    auth.permissions
  );

  if (!permCheck.allowed) {
    return {
      authorized: false,
      error: {
        success: false,
        error: {
          code: "PERMISSION_DENIED",
          message:
            permCheck.reason ??
            "このギルドではイベントの編集権限がありません。",
        },
      },
    };
  }

  return { authorized: true, supabase: auth.supabase };
}

/**
 * 権限チェック付きイベント作成 Server Action
 */
export async function createEventAction(
  input: CreateEventActionInput
): Promise<MutationResult<CalendarEvent>> {
  const auth = await authorizeEventOperation(input.guildId, "create");

  if (!auth.authorized) {
    return auth.error;
  }

  const eventService = createEventService(auth.supabase);
  return eventService.createEvent(input.eventData);
}

/**
 * 権限チェック付きイベント更新 Server Action
 */
export async function updateEventAction(
  input: UpdateEventActionInput
): Promise<MutationResult<CalendarEvent>> {
  const auth = await authorizeEventOperation(input.guildId, "update");

  if (!auth.authorized) {
    return auth.error;
  }

  const eventService = createEventService(auth.supabase);
  return eventService.updateEvent(input.eventId, input.eventData);
}

/**
 * 権限チェック付きイベント削除 Server Action
 */
export async function deleteEventAction(
  input: DeleteEventActionInput
): Promise<MutationResult<void>> {
  const auth = await authorizeEventOperation(input.guildId, "delete");

  if (!auth.authorized) {
    return auth.error;
  }

  const eventService = createEventService(auth.supabase);
  return eventService.deleteEvent(input.eventId);
}
