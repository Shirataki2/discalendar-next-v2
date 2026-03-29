import { describe, expect, it, vi } from "vitest";
import type {
  EventRow,
  EventSeriesRow,
  GuildRow,
  IcsFeedDeps,
} from "./ics-feed-handler";
import { handleIcsFeed } from "./ics-feed-handler";

// --- Fixtures ---

const publicGuild: GuildRow = {
  guild_id: "111111111111111111",
  name: "Public Guild",
  is_public: true,
  deleted_at: null,
};

const privateGuild: GuildRow = {
  guild_id: "222222222222222222",
  name: "Private Guild",
  is_public: false,
  deleted_at: null,
};

const deletedGuild: GuildRow = {
  guild_id: "333333333333333333",
  name: "Deleted Guild",
  is_public: true,
  deleted_at: "2026-01-01T00:00:00Z",
};

const singleEvent: EventRow = {
  id: "550e8400-e29b-41d4-a716-446655440000",
  guild_id: "111111111111111111",
  name: "Team Meeting",
  description: "Weekly sync",
  color: "#3B82F6",
  is_all_day: false,
  start_at: "2026-03-15T10:00:00Z",
  end_at: "2026-03-15T11:00:00Z",
  location: "Room A",
  series_id: null,
  original_date: null,
  created_at: "2026-03-01T00:00:00Z",
  updated_at: "2026-03-01T00:00:00Z",
};

const exceptionEvent: EventRow = {
  id: "660e8400-e29b-41d4-a716-446655440001",
  guild_id: "111111111111111111",
  name: "Special Meeting",
  description: null,
  color: "#3B82F6",
  is_all_day: false,
  start_at: "2026-04-01T14:00:00Z",
  end_at: "2026-04-01T15:00:00Z",
  location: null,
  series_id: "770e8400-e29b-41d4-a716-446655440002",
  original_date: "2026-04-01T10:00:00Z",
  created_at: "2026-03-01T00:00:00Z",
  updated_at: "2026-03-01T00:00:00Z",
};

const series: EventSeriesRow = {
  id: "770e8400-e29b-41d4-a716-446655440002",
  guild_id: "111111111111111111",
  name: "Weekly Standup",
  description: "Daily standup meeting",
  color: "#22C55E",
  is_all_day: false,
  rrule: "FREQ=WEEKLY;BYDAY=MO",
  dtstart: "2026-03-02T10:00:00Z",
  duration_minutes: 30,
  location: null,
  exdates: ["2026-03-16T10:00:00Z"],
  created_at: "2026-03-01T00:00:00Z",
  updated_at: "2026-03-01T00:00:00Z",
};

const VALID_TOKEN = "a".repeat(64);

function createMockDeps(overrides: Partial<IcsFeedDeps> = {}): IcsFeedDeps {
  return {
    findGuild: vi.fn().mockResolvedValue(null),
    findActiveTokenForGuild: vi.fn().mockResolvedValue(null),
    findSingleEvents: vi.fn().mockResolvedValue([]),
    findEventSeries: vi.fn().mockResolvedValue([]),
    findExceptionEvents: vi.fn().mockResolvedValue([]),
    ...overrides,
  };
}

// --- Tests ---

