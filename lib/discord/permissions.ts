/**
 * Discord 権限ビットフィールド解析ユーティリティ
 *
 * Discord API から取得した権限ビットフィールド文字列を解析し、
 * 各管理権限フラグをブール値に変換する。
 *
 * Requirements: 1.1, 1.2, 1.3, 1.4
 */

/** Discord 権限ビットフィールドのフラグ定数 */
export const DISCORD_PERMISSION_FLAGS = {
  ADMINISTRATOR: 1n << 3n,
  MANAGE_CHANNELS: 1n << 4n,
  MANAGE_GUILD: 1n << 5n,
  MANAGE_MESSAGES: 1n << 13n,
  MANAGE_ROLES: 1n << 28n,
  MANAGE_EVENTS: 1n << 33n,
} as const;

/** 解析済み Discord 権限 */
export interface DiscordPermissions {
  administrator: boolean;
  manageGuild: boolean;
  manageChannels: boolean;
  manageMessages: boolean;
  manageRoles: boolean;
  manageEvents: boolean;
  raw: bigint;
}

const DEFAULT_PERMISSIONS: DiscordPermissions = {
  administrator: false,
  manageGuild: false,
  manageChannels: false,
  manageMessages: false,
  manageRoles: false,
  manageEvents: false,
  raw: 0n,
};

/**
 * 権限ビットフィールド文字列を解析し、各権限フラグをブール値に変換する
 *
 * @param permissionsBitfield 数値文字列または空文字列
 * @returns 解析済み権限オブジェクト
 */
export function parsePermissions(
  permissionsBitfield: string
): DiscordPermissions {
  if (!permissionsBitfield) {
    return DEFAULT_PERMISSIONS;
  }

  let raw: bigint;
  try {
    raw = BigInt(permissionsBitfield);
  } catch {
    return DEFAULT_PERMISSIONS;
  }

  return {
    administrator: (raw & DISCORD_PERMISSION_FLAGS.ADMINISTRATOR) !== 0n,
    manageGuild: (raw & DISCORD_PERMISSION_FLAGS.MANAGE_GUILD) !== 0n,
    manageChannels: (raw & DISCORD_PERMISSION_FLAGS.MANAGE_CHANNELS) !== 0n,
    manageMessages: (raw & DISCORD_PERMISSION_FLAGS.MANAGE_MESSAGES) !== 0n,
    manageRoles: (raw & DISCORD_PERMISSION_FLAGS.MANAGE_ROLES) !== 0n,
    manageEvents: (raw & DISCORD_PERMISSION_FLAGS.MANAGE_EVENTS) !== 0n,
    raw,
  };
}

/**
 * 管理権限の有無を判定する
 *
 * administrator / manageGuild / manageMessages / manageRoles の
 * いずれかが true の場合に true を返す。
 *
 * @param permissions 解析済み権限オブジェクト
 * @returns 管理権限の有無
 */
export function canManageGuild(permissions: DiscordPermissions): boolean {
  return (
    permissions.administrator ||
    permissions.manageGuild ||
    permissions.manageMessages ||
    permissions.manageRoles
  );
}
