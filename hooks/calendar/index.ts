/**
 * カレンダー関連フックのエクスポート
 *
 * タスク3.1: カレンダー状態管理フックの作成
 * タスク3.2: URLパラメータとの状態同期
 * タスク8.1: デスクトップとタブレット向けレイアウト
 * タスク8.2: モバイル向けレイアウトとデフォルトビュー
 */

export {
  type CalendarActions,
  type CalendarState,
  type UseCalendarStateOptions,
  type UseCalendarStateReturn,
  type ViewMode,
  useCalendarState,
} from "./use-calendar-state";

export {
  type UseCalendarUrlSyncReturn,
  useCalendarUrlSync,
} from "./use-calendar-url-sync";

export {
  BREAKPOINTS,
  type BreakpointState,
  useBreakpoint,
  useMediaQuery,
} from "./use-media-query";
