"use server";

/**
 * ダッシュボード関連の Server Actions
 *
 * Task 6.1: ギルド設定更新の Server Action
 * Task 6.2: イベント操作の Server Actions に権限チェックを追加
 * Task 4.1 (bot-invite-flow): ギルド再取得の Server Action
 * Task 3 (event-rsvp): RSVP Server Actions
 *
 * セキュリティ: クライアントから送信された permissionsBitfield を信頼せず、
 * サーバー側で Discord API / キャッシュから権限を解決する。
 *
 * Requirements: 3.3, 3.4, 4.1, 4.2, 4.3
 */

import { captureException } from "@sentry/nextjs";
import { revalidatePath } from "next/cache";
import { createAttachmentService } from "@/lib/calendar/attachment-service";
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
import { createPublicCalendarService } from "@/lib/calendar/public-calendar-service";
import { createRsvpService } from "@/lib/calendar/rsvp-service";
import {
  type AttendeeData,
  type AttendeeRecord,
  extractDiscordInfo,
  isValidRsvpStatus,
  type RsvpStatus,
} from "@/lib/calendar/rsvp-types";
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
import { createIcsFeedTokenService } from "@/lib/ics/ics-feed-token-service";
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

// ──────────────────────────────────────────────
// Task 3 (event-rsvp): RSVP Server Actions
// ──────────────────────────────────────────────

type UpsertRsvpActionInput = {
  guildId: string;
  eventId: string | null;
  seriesId: string | null;
  occurrenceDate: string | null;
  status: RsvpStatus;
};

type DeleteRsvpActionInput = {
  guildId: string;
  eventId: string | null;
  seriesId: string | null;
  occurrenceDate: string | null;
};

type FetchAttendeesActionInput = {
  guildId: string;
  eventId: string | null;
  seriesId: string | null;
  occurrenceDate: string | null;
};

/**
 * RSVP 認証ヘルパー
 *
 * resolveServerAuth でギルドメンバーシップを検証した上で、
 * Discord ユーザー情報を抽出して返す。
 */
async function resolveRsvpAuth(guildId: string): Promise<
  | {
      success: true;
      auth: ResolvedAuth;
      discordUserId: string;
      discordUsername: string;
      discordAvatarUrl: string | null;
    }
  | { success: false; error: CalendarError }
> {
  const authResult = await resolveServerAuth(guildId);
  if (!authResult.success) {
    return authResult;
  }

  const {
    data: { user },
  } = await authResult.auth.supabase.auth.getUser();
  if (!user) {
    return { success: false, error: UNAUTHORIZED_ERROR };
  }

  try {
    const discordInfo = extractDiscordInfo(user);
    return {
      success: true,
      auth: authResult.auth,
      discordUserId: discordInfo.discordUserId,
      discordUsername: discordInfo.discordUsername,
      discordAvatarUrl: discordInfo.discordAvatarUrl,
    };
  } catch {
    return {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message:
          "Discordユーザー情報の取得に失敗しました。再度ログインしてください。",
      },
    };
  }
}

/**
 * RSVP 出欠登録（upsert） Server Action
 *
 * 認証チェック → Discord 情報抽出 → ownership 取得 → upsert
 *
 * Requirements: 1.3, 2.2
 */
