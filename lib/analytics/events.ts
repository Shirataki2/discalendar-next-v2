import { getPostHogClient } from "./client";

type AnalyticsEventName =
  | "event_created"
  | "event_updated"
  | "event_deleted"
  | "event_moved"
  | "event_resized"
  | "guild_switched"
  | "view_changed"
  | "calendar_navigated";

interface AnalyticsEventMap {
  event_created: {
    is_all_day: boolean;
    color: string;
    has_notifications: boolean;
  };
  event_updated: {
    changed_fields: string[];
  };
  event_deleted: Record<string, never>;
  event_moved: {
    method: "drag_and_drop";
  };
  event_resized: Record<string, never>;
  guild_switched: {
    guild_id: string;
  };
  view_changed: {
    view_type: "day" | "week" | "month";
  };
  calendar_navigated: {
    direction: "prev" | "next" | "today";
  };
}

export function trackEvent<E extends AnalyticsEventName>(
  eventName: E,
  properties: AnalyticsEventMap[E],
): void {
  getPostHogClient()?.capture(eventName, properties);
}

/**
 * イベント編集時に変更されたフィールドを検出する
 *
 * initialとupdatedを比較し、値が異なるフィールド名の配列を返す。
 * Date、配列、プリミティブ型に対応。
 */
export function getChangedEventFields(
  initial: Record<string, unknown>,
  updated: Record<string, unknown>,
): string[] {
  const trackableFields = [
    "title",
    "startAt",
    "endAt",
    "isAllDay",
    "color",
    "description",
    "location",
    "notifications",
  ];

  return trackableFields.filter((field) => {
    const oldVal: unknown = initial[field];
    const newVal: unknown = updated[field];

    // initialに存在しないフィールドは変更とみなす
    if (!(field in initial)) {
      return newVal !== undefined;
    }

    // Date比較
    if (oldVal instanceof Date && newVal instanceof Date) {
      return oldVal.getTime() !== newVal.getTime();
    }

    // 配列・オブジェクト比較
    if (typeof oldVal === "object" || typeof newVal === "object") {
      return JSON.stringify(oldVal) !== JSON.stringify(newVal);
    }

    return oldVal !== newVal;
  });
}

/**
 * ナビゲーションアクションをアナリティクスの方向値にマッピングする
 */
const DIRECTION_MAP: Record<string, "prev" | "next" | "today"> = {
  PREV: "prev",
  NEXT: "next",
  TODAY: "today",
};

export function mapNavigationDirection(
  action: "PREV" | "NEXT" | "TODAY",
): "prev" | "next" | "today" {
  return DIRECTION_MAP[action];
}
