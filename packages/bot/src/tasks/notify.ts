import type { Client, SendableChannels } from "discord.js";
import {
  getEventSettingsByGuildIds,
  getFutureEventsForAllGuilds,
} from "../services/event-service.js";
import type { EventRecord, NotificationPayload } from "../types/event.js";
import { NOTIFICATION_UNIT_LABELS } from "../types/event.js";
import { createNotificationEmbed } from "../utils/embeds.js";
import { logger } from "../utils/logger.js";

// JST (UTC+9) 固定: 本サービスは日本国内向けのため、タイムゾーンをJSTに限定している
const JST_OFFSET_MS = 9 * 60 * 60 * 1000;
const MS_PER_MINUTE = 60_000;
const NOTIFY_CHECK_INTERVAL_MS = MS_PER_MINUTE;

function toMinutes(notification: NotificationPayload): number {
  switch (notification.unit) {
    case "hours":
      return notification.num * 60;
    case "days":
      return notification.num * 60 * 24;
    case "weeks":
      return notification.num * 60 * 24 * 7;
    default:
      return notification.num;
  }
}

const SENTINEL_NOTIFICATION: NotificationPayload = {
  key: "__start__",
  num: 0,
  unit: "minutes",
};

async function processNotifications(client: Client): Promise<void> {
  const now = new Date();
  now.setSeconds(0, 0);
  const nowMs = now.getTime();

  const eventsResult = await getFutureEventsForAllGuilds(now);
  if (!eventsResult.success) {
    logger.error(
      { error: eventsResult.error },
      "Failed to fetch events for notifications"
    );
    return;
  }

  const events = eventsResult.data;
  logger.debug({ count: events.length }, "Fetched events for notification");

  if (events.length === 0) {
    return;
  }

  const uniqueGuildIds = [...new Set(events.map((e) => e.guild_id))];
  const settingsResult = await getEventSettingsByGuildIds(uniqueGuildIds);
  if (!settingsResult.success) {
    logger.error(
      { error: settingsResult.error },
      "Failed to fetch event settings for notifications"
    );
    return;
  }

  const settingsMap = settingsResult.data;

  for (const event of events) {
    try {
      const settings = settingsMap.get(event.guild_id);
      if (!settings) {
        logger.warn(
          { guildId: event.guild_id },
          "No event settings found for guild, skipping notifications"
        );
        continue;
      }

      const channel = client.channels.cache.get(settings.channel_id);
      if (!channel?.isSendable()) {
        logger.warn(
          { guildId: event.guild_id, channelId: settings.channel_id },
          "Notification channel not found or not sendable"
        );
        continue;
      }

      await checkEventNotifications(channel, event, nowMs);
    } catch (error) {
      logger.error(
        { error, eventId: event.id },
        "Failed to process notifications for event"
      );
    }
  }
}

async function checkEventNotifications(
  channel: SendableChannels,
  event: EventRecord,
  nowMs: number
): Promise<void> {
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
    SENTINEL_NOTIFICATION,
  ];

  for (const notification of notifications) {
    const offsetMs = toMinutes(notification) * MS_PER_MINUTE;
    const notifyTimeMs = startMs - offsetMs;
    const diff = nowMs - notifyTimeMs;

    if (diff >= 0 && diff < MS_PER_MINUTE) {
      const isSentinel = notification.key === SENTINEL_NOTIFICATION.key;
      const label = isSentinel
        ? "以下の予定が開催されます"
        : `${notification.num}${NOTIFICATION_UNIT_LABELS[notification.unit]}に以下の予定が開催されます`;

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
            guildId: event.guild_id,
          },
          "Failed to send notification"
        );
      }
    }
  }
}

// NOTE: 通知の重複送信について
// 再起動やクラッシュ復旧時に同一分のウィンドウ内で重複送信される可能性がある。
// 現時点ではDB送信済みフラグによる管理は複雑さに対して効果が見合わないため、
// 再起動頻度が低いことを前提に重複を許容する設計とする。
// 将来的に問題になった場合は、sent_notifications テーブルの追加を検討する。
export function startNotifyTask(client: Client): NodeJS.Timeout {
  return setInterval(() => {
    processNotifications(client).catch((error) => {
      logger.error({ error }, "Unhandled error in notification processing");
    });
  }, NOTIFY_CHECK_INTERVAL_MS);
}
