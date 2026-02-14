/**
 * ギルド権限チェック用 React Hook
 *
 * Server Component から渡された権限情報を基に、
 * ギルド内のユーザー権限状態を計算して返す。
 *
 * Requirements: 6.1, 6.2, 6.3, 6.4
 */
import { useMemo } from "react";
import {
  parsePermissions,
  canManageGuild as checkCanManageGuild,
} from "@/lib/discord/permissions";

export interface GuildPermissionsState {
  /** 管理権限（administrator / manage_guild / manage_messages / manage_roles） */
  canManageGuild: boolean;
  /** ギルドの restricted フラグ */
  isRestricted: boolean;
  /** イベント編集可否の最終判定 */
  canEditEvents: boolean;
  /** 権限情報のローディング状態 */
  isLoading: boolean;
  /** エラー状態 */
  error: string | null;
}

/**
 * ギルド権限状態を計算する Hook
 *
 * @param guildId 現在選択中のギルド ID（null はギルド未選択）
 * @param permissionsBitfield Discord 権限ビットフィールド文字列（null はローディング中）
 * @param restricted ギルドの制限フラグ
 * @returns 権限状態
 */
export function useGuildPermissions(
  guildId: string | null,
  permissionsBitfield: string | null,
  restricted: boolean,
): GuildPermissionsState {
  return useMemo(() => {
    // ギルド未選択
    if (!guildId) {
      return {
        canManageGuild: false,
        isRestricted: false,
        canEditEvents: false,
        isLoading: false,
        error: null,
      };
    }

    // 権限情報がまだ提供されていない（ローディング中）
    if (permissionsBitfield === null) {
      return {
        canManageGuild: false,
        isRestricted: restricted,
        canEditEvents: false,
        isLoading: true,
        error: null,
      };
    }

    // 権限を解析
    const permissions = parsePermissions(permissionsBitfield);
    const hasManagePermission = checkCanManageGuild(permissions);

    // canEditEvents: restricted でない場合は全員編集可能、restricted の場合は管理権限が必要
    const canEdit = !restricted || hasManagePermission;

    return {
      canManageGuild: hasManagePermission,
      isRestricted: restricted,
      canEditEvents: canEdit,
      isLoading: false,
      error: null,
    };
  }, [guildId, permissionsBitfield, restricted]);
}
