"use server";

/**
 * ダッシュボード関連の Server Actions
 *
 * Task 6.1: ギルド設定更新の Server Action
 * Task 6.2: イベント操作の Server Actions に権限チェックを追加
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
import { canManageGuild, parsePermissions } from "@/lib/discord/permissions";
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
// Task 6.1: ギルド設定更新
// ──────────────────────────────────────────────

type UpdateGuildConfigInput = {
  guildId: string;
  restricted: boolean;
  permissionsBitfield: string;
};

/**
 * ギルド設定を更新する Server Action
 *
 * 認証チェック → 権限チェック → DB 更新の順に実行する。
 * 管理権限がない場合は PERMISSION_DENIED エラーを返す。
 */
export async function updateGuildConfig(
  input: UpdateGuildConfigInput
): GuildConfigMutationResult<GuildConfig> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      success: false,
      error: {
        code: "UNAUTHORIZED",
        message: "認証が必要です。再度ログインしてください。",
      },
    };
  }

  const permissions = parsePermissions(input.permissionsBitfield);
  if (!canManageGuild(permissions)) {
    return {
      success: false,
      error: {
        code: "PERMISSION_DENIED",
        message: "ギルドの設定を変更するには管理権限が必要です。",
      },
    };
  }

  const service = createGuildConfigService(supabase);
  const result = await service.upsertGuildConfig(input.guildId, {
    restricted: input.restricted,
  });

  if (result.success) {
    revalidatePath("/dashboard");
  }

  return result;
}

// ──────────────────────────────────────────────
// Task 6.2: イベント操作に権限チェックを追加
// ──────────────────────────────────────────────

type CreateEventActionInput = {
  guildId: string;
  permissionsBitfield: string;
  eventData: CreateEventInput;
};

type UpdateEventActionInput = {
  eventId: string;
  guildId: string;
  permissionsBitfield: string;
  eventData: UpdateEventInput;
};

type DeleteEventActionInput = {
  eventId: string;
  guildId: string;
  permissionsBitfield: string;
};

/**
 * 認証 + 権限チェックを行う共通ヘルパー
 *
 * 認証済みかつ権限チェックをパスした場合に Supabase クライアントを返す。
 * 失敗時はエラー結果を返す。
 */
async function authorizeEventOperation(
  guildId: string,
  permissionsBitfield: string,
  operation: "create" | "update" | "delete"
): Promise<
  | { authorized: true; supabase: Awaited<ReturnType<typeof createClient>> }
  | { authorized: false; error: MutationResult<never> }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      authorized: false,
      error: { success: false, error: UNAUTHORIZED_ERROR },
    };
  }

  const configService = createGuildConfigService(supabase);
  const guildConfig = await configService.getGuildConfig(guildId);
  const permissions = parsePermissions(permissionsBitfield);
  const permCheck = checkEventPermission(operation, guildConfig, permissions);

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

  return { authorized: true, supabase };
}

/**
 * 権限チェック付きイベント作成 Server Action
 */
export async function createEventAction(
  input: CreateEventActionInput
): Promise<MutationResult<CalendarEvent>> {
  const auth = await authorizeEventOperation(
    input.guildId,
    input.permissionsBitfield,
    "create"
  );

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
  const auth = await authorizeEventOperation(
    input.guildId,
    input.permissionsBitfield,
    "update"
  );

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
  const auth = await authorizeEventOperation(
    input.guildId,
    input.permissionsBitfield,
    "delete"
  );

  if (!auth.authorized) {
    return auth.error;
  }

  const eventService = createEventService(auth.supabase);
  return eventService.deleteEvent(input.eventId);
}
