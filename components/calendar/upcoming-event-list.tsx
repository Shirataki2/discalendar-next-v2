import type { UpcomingEvent } from "@/lib/calendar/cross-guild-event-types";
import { UpcomingEventItem } from "./upcoming-event-item";

export type UpcomingEventListProps = {
  events: UpcomingEvent[];
  hasMore: boolean;
};

export function UpcomingEventList({ events, hasMore }: UpcomingEventListProps) {
  return (
    <section>
      <h2 className="mb-2 font-semibold text-sm">直近の予定</h2>
      <div className="space-y-1">
        {events.map((event) => (
          <UpcomingEventItem event={event} key={event.id} />
        ))}
      </div>
      {hasMore ? (
        <div className="mt-3 text-center">
          <a
            className="text-muted-foreground text-xs hover:text-foreground hover:underline"
            href="/dashboard"
          >
            さらに表示 →
          </a>
        </div>
      ) : null}
    </section>
  );
}
