export type NotificationUnit = "minutes" | "hours" | "days" | "weeks";

export const NOTIFICATION_UNIT_LABELS: Record<NotificationUnit, string> = {
  minutes: "分前",
  hours: "時間前",
  days: "日前",
  weeks: "週間前",
};

export type NotificationPayload = {
  key: string;
  num: number;
  unit: NotificationUnit;
};

export type EventRecord = {
  id: string;
  guild_id: string;
  name: string;
  description: string | null;
  color: string;
  is_all_day: boolean;
  start_at: string;
  end_at: string;
  location: string | null;
  channel_id: string | null;
  channel_name: string | null;
  notifications: NotificationPayload[];
  created_at: string;
  updated_at: string;
};

export type EventCreate = {
  guild_id: string;
  name: string;
  start_at: string;
  end_at: string;
  description?: string | null;
  color?: string;
  is_all_day?: boolean;
  location?: string | null;
  channel_id?: string | null;
  channel_name?: string | null;
  notifications?: NotificationPayload[];
};

export type EventSettings = {
  id: number;
  guild_id: string;
  channel_id: string;
};
