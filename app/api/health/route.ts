import { createClient } from "@/lib/supabase/server";
import type {
  BotMetadata,
  BotStatus,
  DbStatus,
  HealthResponse,
} from "@/types/health";
import { BOT_OFFLINE_THRESHOLD_MS } from "@/types/health";

type ServiceHealthRow = {
  service_name: string;
  last_seen_at: string;
  metadata: BotMetadata | null;
};

export async function GET(): Promise<Response> {
  const start = Date.now();

  let db: DbStatus = "connected";
  let bot: BotStatus = "unknown";
  let botLastSeenAt: string | null = null;
  let botMetadata: BotMetadata | null = null;

  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("service_health")
      .select("service_name, last_seen_at, metadata")
      .eq("service_name", "discord-bot")
      .maybeSingle<ServiceHealthRow>();

    if (error) {
      db = "error";
    } else if (data) {
      botLastSeenAt = data.last_seen_at;
      botMetadata = data.metadata;
      const ageMs = Date.now() - new Date(data.last_seen_at).getTime();
      bot = ageMs < BOT_OFFLINE_THRESHOLD_MS ? "online" : "offline";
    }
  } catch {
    db = "error";
  }

  const responseTime = Date.now() - start;
  const status =
    db === "connected" && bot === "online" ? "healthy" : "unhealthy";

  const body: HealthResponse = {
    status,
    db,
    bot,
    botLastSeenAt,
    botMetadata,
    responseTime,
  };

  return Response.json(body, {
    status: status === "healthy" ? 200 : 503,
    headers: { "Cache-Control": "no-store" },
  });
}
