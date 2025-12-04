import { describe, expect, it } from "vitest";
import {
  calendarLocalizer,
  calendarMessages,
  type CalendarFormats,
} from "./localizer";

/**
 * dateFnsLocalizer 設定のテスト
 *
 * タスク1: カレンダーライブラリのセットアップ
 * - date-fns日本語ロケールを設定したdateFnsLocalizerを作成する
 *
 * Requirements: 1.1, 1.2, 1.3
 */
describe("calendarLocalizer", () => {
  describe("日本語ロケールの設定", () => {
    it("should be defined and exported", () => {
      expect(calendarLocalizer).toBeDefined();
    });

    it("should have format method", () => {
      expect(typeof calendarLocalizer.format).toBe("function");
    });

    it("should format date in Japanese locale", () => {
      const testDate = new Date(2025, 11, 5); // 2025年12月5日
      const formatted = calendarLocalizer.format(testDate, "dayHeaderFormat");
      // 日本語の曜日が含まれていることを確認
      expect(formatted).toMatch(/金|12/);
    });

    it("should format month correctly", () => {
      const testDate = new Date(2025, 11, 1); // 2025年12月
      const formatted = calendarLocalizer.format(testDate, "monthHeaderFormat");
      expect(formatted).toContain("2025");
      expect(formatted).toContain("12");
    });
  });

  describe("カレンダーメッセージの日本語化", () => {
    it("should have Japanese today message", () => {
      expect(calendarMessages.today).toBe("今日");
    });

    it("should have Japanese previous message", () => {
      expect(calendarMessages.previous).toBe("前へ");
    });

    it("should have Japanese next message", () => {
      expect(calendarMessages.next).toBe("次へ");
    });

    it("should have Japanese month message", () => {
      expect(calendarMessages.month).toBe("月");
    });

    it("should have Japanese week message", () => {
      expect(calendarMessages.week).toBe("週");
    });

    it("should have Japanese day message", () => {
      expect(calendarMessages.day).toBe("日");
    });

    it("should have Japanese agenda message", () => {
      expect(calendarMessages.agenda).toBe("予定一覧");
    });

    it("should have Japanese noEventsInRange message", () => {
      expect(calendarMessages.noEventsInRange).toBe(
        "この期間には予定がありません"
      );
    });

    it("should have showMore function returning Japanese format", () => {
      expect(calendarMessages.showMore(3)).toBe("+3件");
      expect(calendarMessages.showMore(10)).toBe("+10件");
    });
  });

  describe("カレンダーフォーマット設定", () => {
    it("should export CalendarFormats type", () => {
      // Type check - this will fail at compile time if type is missing
      const formats: CalendarFormats = {
        dateFormat: "d",
        dayFormat: "d日(E)",
        weekdayFormat: "E",
        monthHeaderFormat: "yyyy年M月",
        dayHeaderFormat: "M月d日(E)",
        dayRangeHeaderFormat: expect.any(Function),
        agendaDateFormat: "M月d日(E)",
        agendaTimeFormat: "HH:mm",
        agendaTimeRangeFormat: expect.any(Function),
      };
      expect(formats).toBeDefined();
    });
  });
});
