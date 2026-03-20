/**
 * HolidayService ユニットテスト
 *
 * タスク 1.2: HolidayService のユニットテスト
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5
 */
import { describe, expect, it } from "vitest";
import {
  HOLIDAY_COLOR,
  HOLIDAY_EVENT_ID_PREFIX,
  type HolidayInfo,
  getHolidayName,
  getHolidaysInRange,
  isHolidayEvent,
  toHolidayEvents,
} from "./holiday-service";

describe("getHolidaysInRange", () => {
  it("指定期間内の祝日を返す（2026年1月: 元日・成人の日）", () => {
    const start = new Date(2026, 0, 1); // 2026-01-01
    const end = new Date(2026, 0, 31); // 2026-01-31

    const holidays = getHolidaysInRange(start, end);

    expect(holidays.length).toBeGreaterThanOrEqual(2);

    const names = holidays.map((h) => h.name);
    expect(names).toContain("元日");
    expect(names).toContain("成人の日");
  });

  it("各祝日が date と name を持つ HolidayInfo 形式で返される", () => {
    const start = new Date(2026, 0, 1);
    const end = new Date(2026, 0, 31);

    const holidays = getHolidaysInRange(start, end);

    for (const holiday of holidays) {
      expect(holiday.date).toBeInstanceOf(Date);
      expect(typeof holiday.name).toBe("string");
      expect(holiday.name.length).toBeGreaterThan(0);
    }
  });

  it("期間外の祝日は含まれない", () => {
    const start = new Date(2026, 1, 1); // 2026-02-01
    const end = new Date(2026, 1, 10); // 2026-02-10

    const holidays = getHolidaysInRange(start, end);

    const names = holidays.map((h) => h.name);
    expect(names).not.toContain("元日");
    expect(names).not.toContain("成人の日");
  });

  it("祝日がない期間では空配列を返す", () => {
    // 2026年6月には祝日がない
    const start = new Date(2026, 5, 1);
    const end = new Date(2026, 5, 30);

    const holidays = getHolidaysInRange(start, end);

    expect(holidays).toEqual([]);
  });

  it("全16の国民の祝日が年間で取得できる（Req 1.2）", () => {
    const start = new Date(2026, 0, 1);
    const end = new Date(2026, 11, 31);

    const holidays = getHolidaysInRange(start, end);
    const names = holidays.map((h) => h.name);

    // 16の国民の祝日
    const expectedHolidays = [
      "元日",
      "成人の日",
      "建国記念の日",
      "天皇誕生日",
      "春分の日",
      "昭和の日",
      "憲法記念日",
      "みどりの日",
      "こどもの日",
      "海の日",
      "山の日",
      "敬老の日",
      "秋分の日",
      "スポーツの日",
      "文化の日",
      "勤労感謝の日",
    ];

    for (const name of expectedHolidays) {
      expect(names).toContain(name);
    }
  });

  it("振替休日が正しく含まれる（Req 1.3）", () => {
    // 2023年1月1日(日) 元日 → 1月2日(月) 振替休日
    // ライブラリは "元日 振替休日" のような形式で名前を返す
    const start = new Date(2023, 0, 1);
    const end = new Date(2023, 11, 31);
    const holidays = getHolidaysInRange(start, end);
    const names = holidays.map((h) => h.name);

    const hasSubstituteHoliday = names.some((n) => n.includes("振替休日"));
    expect(hasSubstituteHoliday).toBe(true);
  });

  it("国民の休日が正しく含まれる（Req 1.4）", () => {
    // 2026年9月: 敬老の日(21日月)と秋分の日(23日水)に挟まれた9月22日(火)が国民の休日
    // ライブラリは "休日" という名前で返す
    const start = new Date(2026, 8, 1); // 2026-09-01
    const end = new Date(2026, 8, 30); // 2026-09-30

    const holidays = getHolidaysInRange(start, end);
    const names = holidays.map((h) => h.name);

    expect(names).toContain("敬老の日");
    expect(names).toContain("秋分の日");
    // 国民の休日はライブラリ上 "休日" として返される
    const hasNationalHoliday = names.some(
      (n) => n === "休日" || n.includes("国民の休日")
    );
    expect(hasNationalHoliday).toBe(true);
  });

  it("日付の境界値が正しく処理される（開始日・終了日の祝日を含む）", () => {
    // 2026年1月1日（元日）を開始日と終了日に設定
    const start = new Date(2026, 0, 1);
    const end = new Date(2026, 0, 1);

    const holidays = getHolidaysInRange(start, end);
    const names = holidays.map((h) => h.name);

    expect(names).toContain("元日");
  });
});