describe("handleIcsFeed", () => {
  describe("Task 3.1: 基本セットアップとギルド検索", () => {
    it("guild_id未指定で400を返す", async () => {
      const deps = createMockDeps();
      const res = await handleIcsFeed(null, null, deps);
      expect(res.status).toBe(400);
    });

    it("空文字のguild_idで400を返す", async () => {
      const deps = createMockDeps();
      const res = await handleIcsFeed("", null, deps);
      expect(res.status).toBe(400);
    });

    it("存在しないguild_idで404を返す", async () => {
      const deps = createMockDeps({
        findGuild: vi.fn().mockResolvedValue(null),
      });
      const res = await handleIcsFeed("999999999999999999", null, deps);
      expect(res.status).toBe(404);
    });

    it("削除済みギルドで404を返す", async () => {
      const deps = createMockDeps({
        findGuild: vi.fn().mockResolvedValue(deletedGuild),
      });
      const res = await handleIcsFeed(deletedGuild.guild_id, null, deps);
      expect(res.status).toBe(404);
    });

    it("公開ギルドで200とtext/calendarのContent-Typeを返す", async () => {
      const deps = createMockDeps({
        findGuild: vi.fn().mockResolvedValue(publicGuild),
      });
      const res = await handleIcsFeed(publicGuild.guild_id, null, deps);
      expect(res.status).toBe(200);
      expect(res.headers.get("Content-Type")).toBe(
        "text/calendar; charset=utf-8"
      );
    });

    it("レスポンスにCache-Controlヘッダーが含まれる", async () => {
      const deps = createMockDeps({
        findGuild: vi.fn().mockResolvedValue(publicGuild),
      });
      const res = await handleIcsFeed(publicGuild.guild_id, null, deps);
      expect(res.headers.get("Cache-Control")).toBe(
        "public, max-age=3600, stale-while-revalidate=600"
      );
    });

    it("レスポンスにContent-Dispositionヘッダーが含まれる", async () => {
      const deps = createMockDeps({
        findGuild: vi.fn().mockResolvedValue(publicGuild),
      });
      const res = await handleIcsFeed(publicGuild.guild_id, null, deps);
      expect(res.headers.get("Content-Disposition")).toBe(
        'attachment; filename="calendar.ics"'
      );
    });

    it("レスポンスにCORSヘッダーが含まれる", async () => {
      const deps = createMockDeps({
        findGuild: vi.fn().mockResolvedValue(publicGuild),
      });
      const res = await handleIcsFeed(publicGuild.guild_id, null, deps);
      expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
    });
  });

  describe("Task 3.2: アクセストークン認証", () => {
    it("非公開ギルド + 有効なトークンで200を返す", async () => {
      const deps = createMockDeps({
        findGuild: vi.fn().mockResolvedValue(privateGuild),
        findActiveTokenForGuild: vi.fn().mockResolvedValue(VALID_TOKEN),
      });
      const res = await handleIcsFeed(privateGuild.guild_id, VALID_TOKEN, deps);
      expect(res.status).toBe(200);
    });

    it("非公開ギルド + トークンなしで401を返す", async () => {
      const deps = createMockDeps({
        findGuild: vi.fn().mockResolvedValue(privateGuild),
        findActiveTokenForGuild: vi.fn().mockResolvedValue(VALID_TOKEN),
      });
      const res = await handleIcsFeed(privateGuild.guild_id, null, deps);
      expect(res.status).toBe(401);
    });

    it("非公開ギルド + 無効なトークンで401を返す", async () => {
      const deps = createMockDeps({
        findGuild: vi.fn().mockResolvedValue(privateGuild),
        findActiveTokenForGuild: vi.fn().mockResolvedValue(VALID_TOKEN),
      });
      const res = await handleIcsFeed(
        privateGuild.guild_id,
        "invalid-token",
        deps
      );
      expect(res.status).toBe(401);
    });

    it("非公開ギルド + アクティブなトークンがDBにない場合401を返す", async () => {
      const deps = createMockDeps({
        findGuild: vi.fn().mockResolvedValue(privateGuild),
        findActiveTokenForGuild: vi.fn().mockResolvedValue(null),
      });
      const res = await handleIcsFeed(privateGuild.guild_id, VALID_TOKEN, deps);
      expect(res.status).toBe(401);
    });

    it("公開ギルド + トークンなしで200を返す", async () => {
      const deps = createMockDeps({
        findGuild: vi.fn().mockResolvedValue(publicGuild),
      });
      const res = await handleIcsFeed(publicGuild.guild_id, null, deps);
      expect(res.status).toBe(200);
    });

    it("公開ギルド + トークンありでも200を返す", async () => {
      const deps = createMockDeps({
        findGuild: vi.fn().mockResolvedValue(publicGuild),
      });
      const res = await handleIcsFeed(publicGuild.guild_id, "some-token", deps);
      expect(res.status).toBe(200);
    });
  });

  describe("Task 3.3: イベントデータ取得とICSレスポンス生成", () => {
    it("レスポンスにVCALENDARヘッダーが含まれる", async () => {
      const deps = createMockDeps({
        findGuild: vi.fn().mockResolvedValue(publicGuild),
      });
      const res = await handleIcsFeed(publicGuild.guild_id, null, deps);
      const body = await res.text();
      expect(body).toContain("BEGIN:VCALENDAR");
      expect(body).toContain("VERSION:2.0");
      expect(body).toContain("PRODID:");
      expect(body).toContain("END:VCALENDAR");
    });

    it("X-WR-CALNAMEにギルド名が含まれる", async () => {
      const deps = createMockDeps({
        findGuild: vi.fn().mockResolvedValue(publicGuild),
      });
      const res = await handleIcsFeed(publicGuild.guild_id, null, deps);
      const body = await res.text();
      expect(body).toContain(`X-WR-CALNAME:${publicGuild.name}`);
    });

    it("単発イベントがVEVENTとして出力される", async () => {
      const deps = createMockDeps({
        findGuild: vi.fn().mockResolvedValue(publicGuild),
        findSingleEvents: vi.fn().mockResolvedValue([singleEvent]),
      });
      const res = await handleIcsFeed(publicGuild.guild_id, null, deps);
      const body = await res.text();
      expect(body).toContain("BEGIN:VEVENT");
      expect(body).toContain(`SUMMARY:${singleEvent.name}`);
      expect(body).toContain(`UID:${singleEvent.id}@discalendar.app`);
      expect(body).toContain("END:VEVENT");
    });

    it("繰り返しイベントがRRULE付きVEVENTとして出力される", async () => {
      const deps = createMockDeps({
        findGuild: vi.fn().mockResolvedValue(publicGuild),
        findEventSeries: vi.fn().mockResolvedValue([series]),
      });
      const res = await handleIcsFeed(publicGuild.guild_id, null, deps);
      const body = await res.text();
      expect(body).toContain(`RRULE:${series.rrule}`);
      expect(body).toContain(`SUMMARY:${series.name}`);
    });

    it("例外オカレンスがRECURRENCE-ID付きVEVENTとして出力される", async () => {
      const deps = createMockDeps({
        findGuild: vi.fn().mockResolvedValue(publicGuild),
        findExceptionEvents: vi.fn().mockResolvedValue([exceptionEvent]),
      });
      const res = await handleIcsFeed(publicGuild.guild_id, null, deps);
      const body = await res.text();
      expect(body).toContain("RECURRENCE-ID:");
      expect(body).toContain(`SUMMARY:${exceptionEvent.name}`);
      // UID should reference the parent series
      expect(body).toContain(`UID:${exceptionEvent.series_id}@discalendar.app`);
    });

    it("内部情報（channel_id等）がレスポンスに含まれない", async () => {
      const deps = createMockDeps({
        findGuild: vi.fn().mockResolvedValue(publicGuild),
        findSingleEvents: vi.fn().mockResolvedValue([singleEvent]),
      });
      const res = await handleIcsFeed(publicGuild.guild_id, null, deps);
      const body = await res.text();
      expect(body).not.toContain("channel_id");
      expect(body).not.toContain("channel_name");
      expect(body).not.toContain("notifications");
    });

    it("イベントがない場合も空のVCALENDARを返す", async () => {
      const deps = createMockDeps({
        findGuild: vi.fn().mockResolvedValue(publicGuild),
      });
      const res = await handleIcsFeed(publicGuild.guild_id, null, deps);
      const body = await res.text();
      expect(body).toContain("BEGIN:VCALENDAR");
      expect(body).toContain("END:VCALENDAR");
      expect(res.status).toBe(200);
    });

    it("snake_caseのDBデータがcamelCaseに変換されてIcsBuilderに渡される", async () => {
      const deps = createMockDeps({
        findGuild: vi.fn().mockResolvedValue(publicGuild),
        findSingleEvents: vi.fn().mockResolvedValue([singleEvent]),
        findEventSeries: vi.fn().mockResolvedValue([series]),
        findExceptionEvents: vi.fn().mockResolvedValue([exceptionEvent]),
      });
      const res = await handleIcsFeed(publicGuild.guild_id, null, deps);
      const body = await res.text();
      // Verify the ICS output is valid (conversion happened correctly)
      expect(body).toContain("DTSTART:");
      expect(body).toContain("DTEND:");
      expect(body).toContain("RRULE:");
      expect(body).toContain("RECURRENCE-ID:");
      expect(res.status).toBe(200);
    });
  });
});
