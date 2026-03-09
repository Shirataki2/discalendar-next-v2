/**
 * @discalendar/rrule-utils のテスト
 *
 * RRULE文字列の生成・パース・オカレンス展開・バリデーション・要約テキスト変換
 */
import { describe, expect, it } from "vitest";
import {
  buildRruleString,
  expandOccurrences,
  formatDateUTC,
  type RruleBuildInput,
  toSummaryText,
  validateRrule,
} from "./index.js";

// =============================================================================
// buildRruleString
// =============================================================================

describe("buildRruleString", () => {
  const baseDtstart = new Date("2026-01-05T10:00:00Z"); // Monday

  describe("基本頻度", () => {
    it("毎日の繰り返しRRULEを生成する", () => {
      const input: RruleBuildInput = {
        frequency: "daily",
        interval: 1,
        endCondition: { type: "never" },
        dtstart: baseDtstart,
      };

      const result = buildRruleString(input);

      expect(result).toContain("FREQ=DAILY");
      expect(result).toContain("INTERVAL=1");
    });

    it("毎週の繰り返しRRULEを生成する", () => {
      const input: RruleBuildInput = {
        frequency: "weekly",
        interval: 1,
        endCondition: { type: "never" },
        dtstart: baseDtstart,
      };

      const result = buildRruleString(input);

      expect(result).toContain("FREQ=WEEKLY");
    });

    it("毎月の繰り返しRRULEを生成する", () => {
      const input: RruleBuildInput = {
        frequency: "monthly",
        interval: 1,
        endCondition: { type: "never" },
        dtstart: baseDtstart,
      };

      const result = buildRruleString(input);

      expect(result).toContain("FREQ=MONTHLY");
    });

    it("毎年の繰り返しRRULEを生成する", () => {
      const input: RruleBuildInput = {
        frequency: "yearly",
        interval: 1,
        endCondition: { type: "never" },
        dtstart: baseDtstart,
      };

      const result = buildRruleString(input);

      expect(result).toContain("FREQ=YEARLY");
    });
  });

  describe("間隔指定", () => {
    it("2週間ごとの繰り返しRRULEを生成する", () => {
      const input: RruleBuildInput = {
        frequency: "weekly",
        interval: 2,
        endCondition: { type: "never" },
        dtstart: baseDtstart,
      };

      const result = buildRruleString(input);

      expect(result).toContain("FREQ=WEEKLY");
      expect(result).toContain("INTERVAL=2");
    });
  });

  describe("曜日指定", () => {
    it("毎週火・木の繰り返しRRULEを生成する", () => {
      const input: RruleBuildInput = {
        frequency: "weekly",
        interval: 1,
        byDay: ["TU", "TH"],
        endCondition: { type: "never" },
        dtstart: baseDtstart,
      };

      const result = buildRruleString(input);

      expect(result).toContain("FREQ=WEEKLY");
      expect(result).toContain("BYDAY=TU,TH");
    });
  });

  describe("月次モード", () => {
    it("毎月15日の繰り返しRRULEを生成する", () => {
      const input: RruleBuildInput = {
        frequency: "monthly",
        interval: 1,
        monthlyMode: { type: "dayOfMonth", day: 15 },
        endCondition: { type: "never" },
        dtstart: baseDtstart,
      };

      const result = buildRruleString(input);

      expect(result).toContain("FREQ=MONTHLY");
      expect(result).toContain("BYMONTHDAY=15");
    });

    it("毎月第2水曜日の繰り返しRRULEを生成する", () => {
      const input: RruleBuildInput = {
        frequency: "monthly",
        interval: 1,
        monthlyMode: { type: "nthWeekday", n: 2, weekday: "WE" },
        endCondition: { type: "never" },
        dtstart: baseDtstart,
      };

      const result = buildRruleString(input);

      expect(result).toContain("FREQ=MONTHLY");
      expect(result).toMatch(/BYDAY=\+?2WE/);
    });
  });

  describe("終了条件", () => {
    it("回数指定（COUNT）のRRULEを生成する", () => {
      const input: RruleBuildInput = {
        frequency: "daily",
        interval: 1,
        endCondition: { type: "count", count: 10 },
        dtstart: baseDtstart,
      };

      const result = buildRruleString(input);

      expect(result).toContain("COUNT=10");
    });

    it("日付指定（UNTIL）のRRULEを生成する", () => {
      const untilDate = new Date("2026-06-30T23:59:59Z");
      const input: RruleBuildInput = {
        frequency: "weekly",
        interval: 1,
        endCondition: { type: "until", until: untilDate },
        dtstart: baseDtstart,
      };

      const result = buildRruleString(input);

      expect(result).toContain("UNTIL=");
      expect(result).toContain("20260630");
    });

    it("無期限のRRULEを生成する", () => {
      const input: RruleBuildInput = {
        frequency: "daily",
        interval: 1,
        endCondition: { type: "never" },
        dtstart: baseDtstart,
      };

      const result = buildRruleString(input);

      expect(result).not.toContain("COUNT=");
      expect(result).not.toContain("UNTIL=");
    });
  });
});

