/**
 * 日本の祝日データ取得ユーティリティ
 *
 * @holiday-jp/holiday_jp をラップし、期間指定で祝日データを取得する。
 * 外部APIへのネットワークリクエストを発行せず、ライブラリのオフラインデータのみ使用。
 *
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5
 */
import holiday_jp from "@holiday-jp/holiday_jp";

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
 * react-big-calendar の backgroundEvent 形式
 */
export interface BackgroundCalendarEvent {
  /** 祝日の日付（開始） */
  start: Date;
  /** 祝日の日付（終了、終日のため開始と同日） */
  end: Date;
  /** 祝日名 */
  title: string;
  /** 終日フラグ（常に true） */
  allDay: true;
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
 * 祝日データを react-big-calendar の backgroundEvent 形式に変換する
 *
 * @param holidays - 祝日情報の配列
 * @returns BackgroundCalendarEvent の配列
 */
export function toBackgroundEvents(
  holidays: HolidayInfo[]
): BackgroundCalendarEvent[] {
  return holidays.map((h) => ({
    start: h.date,
    end: h.date,
    title: h.name,
    allDay: true as const,
  }));
}
