import { type GuildMember, PermissionFlagsBits } from "discord.js";

const MANAGEMENT_PERMISSIONS = [
  PermissionFlagsBits.Administrator,
  PermissionFlagsBits.ManageGuild,
  PermissionFlagsBits.ManageRoles,
  PermissionFlagsBits.ManageMessages,
] as const;

export function hasManagementPermission(member: GuildMember | null): boolean {
  if (!member) {
    return false;
  }
  return MANAGEMENT_PERMISSIONS.some((perm) => member.permissions.has(perm));
}
