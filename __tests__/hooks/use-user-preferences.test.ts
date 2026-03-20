import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useUserPreferences } from "@/hooks/use-user-preferences";

describe("useUserPreferences", () => {
  describe("defaultCalendarView (既存機能)", () => {
    it("デフォルト値としてmonthを返す", () => {
      const { result } = renderHook(() => useUserPreferences());
      expect(result.current.defaultCalendarView).toBe("month");
    });

    it("setDefaultCalendarViewで値を変更できる", () => {
      const { result } = renderHook(() => useUserPreferences());
      act(() => {
        result.current.setDefaultCalendarView("week");
      });
      expect(result.current.defaultCalendarView).toBe("week");
    });
  });

  describe("showHolidays", () => {
    it("デフォルト値としてtrueを返す", () => {
      const { result } = renderHook(() => useUserPreferences());
      expect(result.current.showHolidays).toBe(true);
    });

    it("setShowHolidaysでfalseに変更できる", () => {
      const { result } = renderHook(() => useUserPreferences());
      act(() => {
        result.current.setShowHolidays(false);
      });
      expect(result.current.showHolidays).toBe(false);
    });

    it("setShowHolidaysでtrueに戻せる", () => {
      const { result } = renderHook(() => useUserPreferences());
      act(() => {
        result.current.setShowHolidays(false);
      });
      act(() => {
        result.current.setShowHolidays(true);
      });
      expect(result.current.showHolidays).toBe(true);
    });

    it("既存のdefaultCalendarViewの動作に影響を与えない", () => {
      const { result } = renderHook(() => useUserPreferences());
      act(() => {
        result.current.setDefaultCalendarView("week");
      });
      expect(result.current.defaultCalendarView).toBe("week");
      act(() => {
        result.current.setShowHolidays(false);
      });
      expect(result.current.showHolidays).toBe(false);
      expect(result.current.defaultCalendarView).toBe("week");
    });

    it("showHolidaysとdefaultCalendarViewを独立して操作できる", () => {
      const { result } = renderHook(() => useUserPreferences());
      act(() => {
        result.current.setShowHolidays(false);
        result.current.setDefaultCalendarView("day");
      });
      expect(result.current.showHolidays).toBe(false);
      expect(result.current.defaultCalendarView).toBe("day");
    });
  });
});
