/**
 * Discord 権限ビットフィールド解析ユーティリティ
 *
 * Discord API から取得した権限ビットフィールド文字列を解析し、
 * 各管理権限フラグをブール値に変換する。
 *
 * Requirements: 1.1, 1.2, 1.3, 1.4
 */

const ONE = BigInt(1);
const ZERO = BigInt(0);

/** Discord 権限ビットフィールドのフラグ定数 */
export const DISCORD_PERMISSION_FLAGS = {
  ADMINISTRATOR: ONE << BigInt(3),
  MANAGE_CHANNELS: ONE << BigInt(4),
  MANAGE_GUILD: ONE << BigInt(5),
  MANAGE_MESSAGES: ONE << BigInt(13),
  MANAGE_ROLES: ONE << BigInt(28),
  MANAGE_EVENTS: ONE << BigInt(33),
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
  raw: ZERO,
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
    administrator: (raw & DISCORD_PERMISSION_FLAGS.ADMINISTRATOR) !== ZERO,
    manageGuild: (raw & DISCORD_PERMISSION_FLAGS.MANAGE_GUILD) !== ZERO,
    manageChannels: (raw & DISCORD_PERMISSION_FLAGS.MANAGE_CHANNELS) !== ZERO,
    manageMessages: (raw & DISCORD_PERMISSION_FLAGS.MANAGE_MESSAGES) !== ZERO,
    manageRoles: (raw & DISCORD_PERMISSION_FLAGS.MANAGE_ROLES) !== ZERO,
    manageEvents: (raw & DISCORD_PERMISSION_FLAGS.MANAGE_EVENTS) !== ZERO,
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
