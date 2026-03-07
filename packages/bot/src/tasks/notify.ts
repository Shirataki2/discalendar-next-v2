import type { Client } from "discord.js";
import {
  getEventSettings,
  getFutureEventsForAllGuilds,
} from "../services/event-service.js";
import type { EventRecord, NotificationPayload } from "../types/event.js";
import { createNotificationEmbed } from "../utils/embeds.js";
import { logger } from "../utils/logger.js";

const JST_OFFSET_MS = 9 * 60 * 60 * 1000;

function toMinutes(notification: NotificationPayload): number {
  switch (notification.type) {
    case "時間前":
      return notification.num * 60;
    case "日前":
      return notification.num * 60 * 24;
    case "週間前":
      return notification.num * 60 * 24 * 7;
    default:
      return notification.num;
  }
}

async function processNotifications(client: Client): Promise<void> {
  const now = new Date();
  now.setSeconds(0, 0);
  const nowMs = now.getTime();

  let events: EventRecord[];
  try {
    events = await getFutureEventsForAllGuilds(now);
  } catch (error) {
    logger.error({ error }, "Failed to fetch events for notifications");
    return;
  }

  logger.debug({ count: events.length }, "Fetched events for notification");

  for (const event of events) {
    try {
      await checkEventNotifications(client, event, nowMs);
    } catch (error) {
      logger.error(
        { error, eventId: event.id },
        "Failed to process notifications for event"
      );
    }
  }
}

async function checkEventNotifications(
  client: Client,
  event: EventRecord,
  nowMs: number
): Promise<void> {
  const settings = await getEventSettings(event.guild_id);
  if (!settings) {
    return;
  }

  const channel = client.channels.cache.get(settings.channel_id);
  if (!channel?.isSendable()) {
    return;
  }

  const startDate = new Date(event.start_at);
  let startMs: number;
  if (event.is_all_day) {
    const y = startDate.getUTCFullYear();
    const m = startDate.getUTCMonth();
    const d = startDate.getUTCDate();
    startMs = Date.UTC(y, m, d) - JST_OFFSET_MS;
  } else {
    startMs = startDate.getTime();
  }

  const notifications: NotificationPayload[] = [
    ...event.notifications,
    { key: -1, num: 0, type: "分前" },
  ];

  for (const notification of notifications) {
    const offsetMs = toMinutes(notification) * 60_000;
    const notifyTimeMs = startMs - offsetMs;
    const diff = nowMs - notifyTimeMs;

    if (diff >= 0 && diff < 60_000) {
      const label =
        notification.key === -1
          ? "以下の予定が開催されます"
          : `${notification.num}${notification.type.replace("前", "後")}に以下の予定が開催されます`;

      const embed = createNotificationEmbed(event, label);

      try {
        await channel.send({ embeds: [embed] });
        logger.info(
          { eventName: event.name, guildId: event.guild_id },
          "Sent notification"
        );
      } catch (error) {
        logger.warn(
          {
            error,
            channelId: settings.channel_id,
            guildId: event.guild_id,
          },
          "Failed to send notification"
        );
      }
    }
  }
}

export function startNotifyTask(client: Client): NodeJS.Timeout {
  return setInterval(() => {
    processNotifications(client).catch((error) => {
      logger.error({ error }, "Unhandled error in notification processing");
    });
  }, 60_000);
}
