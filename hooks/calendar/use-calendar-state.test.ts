/**
 * カレンダー状態管理フックのテスト
 *
 * タスク3.1: カレンダー状態管理フックの作成
 * - ビューモード（day/week/month）の状態管理
 * - 選択日付の状態管理
 * - ローディング状態とエラー状態の管理
 * - デフォルトで月ビューを表示する初期状態
 *
 * Requirements: 1.4, 5.3
 */
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CalendarError } from "@/lib/calendar";
import { useCalendarState } from "./use-calendar-state";

describe("useCalendarState", () => {
  // 固定日付でテストの安定性を確保
  const mockToday = new Date("2025-12-05T12:00:00Z");

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(mockToday);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("初期状態", () => {
    it("should default to month view mode (Req 1.4)", () => {
      const { result } = renderHook(() => useCalendarState());

      expect(result.current.state.viewMode).toBe("month");
    });

    it("should default selected date to today", () => {
      const { result } = renderHook(() => useCalendarState());

      // 日付のみを比較（時刻は無視）
      const selectedDate = result.current.state.selectedDate;
      expect(selectedDate.getFullYear()).toBe(mockToday.getFullYear());
      expect(selectedDate.getMonth()).toBe(mockToday.getMonth());
      expect(selectedDate.getDate()).toBe(mockToday.getDate());
    });

    it("should initialize with empty events array", () => {
      const { result } = renderHook(() => useCalendarState());

      expect(result.current.state.events).toEqual([]);
    });

    it("should initialize with loading state as false (Req 5.3)", () => {
      const { result } = renderHook(() => useCalendarState());

      expect(result.current.state.isLoading).toBe(false);
    });

    it("should initialize with error state as null (Req 5.3)", () => {
      const { result } = renderHook(() => useCalendarState());

      expect(result.current.state.error).toBeNull();
    });
  });

  describe("カスタム初期状態", () => {
    it("should accept custom initial view mode", () => {
      const { result } = renderHook(() =>
        useCalendarState({ initialViewMode: "week" })
      );

      expect(result.current.state.viewMode).toBe("week");
    });

    it("should accept custom initial date", () => {
      const customDate = new Date("2025-06-15T00:00:00Z");
      const { result } = renderHook(() =>
        useCalendarState({ initialDate: customDate })
      );

      expect(result.current.state.selectedDate).toEqual(customDate);
    });
  });

  describe("ビューモード変更", () => {
    it("should change view mode to day", () => {
      const { result } = renderHook(() => useCalendarState());

      act(() => {
        result.current.actions.setViewMode("day");
      });

      expect(result.current.state.viewMode).toBe("day");
    });

    it("should change view mode to week", () => {
      const { result } = renderHook(() => useCalendarState());

      act(() => {
        result.current.actions.setViewMode("week");
      });

      expect(result.current.state.viewMode).toBe("week");
    });

    it("should change view mode to month", () => {
      const { result } = renderHook(() =>
        useCalendarState({ initialViewMode: "day" })
      );

      act(() => {
        result.current.actions.setViewMode("month");
      });

      expect(result.current.state.viewMode).toBe("month");
    });
  });

  describe("日付選択", () => {
    it("should change selected date", () => {
      const { result } = renderHook(() => useCalendarState());
      const newDate = new Date("2025-12-20T10:00:00Z");

      act(() => {
        result.current.actions.setSelectedDate(newDate);
      });

      expect(result.current.state.selectedDate).toEqual(newDate);
    });

    it("should navigate to today", () => {
      const { result } = renderHook(() =>
        useCalendarState({ initialDate: new Date("2025-06-01T00:00:00Z") })
      );

      act(() => {
        result.current.actions.navigateToToday();
      });

      const selectedDate = result.current.state.selectedDate;
      expect(selectedDate.getFullYear()).toBe(mockToday.getFullYear());
      expect(selectedDate.getMonth()).toBe(mockToday.getMonth());
      expect(selectedDate.getDate()).toBe(mockToday.getDate());
    });
  });

  describe("ローディング状態 (Req 5.3)", () => {
    it("should set loading state to true", () => {
      const { result } = renderHook(() => useCalendarState());

      act(() => {
        result.current.actions.setLoading(true);
      });

      expect(result.current.state.isLoading).toBe(true);
    });

    it("should set loading state to false", () => {
      const { result } = renderHook(() => useCalendarState());

      act(() => {
        result.current.actions.setLoading(true);
      });

      act(() => {
        result.current.actions.setLoading(false);
      });

      expect(result.current.state.isLoading).toBe(false);
    });
  });

  describe("エラー状態 (Req 5.3)", () => {
    it("should set error state", () => {
      const { result } = renderHook(() => useCalendarState());
      const error: CalendarError = {
        code: "FETCH_FAILED",
        message: "イベントの取得に失敗しました。",
      };

      act(() => {
        result.current.actions.setError(error);
      });

      expect(result.current.state.error).toEqual(error);
    });

    it("should clear error state", () => {
      const { result } = renderHook(() => useCalendarState());
      const error: CalendarError = {
        code: "NETWORK_ERROR",
        message: "ネットワークエラーが発生しました。",
      };

      act(() => {
        result.current.actions.setError(error);
      });

      act(() => {
        result.current.actions.clearError();
      });

      expect(result.current.state.error).toBeNull();
    });
  });

  describe("イベント管理", () => {
    it("should set events array", () => {
      const { result } = renderHook(() => useCalendarState());
      const events = [
        {
          id: "event-1",
          title: "テストイベント",
          start: new Date("2025-12-05T10:00:00Z"),
          end: new Date("2025-12-05T12:00:00Z"),
          allDay: false,
          color: "#FF5733",
        },
      ];

      act(() => {
        result.current.actions.setEvents(events);
      });

      expect(result.current.state.events).toEqual(events);
    });

    it("should clear events array", () => {
      const { result } = renderHook(() => useCalendarState());
      const events = [
        {
          id: "event-1",
          title: "テストイベント",
          start: new Date("2025-12-05T10:00:00Z"),
          end: new Date("2025-12-05T12:00:00Z"),
          allDay: false,
          color: "#FF5733",
        },
      ];

      act(() => {
        result.current.actions.setEvents(events);
      });

      act(() => {
        result.current.actions.clearEvents();
      });

      expect(result.current.state.events).toEqual([]);
    });
  });

  describe("複合アクション", () => {
    it("should start fetching (set loading true, clear error)", () => {
      const { result } = renderHook(() => useCalendarState());
      const error: CalendarError = {
        code: "FETCH_FAILED",
        message: "Previous error",
      };

      // 事前にエラーを設定
      act(() => {
        result.current.actions.setError(error);
      });

      act(() => {
        result.current.actions.startFetching();
      });

      expect(result.current.state.isLoading).toBe(true);
      expect(result.current.state.error).toBeNull();
    });

    it("should complete fetching with success (set events, clear loading)", () => {
      const { result } = renderHook(() => useCalendarState());
      const events = [
        {
          id: "event-1",
          title: "イベント",
          start: new Date("2025-12-05T10:00:00Z"),
          end: new Date("2025-12-05T12:00:00Z"),
          allDay: false,
          color: "#FF5733",
        },
      ];

      act(() => {
        result.current.actions.startFetching();
      });

      act(() => {
        result.current.actions.completeFetchingSuccess(events);
      });

      expect(result.current.state.isLoading).toBe(false);
      expect(result.current.state.events).toEqual(events);
      expect(result.current.state.error).toBeNull();
    });

    it("should complete fetching with error (set error, clear loading)", () => {
      const { result } = renderHook(() => useCalendarState());
      const error: CalendarError = {
        code: "NETWORK_ERROR",
        message: "Network error",
      };

      act(() => {
        result.current.actions.startFetching();
      });

      act(() => {
        result.current.actions.completeFetchingError(error);
      });

      expect(result.current.state.isLoading).toBe(false);
      expect(result.current.state.error).toEqual(error);
    });
  });
});
