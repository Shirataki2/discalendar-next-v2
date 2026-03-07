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

import { captureException } from "@sentry/nextjs";
import { revalidatePath } from "next/cache";
import {
  type CalendarError,
  type CreateEventInput,
  type CreateSeriesInput,
  createEventService,
  type MutationResult,
  type UpdateEventInput,
  type UpdateSeriesInput,
} from "@/lib/calendar/event-service";
import { checkEventPermission } from "@/lib/calendar/permission-check";
import type {
  CalendarEvent,
  EditScope,
  EventSeriesRecord,
} from "@/lib/calendar/types";
import { getUserGuilds } from "@/lib/discord/client";
import {
  type DiscordTextChannel,
  getGuildChannels,
} from "@/lib/discord/notification-channel-service";
import {
  canManageGuild,
  type DiscordPermissions,
  parsePermissions,
} from "@/lib/discord/permissions";
import { clearCache, getCachedGuilds } from "@/lib/guilds/cache";
import {
  createEventSettingsService,
  type EventSettings,
  type EventSettingsMutationResult,
} from "@/lib/guilds/event-settings-service";
import { fetchGuilds } from "@/lib/guilds/fetch-guilds";
import {
  createGuildConfigService,
  type GuildConfig,
  type GuildConfigMutationResult,
} from "@/lib/guilds/guild-config-service";
import type { Guild, GuildListError, InvitableGuild } from "@/lib/guilds/types";
import { createUserGuildsService } from "@/lib/guilds/user-guilds-service";
import { createClient } from "@/lib/supabase/server";
import { SNOWFLAKE_PATTERN } from "@/lib/validation/snowflake";
import type { GuildPermissionInfo } from "./dashboard-with-calendar";

/** 共通の未認証エラー */
const UNAUTHORIZED_ERROR: CalendarError = {
  code: "UNAUTHORIZED",
  message: "認証が必要です。再度ログインしてください。",
};

/** guild_id のフォーマット検証（Discord Snowflake: 数値17〜20桁） */
const GUILD_ID_PATTERN = SNOWFLAKE_PATTERN;

/**
 * MutationResult からデバッグ用の details フィールドを除去する
 *
 * Server Action → クライアントの境界で使用し、
 * Supabase の内部エラーメッセージがクライアントに漏洩するのを防ぐ。
 */
function sanitizeResult<T>(result: MutationResult<T>): MutationResult<T>;
function sanitizeResult<T>(
  result: GuildConfigMutationResult<T>
): GuildConfigMutationResult<T>;
function sanitizeResult<T>(
  result: MutationResult<T> | GuildConfigMutationResult<T>
) {
  if (result.success) {
    return result;
  }
  const { details: _details, ...error } = result.error;
  return { success: false, error };
}

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
 * 2. user_guilds DB からフォールバック
 * 3. Discord API からフォールバック（成功時は DB に書き戻し）
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

  // 2. user_guilds DB からフォールバック
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

  // 3. Discord API からフォールバック
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

  // Discord API 成功時に user_guilds へ書き戻し（次回以降の DB 参照を可能にする）
  // upsertSingleGuild を使用し、他ギルドのメンバーシップを削除しない
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

  return sanitizeResult(upsertResult);
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
  | { success: true; supabase: Awaited<ReturnType<typeof createClient>> }
  | { success: false; error: MutationResult<never> }
