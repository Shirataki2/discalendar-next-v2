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
