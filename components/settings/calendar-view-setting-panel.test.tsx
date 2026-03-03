/**
 * @file CalendarViewSettingPanel コンポーネントのテスト
 * @description カレンダーデフォルトビュー選択パネルの動作を検証
 *
 * Requirements: 3.1, 3.2, 3.3, 5.4, 6.1, 6.2, 6.3
 */

import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CalendarViewSettingPanel } from "./calendar-view-setting-panel";

// useUserPreferences フックをモック
vi.mock("@/hooks/use-user-preferences", () => ({
  useUserPreferences: vi.fn(),
}));

// モックの型安全なインポート
import { useUserPreferences } from "@/hooks/use-user-preferences";

const mockUseUserPreferences = vi.mocked(useUserPreferences);

describe("CalendarViewSettingPanel - カレンダーデフォルトビュー設定パネル", () => {
  let mockSetDefaultCalendarView: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockSetDefaultCalendarView = vi.fn();
    mockUseUserPreferences.mockReturnValue({
      defaultCalendarView: "month",
      setDefaultCalendarView: mockSetDefaultCalendarView,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("Req 3.1: カレンダーデフォルトビュー選択UIの表示", () => {
    it("パネルが表示されること", () => {
      render(<CalendarViewSettingPanel />);
      expect(
        screen.getByTestId("calendar-view-setting-panel")
      ).toBeInTheDocument();
    });
  });

  describe("Req 3.2: 3つのビュー選択肢", () => {
    it("月ビュー・週ビュー・日ビューの3つの選択肢が表示されること", () => {
      render(<CalendarViewSettingPanel />);

      expect(screen.getByTestId("view-option-month")).toBeInTheDocument();
      expect(screen.getByTestId("view-option-week")).toBeInTheDocument();
      expect(screen.getByTestId("view-option-day")).toBeInTheDocument();
    });

    it("各選択肢にラベルテキストが含まれること", () => {
      render(<CalendarViewSettingPanel />);

      expect(screen.getByText("月")).toBeInTheDocument();
      expect(screen.getByText("週")).toBeInTheDocument();
      expect(screen.getByText("日")).toBeInTheDocument();
    });
  });

  describe("Req 3.3: ビュー設定の永続化", () => {
    it("週ビューを選択すると setDefaultCalendarView が呼ばれること", async () => {
      const user = userEvent.setup();
      render(<CalendarViewSettingPanel />);

      await user.click(screen.getByTestId("view-option-week"));

      expect(mockSetDefaultCalendarView).toHaveBeenCalledWith("week");
    });

    it("日ビューを選択すると setDefaultCalendarView が呼ばれること", async () => {
      const user = userEvent.setup();
      render(<CalendarViewSettingPanel />);

      await user.click(screen.getByTestId("view-option-day"));

      expect(mockSetDefaultCalendarView).toHaveBeenCalledWith("day");
    });

    it("月ビューを選択すると setDefaultCalendarView が呼ばれること", async () => {
      const user = userEvent.setup();
      mockUseUserPreferences.mockReturnValue({
        defaultCalendarView: "week",
        setDefaultCalendarView: mockSetDefaultCalendarView,
      });
      render(<CalendarViewSettingPanel />);

      await user.click(screen.getByTestId("view-option-month"));

      expect(mockSetDefaultCalendarView).toHaveBeenCalledWith("month");
    });
  });

  describe("Req 6.1: 保存成功フィードバック", () => {
    it("選択変更後に保存完了フィードバックが表示されること", async () => {
      const user = userEvent.setup();
      render(<CalendarViewSettingPanel />);

      await user.click(screen.getByTestId("view-option-week"));

      await waitFor(() => {
        expect(screen.getByText("保存しました")).toBeInTheDocument();
      });
    });
  });

  describe("Req 6.3: フィードバックの自動消去", () => {
    it("保存完了フィードバックが3秒後に自動消去されること", () => {
      vi.useFakeTimers();
      render(<CalendarViewSettingPanel />);

      fireEvent.click(screen.getByTestId("view-option-week"));

      expect(screen.getByText("保存しました")).toBeInTheDocument();

      act(() => {
        vi.advanceTimersByTime(3000);
      });

      expect(screen.queryByText("保存しました")).not.toBeInTheDocument();

      vi.useRealTimers();
    });
  });

  describe("現在値のハイライト表示", () => {
    it("現在の設定値（月ビュー）がハイライトされること", () => {
      render(<CalendarViewSettingPanel />);

      expect(screen.getByTestId("view-option-month")).toHaveAttribute(
        "data-active",
        "true"
      );
      expect(screen.getByTestId("view-option-week")).toHaveAttribute(
        "data-active",
        "false"
      );
      expect(screen.getByTestId("view-option-day")).toHaveAttribute(
        "data-active",
        "false"
      );
    });

    it("週ビューが設定されている場合、週のみハイライトされること", () => {
      mockUseUserPreferences.mockReturnValue({
        defaultCalendarView: "week",
        setDefaultCalendarView: mockSetDefaultCalendarView,
      });
      render(<CalendarViewSettingPanel />);

      expect(screen.getByTestId("view-option-month")).toHaveAttribute(
        "data-active",
        "false"
      );
      expect(screen.getByTestId("view-option-week")).toHaveAttribute(
        "data-active",
        "true"
      );
      expect(screen.getByTestId("view-option-day")).toHaveAttribute(
        "data-active",
        "false"
      );
    });
  });
});
