import { describe, expect, it } from "vitest";
import {
  type BuildCalendarParams,
  buildCalendar,
  escapeText,
  foldLine,
  formatDateTimeToIcs,
  formatDateToIcs,
  generateUid,
  type IcsEvent,
  type IcsException,
  type IcsSeries,
} from "./ics-builder";

// --- Test Fixtures ---

const singleEvent: IcsEvent = {
  id: "550e8400-e29b-41d4-a716-446655440000",
  name: "チームミーティング",
  description: "週次の定例会議です",
  color: "#3B82F6",
  isAllDay: false,
  startAt: "2026-03-15T10:00:00Z",
  endAt: "2026-03-15T11:00:00Z",
  location: "会議室A",
  createdAt: "2026-03-01T00:00:00Z",
  updatedAt: "2026-03-01T00:00:00Z",
};

const allDayEvent: IcsEvent = {
  id: "660e8400-e29b-41d4-a716-446655440001",
  name: "合宿",
  description: null,
  color: "#22C55E",
  isAllDay: true,
  startAt: "2026-04-01T00:00:00Z",
  endAt: "2026-04-03T00:00:00Z",
  location: null,
  createdAt: "2026-03-01T00:00:00Z",
  updatedAt: "2026-03-01T00:00:00Z",
};

const recurringSeries: IcsSeries = {
  id: "770e8400-e29b-41d4-a716-446655440002",
  name: "朝会",
  description: "毎週月曜の朝会",
  color: "#F59E0B",
  isAllDay: false,
  rrule: "FREQ=WEEKLY;BYDAY=MO",
  dtstart: "2026-03-02T09:00:00Z",
  durationMinutes: 30,
  location: null,
  exdates: [],
  createdAt: "2026-03-01T00:00:00Z",
  updatedAt: "2026-03-01T00:00:00Z",
};

const seriesWithExdates: IcsSeries = {
  id: "880e8400-e29b-41d4-a716-446655440003",
  name: "月例レビュー",
  description: null,
  color: "#EF4444",
  isAllDay: false,
  rrule: "FREQ=MONTHLY;BYMONTHDAY=15",
  dtstart: "2026-01-15T14:00:00Z",
  durationMinutes: 60,
  location: "大会議室",
  exdates: ["2026-02-15T14:00:00Z", "2026-05-15T14:00:00Z"],
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
};

const allDaySeries: IcsSeries = {
  id: "990e8400-e29b-41d4-a716-446655440010",
  name: "月末締め日",
  description: null,
  color: "#3B82F6",
  isAllDay: true,
  rrule: "FREQ=MONTHLY;BYMONTHDAY=-1",
  dtstart: "2026-01-31T00:00:00Z",
  durationMinutes: 1440,
  location: null,
  exdates: [],
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
};

const exceptionOccurrence: IcsException = {
  id: "990e8400-e29b-41d4-a716-446655440004",
  seriesId: "770e8400-e29b-41d4-a716-446655440002",
  name: "朝会（特別版）",
  description: "ゲスト参加の特別回",
  color: "#F59E0B",
  isAllDay: false,
  startAt: "2026-03-09T09:30:00Z",
  endAt: "2026-03-09T10:30:00Z",
  location: "大会議室",
  originalDate: "2026-03-09T09:00:00Z",
  createdAt: "2026-03-01T00:00:00Z",
  updatedAt: "2026-03-05T00:00:00Z",
};

// --- Helper Function Tests ---