// =============================================================================
// expandOccurrences
// =============================================================================

describe("expandOccurrences", () => {
  const dtstart = new Date("2026-01-05T10:00:00Z"); // Monday

  describe("基本展開", () => {
    it("毎日の繰り返しを1週間分展開する", () => {
      const rrule = "FREQ=DAILY;INTERVAL=1";
      const rangeStart = new Date("2026-01-05T00:00:00Z");
      const rangeEnd = new Date("2026-01-11T23:59:59Z");

      const result = expandOccurrences(rrule, dtstart, rangeStart, rangeEnd);

      expect(result.dates).toHaveLength(7);
      expect(result.truncated).toBe(false);
    });

    it("展開結果のすべての日付が範囲内である", () => {
      const rrule = "FREQ=DAILY;INTERVAL=1";
      const rangeStart = new Date("2026-01-10T00:00:00Z");
      const rangeEnd = new Date("2026-01-15T23:59:59Z");

      const result = expandOccurrences(rrule, dtstart, rangeStart, rangeEnd);

      for (const date of result.dates) {
        expect(date.getTime()).toBeGreaterThanOrEqual(rangeStart.getTime());
        expect(date.getTime()).toBeLessThanOrEqual(rangeEnd.getTime());
      }
    });
  });

  describe("EXDATE除外", () => {
    it("除外日のオカレンスが展開結果に含まれない", () => {
      const rrule = "FREQ=DAILY;INTERVAL=1";
      const rangeStart = new Date("2026-01-05T00:00:00Z");
      const rangeEnd = new Date("2026-01-11T23:59:59Z");
      const exdates = [new Date("2026-01-07T10:00:00Z")];

      const result = expandOccurrences(
        rrule,
        dtstart,
        rangeStart,
        rangeEnd,
        exdates
      );

      expect(result.dates).toHaveLength(6);
      const dateStrings = result.dates.map((d) => d.toISOString().slice(0, 10));
      expect(dateStrings).not.toContain("2026-01-07");
    });

    it("複数のEXDATEを正しく除外する", () => {
      const rrule = "FREQ=DAILY;INTERVAL=1";
      const rangeStart = new Date("2026-01-05T00:00:00Z");
      const rangeEnd = new Date("2026-01-11T23:59:59Z");
      const exdates = [
        new Date("2026-01-06T10:00:00Z"),
        new Date("2026-01-08T10:00:00Z"),
      ];

      const result = expandOccurrences(
        rrule,
        dtstart,
        rangeStart,
        rangeEnd,
        exdates
      );

      expect(result.dates).toHaveLength(5);
    });

    it("EXDATEが空配列の場合はすべてのオカレンスを返す", () => {
      const rrule = "FREQ=DAILY;INTERVAL=1;COUNT=3";
      const rangeStart = new Date("2026-01-05T00:00:00Z");
      const rangeEnd = new Date("2026-01-11T23:59:59Z");

      const result = expandOccurrences(
        rrule,
        dtstart,
        rangeStart,
        rangeEnd,
        []
      );

      expect(result.dates).toHaveLength(3);
    });
  });

  describe("パースエラーハンドリング", () => {
    it("不正なRRULE文字列の場合は空の展開結果を返す", () => {
      const rrule = "INVALID_RRULE_STRING";
      const rangeStart = new Date("2026-01-05T00:00:00Z");
      const rangeEnd = new Date("2026-01-11T23:59:59Z");

      const result = expandOccurrences(rrule, dtstart, rangeStart, rangeEnd);

      expect(result.dates).toEqual([]);
      expect(result.truncated).toBe(false);
    });

    it("空のRRULE文字列の場合は空の展開結果を返す", () => {
      const rrule = "";
      const rangeStart = new Date("2026-01-05T00:00:00Z");
      const rangeEnd = new Date("2026-01-11T23:59:59Z");

      const result = expandOccurrences(rrule, dtstart, rangeStart, rangeEnd);

      expect(result.dates).toEqual([]);
    });
  });

  describe("COUNT/UNTIL制限", () => {
    it("COUNT指定されたRRULEは指定回数までしか展開しない", () => {
      const rrule = "FREQ=DAILY;INTERVAL=1;COUNT=3";
      const rangeStart = new Date("2026-01-05T00:00:00Z");
      const rangeEnd = new Date("2026-01-31T23:59:59Z");

      const result = expandOccurrences(rrule, dtstart, rangeStart, rangeEnd);

      expect(result.dates).toHaveLength(3);
    });

    it("UNTIL指定されたRRULEは終了日以降のオカレンスを生成しない", () => {
      const rrule = "FREQ=DAILY;INTERVAL=1;UNTIL=20260110T235959Z";
      const rangeStart = new Date("2026-01-05T00:00:00Z");
      const rangeEnd = new Date("2026-01-31T23:59:59Z");

      const result = expandOccurrences(rrule, dtstart, rangeStart, rangeEnd);

      expect(result.dates).toHaveLength(6);
    });
  });

  describe("曜日指定付き展開", () => {
    it("毎週火・木の繰り返しを正しく展開する", () => {
      const rrule = "FREQ=WEEKLY;INTERVAL=1;BYDAY=TU,TH";
      const rangeStart = new Date("2026-01-05T00:00:00Z");
      const rangeEnd = new Date("2026-01-18T23:59:59Z");

      const result = expandOccurrences(rrule, dtstart, rangeStart, rangeEnd);

      expect(result.dates).toHaveLength(4);
      for (const date of result.dates) {
        const day = date.getUTCDay();
        expect([2, 4]).toContain(day);
      }
    });
  });
});

