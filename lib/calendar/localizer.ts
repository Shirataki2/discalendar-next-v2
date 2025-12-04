/**
 * react-big-calendar用のdate-fns日本語ロケール設定
 *
 * タスク1: カレンダーライブラリのセットアップ
 * - date-fns日本語ロケールを設定したdateFnsLocalizerを作成する
 *
 * Requirements: 1.1, 1.2, 1.3
 */
import { format, getDay, parse, startOfWeek } from "date-fns";
import { ja } from "date-fns/locale";
import { dateFnsLocalizer, type Messages } from "react-big-calendar";

/**
 * date-fns localizer設定
 * 日本語ロケールを使用してreact-big-calendarを初期化
 */
const locales = {
  ja: ja,
};

/**
 * カレンダーのフォーマット設定型
 * react-big-calendarのformats propに渡す
 */
export interface CalendarFormats {
  /** 日付表示形式 (月ビューの日付セル) */
  dateFormat: string;
  /** 日表示形式 (週/日ビューのヘッダー) */
  dayFormat: string;
  /** 曜日表示形式 (月ビューのヘッダー) */
  weekdayFormat: string;
  /** 月ヘッダー表示形式 */
  monthHeaderFormat: string;
  /** 日ヘッダー表示形式 */
  dayHeaderFormat: string;
  /** 日付範囲ヘッダー表示形式 (週ビュー) */
  dayRangeHeaderFormat: (range: {
    start: Date;
    end: Date;
  }) => string;
  /** アジェンダの日付表示形式 */
  agendaDateFormat: string;
  /** アジェンダの時刻表示形式 */
  agendaTimeFormat: string;
  /** アジェンダの時刻範囲表示形式 */
  agendaTimeRangeFormat: (range: {
    start: Date;
    end: Date;
  }) => string;
}

/**
 * 日本語フォーマット設定
 */
export const calendarFormats: CalendarFormats = {
  dateFormat: "d",
  dayFormat: "d日(E)",
  weekdayFormat: "E",
  monthHeaderFormat: "yyyy年M月",
  dayHeaderFormat: "M月d日(E)",
  dayRangeHeaderFormat: ({ start, end }) =>
    `${format(start, "M月d日", { locale: ja })} - ${format(end, "M月d日", { locale: ja })}`,
  agendaDateFormat: "M月d日(E)",
  agendaTimeFormat: "HH:mm",
  agendaTimeRangeFormat: ({ start, end }) =>
    `${format(start, "HH:mm", { locale: ja })} - ${format(end, "HH:mm", { locale: ja })}`,
};

/**
 * 日本語メッセージ設定
 * ツールバーやナビゲーションの文言を日本語化
 */
export const calendarMessages: Messages = {
  today: "今日",
  previous: "前へ",
  next: "次へ",
  month: "月",
  week: "週",
  day: "日",
  agenda: "予定一覧",
  date: "日付",
  time: "時刻",
  event: "予定",
  allDay: "終日",
  noEventsInRange: "この期間には予定がありません",
  showMore: (total: number) => `+${total}件`,
};

/**
 * date-fns localizerインスタンス
 * react-big-calendarのlocalizer propに渡す
 */
export const calendarLocalizer = dateFnsLocalizer({
  format: (date: Date, formatStr: string) => {
    // カスタムフォーマット文字列をマッピング
    const formatMap: Record<string, string> = {
      dayHeaderFormat: "M月d日(E)",
      monthHeaderFormat: "yyyy年M月",
      weekdayFormat: "E",
      dateFormat: "d",
      timeGutterFormat: "HH:mm",
    };
    const actualFormat = formatMap[formatStr] || formatStr;
    return format(date, actualFormat, { locale: ja });
  },
  parse: (value: string, formatStr: string, baseDate: Date) =>
    parse(value, formatStr, baseDate, { locale: ja }),
  startOfWeek: (date: Date) => startOfWeek(date, { locale: ja }),
  getDay,
  locales,
});
