/**
 * 日本の祝日データ取得ユーティリティ
 *
 * @holiday-jp/holiday_jp をラップし、期間指定で祝日データを取得する。
 * 外部APIへのネットワークリクエストを発行せず、ライブラリのオフラインデータのみ使用。
 *
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5
 */
import holiday_jp from "@holiday-jp/holiday_jp";
import type { CalendarEvent } from "./types";

/** 祝日イベントIDのプレフィックス */
export const HOLIDAY_EVENT_ID_PREFIX = "holiday-";

/** 祝日イベントの表示色 */
export const HOLIDAY_COLOR = "#ef4444";

/**
 * 祝日情報
 */
export interface HolidayInfo {
  /** 祝日の日付 */
  date: Date;
  /** 祝日名（日本語） */
  name: string;
}

/**
 * イベントが祝日イベントかどうかを判定する
 */
export function isHolidayEvent(event: CalendarEvent): boolean {
  return event.id.startsWith(HOLIDAY_EVENT_ID_PREFIX);
}

/**
 * 指定期間の祝日を取得する
 *
 * @param start - 取得開始日
 * @param end - 取得終了日
 * @returns 期間内の祝日一覧
 */
export function getHolidaysInRange(start: Date, end: Date): HolidayInfo[] {
  const holidays = holiday_jp.between(start, end);
  return holidays.map((h) => ({
    date: h.date,
    name: h.name,
  }));
}

/**
 * 指定日が祝日かどうかを判定する
 * 祝日の場合は祝日名を返し、祝日でない場合は null を返す
 *
 * @param date - 判定する日付
 * @returns 祝日名または null
 */
export function getHolidayName(date: Date): string | null {
  const holidays = holiday_jp.between(date, date);
  if (holidays.length === 0) {
    return null;
  }
  return holidays[0].name;
}

/**
 * 祝日データを CalendarEvent 形式に変換する
 * 通常の終日イベントと同じ形式で表示される
 *
 * @param holidays - 祝日情報の配列
 * @returns CalendarEvent の配列
 */
export function toHolidayEvents(holidays: HolidayInfo[]): CalendarEvent[] {
  return holidays.map((h) => {
    // holiday_jpの日付はUTC midnightのため、ローカルタイムゾーンに正規化
    const y = h.date.getFullYear();
    const m = h.date.getMonth();
    const d = h.date.getDate();
    return {
      id: `${HOLIDAY_EVENT_ID_PREFIX}${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
      title: h.name,
      start: new Date(y, m, d),
      end: new Date(y, m, d + 1), // react-big-calendarは排他的終了日を使用
      allDay: true,
      color: HOLIDAY_COLOR,
    };
  });
}
