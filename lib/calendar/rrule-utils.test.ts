/**
 * rrule-utils のテスト
 *
 * タスク2.1: buildRruleString - RRULE文字列生成
 * タスク2.2: expandOccurrences - オカレンス展開
 * タスク2.3: toSummaryText, validateRrule - 要約テキスト変換・バリデーション
 *
 * Requirements: 1.2, 2.4, 3.2, 3.3, 3.4, 4.1, 4.3, 4.5, 8.1, 8.3, 8.4
 */
import { describe, expect, it } from "vitest";
import {
  type EndCondition,
  type MonthlyMode,
  type RecurrenceFrequency,
  type RruleBuildInput,
  type Weekday,
  buildRruleString,
  expandOccurrences,
  toSummaryText,
  validateRrule,
} from "./rrule-utils";

// =============================================================================
// Task 2.1: buildRruleString
// =============================================================================

describe("buildRruleString", () => {
  const baseDtstart = new Date("2026-01-05T10:00:00Z"); // Monday

  describe("基本頻度 (Req 1.2)", () => {
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

  describe("間隔指定 (Req 2.3)", () => {
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

    it("3ヶ月ごとの繰り返しRRULEを生成する", () => {
      const input: RruleBuildInput = {
        frequency: "monthly",
        interval: 3,
        endCondition: { type: "never" },
        dtstart: baseDtstart,
      };

      const result = buildRruleString(input);

      expect(result).toContain("FREQ=MONTHLY");
      expect(result).toContain("INTERVAL=3");
    });
  });

  describe("曜日指定 (Req 2.1)", () => {
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

    it("毎週月・水・金の繰り返しRRULEを生成する", () => {
      const input: RruleBuildInput = {
        frequency: "weekly",
        interval: 1,
        byDay: ["MO", "WE", "FR"],
        endCondition: { type: "never" },
        dtstart: baseDtstart,
      };

      const result = buildRruleString(input);

      expect(result).toContain("BYDAY=MO,WE,FR");
    });
  });

  describe("月次モード (Req 2.2)", () => {
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
      // rrule.js は正のn番目に "+" プレフィックスを付与する
      expect(result).toMatch(/BYDAY=\+?2WE/);
    });

    it("毎月最終金曜日の繰り返しRRULEを生成する", () => {
      const input: RruleBuildInput = {
        frequency: "monthly",
        interval: 1,
        monthlyMode: { type: "nthWeekday", n: -1, weekday: "FR" },
        endCondition: { type: "never" },
        dtstart: baseDtstart,
      };

      const result = buildRruleString(input);

      expect(result).toContain("BYDAY=-1FR");
    });
  });

  describe("終了条件 (Req 3.2, 3.3, 3.4)", () => {
    it("回数指定（COUNT）のRRULEを生成する (Req 3.2)", () => {
      const input: RruleBuildInput = {
        frequency: "daily",
        interval: 1,
        endCondition: { type: "count", count: 10 },
        dtstart: baseDtstart,
      };

      const result = buildRruleString(input);

      expect(result).toContain("COUNT=10");
    });

    it("日付指定（UNTIL）のRRULEを生成する (Req 3.3)", () => {
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

    it("無期限のRRULEを生成する（COUNTもUNTILもなし）(Req 3.4)", () => {
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

  describe("複合パターン (Req 2.4)", () => {
    it("2週間ごと火・木、10回までの繰り返しRRULEを生成する", () => {
      const input: RruleBuildInput = {
        frequency: "weekly",
        interval: 2,
        byDay: ["TU", "TH"],
        endCondition: { type: "count", count: 10 },
        dtstart: baseDtstart,
      };

      const result = buildRruleString(input);

      expect(result).toContain("FREQ=WEEKLY");
      expect(result).toContain("INTERVAL=2");
      expect(result).toContain("BYDAY=TU,TH");
      expect(result).toContain("COUNT=10");
    });
  });
});

// =============================================================================
// Task 2.2: expandOccurrences
// =============================================================================

describe("expandOccurrences", () => {
  const dtstart = new Date("2026-01-05T10:00:00Z"); // Monday

  describe("基本展開 (Req 4.1, 8.3)", () => {
    it("毎日の繰り返しを1週間分展開する", () => {
      const rrule = "FREQ=DAILY;INTERVAL=1";
      const rangeStart = new Date("2026-01-05T00:00:00Z");
      const rangeEnd = new Date("2026-01-11T23:59:59Z");

      const result = expandOccurrences(rrule, dtstart, rangeStart, rangeEnd);

      expect(result.dates).toHaveLength(7);
      expect(result.truncated).toBe(false);
    });

    it("毎週の繰り返しを1ヶ月分展開する", () => {
      const rrule = "FREQ=WEEKLY;INTERVAL=1";
      const rangeStart = new Date("2026-01-05T00:00:00Z");
      const rangeEnd = new Date("2026-02-05T23:59:59Z");

      const result = expandOccurrences(rrule, dtstart, rangeStart, rangeEnd);

      // 1/5, 1/12, 1/19, 1/26, 2/2 の5回
      expect(result.dates.length).toBeGreaterThanOrEqual(4);
      expect(result.dates.length).toBeLessThanOrEqual(5);
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

  describe("EXDATE除外 (Req 8.2)", () => {
    it("除外日のオカレンスが展開結果に含まれない", () => {
      const rrule = "FREQ=DAILY;INTERVAL=1";
      const rangeStart = new Date("2026-01-05T00:00:00Z");
      const rangeEnd = new Date("2026-01-11T23:59:59Z");
      const exdates = [new Date("2026-01-07T10:00:00Z")]; // 水曜日を除外

      const result = expandOccurrences(
        rrule,
        dtstart,
        rangeStart,
        rangeEnd,
        exdates,
      );

      // 7日 - 1日(除外) = 6日
      expect(result.dates).toHaveLength(6);
      // 除外日が含まれていないことを確認
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
        exdates,
      );

      expect(result.dates).toHaveLength(5);
    });

    it("EXDATEが空配列の場合はすべてのオカレンスを返す", () => {
      const rrule = "FREQ=DAILY;INTERVAL=1;COUNT=3";
      const rangeStart = new Date("2026-01-05T00:00:00Z");
      const rangeEnd = new Date("2026-01-11T23:59:59Z");

      const result = expandOccurrences(rrule, dtstart, rangeStart, rangeEnd, []);

      expect(result.dates).toHaveLength(3);
    });
  });

  describe("パースエラーハンドリング (Req 8.4)", () => {
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

  describe("COUNT制限", () => {
    it("COUNT指定されたRRULEは指定回数までしか展開しない", () => {
      const rrule = "FREQ=DAILY;INTERVAL=1;COUNT=3";
      const rangeStart = new Date("2026-01-05T00:00:00Z");
      const rangeEnd = new Date("2026-01-31T23:59:59Z");

      const result = expandOccurrences(rrule, dtstart, rangeStart, rangeEnd);

      expect(result.dates).toHaveLength(3);
    });
  });

  describe("UNTIL制限", () => {
    it("UNTIL指定されたRRULEは終了日以降のオカレンスを生成しない", () => {
      const rrule = "FREQ=DAILY;INTERVAL=1;UNTIL=20260110T235959Z";
      const rangeStart = new Date("2026-01-05T00:00:00Z");
      const rangeEnd = new Date("2026-01-31T23:59:59Z");

      const result = expandOccurrences(rrule, dtstart, rangeStart, rangeEnd);

      // 1/5 ~ 1/10 の6日分
      expect(result.dates).toHaveLength(6);
      for (const date of result.dates) {
        expect(date.getTime()).toBeLessThanOrEqual(
          new Date("2026-01-10T23:59:59Z").getTime(),
        );
      }
    });
  });

  describe("パフォーマンス (Req 4.5)", () => {
    it("表示範囲外のオカレンスを展開しない", () => {
      // 無期限の毎日繰り返しでも、範囲指定すれば必要な分だけ展開
      const rrule = "FREQ=DAILY;INTERVAL=1";
      const rangeStart = new Date("2026-06-01T00:00:00Z");
      const rangeEnd = new Date("2026-06-07T23:59:59Z");

      const result = expandOccurrences(rrule, dtstart, rangeStart, rangeEnd);

      // 6/1 ~ 6/7 の7日分のみ
      expect(result.dates).toHaveLength(7);
    });
  });

  describe("曜日指定付き展開", () => {
    it("毎週火・木の繰り返しを正しく展開する", () => {
      const rrule = "FREQ=WEEKLY;INTERVAL=1;BYDAY=TU,TH";
      const rangeStart = new Date("2026-01-05T00:00:00Z");
      const rangeEnd = new Date("2026-01-18T23:59:59Z");

      const result = expandOccurrences(rrule, dtstart, rangeStart, rangeEnd);

      // 1/6(TU), 1/8(TH), 1/13(TU), 1/15(TH) = 4回
      expect(result.dates).toHaveLength(4);
      for (const date of result.dates) {
        const day = date.getUTCDay();
        expect([2, 4]).toContain(day); // Tuesday=2, Thursday=4
      }
    });
  });
});

// =============================================================================
// Task 2.3: toSummaryText, validateRrule
// =============================================================================

describe("toSummaryText", () => {
  const dtstart = new Date("2026-01-05T10:00:00Z");

  it("毎日の繰り返しを「毎日」と表示する", () => {
    const result = toSummaryText("FREQ=DAILY;INTERVAL=1", dtstart);

    expect(result).toContain("毎日");
  });

  it("毎週の繰り返しを「毎週」と表示する", () => {
    const result = toSummaryText("FREQ=WEEKLY;INTERVAL=1", dtstart);

    expect(result).toContain("毎週");
  });

  it("毎月の繰り返しを「毎月」と表示する", () => {
    const result = toSummaryText("FREQ=MONTHLY;INTERVAL=1", dtstart);

    expect(result).toContain("毎月");
  });

  it("毎年の繰り返しを「毎年」と表示する", () => {
    const result = toSummaryText("FREQ=YEARLY;INTERVAL=1", dtstart);

    expect(result).toContain("毎年");
  });

  it("2週間ごとの場合「2週間ごと」と表示する", () => {
    const result = toSummaryText("FREQ=WEEKLY;INTERVAL=2", dtstart);

    expect(result).toContain("2週間ごと");
  });

  it("曜日指定を含む場合に曜日を表示する", () => {
    const result = toSummaryText(
      "FREQ=WEEKLY;INTERVAL=1;BYDAY=TU,TH",
      dtstart,
    );

    expect(result).toContain("火");
    expect(result).toContain("木");
  });

  it("不正なRRULE文字列の場合は空文字を返す", () => {
    const result = toSummaryText("INVALID", dtstart);

    expect(result).toBe("");
  });

  it("回数指定を含む場合に回数を表示する", () => {
    const result = toSummaryText("FREQ=DAILY;INTERVAL=1;COUNT=10", dtstart);

    expect(result).toContain("10");
  });
});

describe("validateRrule", () => {
  describe("有効なRRULE文字列", () => {
    it("毎日の繰り返しを有効と判定する", () => {
      const result = validateRrule("FREQ=DAILY;INTERVAL=1");

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it("毎週の繰り返しを有効と判定する", () => {
      const result = validateRrule("FREQ=WEEKLY;INTERVAL=1;BYDAY=MO,WE,FR");

      expect(result.valid).toBe(true);
    });

    it("COUNT付きの繰り返しを有効と判定する", () => {
      const result = validateRrule("FREQ=DAILY;INTERVAL=1;COUNT=10");

      expect(result.valid).toBe(true);
    });

    it("UNTIL付きの繰り返しを有効と判定する", () => {
      const result = validateRrule(
        "FREQ=DAILY;INTERVAL=1;UNTIL=20260630T235959Z",
      );

      expect(result.valid).toBe(true);
    });
  });

  describe("無効なRRULE文字列", () => {
    it("空文字列を無効と判定する", () => {
      const result = validateRrule("");

      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it("FREQがないRRULE文字列を無効と判定する", () => {
      const result = validateRrule("INTERVAL=1");

      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it("不正な文字列を無効と判定する", () => {
      const result = validateRrule("NOT_A_RRULE");

      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });
  });
});