> {
  if (!GUILD_ID_PATTERN.test(guildId)) {
    return {
      success: false,
      error: {
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "ギルドIDの形式が不正です。",
        },
      },
    };
  }

  const result = await resolveServerAuth(guildId);

  if (!result.success) {
    return {
      success: false,
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
      success: false,
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
      success: false,
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

  return { success: true, supabase: auth.supabase };
}

// NOTE: イベント操作の Server Actions では revalidatePath を呼び出さない。
// 現在イベントデータは Client Component で fetchEvents() による手動再取得パターンを
// 採用しているため、サーバー側のキャッシュ無効化は不要。

/**
 * 権限チェック付きイベント作成 Server Action
 */
export async function createEventAction(
  input: CreateEventActionInput
): Promise<MutationResult<CalendarEvent>> {
  const auth = await authorizeEventOperation(input.guildId, "create");

  if (!auth.success) {
    return auth.error;
  }

  const eventService = createEventService(auth.supabase);
  return sanitizeResult(await eventService.createEvent(input.eventData));
}

/**
 * 権限チェック付きイベント更新 Server Action
 */
export async function updateEventAction(
  input: UpdateEventActionInput
): Promise<MutationResult<CalendarEvent>> {
  const auth = await authorizeEventOperation(input.guildId, "update");

  if (!auth.success) {
    return auth.error;
  }

  const eventService = createEventService(auth.supabase);
  return sanitizeResult(
    await eventService.updateEvent(
      input.guildId,
      input.eventId,
      input.eventData
    )
  );
}

/**
 * 権限チェック付きイベント削除 Server Action
 */
export async function deleteEventAction(
  input: DeleteEventActionInput
): Promise<MutationResult<void>> {
  const auth = await authorizeEventOperation(input.guildId, "delete");

  if (!auth.success) {
    return auth.error;
  }

  const eventService = createEventService(auth.supabase);
  return sanitizeResult(
    await eventService.deleteEvent(input.guildId, input.eventId)
  );
}

// ──────────────────────────────────────────────
// Task 4.1 (recurring-events): 繰り返しイベント作成
// ──────────────────────────────────────────────

type CreateRecurringEventActionInput = {
  guildId: string;
  eventData: CreateSeriesInput;
};

/**
 * 権限チェック付き繰り返しイベントシリーズ作成 Server Action
 *
 * 繰り返し設定が有効なイベントシリーズを作成する。
 * 既存の createEventAction と並行し、UI 側で繰り返し有無に応じて呼び分ける。
 *
 * Requirements: 1.3, 1.5
 */
export async function createRecurringEventAction(
  input: CreateRecurringEventActionInput
): Promise<MutationResult<EventSeriesRecord>> {
  const auth = await authorizeEventOperation(input.guildId, "create");

  if (!auth.success) {
    return auth.error;
  }

  const eventService = createEventService(auth.supabase);
  return sanitizeResult(
    await eventService.createRecurringSeries(input.eventData)
  );
}

// ──────────────────────────────────────────────
// Task 4.2 (recurring-events): オカレンス編集・削除
// ──────────────────────────────────────────────

type UpdateOccurrenceActionInput =
  | {
      guildId: string;
      seriesId: string;
      scope: "this";
      occurrenceDate: Date;
      eventData: UpdateEventInput;
    }
  | {
      guildId: string;
      seriesId: string;
      scope: "all";
      occurrenceDate: Date;
      eventData: UpdateSeriesInput;
    }
  | {
      guildId: string;
      seriesId: string;
      scope: "following";
      occurrenceDate: Date;
      eventData: UpdateSeriesInput;
    };

type DeleteOccurrenceActionInput = {
  guildId: string;
  seriesId: string;
  scope: EditScope;
  occurrenceDate: Date;
};

/**
 * 権限チェック付きオカレンス編集 Server Action
 *
 * 編集スコープに応じて適切な EventService メソッドに委譲する:
 * - "this": updateOccurrence（例外レコード作成）
 * - "all": updateSeries（シリーズ全体更新）
 * - "following": splitSeries（シリーズ分割）
 *
 * Requirements: 5.2, 6.1, 6.2, 7.1
 */
export async function updateOccurrenceAction(
  input: UpdateOccurrenceActionInput
): Promise<MutationResult<CalendarEvent | EventSeriesRecord>> {
  const auth = await authorizeEventOperation(input.guildId, "update");

  if (!auth.success) {
    return auth.error;
  }

  const eventService = createEventService(auth.supabase);

  switch (input.scope) {
    case "this":
      return sanitizeResult(
        await eventService.updateOccurrence(
          input.guildId,
          input.seriesId,
          input.occurrenceDate,
          input.eventData
        )
      );
    case "all":
      return sanitizeResult(
        await eventService.updateSeries(
          input.guildId,
          input.seriesId,
          input.eventData
        )
      );
    case "following":
      return sanitizeResult(
        await eventService.splitSeries(
          input.guildId,
          input.seriesId,
          input.occurrenceDate,
          input.eventData
        )
      );
    default: {
      const _exhaustive: never = input;
      return _exhaustive;
    }
  }
}

/**
 * 権限チェック付きオカレンス削除 Server Action
 *
 * 削除スコープに応じて適切な EventService メソッドに委譲する:
 * - "this": deleteOccurrence（EXDATE 追加）
 * - "all": deleteSeries（シリーズ全体削除）
 * - "following": truncateSeries（シリーズ切り詰め）
 *
 * Requirements: 5.4, 6.3, 7.2
 */
export async function deleteOccurrenceAction(
  input: DeleteOccurrenceActionInput
): Promise<MutationResult<void>> {
  const auth = await authorizeEventOperation(input.guildId, "delete");

  if (!auth.success) {
    return auth.error;
  }

  const eventService = createEventService(auth.supabase);

  switch (input.scope) {
    case "this":
      return sanitizeResult(
        await eventService.deleteOccurrence(
          input.guildId,
          input.seriesId,
          input.occurrenceDate
        )
      );
    case "all":
      return sanitizeResult(
        await eventService.deleteSeries(input.guildId, input.seriesId)
      );
    case "following":
      return sanitizeResult(
        await eventService.truncateSeries(
          input.guildId,
          input.seriesId,
          input.occurrenceDate
        )
      );
    default: {
      const _exhaustive: never = input.scope;
      return _exhaustive;
    }
  }
}

// ──────────────────────────────────────────────
// Task 4.1 (bot-invite-flow): ギルド再取得
// ──────────────────────────────────────────────

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

// ──────────────────────────────────────────────
// Task 4.1 (notification-channel-settings): チャンネル一覧取得
// ──────────────────────────────────────────────

/** fetchGuildChannels の戻り値型 */
type FetchGuildChannelsResult =
  | { success: true; data: DiscordTextChannel[] }
  | { success: false; error: { code: string; message: string } };

/**
 * ギルドの通知チャンネル一覧を取得する Server Action
 *
 * 認証チェック後に Discord BOT API からチャンネル一覧を取得する。
 * チャンネル閲覧は管理権限不要（MANAGE_GUILD チェックなし）。
 *
 * Requirements: 1.1, 5.1, 5.3
 */
export async function fetchGuildChannels(
  guildId: string
): Promise<FetchGuildChannelsResult> {
  if (!GUILD_ID_PATTERN.test(guildId)) {
    return {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "ギルドIDの形式が不正です。",
      },
    };
  }

  const authResult = await resolveServerAuth(guildId);

  if (!authResult.success) {
    return {
      success: false,
      error: {
        code: authResult.error.code,
        message: authResult.error.message,
      },
    };
  }

  // チャンネル一覧の閲覧は管理権限不要（design.md: canManageGuild チェック不要）
  const channelsResult = await getGuildChannels(guildId);

  if (!channelsResult.success) {
    return {
      success: false,
      error: {
        code: channelsResult.error.code,
        message: channelsResult.error.message,
      },
    };
  }

  return { success: true, data: channelsResult.data };
}

