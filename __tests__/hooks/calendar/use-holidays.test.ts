/**
 * useHolidays フックのテスト
 *
 * Task 6.1: useHolidays フックのテスト
 * - 表示期間に基づく祝日データを正しく返すことをテストする
 * - showHolidays が false の場合に空データが返却されることをテストする
 * - 期間変更時に祝日データが再計算されることをテストする
 *
 * Requirements: 1.1, 5.4
 */
import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useHolidays } from "@/hooks/calendar/use-holidays";

describe("useHolidays", () => {
  it("月ビューで表示期間に基づく祝日データを正しく返す", () => {
    // 2026年1月: 元日(1/1)、成人の日(1/12)
    const { result } = renderHook(() =>
      useHolidays("month", new Date(2026, 0, 15), true)
    );

    expect(result.current.holidayEvents.length).toBeGreaterThanOrEqual(2);
    expect(result.current.holidayMap.get("2026-01-01")).toBe("元日");
    expect(result.current.holidayMap.get("2026-01-12")).toBe("成人の日");
  });

  it("holidayEvents が BackgroundCalendarEvent 形式で返却される", () => {
    const { result } = renderHook(() =>
      useHolidays("month", new Date(2026, 0, 15), true)
    );

    for (const event of result.current.holidayEvents) {
      expect(event.start).toBeInstanceOf(Date);
      expect(event.end).toBeInstanceOf(Date);
      expect(typeof event.title).toBe("string");
      expect(event.allDay).toBe(true);
    }
  });

  it("showHolidays が false の場合に空データが返却される", () => {
    const { result } = renderHook(() =>
      useHolidays("month", new Date(2026, 0, 15), false)
    );

    expect(result.current.holidayEvents).toEqual([]);
    expect(result.current.holidayMap.size).toBe(0);
  });

  it("期間変更時に祝日データが再計算される", () => {
    const { result, rerender } = renderHook(
      ({ date }) => useHolidays("month", date, true),
      { initialProps: { date: new Date(2026, 0, 15) } }
    );

    // 1月には祝日がある
    expect(result.current.holidayMap.has("2026-01-01")).toBe(true);

    // 6月に変更（祝日なし）
    rerender({ date: new Date(2026, 5, 15) });
    expect(result.current.holidayMap.has("2026-01-01")).toBe(false);
    expect(result.current.holidayEvents).toHaveLength(0);
  });

  it("週ビューで該当週の祝日のみ返す", () => {
    // 2026年1月1日（木）を含む週
    const { result } = renderHook(() =>
      useHolidays("week", new Date(2026, 0, 1), true)
    );

    expect(result.current.holidayMap.has("2026-01-01")).toBe(true);
    // 成人の日(1/12)は範囲外
    expect(result.current.holidayMap.has("2026-01-12")).toBe(false);
  });

  it("日ビューで該当日のみ判定する", () => {
    const { result } = renderHook(() =>
      useHolidays("day", new Date(2026, 0, 1), true)
    );

    expect(result.current.holidayMap.has("2026-01-01")).toBe(true);
    expect(result.current.holidayEvents).toHaveLength(1);
  });

  it("日ビューで祝日でない日は空データを返す", () => {
    const { result } = renderHook(() =>
      useHolidays("day", new Date(2026, 0, 5), true)
    );

    expect(result.current.holidayEvents).toHaveLength(0);
    expect(result.current.holidayMap.size).toBe(0);
  });
});