// =============================================================================
// toSummaryText
// =============================================================================

describe("toSummaryText", () => {
  const dtstart = new Date("2026-01-05T10:00:00Z");

  it("毎日の繰り返しを「毎日」と表示する", () => {
    expect(toSummaryText("FREQ=DAILY;INTERVAL=1", dtstart)).toContain("毎日");
  });

  it("毎週の繰り返しを「毎週」と表示する", () => {
    expect(toSummaryText("FREQ=WEEKLY;INTERVAL=1", dtstart)).toContain("毎週");
  });

  it("2週間ごとの場合「2週間ごと」と表示する", () => {
    expect(toSummaryText("FREQ=WEEKLY;INTERVAL=2", dtstart)).toContain(
      "2週間ごと"
    );
  });

  it("曜日指定を含む場合に曜日を表示する", () => {
    const result = toSummaryText("FREQ=WEEKLY;INTERVAL=1;BYDAY=TU,TH", dtstart);
    expect(result).toContain("火");
    expect(result).toContain("木");
  });

  it("不正なRRULE文字列の場合は空文字を返す", () => {
    expect(toSummaryText("INVALID", dtstart)).toBe("");
  });
});

// =============================================================================
// validateRrule
// =============================================================================

describe("validateRrule", () => {
  it("有効なRRULE文字列をvalidと判定する", () => {
    expect(validateRrule("FREQ=DAILY;INTERVAL=1").valid).toBe(true);
    expect(validateRrule("FREQ=WEEKLY;INTERVAL=1;BYDAY=MO,WE,FR").valid).toBe(
      true
    );
  });

  it("空文字列を無効と判定する", () => {
    const result = validateRrule("");
    expect(result.valid).toBe(false);
    expect(result.error).toBeDefined();
  });

  it("FREQがないRRULE文字列を無効と判定する", () => {
    const result = validateRrule("INTERVAL=1");
    expect(result.valid).toBe(false);
  });
});

// =============================================================================
// formatDateUTC
// =============================================================================

describe("formatDateUTC", () => {
  it("DateをUTC RRULE日付文字列に変換する", () => {
    const date = new Date("2026-01-05T10:30:00Z");
    expect(formatDateUTC(date)).toBe("20260105T103000Z");
  });

  it("真夜中の日付を正しく変換する", () => {
    const date = new Date("2026-12-31T00:00:00Z");
    expect(formatDateUTC(date)).toBe("20261231T000000Z");
  });
});
