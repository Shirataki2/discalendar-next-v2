import { expandOccurrences } from "@discalendar/rrule-utils";
import type { Client, SendableChannels } from "discord.js";
import {
  getEventSettingsByGuildIds,
  getFutureEventsForAllGuilds,
  getFutureSeriesForAllGuilds,
} from "../services/event-service.js";
import {
  cleanupOldRecords,
  hasSent,
  markSent,
} from "../services/sent-notification-service.js";
import type {
  EventRecord,
  EventSeriesRecord,
  EventSettings,
  NotificationPayload,
} from "../types/event.js";
import { NOTIFICATION_UNIT_LABELS } from "../types/event.js";
import { createNotificationEmbed } from "../utils/embeds.js";
import { logger } from "../utils/logger.js";

// JST (UTC+9) 固定: 本サービスは日本国内向けのため、タイムゾーンをJSTに限定している
const JST_OFFSET_MS = 9 * 60 * 60 * 1000;
const MS_PER_MINUTE = 60_000;
const NOTIFY_CHECK_INTERVAL_MS = MS_PER_MINUTE;
const MAX_NOTIFY_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
const CLEANUP_INTERVAL_MS = 60 * 60 * 1000;
const CLEANUP_RETENTION_DAYS = 7;

let lastCleanupMs = 0;

/** @internal テスト用: モジュールレベル状態をリセットする */
export function _resetState(): void {
  lastCleanupMs = 0;
  isRunning = false;
}

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

export function toEventRecord(
  series: EventSeriesRecord,
  occurrenceDate: Date
): EventRecord {
  return {
    id: `series:${series.id}:occ:${occurrenceDate.toISOString()}`,
    guild_id: series.guild_id,
    name: series.name,
    description: series.description,
    color: series.color,
    is_all_day: series.is_all_day,
    start_at: occurrenceDate.toISOString(),
    end_at: new Date(
      occurrenceDate.getTime() + series.duration_minutes * MS_PER_MINUTE
    ).toISOString(),
    location: series.location,
    channel_id: series.channel_id,
    channel_name: series.channel_name,
    notifications: series.notifications,
    created_at: series.created_at,
    updated_at: series.updated_at,
  };
}

async function processNotifications(client: Client): Promise<void> {
  const now = new Date();
  now.setSeconds(0, 0);
  const nowMs = now.getTime();

  const [eventsResult, seriesResult] = await Promise.all([
    getFutureEventsForAllGuilds(now),
    getFutureSeriesForAllGuilds(),
  ]);

  if (!eventsResult.success) {
    logger.error(
      { error: eventsResult.error },
      "Failed to fetch events for notifications"
    );
    return;
  }

  const events = eventsResult.data;
  const series = seriesResult.success ? seriesResult.data : [];

  if (!seriesResult.success) {
    logger.error(
      { error: seriesResult.error },
      "Failed to fetch event series for notifications"
    );
  }

  logger.debug(
    { eventCount: events.length, seriesCount: series.length },
    "Fetched events and series for notification"
  );

  if (events.length === 0 && series.length === 0) {
    return;
  }

  const uniqueGuildIds = [
    ...new Set([
      ...events.map((e) => e.guild_id),
      ...series.map((s) => s.guild_id),
    ]),
  ];
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

  await processSeriesNotifications({ client, series, settingsMap, now, nowMs });

  await runCleanupIfNeeded(nowMs);
}

type SeriesNotificationContext = {
  client: Client;
  series: EventSeriesRecord[];
  settingsMap: Map<string, EventSettings>;
  now: Date;
  nowMs: number;
};

