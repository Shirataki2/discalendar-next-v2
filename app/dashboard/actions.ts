"use server";

/**
 * ダッシュボード関連の Server Actions
 *
 * Task 6.1: ギルド設定更新の Server Action
 * Task 6.2: イベント操作の Server Actions に権限チェックを追加
 * Task 4.1 (bot-invite-flow): ギルド再取得の Server Action
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

// ──────────────────────────────────────────────
// Task 4.1 (bot-invite-flow): ギルド再取得
// ──────────────────────────────────────────────

import { fetchGuilds } from "@/app/dashboard/page";
import { clearCache } from "@/lib/guilds/cache";
import type { Guild, GuildListError, InvitableGuild } from "@/lib/guilds/types";
import type { GuildPermissionInfo } from "./dashboard-with-calendar";

/** refreshGuilds の戻り値型 */
export type RefreshGuildsResult = {
  guilds: Guild[];
  invitableGuilds: InvitableGuild[];
  guildPermissions: Record<string, GuildPermissionInfo>;
  error?: GuildListError;
};

/**
 * ギルド一覧を再取得する Server Action
 *
 * キャッシュを無効化して最新データを取得する。
 * タブ復帰時の自動更新で使用される。
 *
 * Requirements: bot-invite-flow 5.1, 5.2
 */
export async function refreshGuilds(): Promise<RefreshGuildsResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      guilds: [],
      invitableGuilds: [],
      guildPermissions: {},
      error: { type: "no_token" },
    };
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();
  const providerToken = session?.provider_token;

  if (!providerToken) {
    return {
      guilds: [],
      invitableGuilds: [],
      guildPermissions: {},
      error: { type: "no_token" },
    };
  }

  // キャッシュを無効化して再取得
  clearCache(user.id);
  const result = await fetchGuilds(user.id, providerToken);

  if (result.error) {
    return {
      guilds: [],
      invitableGuilds: [],
      guildPermissions: {},
      error: result.error,
    };
  }

  // GuildWithPermissions -> Guild にマッピング（BigInt シリアライズ対策）
  // guildPermissions マップに権限情報を移動
  const guildPermissions: Record<string, GuildPermissionInfo> = {};

  // guild_config テーブルから restricted フラグを一括取得
  const guildIds = result.guilds.map((g) => g.guildId);
  const restrictedMap = new Map<string, boolean>();

  if (guildIds.length > 0) {
    const { data, error } = await supabase
      .from("guild_config")
      .select("guild_id, restricted")
      .in("guild_id", guildIds);

    if (!error && data) {
      for (const row of data) {
        restrictedMap.set(String(row.guild_id), Boolean(row.restricted));
      }
    }
  }

  for (const guild of result.guilds) {
    guildPermissions[guild.guildId] = {
      permissionsBitfield: guild.permissions.raw.toString(),
      restricted: restrictedMap.get(guild.guildId) ?? false,
    };
  }

  // permissions フィールドを除外して Guild[] に変換
  const guilds: Guild[] = result.guilds.map(
    ({ permissions: _permissions, ...guild }) => guild
  );

  return {
    guilds,
    invitableGuilds: result.invitableGuilds,
    guildPermissions,
  };
}
