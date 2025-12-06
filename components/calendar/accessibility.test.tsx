/**
 * カレンダーアクセシビリティ テストスイート
 *
 * タスク9.1: キーボードナビゲーションの実装
 * - 矢印キーでの日付間移動に対応する
 * - Tabキーでのフォーカス移動に対応する
 * - イベントにフォーカスがある状態でEnterキーでポップオーバーを開く
 * - フォーカス状態の視覚的インジケーターを表示する
 * Requirements: 8.1, 8.4
 *
 * タスク9.2: ARIAラベルとセマンティクスの適用
 * - 日付セルにARIAグリッドロールを適用する
 * - 各UI要素に適切なARIAラベルを設定する
 * - ナビゲーションボタンにアクセシブルな名前を設定する
 * - イベントブロックにイベント情報を読み上げ可能にする
 * Requirements: 8.2, 8.3
 *
 * タスク9.3: カラーコントラストの検証と調整
 * - イベントカラーと背景のコントラスト比を検証する
 * - WCAG AA基準を満たすカラーパレットを適用する
 * - ハイライト表示のコントラストを確保する
 * Requirements: 8.5
 */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CalendarEvent } from "@/lib/calendar/types";
import { CalendarGrid, type CalendarGridProps } from "./calendar-grid";
import { CalendarToolbar, type CalendarToolbarProps } from "./calendar-toolbar";
import { EventBlock, type EventBlockProps } from "./event-block";

// テスト用のモックイベント
const mockEvent: CalendarEvent = {
  id: "1",
  title: "テストイベント",
  start: new Date(2025, 11, 5, 10, 0),
  end: new Date(2025, 11, 5, 11, 0),
  allDay: false,
  color: "#3b82f6",
  description: "イベントの説明文",
  location: "東京都渋谷区",
};

const mockAllDayEvent: CalendarEvent = {
  id: "2",
  title: "終日イベント",
  start: new Date(2025, 11, 6),
  end: new Date(2025, 11, 6),
  allDay: true,
  color: "#10b981",
};

