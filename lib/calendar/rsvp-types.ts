/**
 * RSVP 型定義と Discord ユーザー情報ヘルパー
 *
 * Task 2.1: RSVP 型定義と Discord ユーザー情報ヘルパーを実装する
 *
 * Requirements: 1.1
 */

/**
 * RSVP ステータスの型
 */
export type RsvpStatus = "going" | "maybe" | "not_going";

/**
 * event_attendees テーブルのレコード型（snake_case）
 */
export interface AttendeeRecord {
  id: string;
  event_id: string | null;
  event_series_id: string | null;
  occurrence_date: string | null;
  guild_id: string;
  user_id: string | null;
  discord_user_id: string;
  discord_username: string;
  discord_avatar_url: string | null;
  status: RsvpStatus;
  responded_at: string;
}

/**
 * ステータス別参加者数サマリー
 */
export interface AttendeeSummary {
  going: number;
  maybe: number;
  notGoing: number;
  total: number;
}

/**
 * 参加者データ（UI 表示用）
 */
export interface AttendeeData {
  attendees: AttendeeRecord[];
  summary: AttendeeSummary;
  currentUserStatus: RsvpStatus | null;
}

/**
 * Discord ユーザー情報（Supabase user_metadata から抽出）
 */
export interface DiscordUserInfo {
  discordUserId: string;
  discordUsername: string;
  discordAvatarUrl: string | null;
}

/**
 * Supabase user_metadata から Discord ユーザー情報を抽出する
 *
 * @throws provider_id または full_name が欠損している場合
 */
export function extractDiscordInfo(user: {
  user_metadata: Record<string, unknown>;
}): DiscordUserInfo {
  const { provider_id, full_name, avatar_url } = user.user_metadata;

  if (typeof provider_id !== "string" || provider_id.length === 0) {
    throw new Error("Discord user ID not found in user_metadata");
  }

  if (typeof full_name !== "string" || full_name.length === 0) {
    throw new Error("Discord username not found in user_metadata");
  }

  return {
    discordUserId: provider_id,
    discordUsername: full_name,
    discordAvatarUrl: typeof avatar_url === "string" ? avatar_url : null,
  };
}

/**
 * 参加者レコード配列からステータス別サマリーを算出する
 */
export function computeAttendeeSummary(
  attendees: AttendeeRecord[],
): AttendeeSummary {
  let going = 0;
  let maybe = 0;
  let notGoing = 0;

  for (const a of attendees) {
    switch (a.status) {
      case "going":
        going++;
        break;
      case "maybe":
        maybe++;
        break;
      case "not_going":
        notGoing++;
        break;
    }
  }

  return { going, maybe, notGoing, total: attendees.length };
}
