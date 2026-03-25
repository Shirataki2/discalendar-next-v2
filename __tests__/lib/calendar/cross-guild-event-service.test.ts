/**
 * CrossGuildEventService のユニットテスト
 *
 * TDD: RED → GREEN → REFACTOR
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { GuildInfo } from "@/lib/calendar/cross-guild-event-types";
import { UPCOMING_EVENTS_LIMIT } from "@/lib/calendar/cross-guild-event-types";

// Supabase クライアントのモック
function createMockSupabase() {
  const mockFrom = vi.fn().mockImplementation(() => ({
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    not: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    in: vi.fn().mockResolvedValue({ data: [], error: null }),
  }));

  return {
    supabase: { from: mockFrom } as unknown,
    mockFrom,
  };
}

/** テスト用ギルド情報 */
const GUILD_A: GuildInfo = {
  guildId: "guild-a",
  name: "Server A",
  avatarUrl: "https://cdn.discordapp.com/icons/guild-a/abc.png",
};

const GUILD_B: GuildInfo = {
  guildId: "guild-b",
  name: "Server B",
  avatarUrl: null,
};

describe("CrossGuildEventService", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-24T00:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("fetchUpcomingEvents", () => {
    it("ギルドリストが空の場合は空配列を即座に返す", async () => {
      const { fetchUpcomingEvents } = await import(
        "@/lib/calendar/cross-guild-event-service"
      );
      const { supabase } = createMockSupabase();

      const result = await fetchUpcomingEvents(
        supabase as Parameters<typeof fetchUpcomingEvents>[0],
        { guilds: [] }
      );

      expect(result).toEqual({
        success: true,
        data: [],
        hasMore: false,
      });
    });

    it("単発イベントを取得してUpcomingEventに変換する", async () => {
      const { fetchUpcomingEvents } = await import(
        "@/lib/calendar/cross-guild-event-service"
      );

      // events テーブルのモックデータ
      const singleEvents = [
        {
          id: "event-1",
          guild_id: "guild-a",
          name: "Meeting",
          description: null,
          color: "#3B82F6",
          is_all_day: false,
          start_at: "2026-03-25T10:00:00Z",
          end_at: "2026-03-25T11:00:00Z",
          location: null,
          channel_id: null,
          channel_name: null,
          notifications: [],
          series_id: null,
          original_date: null,
          created_at: "2026-03-01T00:00:00Z",
          updated_at: "2026-03-01T00:00:00Z",
        },
      ];

      // Supabase クエリをモック
      const mockFrom = vi.fn();

      // 1回目: 単発イベント取得
      const singleQuery = {
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        is: vi.fn().mockResolvedValue({ data: singleEvents, error: null }),
      };

      // 2回目: event_series 取得
      const seriesQuery = {
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        lte: vi.fn().mockResolvedValue({ data: [], error: null }),
      };

      // 3回目: 例外レコード取得
      const exceptionQuery = {
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        not: vi.fn().mockReturnThis(),
        or: vi.fn().mockResolvedValue({ data: [], error: null }),
      };

      mockFrom
        .mockReturnValueOnce(singleQuery)
        .mockReturnValueOnce(seriesQuery)
        .mockReturnValueOnce(exceptionQuery);

      const supabase = { from: mockFrom };

      const result = await fetchUpcomingEvents(
        supabase as Parameters<typeof fetchUpcomingEvents>[0],
        { guilds: [GUILD_A] }
      );

      expect(result.success).toBe(true);
      if (!result.success) {
        return;
      }

      expect(result.data).toHaveLength(1);
      expect(result.data[0]).toEqual({
        id: "event-1",
        title: "Meeting",
        start: "2026-03-25T10:00:00Z",
        end: "2026-03-25T11:00:00Z",
        allDay: false,
        color: "#3B82F6",
        isRecurring: false,
        guildId: "guild-a",
        guildName: "Server A",
        guildAvatarUrl: "https://cdn.discordapp.com/icons/guild-a/abc.png",
      });
    });

    it("DBエラー時にFETCH_FAILEDエラーを返す", async () => {
      const { fetchUpcomingEvents } = await import(
        "@/lib/calendar/cross-guild-event-service"
      );

      const mockFrom = vi.fn();
      const singleQuery = {
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        is: vi.fn().mockResolvedValue({
          data: null,
          error: { message: "connection error", code: "PGRST000" },
        }),
      };
      mockFrom.mockReturnValueOnce(singleQuery);

      const supabase = { from: mockFrom };

      const result = await fetchUpcomingEvents(
        supabase as Parameters<typeof fetchUpcomingEvents>[0],
        { guilds: [GUILD_A] }
      );

      expect(result.success).toBe(false);
      if (result.success) {
        return;
      }
      expect(result.error.code).toBe("FETCH_FAILED");
    });

    it("複数ギルドのイベントを時系列順でソートして返す", async () => {
      const { fetchUpcomingEvents } = await import(
        "@/lib/calendar/cross-guild-event-service"
      );

      const singleEvents = [
        {
          id: "event-2",
          guild_id: "guild-b",
          name: "Later Event",
          description: null,
          color: "#22C55E",
          is_all_day: false,
          start_at: "2026-03-26T14:00:00Z",
          end_at: "2026-03-26T15:00:00Z",
          location: null,
          channel_id: null,
          channel_name: null,
          notifications: [],
          series_id: null,
          original_date: null,
          created_at: "2026-03-01T00:00:00Z",
          updated_at: "2026-03-01T00:00:00Z",
        },
        {
          id: "event-1",
          guild_id: "guild-a",
          name: "Earlier Event",
          description: null,
          color: "#3B82F6",
          is_all_day: false,
          start_at: "2026-03-25T10:00:00Z",
          end_at: "2026-03-25T11:00:00Z",
          location: null,
          channel_id: null,
          channel_name: null,
          notifications: [],
          series_id: null,
          original_date: null,
          created_at: "2026-03-01T00:00:00Z",
          updated_at: "2026-03-01T00:00:00Z",
        },
      ];

      const mockFrom = vi.fn();
      const singleQuery = {
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        is: vi.fn().mockResolvedValue({ data: singleEvents, error: null }),
      };
      const seriesQuery = {
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        lte: vi.fn().mockResolvedValue({ data: [], error: null }),
      };
      const exceptionQuery = {
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        not: vi.fn().mockReturnThis(),
        or: vi.fn().mockResolvedValue({ data: [], error: null }),
      };
      mockFrom
        .mockReturnValueOnce(singleQuery)
        .mockReturnValueOnce(seriesQuery)
        .mockReturnValueOnce(exceptionQuery);

      const supabase = { from: mockFrom };

      const result = await fetchUpcomingEvents(
        supabase as Parameters<typeof fetchUpcomingEvents>[0],
        { guilds: [GUILD_A, GUILD_B] }
      );

      expect(result.success).toBe(true);
      if (!result.success) {
        return;
      }

      expect(result.data).toHaveLength(2);
      // 時系列順: Earlier → Later
      const [first, second] = result.data;
      expect(first?.title).toBe("Earlier Event");
      expect(first?.guildId).toBe("guild-a");
      expect(second?.title).toBe("Later Event");
      expect(second?.guildId).toBe("guild-b");
    });

    it("20件の上限を超える場合はhasMoreがtrueになる", async () => {
      const { fetchUpcomingEvents } = await import(
        "@/lib/calendar/cross-guild-event-service"
      );

      // 25件の単発イベントを生成
      const manyEvents = Array.from({ length: 25 }, (_, i) => ({
        id: `event-${i}`,
        guild_id: "guild-a",
        name: `Event ${i}`,
        description: null,
        color: "#3B82F6",
        is_all_day: false,
        start_at: new Date(Date.UTC(2026, 2, 25) + i * 3_600_000).toISOString(),
        end_at: new Date(
          Date.UTC(2026, 2, 25) + (i + 1) * 3_600_000
        ).toISOString(),
        location: null,
        channel_id: null,
        channel_name: null,
        notifications: [],
        series_id: null,
        original_date: null,
        created_at: "2026-03-01T00:00:00Z",
        updated_at: "2026-03-01T00:00:00Z",
      }));

      const mockFrom = vi.fn();
      const singleQuery = {
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        is: vi.fn().mockResolvedValue({ data: manyEvents, error: null }),
      };
      const seriesQuery = {
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        lte: vi.fn().mockResolvedValue({ data: [], error: null }),
      };
      const exceptionQuery = {
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        not: vi.fn().mockReturnThis(),
        or: vi.fn().mockResolvedValue({ data: [], error: null }),
      };
      mockFrom
        .mockReturnValueOnce(singleQuery)
        .mockReturnValueOnce(seriesQuery)
        .mockReturnValueOnce(exceptionQuery);

      const supabase = { from: mockFrom };

      const result = await fetchUpcomingEvents(
        supabase as Parameters<typeof fetchUpcomingEvents>[0],
        { guilds: [GUILD_A] }
      );

      expect(result.success).toBe(true);
      if (!result.success) {
        return;
      }

      expect(result.data).toHaveLength(UPCOMING_EVENTS_LIMIT);
      expect(result.hasMore).toBe(true);
    });

    it("繰り返しイベントのオカレンスを展開してUpcomingEventに変換する", async () => {
      const { fetchUpcomingEvents } = await import(
        "@/lib/calendar/cross-guild-event-service"
      );

      const seriesData = [
        {
          id: "series-1",
          guild_id: "guild-a",
          name: "Weekly Meeting",
          description: null,
          color: "#F59E0B",
          is_all_day: false,
          rrule: "FREQ=WEEKLY;BYDAY=WE",
          dtstart: "2026-03-04T10:00:00Z",
          duration_minutes: 60,
          location: null,
          channel_id: null,
          channel_name: null,
          notifications: [],
          exdates: [],
          created_at: "2026-03-01T00:00:00Z",
          updated_at: "2026-03-01T00:00:00Z",
        },
      ];

      const mockFrom = vi.fn();
      const singleQuery = {
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        is: vi.fn().mockResolvedValue({ data: [], error: null }),
      };
      const seriesQuery = {
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        lte: vi.fn().mockResolvedValue({ data: seriesData, error: null }),
      };
      const exceptionQuery = {
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        not: vi.fn().mockReturnThis(),
        or: vi.fn().mockResolvedValue({ data: [], error: null }),
      };
      mockFrom
        .mockReturnValueOnce(singleQuery)
        .mockReturnValueOnce(seriesQuery)
        .mockReturnValueOnce(exceptionQuery);

      const supabase = { from: mockFrom };

      const result = await fetchUpcomingEvents(
        supabase as Parameters<typeof fetchUpcomingEvents>[0],
        { guilds: [GUILD_A] }
      );

      expect(result.success).toBe(true);
      if (!result.success) {
        return;
      }

      // 2026-03-24 〜 2026-04-23 の水曜日: 3/25, 4/1, 4/8, 4/15, 4/22
      expect(result.data.length).toBeGreaterThanOrEqual(1);
      for (const event of result.data) {
        expect(event.isRecurring).toBe(true);
        expect(event.guildId).toBe("guild-a");
        expect(event.guildName).toBe("Server A");
        expect(event.title).toBe("Weekly Meeting");
        expect(event.id).toMatch(/^series-1:/);
      }
    });

    it("例外レコードがオカレンスを差し替える", async () => {
      const { fetchUpcomingEvents } = await import(
        "@/lib/calendar/cross-guild-event-service"
      );

      const seriesData = [
        {
          id: "series-1",
          guild_id: "guild-a",
          name: "Weekly Meeting",
          description: null,
          color: "#F59E0B",
          is_all_day: false,
          rrule: "FREQ=WEEKLY;BYDAY=WE",
          dtstart: "2026-03-04T10:00:00Z",
          duration_minutes: 60,
          location: null,
          channel_id: null,
          channel_name: null,
          notifications: [],
          exdates: [],
          created_at: "2026-03-01T00:00:00Z",
          updated_at: "2026-03-01T00:00:00Z",
        },
      ];

      // 3/25 のオカレンスを「Rescheduled Meeting」に差し替え
      const exceptionData = [
        {
          id: "exc-1",
          guild_id: "guild-a",
          name: "Rescheduled Meeting",
          description: null,
          color: "#EF4444",
          is_all_day: false,
          start_at: "2026-03-25T14:00:00Z",
          end_at: "2026-03-25T15:00:00Z",
          location: null,
          channel_id: null,
          channel_name: null,
          notifications: [],
          series_id: "series-1",
          original_date: "2026-03-25T10:00:00Z",
          created_at: "2026-03-01T00:00:00Z",
          updated_at: "2026-03-01T00:00:00Z",
        },
      ];

      const mockFrom = vi.fn();
      const singleQuery = {
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        is: vi.fn().mockResolvedValue({ data: [], error: null }),
      };
      const seriesQuery = {
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        lte: vi.fn().mockResolvedValue({ data: seriesData, error: null }),
      };
      const exceptionQuery = {
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        not: vi.fn().mockReturnThis(),
        or: vi.fn().mockResolvedValue({ data: exceptionData, error: null }),
      };
      mockFrom
        .mockReturnValueOnce(singleQuery)
        .mockReturnValueOnce(seriesQuery)
        .mockReturnValueOnce(exceptionQuery);

      const supabase = { from: mockFrom };

      const result = await fetchUpcomingEvents(
        supabase as Parameters<typeof fetchUpcomingEvents>[0],
        { guilds: [GUILD_A] }
      );

      expect(result.success).toBe(true);
      if (!result.success) {
        return;
      }

      // 例外で差し替えられたオカレンスを探す
      const rescheduled = result.data.find(
        (e) => e.title === "Rescheduled Meeting"
      );
      expect(rescheduled).toBeDefined();
      expect(rescheduled?.start).toBe("2026-03-25T14:00:00Z");
      expect(rescheduled?.color).toBe("#EF4444");
      expect(rescheduled?.isRecurring).toBe(true);

      // 元の 3/25 10:00 のオカレンスは表示されない
      const originalOccurrence = result.data.find(
        (e) =>
          e.title === "Weekly Meeting" && e.start === "2026-03-25T10:00:00.000Z"
      );
      expect(originalOccurrence).toBeUndefined();
    });

    it("カスタムのdays/limitパラメータを尊重する", async () => {
      const { fetchUpcomingEvents } = await import(
        "@/lib/calendar/cross-guild-event-service"
      );

      const singleEvents = Array.from({ length: 5 }, (_, i) => ({
        id: `event-${i}`,
        guild_id: "guild-a",
        name: `Event ${i}`,
        description: null,
        color: "#3B82F6",
        is_all_day: false,
        start_at: new Date(Date.UTC(2026, 2, 25) + i * 3_600_000).toISOString(),
        end_at: new Date(
          Date.UTC(2026, 2, 25) + (i + 1) * 3_600_000
        ).toISOString(),
        location: null,
        channel_id: null,
        channel_name: null,
        notifications: [],
        series_id: null,
        original_date: null,
        created_at: "2026-03-01T00:00:00Z",
        updated_at: "2026-03-01T00:00:00Z",
      }));

      const mockFrom = vi.fn();
      const singleQuery = {
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        is: vi.fn().mockResolvedValue({ data: singleEvents, error: null }),
      };
      const seriesQuery = {
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        lte: vi.fn().mockResolvedValue({ data: [], error: null }),
      };
      const exceptionQuery = {
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        not: vi.fn().mockReturnThis(),
        or: vi.fn().mockResolvedValue({ data: [], error: null }),
      };
      mockFrom
        .mockReturnValueOnce(singleQuery)
        .mockReturnValueOnce(seriesQuery)
        .mockReturnValueOnce(exceptionQuery);

      const supabase = { from: mockFrom };

      const result = await fetchUpcomingEvents(
        supabase as Parameters<typeof fetchUpcomingEvents>[0],
        { guilds: [GUILD_A], limit: 3 }
      );

      expect(result.success).toBe(true);
      if (!result.success) {
        return;
      }

      expect(result.data).toHaveLength(3);
      expect(result.hasMore).toBe(true);
    });

    it("単発イベントと繰り返しオカレンスが混在してもソートされる", async () => {
      const { fetchUpcomingEvents } = await import(
        "@/lib/calendar/cross-guild-event-service"
      );

      const singleEvents = [
        {
          id: "event-1",
          guild_id: "guild-a",
          name: "Single Event",
          description: null,
          color: "#3B82F6",
          is_all_day: false,
          start_at: "2026-03-26T10:00:00Z",
          end_at: "2026-03-26T11:00:00Z",
          location: null,
          channel_id: null,
          channel_name: null,
          notifications: [],
          series_id: null,
          original_date: null,
          created_at: "2026-03-01T00:00:00Z",
          updated_at: "2026-03-01T00:00:00Z",
        },
      ];

      // 毎週水曜 → 3/25 が最初のオカレンス（3/26の前）
      const seriesData = [
        {
          id: "series-1",
          guild_id: "guild-b",
          name: "Recurring Event",
          description: null,
          color: "#22C55E",
          is_all_day: false,
          rrule: "FREQ=WEEKLY;BYDAY=WE",
          dtstart: "2026-03-04T09:00:00Z",
          duration_minutes: 60,
          location: null,
          channel_id: null,
          channel_name: null,
          notifications: [],
          exdates: [],
          created_at: "2026-03-01T00:00:00Z",
          updated_at: "2026-03-01T00:00:00Z",
        },
      ];

      const mockFrom = vi.fn();
      const singleQuery = {
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        is: vi.fn().mockResolvedValue({ data: singleEvents, error: null }),
      };
      const seriesQuery = {
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        lte: vi.fn().mockResolvedValue({ data: seriesData, error: null }),
      };
      const exceptionQuery = {
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        not: vi.fn().mockReturnThis(),
        or: vi.fn().mockResolvedValue({ data: [], error: null }),
      };
      mockFrom
        .mockReturnValueOnce(singleQuery)
        .mockReturnValueOnce(seriesQuery)
        .mockReturnValueOnce(exceptionQuery);

      const supabase = { from: mockFrom };

      const result = await fetchUpcomingEvents(
        supabase as Parameters<typeof fetchUpcomingEvents>[0],
        { guilds: [GUILD_A, GUILD_B] }
      );

      expect(result.success).toBe(true);
      if (!result.success) {
        return;
      }

      expect(result.data.length).toBeGreaterThanOrEqual(2);
      // 3/25 09:00 (recurring) が 3/26 10:00 (single) の前に来る
      const firstEvent = result.data[0];
      expect(firstEvent?.title).toBe("Recurring Event");
      expect(firstEvent?.isRecurring).toBe(true);
    });

    it("event_series取得時のDBエラーをハンドリングする", async () => {
      const { fetchUpcomingEvents } = await import(
        "@/lib/calendar/cross-guild-event-service"
      );

      const mockFrom = vi.fn();
      const singleQuery = {
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        is: vi.fn().mockResolvedValue({ data: [], error: null }),
      };
      const seriesQuery = {
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        lte: vi.fn().mockResolvedValue({
          data: null,
          error: { message: "series query failed", code: "PGRST000" },
        }),
      };
      mockFrom
        .mockReturnValueOnce(singleQuery)
        .mockReturnValueOnce(seriesQuery);

      const supabase = { from: mockFrom };

      const result = await fetchUpcomingEvents(
        supabase as Parameters<typeof fetchUpcomingEvents>[0],
        { guilds: [GUILD_A] }
      );

      expect(result.success).toBe(false);
      if (result.success) {
        return;
      }
      expect(result.error.code).toBe("FETCH_FAILED");
    });

    it("各イベントに正しいギルド情報が付与される", async () => {
      const { fetchUpcomingEvents } = await import(
        "@/lib/calendar/cross-guild-event-service"
      );

      const singleEvents = [
        {
          id: "event-a",
          guild_id: "guild-a",
          name: "Event A",
          description: null,
          color: "#3B82F6",
          is_all_day: false,
          start_at: "2026-03-25T10:00:00Z",
          end_at: "2026-03-25T11:00:00Z",
          location: null,
          channel_id: null,
          channel_name: null,
          notifications: [],
          series_id: null,
          original_date: null,
          created_at: "2026-03-01T00:00:00Z",
          updated_at: "2026-03-01T00:00:00Z",
        },
        {
          id: "event-b",
          guild_id: "guild-b",
          name: "Event B",
          description: null,
          color: "#22C55E",
          is_all_day: true,
          start_at: "2026-03-26T00:00:00Z",
          end_at: "2026-03-26T23:59:59Z",
          location: null,
          channel_id: null,
          channel_name: null,
          notifications: [],
          series_id: null,
          original_date: null,
          created_at: "2026-03-01T00:00:00Z",
          updated_at: "2026-03-01T00:00:00Z",
        },
      ];

      const mockFrom = vi.fn();
      const singleQuery = {
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        is: vi.fn().mockResolvedValue({ data: singleEvents, error: null }),
      };
      const seriesQuery = {
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        lte: vi.fn().mockResolvedValue({ data: [], error: null }),
      };
      const exceptionQuery = {
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        not: vi.fn().mockReturnThis(),
        or: vi.fn().mockResolvedValue({ data: [], error: null }),
      };
      mockFrom
        .mockReturnValueOnce(singleQuery)
        .mockReturnValueOnce(seriesQuery)
        .mockReturnValueOnce(exceptionQuery);

      const supabase = { from: mockFrom };

      const result = await fetchUpcomingEvents(
        supabase as Parameters<typeof fetchUpcomingEvents>[0],
        { guilds: [GUILD_A, GUILD_B] }
      );

      expect(result.success).toBe(true);
      if (!result.success) {
        return;
      }

      const eventA = result.data.find((e) => e.title === "Event A");
      const eventB = result.data.find((e) => e.title === "Event B");

      expect(eventA?.guildId).toBe("guild-a");
      expect(eventA?.guildName).toBe("Server A");
      expect(eventA?.guildAvatarUrl).toBe(
        "https://cdn.discordapp.com/icons/guild-a/abc.png"
      );

      expect(eventB?.guildId).toBe("guild-b");
      expect(eventB?.guildName).toBe("Server B");
      expect(eventB?.guildAvatarUrl).toBeNull();
      expect(eventB?.allDay).toBe(true);
    });
  });
});
