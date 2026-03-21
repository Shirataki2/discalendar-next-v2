import { endOfMonth, startOfMonth } from "date-fns";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { PublicCalendarContainer } from "@/components/calendar/public-calendar-container";
import { createPublicCalendarService } from "@/lib/calendar/public-calendar-service";
import { createClient } from "@/lib/supabase/server";

type Params = { slug: string };

/** slug のフォーマット: 12文字の hex 文字列 */
const SLUG_PATTERN = /^[a-f0-9]{12}$/;

const resolveGuildAndEvents = cache(async (slug: string) => {
  if (!SLUG_PATTERN.test(slug)) {
    return { guild: null, events: [] };
  }

  const supabase = await createClient();
  const service = createPublicCalendarService(supabase);

  const guildResult = await service.getPublicGuildBySlug(slug);
  if (!guildResult.success) {
    return { guild: null, events: [] };
  }

  const now = new Date();
  const eventsResult = await service.fetchPublicEvents(
    guildResult.data.guildId,
    startOfMonth(now),
    endOfMonth(now)
  );

  return {
    guild: guildResult.data,
    events: eventsResult.success ? eventsResult.data : [],
  };
});

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await params;
  const { guild, events } = await resolveGuildAndEvents(slug);

  if (!guild) {
    return {};
  }

  const upcomingNames = events
    .sort((a, b) => a.start.getTime() - b.start.getTime())
    .slice(0, 3)
    .map((e) => e.title);

  const description =
    upcomingNames.length > 0
      ? `${guild.name} のカレンダー - ${upcomingNames.join("、")}`
      : `${guild.name} のカレンダー`;

  return {
    title: `${guild.name} | Discalendar`,
    description,
    openGraph: {
      title: `${guild.name} | Discalendar`,
      description,
      url: `/cal/${slug}`,
      type: "website",
      images: ["/og-default.png"],
    },
    twitter: {
      card: "summary_large_image",
      title: `${guild.name} | Discalendar`,
      description,
    },
  };
}

export default async function PublicCalendarPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug } = await params;
  const { guild, events } = await resolveGuildAndEvents(slug);

  if (!guild) {
    notFound();
  }

  const now = new Date();

  return (
    <main className="flex min-h-screen flex-col">
      <PublicCalendarContainer
        guildId={guild.guildId}
        guildName={guild.name}
        initialDate={now}
        initialEvents={events}
      />
    </main>
  );
}