export async function upsertRsvpAction(
  input: UpsertRsvpActionInput
): Promise<MutationResult<AttendeeRecord>> {
  if (!GUILD_ID_PATTERN.test(input.guildId)) {
    return {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "ギルドIDの形式が不正です。",
      },
    };
  }

  if (!isValidRsvpStatus(input.status)) {
    return {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "無効なRSVPステータスです。",
      },
    };
  }

  const rsvpAuth = await resolveRsvpAuth(input.guildId);
  if (!rsvpAuth.success) {
    return { success: false, error: rsvpAuth.error };
  }

  const { auth } = rsvpAuth;

  // Bot 経由で作成された user_id = NULL のレコードの ownership を取得
  const { error: rpcError } = await auth.supabase.rpc("claim_rsvp_ownership", {
    p_discord_user_id: rsvpAuth.discordUserId,
    p_user_id: auth.userId,
  });
  if (rpcError) {
    captureException(
      new Error(
        `[upsertRsvpAction] claim_rsvp_ownership failed: ${rpcError.message}`
      )
    );
  }

  const rsvpService = createRsvpService(auth.supabase);
  const result = await rsvpService.upsertRsvp({
    guildId: input.guildId,
    eventId: input.eventId ?? undefined,
    seriesId: input.seriesId ?? undefined,
    occurrenceDate: input.occurrenceDate ?? undefined,
    userId: auth.userId,
    discordUserId: rsvpAuth.discordUserId,
    discordUsername: rsvpAuth.discordUsername,
    discordAvatarUrl: rsvpAuth.discordAvatarUrl,
    status: input.status,
  });

  return sanitizeResult(result);
}

/**
 * RSVP 出欠削除 Server Action
 *
 * 認証チェック → 出欠レコード削除（トグル解除用）
 *
 * Requirements: 2.4
 */
export async function deleteRsvpAction(
  input: DeleteRsvpActionInput
): Promise<MutationResult<void>> {
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
    return { success: false, error: authResult.error };
  }

  const { auth } = authResult;
  const rsvpService = createRsvpService(auth.supabase);
  const result = await rsvpService.deleteRsvp({
    guildId: input.guildId,
    eventId: input.eventId ?? undefined,
    seriesId: input.seriesId ?? undefined,
    occurrenceDate: input.occurrenceDate ?? undefined,
    userId: auth.userId,
  });

  return sanitizeResult(result);
}

/**
 * RSVP 参加者データ取得 Server Action
 *
 * 認証チェック → 参加者一覧・サマリー・現在ユーザーステータスを取得
 *
 * Requirements: 3.1, 3.2
 */
export async function fetchAttendeesAction(
  input: FetchAttendeesActionInput
): Promise<MutationResult<AttendeeData>> {
  if (!GUILD_ID_PATTERN.test(input.guildId)) {
    return {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "ギルドIDの形式が不正です。",
      },
    };
  }

  const rsvpAuth = await resolveRsvpAuth(input.guildId);
  if (!rsvpAuth.success) {
    return { success: false, error: rsvpAuth.error };
  }

  const { auth } = rsvpAuth;
  const rsvpService = createRsvpService(auth.supabase);
  const result = await rsvpService.fetchAttendees({
    guildId: input.guildId,
    eventId: input.eventId ?? undefined,
    seriesId: input.seriesId ?? undefined,
    occurrenceDate: input.occurrenceDate ?? undefined,
    currentDiscordUserId: rsvpAuth.discordUserId,
  });

  return sanitizeResult(result);
}

// ──────────────────────────────────────────────
// Task 3.2 (public-calendar-url): 公開カレンダー設定
// ──────────────────────────────────────────────

type TogglePublicCalendarInput = {
  guildId: string;
  enabled: boolean;
};

type TogglePublicCalendarResult =
  | { success: true; data: { isPublic: boolean; publicSlug: string | null } }
  | { success: false; error: { code: string; message: string } };

/**
 * 公開カレンダーの有効化/無効化を切り替える Server Action
 *
 * 認証チェック → MANAGE_GUILD 権限検証 → PublicCalendarService 操作
 * 成功時に revalidatePath で管理画面キャッシュを無効化する。
 *
 * Requirements: 1.1, 1.2
 */
