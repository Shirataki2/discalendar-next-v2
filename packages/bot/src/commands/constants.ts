import type { SlashCommandOptionsOnlyBuilder } from "discord.js";
import type { NotificationUnit } from "../types/event.js";

export const COLOR_CHOICES = [
  { name: "白", value: "white" },
  { name: "黒", value: "black" },
  { name: "赤", value: "red" },
  { name: "青", value: "blue" },
  { name: "緑", value: "green" },
  { name: "黄", value: "yellow" },
  { name: "紫", value: "purple" },
  { name: "灰", value: "gray" },
  { name: "茶", value: "brown" },
  { name: "水色", value: "aqua" },
] as const;

export const COLOR_MAP: Record<string, string> = {
  white: "#ffffff",
  black: "#000000",
  red: "#fd4028",
  blue: "#3e44f7",
  green: "#33f54b",
  yellow: "#eaff33",
  purple: "#a31ce0",
  gray: "#808080",
  brown: "#a54f4f",
  aqua: "#44f3f3",
};

export const NOTIFICATION_CHOICES = [
  { name: "5分前", value: "5m" },
  { name: "10分前", value: "10m" },
  { name: "15分前", value: "15m" },
  { name: "30分前", value: "30m" },
  { name: "1時間前", value: "1h" },
  { name: "2時間前", value: "2h" },
  { name: "3時間前", value: "3h" },
  { name: "6時間前", value: "6h" },
  { name: "12時間前", value: "12h" },
  { name: "1日前", value: "1d" },
  { name: "2日前", value: "2d" },
  { name: "3日前", value: "3d" },
  { name: "7日前", value: "7d" },
] as const;

export const NOTIFY_MAP: Record<
  string,
  { num: number; unit: NotificationUnit }
> = {
  "5m": { num: 5, unit: "minutes" },
  "10m": { num: 10, unit: "minutes" },
  "15m": { num: 15, unit: "minutes" },
  "30m": { num: 30, unit: "minutes" },
  "1h": { num: 1, unit: "hours" },
  "2h": { num: 2, unit: "hours" },
  "3h": { num: 3, unit: "hours" },
  "6h": { num: 6, unit: "hours" },
  "12h": { num: 12, unit: "hours" },
  "1d": { num: 1, unit: "days" },
  "2d": { num: 2, unit: "days" },
  "3d": { num: 3, unit: "days" },
  "7d": { num: 7, unit: "days" },
};

export const MIN_YEAR = 1970;
export const MAX_YEAR = 2099;

export function addNotifyOption(
  cmd: SlashCommandOptionsOnlyBuilder,
  name: string,
  description: string
): void {
  cmd.addStringOption((opt) =>
    opt
      .setName(name)
      .setDescription(description)
      .addChoices(...NOTIFICATION_CHOICES)
      .setRequired(false)
  );
}
