import { writeFileSync } from "node:fs";
import type { Client } from "discord.js";
import { upsertHeartbeat } from "../services/health-service.js";
import { logger } from "../utils/logger.js";

const HEARTBEAT_INTERVAL_MS = 60_000;
const SENTINEL_PATH = "/tmp/bot-healthy";

export function startHeartbeatTask(client: Client): NodeJS.Timeout {
  return setInterval(async () => {
    const guildCount = client.guilds.cache.size;
    const wsPing = client.ws.ping;

    try {
      const result = await upsertHeartbeat({ guildCount, wsPing });
      if (result.success) {
        logger.debug({ guildCount, wsPing }, "Heartbeat sent");
        try {
          writeFileSync(SENTINEL_PATH, String(Date.now()));
        } catch (fsError) {
          logger.error(
            { error: fsError },
            "Failed to write heartbeat sentinel file"
          );
        }
      } else {
        logger.error({ error: result.error }, "Heartbeat upsert failed");
      }
    } catch (error) {
      logger.error({ error }, "Heartbeat task failed");
    }
  }, HEARTBEAT_INTERVAL_MS);
}