export async function togglePublicCalendar(
  input: TogglePublicCalendarInput
): Promise<TogglePublicCalendarResult> {
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
        message: "公開カレンダーの設定にはサーバー管理権限が必要です。",
      },
    };
  }

  const service = createPublicCalendarService(auth.supabase);

  if (input.enabled) {
    const result = await service.enablePublicCalendar(input.guildId);

    if (!result.success) {
      return {
        success: false,
        error: {
          code: result.error.code,
          message: result.error.message,
        },
      };
    }

    revalidatePath("/dashboard");
    return {
      success: true,
      data: { isPublic: true, publicSlug: result.data.slug },
    };
  }

  const result = await service.disablePublicCalendar(input.guildId);

  if (!result.success) {
    return {
      success: false,
      error: {
        code: result.error.code,
        message: result.error.message,
      },
    };
  }

  revalidatePath("/dashboard");
  return {
    success: true,
    data: { isPublic: false, publicSlug: result.data.slug },
  };
}

type RegeneratePublicSlugInput = {
  guildId: string;
};

type RegeneratePublicSlugResult =
  | { success: true; data: { publicSlug: string } }
  | { success: false; error: { code: string; message: string } };

/**
 * 公開スラッグを再生成する Server Action
 *
 * 認証チェック → MANAGE_GUILD 権限検証 → PublicCalendarService.regeneratePublicSlug
 * 成功時に revalidatePath で管理画面キャッシュを無効化する。
 *
 * Requirements: 1.3
 */
export async function regeneratePublicSlugAction(
  input: RegeneratePublicSlugInput
): Promise<RegeneratePublicSlugResult> {
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
        message: "公開カレンダーの設定にはサーバー管理権限が必要です。",
      },
    };
  }

  const service = createPublicCalendarService(auth.supabase);
  const result = await service.regeneratePublicSlug(input.guildId);

  if (!result.success) {
    return {
      success: false,
      error: {
        code: result.error.code,
        message: result.error.message,
      },
    };
  }

  revalidatePath("/dashboard");
  return {
    success: true,
    data: { publicSlug: result.data.slug },
  };
}

// ──────────────────────────────────────────────
// Task 4.1 (ics-feed-export): ICSフィードトークン管理
// ──────────────────────────────────────────────

/** getOrCreateIcsFeedToken の戻り値型 */
export type IcsFeedTokenActionResult =
  | { success: true; data: { token: string; feedUrl: string } }
  | {
      success: false;
      error: { code: string; message: string };
    };

/**
 * ICSフィードトークンを取得、または新規生成する Server Action
 *
 * 認証チェック → ギルドメンバーシップ検証 → トークン取得/生成
 * 公開ギルドの場合はトークンなしのフィードURLを返す。
 *
 * Requirements: 4.5, 5.3, 6.3, 6.4
 */
export async function getOrCreateIcsFeedToken(
  guildId: string
): Promise<IcsFeedTokenActionResult> {
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

  const { auth } = authResult;
  const tokenService = createIcsFeedTokenService(auth.supabase);
  const supabaseProjectUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";

  // サーバー側でギルドの公開状態を取得（クライアント入力に依存しない）
  const publicCalendarService = createPublicCalendarService(auth.supabase);
  const publicSettings = await publicCalendarService.getPublicSettings(guildId);
  const isPublic = publicSettings.success && publicSettings.data.isPublic;

  if (isPublic) {
    return {
      success: true,
      data: {
        token: "",
        feedUrl: tokenService.buildFeedUrl({
          guildId,
          token: null,
          isPublic: true,
          supabaseProjectUrl,
        }),
      },
    };
  }

  const tokenResult = await tokenService.getOrCreateToken(guildId);

  if (!tokenResult.success) {
    return {
      success: false,
      error: {
        code: tokenResult.error.code,
        message: tokenResult.error.message,
      },
    };
  }

  return {
    success: true,
    data: {
      token: tokenResult.data.token,
      feedUrl: tokenService.buildFeedUrl({
        guildId,
        token: tokenResult.data.token,
        isPublic: false,
        supabaseProjectUrl,
      }),
    },
  };
}

