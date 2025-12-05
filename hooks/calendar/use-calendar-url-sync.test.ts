/**
 * カレンダーURL同期フックのテスト
 *
 * タスク3.2: URLパラメータとの状態同期
 * - useSearchParamsを使用してビューモードと日付をURL同期する
 * - 不正なURLパラメータは今日の日付にフォールバックする
 * - ビューモード変更時にURLを更新する
 * - ブラウザの戻る/進む操作に対応する
 *
 * Requirements: 1.5, 2.4
 */
import { act, renderHook, waitFor } from "@testing-library/react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useCalendarUrlSync } from "./use-calendar-url-sync";

// Next.jsのnavigationモジュールをモック
vi.mock("next/navigation", () => ({
  useSearchParams: vi.fn(),
  useRouter: vi.fn(),
  usePathname: vi.fn(),
}));

describe("useCalendarUrlSync", () => {
  const mockToday = new Date("2025-12-05T12:00:00Z");
  const mockPush = vi.fn();
  const mockRouter = { push: mockPush };
  const mockPathname = "/dashboard";

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(mockToday);
    vi.mocked(useRouter).mockReturnValue(mockRouter as unknown as ReturnType<typeof useRouter>);
    vi.mocked(usePathname).mockReturnValue(mockPathname);
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  describe("初期状態の読み取り (Req 1.5, 2.4)", () => {
    it("should read view mode from URL params", () => {
      // URLパラメータ: ?view=week
      const mockSearchParams = new URLSearchParams("view=week");
      vi.mocked(useSearchParams).mockReturnValue(mockSearchParams as unknown as ReturnType<typeof useSearchParams>);

      const { result } = renderHook(() => useCalendarUrlSync());

      expect(result.current.viewMode).toBe("week");
    });

    it("should read date from URL params", () => {
      // URLパラメータ: ?date=2025-12-20
      const mockSearchParams = new URLSearchParams("date=2025-12-20");
      vi.mocked(useSearchParams).mockReturnValue(mockSearchParams as unknown as ReturnType<typeof useSearchParams>);

      const { result } = renderHook(() => useCalendarUrlSync());

      const selectedDate = result.current.selectedDate;
      expect(selectedDate.getFullYear()).toBe(2025);
      expect(selectedDate.getMonth()).toBe(11); // 12月は11
      expect(selectedDate.getDate()).toBe(20);
    });

    it("should read both view mode and date from URL params", () => {
      // URLパラメータ: ?view=day&date=2025-12-25
      const mockSearchParams = new URLSearchParams("view=day&date=2025-12-25");
      vi.mocked(useSearchParams).mockReturnValue(mockSearchParams as unknown as ReturnType<typeof useSearchParams>);

      const { result } = renderHook(() => useCalendarUrlSync());

      expect(result.current.viewMode).toBe("day");
      const selectedDate = result.current.selectedDate;
      expect(selectedDate.getFullYear()).toBe(2025);
      expect(selectedDate.getMonth()).toBe(11);
      expect(selectedDate.getDate()).toBe(25);
    });

    it("should default to month view when no view param exists", () => {
      // URLパラメータなし
      const mockSearchParams = new URLSearchParams("");
      vi.mocked(useSearchParams).mockReturnValue(mockSearchParams as unknown as ReturnType<typeof useSearchParams>);

      const { result } = renderHook(() => useCalendarUrlSync());

      expect(result.current.viewMode).toBe("month");
    });

    it("should default to today when no date param exists", () => {
      // URLパラメータなし
      const mockSearchParams = new URLSearchParams("");
      vi.mocked(useSearchParams).mockReturnValue(mockSearchParams as unknown as ReturnType<typeof useSearchParams>);

      const { result } = renderHook(() => useCalendarUrlSync());

      const selectedDate = result.current.selectedDate;
      expect(selectedDate.getFullYear()).toBe(mockToday.getFullYear());
      expect(selectedDate.getMonth()).toBe(mockToday.getMonth());
      expect(selectedDate.getDate()).toBe(mockToday.getDate());
    });
  });

  describe("不正なURLパラメータのフォールバック (Req 2.4)", () => {
    it("should fallback to month view when invalid view param", () => {
      // 不正なビューモード: ?view=invalid
      const mockSearchParams = new URLSearchParams("view=invalid");
      vi.mocked(useSearchParams).mockReturnValue(mockSearchParams as unknown as ReturnType<typeof useSearchParams>);

      const { result } = renderHook(() => useCalendarUrlSync());

      expect(result.current.viewMode).toBe("month");
    });

    it("should fallback to today when invalid date param", () => {
      // 不正な日付: ?date=invalid-date
      const mockSearchParams = new URLSearchParams("date=invalid-date");
      vi.mocked(useSearchParams).mockReturnValue(mockSearchParams as unknown as ReturnType<typeof useSearchParams>);

      const { result } = renderHook(() => useCalendarUrlSync());

      const selectedDate = result.current.selectedDate;
      expect(selectedDate.getFullYear()).toBe(mockToday.getFullYear());
      expect(selectedDate.getMonth()).toBe(mockToday.getMonth());
      expect(selectedDate.getDate()).toBe(mockToday.getDate());
    });

    it("should fallback to today when date param is malformed", () => {
      // 不正な形式: ?date=2025/12/20 (スラッシュ区切り)
      const mockSearchParams = new URLSearchParams("date=2025/12/20");
      vi.mocked(useSearchParams).mockReturnValue(mockSearchParams as unknown as ReturnType<typeof useSearchParams>);

      const { result } = renderHook(() => useCalendarUrlSync());

      const selectedDate = result.current.selectedDate;
      expect(selectedDate.getFullYear()).toBe(mockToday.getFullYear());
      expect(selectedDate.getMonth()).toBe(mockToday.getMonth());
      expect(selectedDate.getDate()).toBe(mockToday.getDate());
    });

    it("should handle empty view param as default", () => {
      // 空のビューパラメータ: ?view=
      const mockSearchParams = new URLSearchParams("view=");
      vi.mocked(useSearchParams).mockReturnValue(mockSearchParams as unknown as ReturnType<typeof useSearchParams>);

      const { result } = renderHook(() => useCalendarUrlSync());

      expect(result.current.viewMode).toBe("month");
    });
  });

  describe("URL更新 (Req 1.5, 2.4)", () => {
    it("should update URL when view mode changes", () => {
      const mockSearchParams = new URLSearchParams("");
      vi.mocked(useSearchParams).mockReturnValue(mockSearchParams as unknown as ReturnType<typeof useSearchParams>);

      const { result } = renderHook(() => useCalendarUrlSync());

      // ビューモードを変更
      act(() => {
        result.current.setViewMode("week");
      });

      // router.pushが呼ばれることを確認
      expect(mockPush).toHaveBeenCalledTimes(1);
      expect(mockPush).toHaveBeenCalledWith(
        expect.stringContaining("view=week")
      );
    });

    it("should update URL when date changes", () => {
      const mockSearchParams = new URLSearchParams("");
      vi.mocked(useSearchParams).mockReturnValue(mockSearchParams as unknown as ReturnType<typeof useSearchParams>);

      const { result } = renderHook(() => useCalendarUrlSync());

      // 日付を変更
      const newDate = new Date("2025-12-20T00:00:00Z");
      act(() => {
        result.current.setSelectedDate(newDate);
      });

      expect(mockPush).toHaveBeenCalledTimes(1);
      expect(mockPush).toHaveBeenCalledWith(
        expect.stringContaining("date=2025-12-20")
      );
    });

    it("should update URL with both view mode and date", () => {
      const mockSearchParams = new URLSearchParams("");
      vi.mocked(useSearchParams).mockReturnValue(mockSearchParams as unknown as ReturnType<typeof useSearchParams>);

      const { result } = renderHook(() => useCalendarUrlSync());

      // ビューモードを変更
      act(() => {
        result.current.setViewMode("day");
      });

      expect(mockPush).toHaveBeenCalledTimes(1);
      expect(mockPush).toHaveBeenCalledWith(
        expect.stringMatching(/view=day.*date=2025-12-05/)
      );
    });

    it("should preserve existing URL params when updating", () => {
      // 既存のパラメータ: ?view=month&other=value
      const mockSearchParams = new URLSearchParams("view=month&other=value");
      vi.mocked(useSearchParams).mockReturnValue(mockSearchParams as unknown as ReturnType<typeof useSearchParams>);

      const { result } = renderHook(() => useCalendarUrlSync());

      // ビューモードを変更
      act(() => {
        result.current.setViewMode("week");
      });

      expect(mockPush).toHaveBeenCalledTimes(1);
      const callArg = mockPush.mock.calls[0]?.[0] as string;
      expect(callArg).toContain("view=week");
      expect(callArg).toContain("other=value");
    });

    it("should format date as YYYY-MM-DD in URL", () => {
      const mockSearchParams = new URLSearchParams("");
      vi.mocked(useSearchParams).mockReturnValue(mockSearchParams as unknown as ReturnType<typeof useSearchParams>);

      const { result } = renderHook(() => useCalendarUrlSync());

      // 日付を変更（1桁の月・日）
      const newDate = new Date("2025-01-05T00:00:00Z");
      act(() => {
        result.current.setSelectedDate(newDate);
      });

      expect(mockPush).toHaveBeenCalledTimes(1);
      expect(mockPush).toHaveBeenCalledWith(
        expect.stringContaining("date=2025-01-05")
      );
    });
  });

  describe("ブラウザの戻る/進む操作 (Req 2.4)", () => {
    it("should reflect URL changes from browser navigation", () => {
      // 初期状態: ?view=month&date=2025-12-05
      const mockSearchParams1 = new URLSearchParams("view=month&date=2025-12-05");
      vi.mocked(useSearchParams).mockReturnValue(mockSearchParams1 as unknown as ReturnType<typeof useSearchParams>);

      const { result, rerender } = renderHook(() => useCalendarUrlSync());

      expect(result.current.viewMode).toBe("month");

      // ブラウザの戻る操作をシミュレート（URLが変わる）
      const mockSearchParams2 = new URLSearchParams("view=week&date=2025-12-01");
      vi.mocked(useSearchParams).mockReturnValue(mockSearchParams2 as unknown as ReturnType<typeof useSearchParams>);

      rerender();

      expect(result.current.viewMode).toBe("week");
      const selectedDate = result.current.selectedDate;
      expect(selectedDate.getDate()).toBe(1);
    });
  });

  describe("エッジケース", () => {
    it("should handle date at year boundary", () => {
      // 年末の日付: ?date=2025-12-31
      const mockSearchParams = new URLSearchParams("date=2025-12-31");
      vi.mocked(useSearchParams).mockReturnValue(mockSearchParams as unknown as ReturnType<typeof useSearchParams>);

      const { result } = renderHook(() => useCalendarUrlSync());

      const selectedDate = result.current.selectedDate;
      expect(selectedDate.getFullYear()).toBe(2025);
      expect(selectedDate.getMonth()).toBe(11);
      expect(selectedDate.getDate()).toBe(31);
    });

    it("should handle date at month boundary", () => {
      // 月末の日付: ?date=2025-02-28
      const mockSearchParams = new URLSearchParams("date=2025-02-28");
      vi.mocked(useSearchParams).mockReturnValue(mockSearchParams as unknown as ReturnType<typeof useSearchParams>);

      const { result } = renderHook(() => useCalendarUrlSync());

      const selectedDate = result.current.selectedDate;
      expect(selectedDate.getFullYear()).toBe(2025);
      expect(selectedDate.getMonth()).toBe(1);
      expect(selectedDate.getDate()).toBe(28);
    });

    it("should handle all valid view modes", () => {
      const viewModes = ["day", "week", "month"] as const;

      for (const viewMode of viewModes) {
        const mockSearchParams = new URLSearchParams(`view=${viewMode}`);
        vi.mocked(useSearchParams).mockReturnValue(mockSearchParams as unknown as ReturnType<typeof useSearchParams>);

        const { result } = renderHook(() => useCalendarUrlSync());

        expect(result.current.viewMode).toBe(viewMode);
      }
    });
  });
});
