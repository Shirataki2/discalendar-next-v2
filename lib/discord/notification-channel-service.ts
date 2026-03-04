/**
 * NotificationChannelService - Discord BOT API チャンネル取得サービス
 *
 * Discord BOT API を使用してギルドのテキストチャンネル一覧を取得し、
 * BOT の投稿権限を簡易チェックする。
 *
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 4.1
 * Contracts: NotificationChannelService Service Interface (design.md)
 */

import { DISCORD_PERMISSION_FLAGS } from "./permissions";

/** Discord API v10 ベースURL */
const DISCORD_API_BASE_URL = "https://discord.com/api/v10";

// --- Discord API レスポンス型 ---

/** Discord API Permission Overwrite Object */
interface DiscordPermissionOverwrite {
  id: string;
  type: number; // 0=role, 1=member
  allow: string; // permission bitfield
  deny: string; // permission bitfield
}

/** Discord API Channel Object（必要フィールドのみ） */
interface DiscordApiChannel {
  id: string;
  name: string;
  type: number;
  parent_id: string | null;
  position: number;
  permission_overwrites: DiscordPermissionOverwrite[];
}

// --- アプリケーション型 ---

/** Discord テキストチャンネル情報 */
export interface DiscordTextChannel {
  /** チャンネルID (snowflake) */
  id: string;
  /** チャンネル名 */
  name: string;
  /** 親カテゴリID (nullable) */
  parentId: string | null;
  /** 親カテゴリ名 (nullable) */
  categoryName: string | null;
  /** 表示順序 */
  position: number;
  /** BOTがメッセージ送信可能か */
  canBotSendMessages: boolean;
}

/** エラー型 */
type NotificationChannelError =
  | { code: "unauthorized"; message: string }
  | { code: "rate_limited"; message: string; retryAfter: number }
  | { code: "network_error"; message: string }
  | { code: "bot_token_missing"; message: string }
  | { code: "bot_config_missing"; message: string }
  | { code: "unknown"; message: string };

/** チャンネル一覧取得結果 */
export type GuildChannelsResult =
  | { success: true; data: DiscordTextChannel[] }
  | { success: false; error: NotificationChannelError };

/** Discord チャンネルタイプ: テキストチャンネル */
const CHANNEL_TYPE_TEXT = 0;
/** Discord チャンネルタイプ: カテゴリ */
const CHANNEL_TYPE_CATEGORY = 4;

/**
 * permission_overwrites から BOT がメッセージを送信可能かを簡易判定する
 *
 * @everyone ロール（id=guildId）と BOT ユーザー（id=botUserId）の
 * deny ビットに SEND_MESSAGES または VIEW_CHANNEL が含まれていれば false
 */
function checkBotSendPermission(
  overwrites: DiscordPermissionOverwrite[],
  guildId: string,
  botUserId: string,
): boolean {
  const relevantMask =
    DISCORD_PERMISSION_FLAGS.SEND_MESSAGES |
    DISCORD_PERMISSION_FLAGS.VIEW_CHANNEL;

  for (const overwrite of overwrites) {
    // @everyone ロール（type=0, id=guildId）または BOT ユーザー（type=1, id=botUserId）のみ確認
    const isEveryone = overwrite.type === 0 && overwrite.id === guildId;
    const isBotUser = overwrite.type === 1 && overwrite.id === botUserId;

    if (!isEveryone && !isBotUser) {
      continue;
    }

    let denyBits: bigint;
    try {
      denyBits = BigInt(overwrite.deny);
    } catch {
      continue;
    }

    if ((denyBits & relevantMask) !== BigInt(0)) {
      return false;
    }
  }

  return true;
}

/**
 * Discord BOT API からギルドのテキストチャンネル一覧を取得する
 *
 * @param guildId ギルドID
 * @returns テキストチャンネル一覧またはエラー
 */
export async function getGuildChannels(
  guildId: string,
): Promise<GuildChannelsResult> {
  const botToken = process.env.DISCORD_BOT_TOKEN;
  if (!botToken) {
    return {
      success: false,
      error: {
        code: "bot_token_missing",
        message:
          "BOTの設定が不完全です。管理者に連絡してください。",
      },
    };
  }

  const botUserId = process.env.DISCORD_CLIENT_ID;
  if (!botUserId) {
    return {
      success: false,
      error: {
        code: "bot_config_missing",
        message:
          "BOTの設定が不完全です。管理者に連絡してください。",
      },
    };
  }

  try {
    const response = await fetch(
      `${DISCORD_API_BASE_URL}/guilds/${encodeURIComponent(guildId)}/channels`,
      {
        headers: {
          Authorization: `Bot ${botToken}`,
        },
      },
    );

    if (response.ok) {
      const channels = (await response.json()) as DiscordApiChannel[];
      return {
        success: true,
        data: transformChannels(channels, guildId, botUserId),
      };
    }

    if (response.status === 401) {
      return {
        success: false,
        error: {
          code: "unauthorized",
          message: "BOTの認証に失敗しました。",
        },
      };
    }

    if (response.status === 429) {
      const retryAfterHeader = response.headers.get("Retry-After");
      let retryAfter = 60;

      if (retryAfterHeader) {
        retryAfter = Number.parseInt(retryAfterHeader, 10);
      } else {
        try {
          const body = (await response.json()) as { retry_after?: number };
          if (body.retry_after) {
            retryAfter = body.retry_after;
          }
        } catch {
          // JSON parse failure: use default
        }
      }

      return {
        success: false,
        error: {
          code: "rate_limited",
          message: `リクエスト制限に達しました。${retryAfter}秒後に再試行してください。`,
          retryAfter,
        },
      };
    }

    return {
      success: false,
      error: {
        code: "unknown",
        message: `Discord APIエラーが発生しました。(ステータス: ${response.status})`,
      },
    };
  } catch {
    return {
      success: false,
      error: {
        code: "network_error",
        message:
          "サーバーに接続できませんでした。ネットワーク接続を確認してください。",
      },
    };
  }
}

/**
 * Discord API のチャンネル配列をアプリケーション型に変換する
 */
function transformChannels(
  apiChannels: DiscordApiChannel[],
  guildId: string,
  botUserId: string,
): DiscordTextChannel[] {
  // カテゴリ名の lookup map を構築
  const categoryMap = new Map<string, string>();
  for (const ch of apiChannels) {
    if (ch.type === CHANNEL_TYPE_CATEGORY) {
      categoryMap.set(ch.id, ch.name);
    }
  }

  // テキストチャンネルのみフィルタ・変換
  return apiChannels
    .filter((ch) => ch.type === CHANNEL_TYPE_TEXT)
    .map((ch) => ({
      id: ch.id,
      name: ch.name,
      parentId: ch.parent_id,
      categoryName: ch.parent_id
        ? (categoryMap.get(ch.parent_id) ?? null)
        : null,
      position: ch.position,
      canBotSendMessages: checkBotSendPermission(
        ch.permission_overwrites,
        guildId,
        botUserId,
      ),
    }));
}
