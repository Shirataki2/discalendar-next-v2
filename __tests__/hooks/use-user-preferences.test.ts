/**
 * useUserPreferences フックのテスト
 *
 * Task 6.1: useUserPreferences 拡張のテスト
 * - showHolidays が localStorage に保存・復元されることをテストする
 *
 * Requirements: 5.4
 */
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useUserPreferences } from "@/hooks/use-user-preferences";

// localStorage のモック
const store = new Map<string, string>();

const localStorageMock = {
  getItem: vi.fn((key: string) => store.get(key) ?? null),
  setItem: vi.fn((key: string, value: string) => {
    store.set(key, value);
  }),
  removeItem: vi.fn((key: string) => {
    store.delete(key);
  }),
  clear: vi.fn(() => {
    store.clear();
  }),
  get length() {
    return store.size;
  },
  key: vi.fn((_index: number) => null),
};

Object.defineProperty(window, "localStorage", {
  value: localStorageMock,
  writable: true,
});

describe("useUserPreferences - showHolidays", () => {
  beforeEach(() => {
    store.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    store.clear();
  });

  it("showHolidays のデフォルト値が true である", () => {
    const { result } = renderHook(() => useUserPreferences());
    expect(result.current.showHolidays).toBe(true);
  });

  it("setShowHolidays で false に変更できる", () => {
    const { result } = renderHook(() => useUserPreferences());

    act(() => {
      result.current.setShowHolidays(false);
    });

    expect(result.current.showHolidays).toBe(false);
  });

  it("showHolidays が localStorage に保存される", () => {
    const { result } = renderHook(() => useUserPreferences());

    act(() => {
      result.current.setShowHolidays(false);
    });

    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      "discalendar:show-holidays",
      JSON.stringify(false)
    );
  });

  it("localStorage から showHolidays が復元される", () => {
    store.set("discalendar:show-holidays", JSON.stringify(false));

    const { result } = renderHook(() => useUserPreferences());
    expect(result.current.showHolidays).toBe(false);
  });

  it("localStorage に不正な値がある場合は true にフォールバックする", () => {
    store.set("discalendar:show-holidays", "not-a-boolean");

    const { result } = renderHook(() => useUserPreferences());
    expect(result.current.showHolidays).toBe(true);
  });

  it("既存の defaultCalendarView に影響を与えない", () => {
    store.set("discalendar:default-calendar-view", JSON.stringify("week"));

    const { result } = renderHook(() => useUserPreferences());

    expect(result.current.defaultCalendarView).toBe("week");
    expect(result.current.showHolidays).toBe(true);

    act(() => {
      result.current.setShowHolidays(false);
    });

    // defaultCalendarView は変更されない
    expect(result.current.defaultCalendarView).toBe("week");
  });
});