/**
 * ICSフィードトークンを再生成する Server Action
 *
 * 既存のアクティブトークンを無効化し、新しいトークンを生成する。
 * 新しいトークンを含むフィードURLを返す。
 *
 * Requirements: 5.4, 6.5
 */
export async function regenerateIcsFeedToken(
  guildId: string
): Promise<IcsFeedTokenActionResult> {
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

  const { auth } = authResult;

  if (!canManageGuild(auth.permissions)) {
    return {
      success: false,
      error: {
        code: "PERMISSION_DENIED",
        message: "ICSフィードトークンを再生成するには管理権限が必要です。",
      },
    };
  }

  // 公開ギルドはトークン不要のため再生成を拒否
  const publicCalendarService = createPublicCalendarService(auth.supabase);
  const publicSettings = await publicCalendarService.getPublicSettings(guildId);
  if (publicSettings.success && publicSettings.data.isPublic) {
    return {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "公開カレンダーではトークンの再生成は不要です。",
      },
    };
  }

  const tokenService = createIcsFeedTokenService(auth.supabase);

  const tokenResult = await tokenService.regenerateToken(guildId);

  if (!tokenResult.success) {
    return {
      success: false,
      error: {
        code: tokenResult.error.code,
        message: tokenResult.error.message,
      },
    };
  }

  const supabaseProjectUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  return {
    success: true,
    data: {
      token: tokenResult.data.token,
      feedUrl: tokenService.buildFeedUrl({
        guildId,
        token: tokenResult.data.token,
        isPublic: false,
        supabaseProjectUrl,
      }),
    },
  };
}

// ──────────────────────────────────────────────
// 添付ファイル削除
// ──────────────────────────────────────────────

type DeleteAttachmentFilesInput = {
  guildId: string;
  paths: string[];
};

/**
 * 権限チェック付き添付ファイル削除 Server Action
 *
 * イベント更新時に削除対象の添付ファイルをSupabase Storageから削除する。
 * 削除失敗はログ記録のみで、エラーをクライアントに返さない（孤立ファイルは定期クリーンアップで対応）。
 *
 * Requirements: 7.2
 */
export async function deleteAttachmentFilesAction(
  input: DeleteAttachmentFilesInput
): Promise<MutationResult<void>> {
  if (input.paths.length === 0) {
    return { success: true, data: undefined };
  }

  const auth = await authorizeEventOperation(input.guildId, "update");
  if (!auth.success) {
    return auth.error;
  }

  const attachmentService = createAttachmentService(auth.supabase);
  const result = await attachmentService.deleteFiles(input.paths);

  if (!result.success) {
    captureException(
      new Error(`Attachment deletion failed: ${result.error.details}`)
    );
  }

  // 削除失敗でも成功として返す（孤立ファイルは定期クリーンアップで対応）
  return { success: true, data: undefined };
}

// ──────────────────────────────────────────────
// 添付ファイルURL取得
// ──────────────────────────────────────────────

type GetAttachmentUrlsInput = {
  guildId: string;
  attachments: import("@/lib/calendar/attachment-types").AttachmentMeta[];
};

/**
 * 添付ファイルのSigned URLを取得する Server Action
 *
 * 認証・ギルドメンバーシップチェック後にattachment-serviceのgetSignedUrlsを呼び出す。
 *
 * Requirements: 3.1, 3.2, 6.1, 6.2
 */
export async function getAttachmentUrlsAction(
  input: GetAttachmentUrlsInput
): Promise<
  MutationResult<import("@/lib/calendar/attachment-service").SignedUrlResult[]>
> {
  if (input.attachments.length === 0) {
    return { success: true, data: [] };
  }

  const authResult = await resolveServerAuth(input.guildId);
  if (!authResult.success) {
    return { success: false, error: authResult.error };
  }

  const attachmentService = createAttachmentService(authResult.auth.supabase);
  const result = await attachmentService.getSignedUrls(input.attachments);

  return sanitizeResult(result);
}
