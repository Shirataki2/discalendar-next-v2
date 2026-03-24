import { fetchUpcomingEvents } from "@/lib/calendar/cross-guild-event-service";
import type { Guild } from "@/lib/guilds/types";
import { createClient } from "@/lib/supabase/server";
import { UpcomingEventList } from "./upcoming-event-list";
import { UpcomingEventsEmpty } from "./upcoming-events-empty";
import { UpcomingEventsError } from "./upcoming-events-error";

type UpcomingEventsSectionProps = {
  guilds: Guild[];
};

/**
 * 直近の予定セクション（Server Component）
 *
 * Suspense境界内で使用され、全参加ギルドの直近予定を取得して表示する。
 * Requirements: 5.3
 */
export async function UpcomingEventsSection({
  guilds,
}: UpcomingEventsSectionProps) {
  if (guilds.length === 0) {
    return <UpcomingEventsEmpty variant="no-guilds" />;
  }

  const supabase = await createClient();
  const result = await fetchUpcomingEvents(supabase, {
    guilds: guilds.map((g) => ({
      guildId: g.guildId,
      name: g.name,
      avatarUrl: g.avatarUrl,
    })),
  });

  if (!result.success) {
    return <UpcomingEventsError />;
  }

  if (result.data.length === 0) {
    return <UpcomingEventsEmpty variant="no-events" />;
  }

  return <UpcomingEventList events={result.data} hasMore={result.hasMore} />;
}