describe("ics-builder", () => {
  describe("generateUid", () => {
    it("should generate UID in {id}@discalendar.app format [Req 2.6]", () => {
      const uid = generateUid("550e8400-e29b-41d4-a716-446655440000");
      expect(uid).toBe("550e8400-e29b-41d4-a716-446655440000@discalendar.app");
    });
  });

  describe("formatDateTimeToIcs", () => {
    it("should convert ISO 8601 UTC to ICS datetime format YYYYMMDDTHHMMSSZ", () => {
      expect(formatDateTimeToIcs("2026-03-15T10:00:00Z")).toBe(
        "20260315T100000Z"
      );
    });

    it("should handle midnight correctly", () => {
      expect(formatDateTimeToIcs("2026-01-01T00:00:00Z")).toBe(
        "20260101T000000Z"
      );
    });

    it("should handle end-of-day time", () => {
      expect(formatDateTimeToIcs("2026-12-31T23:59:59Z")).toBe(
        "20261231T235959Z"
      );
    });
  });

  describe("formatDateToIcs", () => {
    it("should convert ISO 8601 to ICS date format YYYYMMDD for all-day events [Req 2.5]", () => {
      expect(formatDateToIcs("2026-04-01T00:00:00Z")).toBe("20260401");
    });
  });

  describe("escapeText", () => {
    it("should escape commas with backslash", () => {
      expect(escapeText("Hello, World")).toBe("Hello\\, World");
    });

    it("should escape semicolons with backslash", () => {
      expect(escapeText("key;value")).toBe("key\\;value");
    });

    it("should convert newlines to \\n", () => {
      expect(escapeText("line1\nline2")).toBe("line1\\nline2");
    });

    it("should escape backslashes", () => {
      expect(escapeText("path\\to\\file")).toBe("path\\\\to\\\\file");
    });

    it("should handle multiple escape characters together", () => {
      expect(escapeText("a, b; c\nd")).toBe("a\\, b\\; c\\nd");
    });

    it("should return empty string for empty input", () => {
      expect(escapeText("")).toBe("");
    });
  });

  describe("foldLine", () => {
    it("should not fold lines within 75 octets", () => {
      const short = "SUMMARY:Short title";
      expect(foldLine(short)).toBe(short);
    });

    it("should fold lines exceeding 75 octets with CRLF + space", () => {
      const long = `DESCRIPTION:${"A".repeat(80)}`;
      const folded = foldLine(long);
      const lines = folded.split("\r\n");
      expect(lines.length).toBeGreaterThan(1);
      // First line should be at most 75 octets
      expect(Buffer.byteLength(lines[0], "utf-8")).toBeLessThanOrEqual(75);
      // Continuation lines start with space
      for (let i = 1; i < lines.length; i++) {
        expect(lines[i].startsWith(" ")).toBe(true);
      }
    });

    it("should correctly fold multibyte characters without splitting them", () => {
      // Each Japanese character is 3 bytes in UTF-8
      const longJapanese = `SUMMARY:${"あ".repeat(30)}`; // 8 + 90 = 98 bytes
      const folded = foldLine(longJapanese);
      const lines = folded.split("\r\n");
      expect(lines.length).toBeGreaterThan(1);
      for (const line of lines) {
        expect(Buffer.byteLength(line, "utf-8")).toBeLessThanOrEqual(75);
      }
    });

    it("should produce unfoldable output (fold+unfold roundtrip)", () => {
      const original = `DESCRIPTION:${"テスト".repeat(20)}`;
      const folded = foldLine(original);
      // Unfold by removing CRLF+space
      const unfolded = folded.replace(/\r\n /g, "");
      expect(unfolded).toBe(original);
    });
  });

  // --- VCALENDAR Structure Tests ---

  describe("buildCalendar - VCALENDAR structure", () => {
    const emptyParams: BuildCalendarParams = {
      calendarName: "テストギルド",
      events: [],
      series: [],
      exceptions: [],
    };

    it("should start with BEGIN:VCALENDAR [Req 1.2]", () => {
      const ics = buildCalendar(emptyParams);
      expect(ics.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true);
    });

    it("should end with END:VCALENDAR [Req 1.2]", () => {
      const ics = buildCalendar(emptyParams);
      expect(ics.trimEnd().endsWith("END:VCALENDAR")).toBe(true);
    });

    it("should include VERSION:2.0 [Req 1.2]", () => {
      const ics = buildCalendar(emptyParams);
      expect(ics).toContain("VERSION:2.0\r\n");
    });

    it("should include PRODID [Req 1.2]", () => {
      const ics = buildCalendar(emptyParams);
      expect(ics).toMatch(/PRODID:-\/\/.*\/\/.*\/\/EN\r\n/);
    });

    it("should include X-WR-CALNAME with guild name [Req 1.2]", () => {
      const ics = buildCalendar(emptyParams);
      expect(ics).toContain("X-WR-CALNAME:テストギルド\r\n");
    });

    it("should use CRLF line endings throughout", () => {
      const ics = buildCalendar(emptyParams);
      // All line breaks should be CRLF, not bare LF
      const lines = ics.split("\r\n");
      for (const line of lines) {
        expect(line).not.toContain("\n");
      }
    });
  });

  // --- Single Event VEVENT Tests ---

  describe("buildCalendar - single events", () => {
    it("should output VEVENT for single events (series_id NULL) [Req 2.1]", () => {
      const ics = buildCalendar({
        calendarName: "テスト",
        events: [singleEvent],
        series: [],
        exceptions: [],
      });
      expect(ics).toContain("BEGIN:VEVENT\r\n");
      expect(ics).toContain("END:VEVENT\r\n");
    });

    it("should include DTSTART, DTEND, SUMMARY, UID as required fields [Req 2.2]", () => {
      const ics = buildCalendar({
        calendarName: "テスト",
        events: [singleEvent],
        series: [],
        exceptions: [],
      });
      expect(ics).toContain("DTSTART:20260315T100000Z\r\n");
      expect(ics).toContain("DTEND:20260315T110000Z\r\n");
      expect(ics).toContain("SUMMARY:チームミーティング\r\n");
      expect(ics).toContain(`UID:${singleEvent.id}@discalendar.app\r\n`);
    });

    it("should include DTSTAMP [Req 2.2]", () => {
      const ics = buildCalendar({
        calendarName: "テスト",
        events: [singleEvent],
        series: [],
        exceptions: [],
      });
      expect(ics).toMatch(/DTSTAMP:\d{8}T\d{6}Z\r\n/);
    });

    it("should include DESCRIPTION when event has description [Req 2.3]", () => {
      const ics = buildCalendar({
        calendarName: "テスト",
        events: [singleEvent],
        series: [],
        exceptions: [],
      });
      expect(ics).toContain("DESCRIPTION:週次の定例会議です\r\n");
    });

    it("should not include DESCRIPTION when event has no description [Req 2.3]", () => {
      const noDescEvent: IcsEvent = { ...singleEvent, description: null };
      const ics = buildCalendar({
        calendarName: "テスト",
        events: [noDescEvent],
        series: [],
        exceptions: [],
      });
      expect(ics).not.toContain("DESCRIPTION:");
    });

    it("should include LOCATION when event has location [Req 2.4]", () => {
      const ics = buildCalendar({
        calendarName: "テスト",
        events: [singleEvent],
        series: [],
        exceptions: [],
      });
      expect(ics).toContain("LOCATION:会議室A\r\n");
    });

    it("should not include LOCATION when event has no location [Req 2.4]", () => {
      const noLocEvent: IcsEvent = { ...singleEvent, location: null };
      const ics = buildCalendar({
        calendarName: "テスト",
        events: [noLocEvent],
        series: [],
        exceptions: [],
      });
      expect(ics).not.toContain("LOCATION:");
    });

    it("should use VALUE=DATE format for all-day events [Req 2.5]", () => {
      const ics = buildCalendar({
        calendarName: "テスト",
        events: [allDayEvent],
        series: [],
        exceptions: [],
      });
      expect(ics).toContain("DTSTART;VALUE=DATE:20260401\r\n");
      expect(ics).toContain("DTEND;VALUE=DATE:20260403\r\n");
    });

    it("should not use VALUE=DATE for timed events", () => {
      const ics = buildCalendar({
        calendarName: "テスト",
        events: [singleEvent],
        series: [],
        exceptions: [],
      });
      expect(ics).not.toContain("VALUE=DATE");
    });
  });

  // --- Recurring Event VEVENT Tests ---

  describe("buildCalendar - recurring events", () => {
    it("should output RRULE-bearing VEVENT for event_series [Req 3.1]", () => {
      const ics = buildCalendar({
        calendarName: "テスト",
        events: [],
        series: [recurringSeries],
        exceptions: [],
      });
      expect(ics).toContain("BEGIN:VEVENT\r\n");
      expect(ics).toContain("RRULE:FREQ=WEEKLY;BYDAY=MO\r\n");
    });

    it("should output rrule value as-is in RRULE property [Req 3.2]", () => {
      const ics = buildCalendar({
        calendarName: "テスト",
        events: [],
        series: [seriesWithExdates],
        exceptions: [],
      });
      expect(ics).toContain("RRULE:FREQ=MONTHLY;BYMONTHDAY=15\r\n");
    });

    it("should use dtstart as DTSTART and dtstart + duration_minutes as DTEND [Req 3.3]", () => {
      const ics = buildCalendar({
        calendarName: "テスト",
        events: [],
        series: [recurringSeries],
        exceptions: [],
      });
      // dtstart = 2026-03-02T09:00:00Z
      expect(ics).toContain("DTSTART:20260302T090000Z\r\n");
      // dtstart + 30 minutes = 2026-03-02T09:30:00Z
      expect(ics).toContain("DTEND:20260302T093000Z\r\n");
    });

    it("should output EXDATE when exdates are present [Req 3.4]", () => {
      const ics = buildCalendar({
        calendarName: "テスト",
        events: [],
        series: [seriesWithExdates],
        exceptions: [],
      });
      expect(ics).toContain("EXDATE:20260215T140000Z,20260515T140000Z\r\n");
    });

    it("should not include EXDATE when exdates are empty", () => {
      const ics = buildCalendar({
        calendarName: "テスト",
        events: [],
        series: [recurringSeries],
        exceptions: [],
      });
      expect(ics).not.toContain("EXDATE:");
    });

    it("should use VALUE=DATE for all-day recurring series", () => {
      const ics = buildCalendar({
        calendarName: "テスト",
        events: [],
        series: [allDaySeries],
        exceptions: [],
      });
      expect(ics).toContain("DTSTART;VALUE=DATE:20260131\r\n");
      // 1440 minutes = 1 day, so DTEND should be next day
      expect(ics).toContain("DTEND;VALUE=DATE:20260201\r\n");
    });

    it("should include UID and SUMMARY for series [Req 3.1]", () => {
      const ics = buildCalendar({
        calendarName: "テスト",
        events: [],
        series: [recurringSeries],
        exceptions: [],
      });
      expect(ics).toContain(`UID:${recurringSeries.id}@discalendar.app\r\n`);
      expect(ics).toContain("SUMMARY:朝会\r\n");
    });
  });

  // --- Exception Occurrence Tests ---

  describe("buildCalendar - exception occurrences", () => {
    it("should output RECURRENCE-ID for exception events [Req 3.5]", () => {
      const ics = buildCalendar({
        calendarName: "テスト",
        events: [],
        series: [recurringSeries],
        exceptions: [exceptionOccurrence],
      });
      expect(ics).toContain("RECURRENCE-ID:20260309T090000Z\r\n");
    });

    it("should use parent series UID for exception events [Req 3.5]", () => {
      const ics = buildCalendar({
        calendarName: "テスト",
        events: [],
        series: [recurringSeries],
        exceptions: [exceptionOccurrence],
      });
      // The exception should have the same UID as its parent series
      const lines = ics.split("\r\n");
      // Find VEVENT blocks
      const vevents: string[][] = [];
      let current: string[] | null = null;
      for (const line of lines) {
        if (line === "BEGIN:VEVENT") {
          current = [];
        } else if (line === "END:VEVENT" && current) {
          vevents.push(current);
          current = null;
        } else if (current) {
          current.push(line);
        }
      }
      // There should be 2 VEVENTs: the series and the exception
      expect(vevents.length).toBe(2);
      // The exception VEVENT (has RECURRENCE-ID) should have the series UID
      const exceptionVevent = vevents.find((v) =>
        v.some((l) => l.startsWith("RECURRENCE-ID:"))
      );
      expect(exceptionVevent).toBeDefined();
      expect(
        exceptionVevent?.some(
          (l) => l === `UID:${exceptionOccurrence.seriesId}@discalendar.app`
        )
      ).toBe(true);
    });

    it("should include exception event's own DTSTART and DTEND [Req 3.5]", () => {
      const ics = buildCalendar({
        calendarName: "テスト",
        events: [],
        series: [recurringSeries],
        exceptions: [exceptionOccurrence],
      });
      expect(ics).toContain("DTSTART:20260309T093000Z\r\n");
      expect(ics).toContain("DTEND:20260309T103000Z\r\n");
    });

    it("should include exception event's SUMMARY", () => {
      const ics = buildCalendar({
        calendarName: "テスト",
        events: [],
        series: [recurringSeries],
        exceptions: [exceptionOccurrence],
      });
      expect(ics).toContain("SUMMARY:朝会（特別版）\r\n");
    });
  });

  // --- Security Tests ---

  describe("buildCalendar - security", () => {
    it("should not include channel_id, channel_name, or notifications in output [Req 7.3]", () => {
      const ics = buildCalendar({
        calendarName: "テスト",
        events: [singleEvent],
        series: [recurringSeries],
        exceptions: [exceptionOccurrence],
      });
      expect(ics).not.toContain("channel_id");
      expect(ics).not.toContain("channel_name");
      expect(ics).not.toContain("notifications");
      expect(ics).not.toContain("CHANNEL");
    });
  });

  // --- Text Escaping in Context Tests ---

  describe("buildCalendar - text escaping in output", () => {
    it("should escape special characters in SUMMARY and DESCRIPTION", () => {
      const eventWithSpecialChars: IcsEvent = {
        ...singleEvent,
        name: "会議, 重要; 必須",
        description: "1行目\n2行目",
      };
      const ics = buildCalendar({
        calendarName: "テスト",
        events: [eventWithSpecialChars],
        series: [],
        exceptions: [],
      });
      expect(ics).toContain("SUMMARY:会議\\, 重要\\; 必須\r\n");
      expect(ics).toContain("DESCRIPTION:1行目\\n2行目\r\n");
    });
  });

  // --- Full Integration Test ---

  describe("buildCalendar - full integration", () => {
    it("should produce valid ICS with mixed event types", () => {
      const ics = buildCalendar({
        calendarName: "Discordサーバー",
        events: [singleEvent, allDayEvent],
        series: [recurringSeries, seriesWithExdates],
        exceptions: [exceptionOccurrence],
      });

      // Should have VCALENDAR wrapper
      expect(ics).toContain("BEGIN:VCALENDAR");
      expect(ics).toContain("END:VCALENDAR");

      // Count VEVENTs: 2 single + 2 series + 1 exception = 5
      const veventCount = (ics.match(/BEGIN:VEVENT/g) || []).length;
      expect(veventCount).toBe(5);

      // Should have RRULE for series
      expect(ics).toContain("RRULE:");

      // Should have RECURRENCE-ID for exception
      expect(ics).toContain("RECURRENCE-ID:");

      // Should have both VALUE=DATE and datetime formats
      expect(ics).toContain("VALUE=DATE:");
      expect(ics).toMatch(/DTSTART:\d{8}T\d{6}Z/);
    });

    it("should produce empty calendar when no events exist", () => {
      const ics = buildCalendar({
        calendarName: "空のカレンダー",
        events: [],
        series: [],
        exceptions: [],
      });
      expect(ics).toContain("BEGIN:VCALENDAR");
      expect(ics).toContain("END:VCALENDAR");
      expect(ics).not.toContain("BEGIN:VEVENT");
    });
  });

  // --- EXDATE with VALUE=DATE for all-day series ---

  describe("buildCalendar - all-day series EXDATE", () => {
    it("should output EXDATE with VALUE=DATE for all-day series", () => {
      const allDaySeriesWithExdates: IcsSeries = {
        ...allDaySeries,
        exdates: ["2026-02-28T00:00:00Z"],
      };
      const ics = buildCalendar({
        calendarName: "テスト",
        events: [],
        series: [allDaySeriesWithExdates],
        exceptions: [],
      });
      expect(ics).toContain("EXDATE;VALUE=DATE:20260228\r\n");
    });
  });
});
