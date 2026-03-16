/**
 * RsvpService のユニットテスト
 *
 * Task 2.2: RsvpService を実装する（出欠データの取得・登録・削除）
 * - fetchAttendees: 出欠データ取得 + サマリー算出
 * - upsertRsvp: 出欠登録（upsert）
 * - deleteRsvp: 出欠削除（トグル解除用）
 *
 * Requirements: 1.3, 6.3
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRsvpService } from "@/lib/calendar/rsvp-service";
import type { AttendeeRecord } from "@/lib/calendar/rsvp-types";

// ──────────────────────────────────────────────
// Supabase クエリビルダーモック（thenable 対応）
// ──────────────────────────────────────────────

/**
 * Supabase のクエリビルダーを模倣する thenable なモック。
 * 全メソッドがチェーン可能で、await 時に設定済みの結果を返す。
 */
function createQueryBuilder(data: unknown = null, error: unknown = null) {
  const result = { data, error };

  const builder: Record<string, unknown> = {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    upsert: vi.fn(),
    eq: vi.fn(),
    or: vi.fn(),
    single: vi.fn(),
    maybeSingle: vi.fn(),
    // biome-ignore lint/suspicious/noThenProperty: Supabase クエリビルダーの thenable 模倣に必要
    then(
      onFulfilled?: (value: unknown) => unknown,
      onRejected?: (reason: unknown) => unknown
    ) {
      return Promise.resolve(result).then(onFulfilled, onRejected);
    },
  };

  for (const method of [
    "select",
    "insert",
    "update",
    "delete",
    "upsert",
    "eq",
    "or",
    "single",
    "maybeSingle",
  ]) {
    (builder[method] as ReturnType<typeof vi.fn>).mockReturnValue(builder);
  }

  return builder;
}

// ──────────────────────────────────────────────
// テストデータ
// ──────────────────────────────────────────────

const GUILD_ID = "11111111111111111";
const EVENT_ID = "event-uuid-1";
const SERIES_ID = "series-uuid-1";
const USER_ID = "user-uuid-1";
const DISCORD_USER_ID = "123456789012345678";

const sampleAttendeeRow: AttendeeRecord = {
  id: "att-uuid-1",
  event_id: EVENT_ID,
  event_series_id: null,
  occurrence_date: null,
  guild_id: GUILD_ID,
  user_id: USER_ID,
  discord_user_id: DISCORD_USER_ID,
  discord_username: "TestUser",
  discord_avatar_url: "https://cdn.discordapp.com/avatars/123/abc.png",
  status: "going",
  responded_at: "2026-03-17T00:00:00Z",
};

// ──────────────────────────────────────────────
// テスト
// ──────────────────────────────────────────────

