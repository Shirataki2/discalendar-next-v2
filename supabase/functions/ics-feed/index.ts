// ICS Feed Edge Function - Supabase Edge Functions (Deno 2)
// Deploy with: supabase functions deploy ics-feed --no-verify-jwt

import { createClient } from "jsr:@supabase/supabase-js@2";
import type {
  EventRow,
  EventSeriesRow,
  GuildRow,
  IcsFeedDeps,
} from "../_shared/ics-feed-handler.ts";
import { handleIcsFeed } from "../_shared/ics-feed-handler.ts";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const EVENT_SELECT =
  "id, guild_id, name, description, color, is_all_day, start_at, end_at, location, series_id, original_date, created_at, updated_at" as const;

const SERIES_SELECT =
  "id, guild_id, name, description, color, is_all_day, rrule, dtstart, duration_minutes, location, exdates, created_at, updated_at" as const;

function createDeps(supabaseUrl: string, serviceRoleKey: string): IcsFeedDeps {
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  return {
    async findGuild(guildId: string): Promise<GuildRow | null> {
      const { data } = await supabase
        .from("guilds")
        .select("guild_id, name, is_public, deleted_at")
        .eq("guild_id", guildId)
        .single();
      return data;
    },

    async findActiveTokenForGuild(guildId: string): Promise<string | null> {
      const { data } = await supabase
        .from("ics_feed_tokens")
        .select("token")
        .eq("guild_id", guildId)
        .is("revoked_at", null)
        .single();
      return data?.token ?? null;
    },

    async findSingleEvents(guildId: string): Promise<EventRow[]> {
      const { data } = await supabase
        .from("events")
        .select(EVENT_SELECT)
        .eq("guild_id", guildId)
        .is("series_id", null)
        .limit(1000);
      return data ?? [];
    },

    async findEventSeries(guildId: string): Promise<EventSeriesRow[]> {
      const { data } = await supabase
        .from("event_series")
        .select(SERIES_SELECT)
        .eq("guild_id", guildId)
        .limit(1000);
      return data ?? [];
    },

    async findExceptionEvents(guildId: string): Promise<EventRow[]> {
      const { data } = await supabase
        .from("events")
        .select(EVENT_SELECT)
        .eq("guild_id", guildId)
        .not("series_id", "is", null)
        .limit(1000);
      return data ?? [];
    },
  };
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  try {
    const url = new URL(req.url);
    const guildId = url.searchParams.get("guild_id");
    const token = url.searchParams.get("token");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const deps = createDeps(supabaseUrl, serviceRoleKey);

    const response = await handleIcsFeed(guildId, token, deps);
    // Add CORS headers to all responses
    for (const [key, value] of Object.entries(CORS_HEADERS)) {
      response.headers.set(key, value);
    }
    return response;
  } catch (error) {
    console.error(
      "ICS feed error:",
      error instanceof Error ? error.message : "Unknown error"
    );
    return new Response("Internal Server Error", {
      status: 500,
      headers: CORS_HEADERS,
    });
  }
});
