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
