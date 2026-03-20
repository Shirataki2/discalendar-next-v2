import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useHolidays } from "@/hooks/calendar/use-holidays";

describe("useHolidays", () => {
  describe("showHolidaysがtrueの場合", () => {
    it("月ビューで該当月の祝日をbackgroundEventsとして返す", () => {
      // 2026年1月: 元日(1/1)、成人の日(1/12)
      const selectedDate = new Date(2026, 0, 15);
      const { result } = renderHook(() =>
        useHolidays("month", selectedDate, true)
      );

      expect(result.current.holidayEvents.length).toBeGreaterThanOrEqual(2);
      const titles = result.current.holidayEvents.map((e) => e.title);
      expect(titles).toContain("元日");
      expect(titles).toContain("成人の日");
    });

    it("backgroundEventsが正しい形式を持つ", () => {
      const selectedDate = new Date(2026, 0, 1);
      const { result } = renderHook(() =>
        useHolidays("month", selectedDate, true)
      );

      for (const event of result.current.holidayEvents) {
        expect(event).toHaveProperty("start");
        expect(event).toHaveProperty("end");
        expect(event).toHaveProperty("title");
        expect(event.allDay).toBe(true);
      }
    });

    it("holidayMapに日付→祝日名のマッピングを返す", () => {
      // 2026年1月1日は元日
      const selectedDate = new Date(2026, 0, 15);
      const { result } = renderHook(() =>
        useHolidays("month", selectedDate, true)
      );

      expect(result.current.holidayMap.size).toBeGreaterThanOrEqual(2);
      expect(result.current.holidayMap.get("2026-01-01")).toBe("元日");
      expect(result.current.holidayMap.get("2026-01-12")).toBe("成人の日");
    });

    it("週ビューで該当週の祝日を返す", () => {
      // 2026年1月1日（木）を含む週
      const selectedDate = new Date(2026, 0, 1);
      const { result } = renderHook(() =>
        useHolidays("week", selectedDate, true)
      );

      const titles = result.current.holidayEvents.map((e) => e.title);
      expect(titles).toContain("元日");
    });

    it("日ビューで該当日の祝日を返す", () => {
      // 2026年1月1日は元日
      const selectedDate = new Date(2026, 0, 1);
      const { result } = renderHook(() =>
        useHolidays("day", selectedDate, true)
      );

      expect(result.current.holidayEvents.length).toBe(1);
      expect(result.current.holidayEvents[0].title).toBe("元日");
    });

    it("日ビューで祝日がない日は空データを返す", () => {
      // 2026年1月2日は祝日でない
      const selectedDate = new Date(2026, 0, 2);
      const { result } = renderHook(() =>
        useHolidays("day", selectedDate, true)
      );

      expect(result.current.holidayEvents).toHaveLength(0);
      expect(result.current.holidayMap.size).toBe(0);
    });
  });

  describe("showHolidaysがfalseの場合", () => {
    it("空のbackgroundEventsを返す", () => {
      const selectedDate = new Date(2026, 0, 15);
      const { result } = renderHook(() =>
        useHolidays("month", selectedDate, false)
      );

      expect(result.current.holidayEvents).toHaveLength(0);
    });

    it("空のholidayMapを返す", () => {
      const selectedDate = new Date(2026, 0, 15);
      const { result } = renderHook(() =>
        useHolidays("month", selectedDate, false)
      );

      expect(result.current.holidayMap.size).toBe(0);
    });
  });

  describe("月ビューでの拡張期間取得", () => {
    it("月ビューでは前後の表示分も含めた祝日を取得する", () => {
      // 2026年5月のカレンダー: 月ビューでは前月末・次月初の日も表示される
      // 5月のカレンダーは4月26日(日)から始まり、6月6日(土)で終わる
      // 4月29日: 昭和の日
      const selectedDate = new Date(2026, 4, 15);
      const { result } = renderHook(() =>
        useHolidays("month", selectedDate, true)
      );

      const titles = result.current.holidayEvents.map((e) => e.title);
      // 5月の祝日: 憲法記念日(5/3), みどりの日(5/4), こどもの日(5/5)
      expect(titles).toContain("憲法記念日");
      expect(titles).toContain("みどりの日");
      expect(titles).toContain("こどもの日");
    });
  });
});
