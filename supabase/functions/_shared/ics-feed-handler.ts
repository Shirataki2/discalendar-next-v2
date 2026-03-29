// ICS Feed Handler - Environment-agnostic handler logic
// Tested via Vitest, used by the Edge Function entry point

import type { IcsEvent, IcsException, IcsSeries } from "./ics-builder.ts";
import { buildCalendar } from "./ics-builder.ts";

// --- DB Row Types (snake_case) ---

export type GuildRow = {
  guild_id: string;
  name: string;
  is_public: boolean;
  deleted_at: string | null;
};

export type EventRow = {
  id: string;
  guild_id: string;
  name: string;
  description: string | null;
  color: string;
  is_all_day: boolean;
  start_at: string;
  end_at: string;
  location: string | null;
  series_id: string | null;
  original_date: string | null;
  created_at: string;
  updated_at: string;
};

export type EventSeriesRow = {
  id: string;
  guild_id: string;
  name: string;
  description: string | null;
  color: string;
  is_all_day: boolean;
  rrule: string;
  dtstart: string;
  duration_minutes: number;
  location: string | null;
  exdates: string[];
  created_at: string;
  updated_at: string;
};

// --- Dependency Interface ---

export type IcsFeedDeps = {
  findGuild(guildId: string): Promise<GuildRow | null>;
  findActiveTokenForGuild(guildId: string): Promise<string | null>;
  findSingleEvents(guildId: string): Promise<EventRow[]>;
  findEventSeries(guildId: string): Promise<EventSeriesRow[]>;
  findExceptionEvents(guildId: string): Promise<EventRow[]>;
};

// --- Response Headers ---

const ICS_HEADERS: HeadersInit = {
  "Content-Type": "text/calendar; charset=utf-8",
  "Content-Disposition": 'attachment; filename="calendar.ics"',
  "Cache-Control": "public, max-age=3600, stale-while-revalidate=600",
  "Access-Control-Allow-Origin": "*",
};

// --- Constant-time string comparison ---

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    // biome-ignore lint/suspicious/noBitwiseOperators: intentional constant-time comparison
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

// --- snake_case → camelCase converters ---

function toIcsEvent(row: EventRow): IcsEvent {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    color: row.color,
    isAllDay: row.is_all_day,
    startAt: row.start_at,
    endAt: row.end_at,
    location: row.location,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toIcsSeries(row: EventSeriesRow): IcsSeries {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    color: row.color,
    isAllDay: row.is_all_day,
    rrule: row.rrule,
    dtstart: row.dtstart,
    durationMinutes: row.duration_minutes,
    location: row.location,
    exdates: row.exdates,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toIcsException(row: EventRow): IcsException | null {
  // series_id と original_date は findExceptionEvents のクエリで
  // .not("series_id", "is", null) フィルタ済みだが、型安全のためガード
  if (!(row.series_id && row.original_date)) {
    return null;
  }
  return {
    id: row.id,
    seriesId: row.series_id,
    name: row.name,
    description: row.description,
    color: row.color,
    isAllDay: row.is_all_day,
    startAt: row.start_at,
    endAt: row.end_at,
    location: row.location,
    originalDate: row.original_date,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// --- Main Handler ---

export async function handleIcsFeed(
  guildId: string | null,
  token: string | null,
  deps: IcsFeedDeps
): Promise<Response> {
  // Validate guild_id parameter
  if (!guildId) {
    return new Response("guild_id is required", { status: 400 });
  }

  // Find guild
  const guild = await deps.findGuild(guildId);
  if (!guild || guild.deleted_at !== null) {
    return new Response("Guild not found", { status: 404 });
  }

  // Token authentication for private guilds
  if (!guild.is_public) {
    if (!token) {
      return new Response("Unauthorized", { status: 401 });
    }
    const storedToken = await deps.findActiveTokenForGuild(guildId);
    if (!(storedToken && constantTimeEqual(token, storedToken))) {
      return new Response("Unauthorized", { status: 401 });
    }
  }

  // Fetch event data
  const [singleEvents, eventSeries, exceptionEvents] = await Promise.all([
    deps.findSingleEvents(guildId),
    deps.findEventSeries(guildId),
    deps.findExceptionEvents(guildId),
  ]);

  // Build ICS
  const icsText = buildCalendar({
    calendarName: guild.name,
    events: singleEvents.map(toIcsEvent),
    series: eventSeries.map(toIcsSeries),
    exceptions: exceptionEvents
      .map(toIcsException)
      .filter((e): e is IcsException => e !== null),
  });

  return new Response(icsText, {
    status: 200,
    headers: ICS_HEADERS,
  });
}
