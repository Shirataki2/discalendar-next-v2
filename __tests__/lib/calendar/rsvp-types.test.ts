/**
 * RSVP 型定義と Discord ユーザー情報ヘルパーのテスト
 *
 * Task 2.1: RSVP 型定義と Discord ユーザー情報ヘルパーを実装する
 * - extractDiscordInfo: Supabase user_metadata から Discord 情報を抽出
 * - computeAttendeeSummary: 参加者レコードからサマリーを算出
 *
 * Requirements: 1.1
 */
import { describe, expect, it } from "vitest";
import {
  type AttendeeRecord,
  computeAttendeeSummary,
  extractDiscordInfo,
} from "@/lib/calendar/rsvp-types";

describe("extractDiscordInfo", () => {
  it("user_metadata から Discord 情報を正しく抽出する", () => {
    const user = {
      user_metadata: {
        provider_id: "123456789012345678",
        full_name: "TestUser",
        avatar_url: "https://cdn.discordapp.com/avatars/123/abc.png",
      },
    };

    const result = extractDiscordInfo(user);

    expect(result).toEqual({
      discordUserId: "123456789012345678",
      discordUsername: "TestUser",
      discordAvatarUrl: "https://cdn.discordapp.com/avatars/123/abc.png",
    });
  });

  it("avatar_url が未設定の場合 null を返す", () => {
    const user = {
      user_metadata: {
        provider_id: "123456789012345678",
        full_name: "TestUser",
      },
    };

    const result = extractDiscordInfo(user);

    expect(result.discordAvatarUrl).toBeNull();
  });

  it("provider_id が欠損している場合エラーをスローする", () => {
    const user = {
      user_metadata: {
        full_name: "TestUser",
      },
    };

    expect(() => extractDiscordInfo(user)).toThrow("Discord user ID not found");
  });

  it("full_name が欠損している場合エラーをスローする", () => {
    const user = {
      user_metadata: {
        provider_id: "123456789012345678",
      },
    };

    expect(() => extractDiscordInfo(user)).toThrow(
      "Discord username not found"
    );
  });
});

describe("computeAttendeeSummary", () => {
  const baseRecord: AttendeeRecord = {
    id: "att-1",
    event_id: "event-1",
    event_series_id: null,
    occurrence_date: null,
    guild_id: "11111111111111111",
    user_id: "user-1",
    discord_user_id: "123456789012345678",
    discord_username: "TestUser",
    discord_avatar_url: null,
    status: "going",
    responded_at: "2026-03-17T00:00:00Z",
  };

  it("ステータス別の参加者数を正しく集計する", () => {
    const attendees: AttendeeRecord[] = [
      { ...baseRecord, id: "att-1", status: "going" },
      { ...baseRecord, id: "att-2", status: "going" },
      { ...baseRecord, id: "att-3", status: "maybe" },
      { ...baseRecord, id: "att-4", status: "not_going" },
    ];

    const summary = computeAttendeeSummary(attendees);

    expect(summary).toEqual({
      going: 2,
      maybe: 1,
      notGoing: 1,
      total: 4,
    });
  });

  it("空の配列の場合すべて0を返す", () => {
    const summary = computeAttendeeSummary([]);

    expect(summary).toEqual({
      going: 0,
      maybe: 0,
      notGoing: 0,
      total: 0,
    });
  });

  it("全員 going の場合", () => {
    const attendees: AttendeeRecord[] = [
      { ...baseRecord, id: "att-1", status: "going" },
      { ...baseRecord, id: "att-2", status: "going" },
    ];

    const summary = computeAttendeeSummary(attendees);

    expect(summary.going).toBe(2);
    expect(summary.maybe).toBe(0);
    expect(summary.notGoing).toBe(0);
    expect(summary.total).toBe(2);
  });
});