describe("getHolidayName", () => {
  it("祝日の場合は祝日名を返す", () => {
    const newYearsDay = new Date(2026, 0, 1); // 2026年元日

    const name = getHolidayName(newYearsDay);

    expect(name).toBe("元日");
  });

  it("祝日でない場合は null を返す", () => {
    const normalDay = new Date(2026, 0, 5); // 2026年1月5日（月）

    const name = getHolidayName(normalDay);

    expect(name).toBeNull();
  });

  it("振替休日の日付でも正しく判定する", () => {
    // 2023年1月2日(月) は振替休日（元日が日曜のため）
    // ライブラリは "元日 振替休日" のような形式で返す
    const substituteHoliday = new Date(2023, 0, 2);

    const name = getHolidayName(substituteHoliday);

    expect(name).not.toBeNull();
    expect(name).toContain("振替休日");
  });

  it("複数の祝日について正しく判定する", () => {
    const testCases = [
      { date: new Date(2026, 0, 12), expected: "成人の日" },
      { date: new Date(2026, 1, 11), expected: "建国記念の日" },
      { date: new Date(2026, 1, 23), expected: "天皇誕生日" },
      { date: new Date(2026, 3, 29), expected: "昭和の日" },
      { date: new Date(2026, 4, 3), expected: "憲法記念日" },
      { date: new Date(2026, 4, 4), expected: "みどりの日" },
      { date: new Date(2026, 4, 5), expected: "こどもの日" },
      { date: new Date(2026, 10, 3), expected: "文化の日" },
      { date: new Date(2026, 10, 23), expected: "勤労感謝の日" },
    ];

    for (const { date, expected } of testCases) {
      expect(getHolidayName(date)).toBe(expected);
    }
  });
});

describe("toHolidayEvents", () => {
  it("HolidayInfo 配列を CalendarEvent 配列に変換する", () => {
    const holidays: HolidayInfo[] = [
      { date: new Date(2026, 0, 1), name: "元日" },
      { date: new Date(2026, 0, 12), name: "成人の日" },
    ];

    const events = toHolidayEvents(holidays);

    expect(events).toHaveLength(2);
  });

  it("各イベントが正しいプロパティを持つ", () => {
    const holidays: HolidayInfo[] = [
      { date: new Date(2026, 0, 1), name: "元日" },
    ];

    const events = toHolidayEvents(holidays);
    const event = events[0];

    expect(event.id).toBe(`${HOLIDAY_EVENT_ID_PREFIX}2026-01-01`);
    expect(event.start).toEqual(new Date(2026, 0, 1));
    expect(event.end).toEqual(new Date(2026, 0, 2)); // 排他的終了日（翌日）
    expect(event.title).toBe("元日");
    expect(event.allDay).toBe(true);
    expect(event.color).toBe(HOLIDAY_COLOR);
  });

  it("空配列に対しては空配列を返す", () => {
    const events = toHolidayEvents([]);

    expect(events).toEqual([]);
  });

  it("全ての祝日が正しく変換される", () => {
    const holidays: HolidayInfo[] = [
      { date: new Date(2026, 0, 1), name: "元日" },
      { date: new Date(2026, 0, 12), name: "成人の日" },
      { date: new Date(2026, 1, 11), name: "建国記念の日" },
    ];

    const events = toHolidayEvents(holidays);

    expect(events).toHaveLength(3);
    for (const event of events) {
      expect(event.allDay).toBe(true);
      expect(event.start).toBeInstanceOf(Date);
      expect(event.end).toBeInstanceOf(Date);
      expect(typeof event.title).toBe("string");
      expect(event.id.startsWith(HOLIDAY_EVENT_ID_PREFIX)).toBe(true);
    }
  });
});

describe("isHolidayEvent", () => {
  it("祝日イベントに対して true を返す", () => {
    const holidays: HolidayInfo[] = [
      { date: new Date(2026, 0, 1), name: "元日" },
    ];
    const event = toHolidayEvents(holidays)[0];

    expect(isHolidayEvent(event)).toBe(true);
  });

  it("通常イベントに対して false を返す", () => {
    const event = {
      id: "regular-event-1",
      title: "ミーティング",
      start: new Date(2026, 0, 1),
      end: new Date(2026, 0, 1),
      allDay: false,
      color: "#3b82f6",
    };

    expect(isHolidayEvent(event)).toBe(false);
  });
});

describe("外部APIリクエスト不要（Req 1.5）", () => {
  it("ネットワークリクエストを発行せずに祝日データを取得できる", () => {
    // このテストは同期的に祝日データが返されることで
    // 外部APIへのリクエストが不要であることを間接的に検証する
    const start = new Date(2026, 0, 1);
    const end = new Date(2026, 11, 31);

    // 同期的にデータが返される（Promiseではない）
    const result = getHolidaysInRange(start, end);

    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
  });
});
