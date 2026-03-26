import { Calendar, Users } from "lucide-react";
import { UPCOMING_EVENTS_DAYS } from "@/lib/calendar/cross-guild-event-types";

export type UpcomingEventsEmptyProps = {
  variant: "no-events" | "no-guilds";
};

export function UpcomingEventsEmpty({ variant }: UpcomingEventsEmptyProps) {
  if (variant === "no-guilds") {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed p-8 text-center">
        <Users
          className="h-10 w-10 text-muted-foreground/50"
          data-testid="empty-guilds-icon"
        />
        <div className="space-y-1">
          <p className="font-medium text-muted-foreground text-sm">
            Botが参加しているサーバーがありません
          </p>
          <p className="text-muted-foreground/70 text-xs">
            DiscalendarのBotをサーバーに招待して、カレンダー機能を利用しましょう
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed p-8 text-center">
      <Calendar
        className="h-10 w-10 text-muted-foreground/50"
        data-testid="empty-calendar-icon"
      />
      <div className="space-y-1">
        <p className="font-medium text-muted-foreground text-sm">
          直近の予定はありません
        </p>
        <p className="text-muted-foreground/70 text-xs">
          今後{UPCOMING_EVENTS_DAYS}日以内に予定が登録されていません
        </p>
      </div>
    </div>
  );
}