describe("RsvpService", () => {
  const mockFrom = vi.fn();
  const mockSupabase = { from: mockFrom };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ──────────────────────────────────────────────
  // fetchAttendees
  // ──────────────────────────────────────────────

  describe("fetchAttendees", () => {
    it("単発イベントの参加者一覧を取得し、サマリーと現在ユーザーステータスを返す", async () => {
      const attendees: AttendeeRecord[] = [
        {
          ...sampleAttendeeRow,
          id: "att-1",
          status: "going",
          discord_user_id: DISCORD_USER_ID,
        },
        {
          ...sampleAttendeeRow,
          id: "att-2",
          status: "maybe",
          discord_user_id: "999999999999999999",
          discord_username: "OtherUser",
        },
      ];

      mockFrom.mockReturnValue(createQueryBuilder(attendees));

      const service = createRsvpService(
        mockSupabase as unknown as SupabaseClient
      );
      const result = await service.fetchAttendees({
        guildId: GUILD_ID,
        eventId: EVENT_ID,
        currentDiscordUserId: DISCORD_USER_ID,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.attendees).toHaveLength(2);
        expect(result.data.summary).toEqual({
          going: 1,
          maybe: 1,
          notGoing: 0,
          total: 2,
        });
        expect(result.data.currentUserStatus).toBe("going");
      }
    });

    it("繰り返しイベントのオカレンス単位で参加者を取得する", async () => {
      const attendees: AttendeeRecord[] = [
        {
          ...sampleAttendeeRow,
          id: "att-1",
          event_id: null,
          event_series_id: SERIES_ID,
          occurrence_date: "2026-03-17",
          status: "going",
        },
      ];

      mockFrom.mockReturnValue(createQueryBuilder(attendees));

      const service = createRsvpService(
        mockSupabase as unknown as SupabaseClient
      );
      const result = await service.fetchAttendees({
        guildId: GUILD_ID,
        seriesId: SERIES_ID,
        occurrenceDate: "2026-03-17",
        currentDiscordUserId: DISCORD_USER_ID,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.attendees).toHaveLength(1);
        expect(result.data.currentUserStatus).toBe("going");
      }
    });

    it("参加者がいない場合は空のデータを返す", async () => {
      mockFrom.mockReturnValue(createQueryBuilder([]));

      const service = createRsvpService(
        mockSupabase as unknown as SupabaseClient
      );
      const result = await service.fetchAttendees({
        guildId: GUILD_ID,
        eventId: EVENT_ID,
        currentDiscordUserId: DISCORD_USER_ID,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.attendees).toHaveLength(0);
        expect(result.data.summary).toEqual({
          going: 0,
          maybe: 0,
          notGoing: 0,
          total: 0,
        });
        expect(result.data.currentUserStatus).toBeNull();
      }
    });

    it("Supabase エラー時に FETCH_FAILED を返す", async () => {
      mockFrom.mockReturnValue(
        createQueryBuilder(null, { message: "DB error", code: "42P01" })
      );

      const service = createRsvpService(
        mockSupabase as unknown as SupabaseClient
      );
      const result = await service.fetchAttendees({
        guildId: GUILD_ID,
        eventId: EVENT_ID,
        currentDiscordUserId: DISCORD_USER_ID,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe("FETCH_FAILED");
      }
    });
  });

  // ──────────────────────────────────────────────
  // upsertRsvp
  // ──────────────────────────────────────────────

  describe("upsertRsvp", () => {
    it("単発イベントに RSVP を upsert する", async () => {
      const upsertedRecord: AttendeeRecord = {
        ...sampleAttendeeRow,
        status: "going",
      };

      const builder = createQueryBuilder(upsertedRecord);
      mockFrom.mockReturnValue(builder);

      const service = createRsvpService(
        mockSupabase as unknown as SupabaseClient
      );
      const result = await service.upsertRsvp({
        guildId: GUILD_ID,
        eventId: EVENT_ID,
        userId: USER_ID,
        discordUserId: DISCORD_USER_ID,
        discordUsername: "TestUser",
        discordAvatarUrl: "https://cdn.discordapp.com/avatars/123/abc.png",
        status: "going",
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.status).toBe("going");
      }
      expect(mockFrom).toHaveBeenCalledWith("event_attendees");
      expect(builder.upsert).toHaveBeenCalled();
    });

    it("繰り返しイベントのオカレンスに RSVP を upsert する", async () => {
      const upsertedRecord: AttendeeRecord = {
        ...sampleAttendeeRow,
        event_id: null,
        event_series_id: SERIES_ID,
        occurrence_date: "2026-03-17",
        status: "maybe",
      };

      const builder = createQueryBuilder(upsertedRecord);
      mockFrom.mockReturnValue(builder);

      const service = createRsvpService(
        mockSupabase as unknown as SupabaseClient
      );
      const result = await service.upsertRsvp({
        guildId: GUILD_ID,
        seriesId: SERIES_ID,
        occurrenceDate: "2026-03-17",
        userId: USER_ID,
        discordUserId: DISCORD_USER_ID,
        discordUsername: "TestUser",
        discordAvatarUrl: null,
        status: "maybe",
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.status).toBe("maybe");
        expect(result.data.event_series_id).toBe(SERIES_ID);
        expect(result.data.occurrence_date).toBe("2026-03-17");
      }
    });

    it("Supabase エラー時に CREATE_FAILED を返す", async () => {
      mockFrom.mockReturnValue(
        createQueryBuilder(null, { message: "RLS violation", code: "42501" })
      );

      const service = createRsvpService(
        mockSupabase as unknown as SupabaseClient
      );
      const result = await service.upsertRsvp({
        guildId: GUILD_ID,
        eventId: EVENT_ID,
        userId: USER_ID,
        discordUserId: DISCORD_USER_ID,
        discordUsername: "TestUser",
        discordAvatarUrl: null,
        status: "going",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe("CREATE_FAILED");
      }
    });
  });

  // ──────────────────────────────────────────────
  // deleteRsvp
  // ──────────────────────────────────────────────

  describe("deleteRsvp", () => {
    it("単発イベントの RSVP レコードを削除する", async () => {
      const builder = createQueryBuilder(null);
      mockFrom.mockReturnValue(builder);

      const service = createRsvpService(
        mockSupabase as unknown as SupabaseClient
      );
      const result = await service.deleteRsvp({
        guildId: GUILD_ID,
        eventId: EVENT_ID,
        userId: USER_ID,
      });

      expect(result.success).toBe(true);
      expect(mockFrom).toHaveBeenCalledWith("event_attendees");
      expect(builder.delete).toHaveBeenCalled();
    });

    it("繰り返しイベントのオカレンス RSVP レコードを削除する", async () => {
      const builder = createQueryBuilder(null);
      mockFrom.mockReturnValue(builder);

      const service = createRsvpService(
        mockSupabase as unknown as SupabaseClient
      );
      const result = await service.deleteRsvp({
        guildId: GUILD_ID,
        seriesId: SERIES_ID,
        occurrenceDate: "2026-03-17",
        userId: USER_ID,
      });

      expect(result.success).toBe(true);
      expect(mockFrom).toHaveBeenCalledWith("event_attendees");
      expect(builder.delete).toHaveBeenCalled();
    });

    it("Supabase エラー時に DELETE_FAILED を返す", async () => {
      mockFrom.mockReturnValue(
        createQueryBuilder(null, { message: "Delete failed", code: "42501" })
      );

      const service = createRsvpService(
        mockSupabase as unknown as SupabaseClient
      );
      const result = await service.deleteRsvp({
        guildId: GUILD_ID,
        eventId: EVENT_ID,
        userId: USER_ID,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe("DELETE_FAILED");
      }
    });
  });
});
