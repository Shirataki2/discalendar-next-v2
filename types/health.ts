export const BOT_OFFLINE_THRESHOLD_MS = 2 * 60 * 1000;

export type ServiceStatus = "healthy" | "unhealthy";
export type DbStatus = "connected" | "error";
export type BotStatus = "online" | "offline" | "unknown";

export type BotMetadata = {
  guildCount: number;
  wsPing: number;
};

export type HealthResponse = {
  status: ServiceStatus;
  db: DbStatus;
  bot: BotStatus;
  botLastSeenAt: string | null;
  botMetadata: BotMetadata | null;
  responseTime: number;
};
