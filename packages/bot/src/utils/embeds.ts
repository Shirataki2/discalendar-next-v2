import { EmbedBuilder } from "discord.js";
import type { EventRecord } from "../types/event.js";
import { NOTIFICATION_UNIT_LABELS } from "../types/event.js";
import { formatDate, formatDateTime } from "./datetime.js";

const BOT_VERSION = "2.0.0";

export function createHelpEmbed(
  botAvatarUrl: string | null,
  invitationUrl: string
): EmbedBuilder {
  const description = `DisCalendarはDiscord用の__予定管理Bot__です

ほとんどの操作は**Web上で行えることが特徴です！**

[**こちら**](https://discalendar.app)からログインして
サーバーのカレンダーを閲覧することができます

__**🌟初期化🌟**__
　この操作を行わなくても予定の追加はできますが
追加した予定の開始時間になった際にチャンネルに
投稿するようにするには初期化処理が必要です！

　このBotからメッセージを受信したいチャンネルで
\`\`\`
/init
\`\`\`
　と入力してください

　受信チャンネルを変更したい際には再度別のチャンネルで
このコマンドを実行して下さい

__**🌟コマンド機能🌟**__
　Discord上でも予定の表示と作成が行えます！
　詳しくは\`/create\`, \`/list\`と打ってみてください！

__**🌟サポートサーバー🌟**__
　機能要望やバグなどがあった場合には
[サポートサーバー](https://discord.gg/MyaZRuze23)へ参加し，ご連絡をお願いします！

__**🌟他のサーバーにも導入する場合🌟**__
　[こちら](${invitationUrl})より導入をお願いします！`;

  const embed = new EmbedBuilder()
    .setTitle("DisCalendar - Help")
    .setDescription(description)
    .setColor(0x00_00_dd)
    .setTimestamp()
    .setFooter({ text: `v${BOT_VERSION}` });

  if (botAvatarUrl) {
    embed.setThumbnail(botAvatarUrl);
  }

  return embed;
}

export function createEventEmbed(event: EventRecord): EmbedBuilder {
  const colorInt = Number.parseInt(event.color.replace("#", ""), 16);
  const startDate = new Date(event.start_at);
  const endDate = new Date(event.end_at);

  const startStr = event.is_all_day
    ? formatDate(startDate)
    : formatDateTime(startDate);
  const endStr = event.is_all_day
    ? formatDate(endDate)
    : formatDateTime(endDate);

  const embed = new EmbedBuilder()
    .setTitle(event.name)
    .setDescription(event.description || null)
    .setColor(colorInt)
    .addFields(
      { name: "開始時間", value: startStr, inline: true },
      { name: "終了時間", value: endStr, inline: true }
    )
    .setTimestamp();

  if (event.notifications.length > 0) {
    const notifStr = event.notifications
      .map((n) => `${n.num}${NOTIFICATION_UNIT_LABELS[n.unit]}`)
      .join(", ");
    embed.addFields({ name: "通知", value: notifStr, inline: true });
  }

  return embed;
}

export function createErrorEmbed(
  title: string,
  description: string
): EmbedBuilder {
  return new EmbedBuilder()
    .setTitle(`❌ ${title}`)
    .setDescription(description)
    .setColor(0xff_00_00);
}

export function createNotificationEmbed(
  event: EventRecord,
  notificationLabel: string
): EmbedBuilder {
  const colorInt = Number.parseInt(event.color.replace("#", ""), 16);
  const startDate = new Date(event.start_at);
  const endDate = new Date(event.end_at);

  let dateStr: string;
  if (event.is_all_day) {
    const startStr = formatDate(startDate);
    const endStr = formatDate(endDate);
    dateStr = startStr === endStr ? startStr : `${startStr} - ${endStr}`;
  } else {
    const startDateOnly = formatDate(startDate);
    const endDateOnly = formatDate(endDate);
    if (startDateOnly === endDateOnly) {
      const endTime = formatDateTime(endDate).split(" ")[1];
      dateStr = `${formatDateTime(startDate)} - ${endTime}`;
    } else {
      dateStr = `${formatDateTime(startDate)} - ${formatDateTime(endDate)}`;
    }
  }

  return new EmbedBuilder()
    .setTitle(event.name)
    .setDescription(event.description || null)
    .setColor(colorInt)
    .setAuthor({ name: notificationLabel })
    .addFields({ name: "日時", value: dateStr, inline: false });
}