async function processSeriesNotifications(
  ctx: SeriesNotificationContext
): Promise<void> {
  const { client, series, settingsMap, now, nowMs } = ctx;
  const rangeEnd = new Date(now.getTime() + MAX_NOTIFY_WINDOW_MS);

  for (const s of series) {
    try {
      const settings = settingsMap.get(s.guild_id);
      if (!settings) {
        logger.warn(
          { guildId: s.guild_id },
          "No event settings found for guild, skipping series notifications"
        );
        continue;
      }

      const channel = client.channels.cache.get(settings.channel_id);
      if (!channel?.isSendable()) {
        logger.warn(
          { guildId: s.guild_id, channelId: settings.channel_id },
          "Notification channel not found or not sendable"
        );
        continue;
      }

      const exdates = s.exdates.map((d) => new Date(d));
      const result = expandOccurrences(
        s.rrule,
        new Date(s.dtstart),
        now,
        rangeEnd,
        exdates
      );

      if (result.truncated) {
        logger.warn({ seriesId: s.id }, "Occurrence expansion was truncated");
      }

      logger.debug(
        { seriesId: s.id, occurrenceCount: result.dates.length },
        "Expanded occurrences"
      );

      for (const occDate of result.dates) {
        const pseudoEvent = toEventRecord(s, occDate);
        await checkEventNotifications(channel, pseudoEvent, nowMs);
      }
    } catch (error) {
      logger.error(
        { error, seriesId: s.id },
        "Failed to process notifications for series"
      );
    }
  }
}

function getStartMs(event: EventRecord): number {
  const startDate = new Date(event.start_at);
  if (event.is_all_day) {
    const y = startDate.getUTCFullYear();
    const m = startDate.getUTCMonth();
    const d = startDate.getUTCDate();
    return Date.UTC(y, m, d) - JST_OFFSET_MS;
  }
  return startDate.getTime();
}

async function sendNotification(
  channel: SendableChannels,
  event: EventRecord,
  notification: NotificationPayload
): Promise<void> {
  // DB障害時はフェイルオープン: 未送信よりも重複送信を許容する設計
  const sentResult = await hasSent(event.id, event.guild_id, notification.key);
  if (sentResult.success && sentResult.data) {
    logger.debug(
      {
        eventId: event.id,
        guildId: event.guild_id,
        notificationKey: notification.key,
      },
      "Notification already sent, skipping"
    );
    return;
  }

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
    const markResult = await markSent(
      event.id,
      event.guild_id,
      notification.key
    );
    if (!markResult.success) {
      logger.warn(
        {
          eventId: event.id,
          guildId: event.guild_id,
          notificationKey: notification.key,
        },
        "Failed to record sent notification; may resend on restart"
      );
    }
  } catch (error) {
    logger.warn(
      { error, guildId: event.guild_id },
      "Failed to send notification"
    );
  }
}

async function checkEventNotifications(
  channel: SendableChannels,
  event: EventRecord,
  nowMs: number
): Promise<void> {
  const startMs = getStartMs(event);
  const notifications: NotificationPayload[] = [
    ...event.notifications,
    SENTINEL_NOTIFICATION,
  ];

  for (const notification of notifications) {
    const offsetMs = toMinutes(notification) * MS_PER_MINUTE;
    const notifyTimeMs = startMs - offsetMs;
    const diff = nowMs - notifyTimeMs;

    if (diff >= 0 && diff < MS_PER_MINUTE) {
      await sendNotification(channel, event, notification);
    }
  }
}

async function runCleanupIfNeeded(nowMs: number): Promise<void> {
  if (nowMs - lastCleanupMs < CLEANUP_INTERVAL_MS) {
    return;
  }

  try {
    const result = await cleanupOldRecords(CLEANUP_RETENTION_DAYS);
    if (result.success) {
      lastCleanupMs = nowMs;
      if (result.data > 0) {
        logger.info(
          { deletedCount: result.data },
          "Cleaned up old sent notification records"
        );
      }
    } else {
      logger.warn(
        { error: result.error },
        "Cleanup failed; will retry on next interval"
      );
    }
  } catch (error) {
    logger.error({ error }, "Failed to cleanup old sent notification records");
  }
}

let isRunning = false;

export function startNotifyTask(client: Client): NodeJS.Timeout {
  return setInterval(() => {
    if (isRunning) {
      return;
    }
    isRunning = true;
    processNotifications(client)
      .catch((error) => {
        logger.error({ error }, "Unhandled error in notification processing");
      })
      .finally(() => {
        isRunning = false;
      });
  }, NOTIFY_CHECK_INTERVAL_MS);
}
