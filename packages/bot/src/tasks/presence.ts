import { ActivityType, type Client } from "discord.js";
import { logger } from "../utils/logger.js";

const STATES = ["help", "slash_help", "servers", "url"] as const;

function updatePresence(client: Client, state: (typeof STATES)[number]): void {
  if (!client.user) {
    return;
  }

  switch (state) {
    case "help":
      client.user.setPresence({
        activities: [{ type: ActivityType.Watching, name: "cal help" }],
      });
      break;
    case "slash_help":
      client.user.setPresence({
        activities: [{ type: ActivityType.Watching, name: "/help" }],
      });
      break;
    case "servers":
      client.user.setPresence({
        activities: [
          {
            type: ActivityType.Watching,
            name: `${client.guilds.cache.size} servers`,
          },
        ],
      });
      break;
    case "url":
      client.user.setPresence({
        activities: [{ type: ActivityType.Listening, name: "discalendar.app" }],
      });
      break;
    default:
      break;
  }
}

export function startPresenceTask(client: Client): NodeJS.Timeout {
  let index = 0;
  return setInterval(() => {
    try {
      updatePresence(client, STATES[index]);
      index = (index + 1) % STATES.length;
    } catch (error) {
      logger.error({ error }, "Failed to update presence");
    }
  }, 10_000);
}