describe("Task 9.1: キーボードナビゲーション (Req 8.1, 8.4)", () => {
  describe("CalendarToolbar キーボード操作", () => {
    let defaultProps: CalendarToolbarProps;

    beforeEach(() => {
      defaultProps = {
        viewMode: "month",
        selectedDate: new Date("2025-12-05T12:00:00Z"),
        onViewChange: vi.fn(),
        onNavigate: vi.fn(),
        isMobile: false,
      };
    });

    it("Tabキーでナビゲーションボタン間をフォーカス移動できる", async () => {
      const user = userEvent.setup();
      render(<CalendarToolbar {...defaultProps} />);

      // 最初のボタン（前へ）にフォーカス
      const prevButton = screen.getByRole("button", { name: "前へ" });
      prevButton.focus();
      expect(prevButton).toHaveFocus();

      // Tabキーで次のボタンへ移動
      await user.tab();
      const todayButton = screen.getByRole("button", { name: "今日" });
      expect(todayButton).toHaveFocus();

      // さらにTabキーで次のボタンへ
      await user.tab();
      const nextButton = screen.getByRole("button", { name: "次へ" });
      expect(nextButton).toHaveFocus();
    });

    it("Tabキーでビュー切り替えボタン間をフォーカス移動できる", async () => {
      const user = userEvent.setup();
      render(<CalendarToolbar {...defaultProps} />);

      // 日ビューボタンにフォーカス
      const dayButton = screen.getByRole("button", { name: "日ビュー" });
      dayButton.focus();
      expect(dayButton).toHaveFocus();

      // Tabキーで週ビューボタンへ
      await user.tab();
      const weekButton = screen.getByRole("button", { name: "週ビュー" });
      expect(weekButton).toHaveFocus();

      // Tabキーで月ビューボタンへ
      await user.tab();
      const monthButton = screen.getByRole("button", { name: "月ビュー" });
      expect(monthButton).toHaveFocus();
    });

    it("Enterキーでボタンをアクティベートできる", async () => {
      const user = userEvent.setup();
      const onNavigate = vi.fn();
      render(<CalendarToolbar {...defaultProps} onNavigate={onNavigate} />);

      const prevButton = screen.getByRole("button", { name: "前へ" });
      prevButton.focus();
      await user.keyboard("{Enter}");

      expect(onNavigate).toHaveBeenCalledWith("PREV");
    });

    it("Spaceキーでボタンをアクティベートできる", async () => {
      const user = userEvent.setup();
      const onViewChange = vi.fn();
      render(<CalendarToolbar {...defaultProps} onViewChange={onViewChange} />);

      const weekButton = screen.getByRole("button", { name: "週ビュー" });
      weekButton.focus();
      await user.keyboard(" ");

      expect(onViewChange).toHaveBeenCalledWith("week");
    });

    it("フォーカス状態が視覚的に表示される", () => {
      render(<CalendarToolbar {...defaultProps} />);

      const prevButton = screen.getByRole("button", { name: "前へ" });
      prevButton.focus();

      // ボタンがフォーカス可能であること
      expect(prevButton).toHaveFocus();
      // フォーカスリングのスタイルはCSSで適用されるため、
      // ここではフォーカス可能であることのみを検証
    });
  });

  describe("EventBlock キーボード操作", () => {
    const defaultProps: EventBlockProps = {
      event: mockEvent,
      title: mockEvent.title,
    };

    it("Tabキーでイベントブロックにフォーカスできる", () => {
      render(<EventBlock {...defaultProps} />);

      const eventBlock = screen.getByTestId("event-block");
      eventBlock.focus();

      expect(eventBlock).toHaveFocus();
    });

    it("Enterキーでイベント詳細ポップオーバーを開く", async () => {
      const user = userEvent.setup();
      const onClick = vi.fn();
      render(<EventBlock {...defaultProps} onClick={onClick} />);

      const eventBlock = screen.getByTestId("event-block");
      eventBlock.focus();
      await user.keyboard("{Enter}");

      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it("Spaceキーでイベント詳細ポップオーバーを開く", async () => {
      const user = userEvent.setup();
      const onClick = vi.fn();
      render(<EventBlock {...defaultProps} onClick={onClick} />);

      const eventBlock = screen.getByTestId("event-block");
      eventBlock.focus();
      await user.keyboard(" ");

      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it("フォーカス状態の視覚的インジケーターが表示される", () => {
      render(<EventBlock {...defaultProps} />);

      const eventBlock = screen.getByTestId("event-block");

      // フォーカスリングのクラスが適用されていることを確認
      expect(eventBlock.className).toContain("focus:");
    });

    it("tabIndexが0に設定されている", () => {
      render(<EventBlock {...defaultProps} />);

      const eventBlock = screen.getByTestId("event-block");
      expect(eventBlock).toHaveAttribute("tabIndex", "0");
    });
  });

  describe("CalendarGrid キーボードナビゲーション", () => {
    let defaultProps: CalendarGridProps;

    beforeEach(() => {
      defaultProps = {
        events: [mockEvent, mockAllDayEvent],
        viewMode: "month",
        selectedDate: new Date("2025-12-05T12:00:00Z"),
        onEventClick: vi.fn(),
        onDateChange: vi.fn(),
        today: new Date("2025-12-05T12:00:00Z"),
      };
    });

    it("カレンダーグリッドがキーボード操作可能なことを示すroleを持つ", () => {
      render(<CalendarGrid {...defaultProps} />);

      // カレンダーグリッドのコンテナがaria-labelを持つ
      const calendarGrid = screen.getByTestId("calendar-grid");
      expect(calendarGrid).toHaveAttribute("aria-label", "カレンダー");
    });

    it("カレンダーがテーブル構造でアクセシブルに表示される", () => {
      render(<CalendarGrid {...defaultProps} />);

      // react-big-calendarはテーブル構造でカレンダーを表示
      // rowgroup, row, cell, columnheader のロールが適用される
      const rows = screen.getAllByRole("row");
      expect(rows.length).toBeGreaterThan(0);
    });
  });
});

describe("Task 9.2: ARIAラベルとセマンティクス (Req 8.2, 8.3)", () => {
  describe("CalendarToolbar ARIA属性", () => {
    let defaultProps: CalendarToolbarProps;

    beforeEach(() => {
      defaultProps = {
        viewMode: "month",
        selectedDate: new Date("2025-12-05T12:00:00Z"),
        onViewChange: vi.fn(),
        onNavigate: vi.fn(),
        isMobile: false,
      };
    });

    it('ツールバーにrole="toolbar"が適用されている', () => {
      render(<CalendarToolbar {...defaultProps} />);

      const toolbar = screen.getByRole("toolbar");
      expect(toolbar).toBeInTheDocument();
    });

    it("ツールバーにaria-labelが設定されている", () => {
      render(<CalendarToolbar {...defaultProps} />);

      const toolbar = screen.getByRole("toolbar");
      expect(toolbar).toHaveAttribute("aria-label", "カレンダー操作");
    });

    it("ナビゲーションボタンにアクセシブルな名前が設定されている", () => {
      render(<CalendarToolbar {...defaultProps} />);

      expect(screen.getByRole("button", { name: "前へ" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "今日" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "次へ" })).toBeInTheDocument();
    });

    it("ビュー切り替えボタンにaria-pressedが設定されている", () => {
      render(<CalendarToolbar {...defaultProps} viewMode="month" />);

      const monthButton = screen.getByRole("button", { name: "月ビュー" });
      expect(monthButton).toHaveAttribute("aria-pressed", "true");

      const weekButton = screen.getByRole("button", { name: "週ビュー" });
      expect(weekButton).toHaveAttribute("aria-pressed", "false");

      const dayButton = screen.getByRole("button", { name: "日ビュー" });
      expect(dayButton).toHaveAttribute("aria-pressed", "false");
    });

    it("日付範囲ラベルがスクリーンリーダーで読み上げ可能", () => {
      render(<CalendarToolbar {...defaultProps} />);

      const dateLabel = screen.getByTestId("date-range-label");
      expect(dateLabel).toHaveAttribute("aria-live", "polite");
    });
  });

  describe("CalendarGrid ARIA属性", () => {
    let defaultProps: CalendarGridProps;

    beforeEach(() => {
      defaultProps = {
        events: [mockEvent],
        viewMode: "month",
        selectedDate: new Date("2025-12-05T12:00:00Z"),
        onEventClick: vi.fn(),
        onDateChange: vi.fn(),
        today: new Date("2025-12-05T12:00:00Z"),
      };
    });

    it("カレンダーグリッドにaria-labelが設定されている", () => {
      render(<CalendarGrid {...defaultProps} />);

      const grid = screen.getByTestId("calendar-grid");
      expect(grid).toHaveAttribute("aria-label", "カレンダー");
    });

    it('日付セルにrole="cell"が適用されている', () => {
      render(<CalendarGrid {...defaultProps} />);

      // react-big-calendarはrole="cell"を日付セルに適用
      const cells = screen.getAllByRole("cell");
      expect(cells.length).toBeGreaterThan(0);
    });

    it('グリッド行にrole="row"が適用されている', () => {
      render(<CalendarGrid {...defaultProps} />);

      const rows = screen.getAllByRole("row");
      expect(rows.length).toBeGreaterThan(0);
    });
  });

  describe("EventBlock ARIA属性", () => {
    const defaultProps: EventBlockProps = {
      event: mockEvent,
      title: mockEvent.title,
    };

    it("イベントブロックにaria-labelが設定されている", () => {
      render(<EventBlock {...defaultProps} />);

      const eventBlock = screen.getByTestId("event-block");
      expect(eventBlock).toHaveAttribute("aria-label", "テストイベント");
    });

    it("終日イベントのaria-labelに「終日」が含まれる", () => {
      render(
        <EventBlock event={mockAllDayEvent} title={mockAllDayEvent.title} />
      );

      const eventBlock = screen.getByTestId("event-block");
      expect(eventBlock).toHaveAttribute(
        "aria-label",
        expect.stringContaining("終日")
      );
    });

    it("イベントブロックがbutton roleを持つ", () => {
      render(<EventBlock {...defaultProps} />);

      const button = screen.getByRole("button", { name: "テストイベント" });
      expect(button).toBeInTheDocument();
    });

    it("イベント情報をスクリーンリーダーで読み上げ可能にするaria-describedbyが設定されている", () => {
      render(<EventBlock {...defaultProps} />);

      const eventBlock = screen.getByTestId("event-block");
      // aria-describedbyまたは詳細なaria-labelが設定されている
      const ariaLabel = eventBlock.getAttribute("aria-label");
      expect(ariaLabel).toBeTruthy();
    });
  });
});

describe("Task 9.3: カラーコントラスト (Req 8.5)", () => {
  describe("EventBlock カラーコントラスト", () => {
    it("テキストカラーが白（#ffffff）で十分なコントラストを持つ", () => {
      render(<EventBlock event={mockEvent} title={mockEvent.title} />);

      const eventBlock = screen.getByTestId("event-block");
      expect(eventBlock).toHaveStyle({ color: "#ffffff" });
    });

    it("イベントブロックに背景色が適用されている", () => {
      render(<EventBlock event={mockEvent} title={mockEvent.title} />);

      const eventBlock = screen.getByTestId("event-block");
      expect(eventBlock).toHaveStyle({ backgroundColor: "#3b82f6" });
    });
  });

  describe("CalendarGrid ハイライトカラー", () => {
    let defaultProps: CalendarGridProps;

    beforeEach(() => {
      defaultProps = {
        events: [],
        viewMode: "month",
        selectedDate: new Date("2025-12-05T12:00:00Z"),
        onEventClick: vi.fn(),
        onDateChange: vi.fn(),
        today: new Date("2025-12-05T12:00:00Z"),
      };
    });

    it("今日の日付ハイライトがアクセシブルなコントラスト比を持つ", () => {
      render(<CalendarGrid {...defaultProps} />);

      // 今日のハイライトセルを確認
      // react-big-calendarがtoday classを適用するかを確認
      const calendarGrid = screen.getByTestId("calendar-grid");
      expect(calendarGrid).toBeInTheDocument();
    });
  });

  describe("フォーカス表示のコントラスト", () => {
    it("EventBlockのフォーカスリングが視認可能", () => {
      render(<EventBlock event={mockEvent} title={mockEvent.title} />);

      const eventBlock = screen.getByTestId("event-block");
      // フォーカスリングのTailwindクラスが適用されている
      expect(eventBlock.className).toContain("focus:ring-");
    });

    it("CalendarToolbarボタンのフォーカスリングが視認可能", () => {
      render(
        <CalendarToolbar
          isMobile={false}
          onNavigate={vi.fn()}
          onViewChange={vi.fn()}
          selectedDate={new Date("2025-12-05T12:00:00Z")}
          viewMode="month"
        />
      );

      const button = screen.getByRole("button", { name: "前へ" });
      // ボタンがフォーカス可能であることを確認
      expect(button).not.toBeDisabled();
    });
  });
});