// ──────────────────────────────────────────────
// Task 4.2 (notification-channel-settings): 通知チャンネル更新
// ──────────────────────────────────────────────

type UpdateNotificationChannelInput = {
  guildId: string;
  channelId: string;
};

/**
 * 通知チャンネル設定を更新する Server Action
 *
 * 認証 → MANAGE_GUILD 権限チェック → チャンネルID バリデーション → upsert
 *
 * Requirements: 3.1, 3.2, 5.1, 5.2, 5.3
 */
export async function updateNotificationChannel(
  input: UpdateNotificationChannelInput
): Promise<EventSettingsMutationResult<EventSettings>> {
  if (!GUILD_ID_PATTERN.test(input.guildId)) {
    return {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "ギルドIDの形式が不正です。",
      },
    };
  }

  const authResult = await resolveServerAuth(input.guildId);

  if (!authResult.success) {
    return {
      success: false,
      error: {
        code: authResult.error.code,
        message: authResult.error.message,
      },
    };
  }

  const { auth } = authResult;

  if (!canManageGuild(auth.permissions)) {
    return {
      success: false,
      error: {
        code: "PERMISSION_DENIED",
        message: "通知チャンネルの設定にはサーバー管理権限が必要です。",
      },
    };
  }

  if (!SNOWFLAKE_PATTERN.test(input.channelId)) {
    return {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "無効なチャンネルIDです。",
      },
    };
  }

  const service = createEventSettingsService(auth.supabase);
  const result = await service.upsertEventSettings(
    input.guildId,
    input.channelId
  );

  if (!result.success) {
    const { details, ...error } = result.error;
    if (process.env.NODE_ENV !== "production") {
      console.error("[updateNotificationChannel] upsert failed:", {
        code: error.code,
        message: error.message,
        details,
        guildId: input.guildId,
      });
    }
    return { success: false, error };
  }

  return result;
}
