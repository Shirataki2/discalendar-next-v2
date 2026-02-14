/**
 * イベント操作権限チェック関数
 *
 * Task 4: ギルド設定とユーザー権限に基づいてイベント操作の可否を判定する
 * - read 操作は常に許可
 * - restricted フラグが無効な場合はすべての操作を許可
 * - restricted フラグが有効で管理権限がない場合、create/update/delete を拒否
 *
 * Requirements: 4.1, 4.2, 4.3, 4.4
 */
import type { DiscordPermissions } from "@/lib/discord/permissions";
import { canManageGuild } from "@/lib/discord/permissions";
import type { GuildConfig } from "@/lib/guilds/guild-config-service";

export type EventOperation = "create" | "update" | "delete" | "read";

export interface PermissionCheckResult {
  allowed: boolean;
  reason?: string;
}

/**
 * イベント操作の権限を検証する
 *
 * @param operation - 操作種別（create/update/delete/read）
 * @param guildConfig - ギルド設定（restricted フラグ）
 * @param permissions - 解析済み Discord 権限
 * @returns 操作の可否と理由
 */
export function checkEventPermission(
  operation: EventOperation,
  guildConfig: GuildConfig,
  permissions: DiscordPermissions,
): PermissionCheckResult {
  // read 操作は常に許可（Req 4.4）
  if (operation === "read") {
    return { allowed: true };
  }

  // restricted フラグが無効な場合はすべて許可（Req 4.2）
  if (!guildConfig.restricted) {
    return { allowed: true };
  }

  // restricted フラグが有効で管理権限がない場合は拒否（Req 4.1）
  if (!canManageGuild(permissions)) {
    return {
      allowed: false,
      reason: "このギルドではイベントの編集権限がありません。",
    };
  }

  // restricted フラグが有効で管理権限がある場合は許可
  return { allowed: true };
}
