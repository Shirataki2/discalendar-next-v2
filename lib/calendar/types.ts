/**
 * イベント型定義とデータ変換ロジック
 *
 * タスク2.1: イベント型定義とデータ変換ロジックの作成
 * - Supabaseから取得するEventRecordの型定義
 * - カレンダー表示用のCalendarEvent型
 * - EventRecordからCalendarEventへの変換関数
 *
 * Requirements: 3.1, 9.1
 */

/**
 * 通知タイミングの単位
 */
export type NotificationUnit = "minutes" | "hours" | "days" | "weeks";

/**
 * 通知設定
 */
export interface NotificationSetting {
  /** 一意キー */
  key: string;
  /** 数値（1〜99） */
  num: number;
  /** 単位 */
  unit: NotificationUnit;
}

/**
 * 通知単位の日本語表示ラベル
 */
export const NOTIFICATION_UNIT_LABELS: Record<NotificationUnit, string> = {
  minutes: "分前",
  hours: "時間前",
  days: "日前",
  weeks: "週間前",
};

/**
 * Supabaseから取得するイベントレコード型
 * eventsテーブルのカラム構造に対応
 */
export interface EventRecord {
  /** イベントID (UUID) */
  id: string;
  /** ギルドID (Discord サーバーID) */
  guild_id: string;
  /** イベント名 */
  name: string;
  /** イベントの説明 */
  description: string | null;
  /** イベントカラー (HEXコード) */
  color: string;
  /** 終日イベントフラグ */
  is_all_day: boolean;
  /** 開始日時 (ISO 8601形式) */
  start_at: string;
  /** 終了日時 (ISO 8601形式) */
  end_at: string;
  /** 場所情報 */
  location: string | null;
  /** Discordチャンネル ID */
  channel_id: string | null;
  /** Discordチャンネル名 */
  channel_name: string | null;
  /** 通知設定 (JSONB) */
  notifications: NotificationSetting[];
  /** 作成日時 (ISO 8601形式) */
  created_at: string;
  /** 更新日時 (ISO 8601形式) */
  updated_at: string;
}

/**
 * Discordチャンネル情報
 */
export interface ChannelInfo {
  /** チャンネルID */
  id: string;
  /** チャンネル名 */
  name: string;
}

/**
 * カレンダー表示用のイベント型
 * react-big-calendarが期待するEvent型に準拠
 */
export interface CalendarEvent {
  /** イベントID */
  id: string;
  /** イベント名 (react-big-calendarではtitleを使用) */
  title: string;
  /** 開始日時 */
  start: Date;
  /** 終了日時 */
  end: Date;
  /** 終日イベントフラグ (Req 9.1) */
  allDay: boolean;
  /** イベントカラー */
  color: string;
  /** イベントの説明 */
  description?: string;
  /** 場所情報 */
  location?: string;
  /** Discordチャンネル情報 */
  channel?: ChannelInfo;
  /** 通知設定 */
  notifications?: NotificationSetting[];
}

/**
 * EventRecordからCalendarEventへの変換関数
 *
 * @param record - Supabaseから取得したイベントレコード
 * @returns カレンダー表示用のイベントオブジェクト
 */
export function toCalendarEvent(record: EventRecord): CalendarEvent {
  // チャンネル情報の構築 (両方のフィールドが存在する場合のみ)
  const channel: ChannelInfo | undefined =
    record.channel_id && record.channel_name
      ? { id: record.channel_id, name: record.channel_name }
      : undefined;

  return {
    id: record.id,
    title: record.name,
    start: new Date(record.start_at),
    end: new Date(record.end_at),
    allDay: record.is_all_day,
    color: record.color,
    description: record.description ?? undefined,
    location: record.location ?? undefined,
    channel,
    notifications: Array.isArray(record.notifications)
      ? record.notifications
          .filter(
            (n): n is NotificationSetting & { key?: string } =>
              typeof n === "object" &&
              n !== null &&
              "num" in n &&
              "unit" in n &&
              typeof n.num === "number" &&
              typeof n.unit === "string",
          )
          .map((n) => ({
            ...n,
            key:
              typeof n.key === "string" && n.key.length > 0
                ? n.key
                : `db-${n.num}-${n.unit}-${Math.random().toString(36).slice(2, 9)}`,
          }))
      : [],
  };
}

/**
 * EventRecord配列からCalendarEvent配列への変換関数
 *
 * @param records - Supabaseから取得したイベントレコードの配列
 * @returns カレンダー表示用のイベントオブジェクトの配列
 */
export function toCalendarEvents(records: EventRecord[]): CalendarEvent[] {
  return records.map(toCalendarEvent);
}
