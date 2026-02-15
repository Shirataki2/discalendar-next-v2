/**
 * カレンダーライブラリのエクスポート
 *
 * タスク1: カレンダーライブラリのセットアップ
 * タスク2.1: イベント型定義とデータ変換ロジック
 * タスク2.2: EventServiceの実装
 */

// Localizer (タスク1)
export {
  calendarFormats,
  calendarLocalizer,
  calendarMessages,
  type CalendarFormats,
} from "./localizer";

// Types (タスク2.1)
export {
  type CalendarEvent,
  type ChannelInfo,
  type EventRecord,
  type NotificationSetting,
  type NotificationUnit,
  NOTIFICATION_UNIT_LABELS,
  toCalendarEvent,
  toCalendarEvents,
} from "./types";

// Event Service (タスク2.2)
export {
  CALENDAR_ERROR_CODES,
  CALENDAR_ERROR_MESSAGES,
  type CalendarError,
  type CalendarErrorCode,
  type EventServiceInterface,
  type FetchEventsParams,
  type FetchEventsResult,
  createEventService,
  getCalendarErrorMessage,
} from "./event-service";

// Permission Check (タスク4)
export {
  type EventOperation,
  type PermissionCheckResult,
  checkEventPermission,
} from "./permission-check";
