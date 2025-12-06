/**
 * CalendarToolbar テストスイート
 *
 * タスク4.1: ビューモード切り替えUIの作成
 * タスク4.2: 日付ナビゲーションコントロールの作成
 * タスク4.3: CalendarToolbarコンポーネントの統合
 *
 * Requirements: 1.1, 1.2, 1.3, 1.5, 2.1, 2.2, 2.3, 2.4
 */
import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CalendarToolbarProps } from "./calendar-toolbar";
import { CalendarToolbar } from "./calendar-toolbar";

describe("CalendarToolbar", () => {
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

  describe("Task 4.1: ビューモード切り替えUI (Req 1.1, 1.2, 1.3)", () => {
    it("日/週/月の3つのビュー切り替えボタンを表示する", () => {
      render(<CalendarToolbar {...defaultProps} />);

      expect(
        screen.getByRole("button", { name: "日ビュー" })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "週ビュー" })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "月ビュー" })
      ).toBeInTheDocument();
    });

    it("現在選択中のビューモードを視覚的に強調表示する", () => {
      const { rerender } = render(<CalendarToolbar {...defaultProps} />);

      // 月ビューが選択されている
      const monthButton = screen.getByRole("button", { name: "月ビュー" });
      expect(monthButton).toHaveAttribute("data-active", "true");

      // 週ビューに変更
      rerender(<CalendarToolbar {...defaultProps} viewMode="week" />);
      const weekButton = screen.getByRole("button", { name: "週ビュー" });
      expect(weekButton).toHaveAttribute("data-active", "true");

      // 日ビューに変更
      rerender(<CalendarToolbar {...defaultProps} viewMode="day" />);
      const dayButton = screen.getByRole("button", { name: "日ビュー" });
      expect(dayButton).toHaveAttribute("data-active", "true");
    });

    it("日ビューボタンをクリックすると onViewChange が 'day' で呼ばれる", async () => {
      const user = userEvent.setup();
      render(<CalendarToolbar {...defaultProps} />);

      const dayButton = screen.getByRole("button", { name: "日ビュー" });
      await user.click(dayButton);

      expect(defaultProps.onViewChange).toHaveBeenCalledWith("day");
    });

    it("週ビューボタンをクリックすると onViewChange が 'week' で呼ばれる", async () => {
      const user = userEvent.setup();
      render(<CalendarToolbar {...defaultProps} />);

      const weekButton = screen.getByRole("button", { name: "週ビュー" });
      await user.click(weekButton);

      expect(defaultProps.onViewChange).toHaveBeenCalledWith("week");
    });

    it("月ビューボタンをクリックすると onViewChange が 'month' で呼ばれる", async () => {
      const user = userEvent.setup();
      render(<CalendarToolbar {...defaultProps} />);

      const monthButton = screen.getByRole("button", { name: "月ビュー" });
      await user.click(monthButton);

      expect(defaultProps.onViewChange).toHaveBeenCalledWith("month");
    });

    it("ボタングループとしてアクセシブルなマークアップを適用する", () => {
      render(<CalendarToolbar {...defaultProps} />);

      // ビュー切り替えボタングループにアクセシブルなラベルがある
      const viewSwitcher = screen.getByRole("group", {
        name: "ビュー切り替え",
      });
      expect(viewSwitcher).toBeInTheDocument();
    });
  });

  describe("Task 4.2: 日付ナビゲーションコントロール (Req 2.1, 2.2, 2.3, 2.4)", () => {
    it("前へ/次へ/今日ボタンを表示する", () => {
      render(<CalendarToolbar {...defaultProps} />);

      expect(screen.getByRole("button", { name: "前へ" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "次へ" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "今日" })).toBeInTheDocument();
    });

    it("前へボタンをクリックすると onNavigate が 'PREV' で呼ばれる", async () => {
      const user = userEvent.setup();
      render(<CalendarToolbar {...defaultProps} />);

      const prevButton = screen.getByRole("button", { name: "前へ" });
      await user.click(prevButton);

      expect(defaultProps.onNavigate).toHaveBeenCalledWith("PREV");
    });

    it("次へボタンをクリックすると onNavigate が 'NEXT' で呼ばれる", async () => {
      const user = userEvent.setup();
      render(<CalendarToolbar {...defaultProps} />);

      const nextButton = screen.getByRole("button", { name: "次へ" });
      await user.click(nextButton);

      expect(defaultProps.onNavigate).toHaveBeenCalledWith("NEXT");
    });

    it("今日ボタンをクリックすると onNavigate が 'TODAY' で呼ばれる", async () => {
      const user = userEvent.setup();
      render(<CalendarToolbar {...defaultProps} />);

      const todayButton = screen.getByRole("button", { name: "今日" });
      await user.click(todayButton);

      expect(defaultProps.onNavigate).toHaveBeenCalledWith("TODAY");
    });

    it("月ビューの場合、年月を表示する（例: '2025年12月'）", () => {
      render(<CalendarToolbar {...defaultProps} viewMode="month" />);

      expect(screen.getByText("2025年12月")).toBeInTheDocument();
    });

    it("週ビューの場合、週の範囲を表示する", () => {
      render(<CalendarToolbar {...defaultProps} viewMode="week" />);

      // 週の範囲が表示される（例: '2025年12月1日 - 12月7日'）
      const dateRange = screen.getByTestId("date-range-label");
      expect(dateRange).toBeInTheDocument();
      expect(dateRange.textContent).toContain("2025");
    });

    it("日ビューの場合、年月日を表示する（例: '2025年12月5日'）", () => {
      render(<CalendarToolbar {...defaultProps} viewMode="day" />);

      const dateRange = screen.getByTestId("date-range-label");
      expect(dateRange.textContent).toContain("2025年12月5日");
    });

    it("ナビゲーションボタンにアクセシブルな名前を設定する", () => {
      render(<CalendarToolbar {...defaultProps} />);

      const prevButton = screen.getByRole("button", { name: "前へ" });
      const nextButton = screen.getByRole("button", { name: "次へ" });
      const todayButton = screen.getByRole("button", { name: "今日" });

      expect(prevButton).toHaveAccessibleName();
      expect(nextButton).toHaveAccessibleName();
      expect(todayButton).toHaveAccessibleName();
    });
  });

  describe("レスポンシブデザイン (Req 6.3, 6.4)", () => {
    it("モバイル表示時はコンパクトなレイアウトを使用する", () => {
      render(<CalendarToolbar {...defaultProps} isMobile={true} />);

      // モバイル表示の要素がある
      const toolbar = screen.getByTestId("calendar-toolbar");
      expect(toolbar).toHaveAttribute("data-mobile", "true");
    });

    it("デスクトップ表示時はフルレイアウトを使用する", () => {
      render(<CalendarToolbar {...defaultProps} isMobile={false} />);

      const toolbar = screen.getByTestId("calendar-toolbar");
      expect(toolbar).toHaveAttribute("data-mobile", "false");
    });
  });

  describe("Task 8.1: デスクトップとタブレット向けレイアウト (Req 6.1, 6.2, 6.5)", () => {
    it("デスクトップ表示時に全てのビューモードボタンを表示する", () => {
      render(<CalendarToolbar {...defaultProps} isMobile={false} />);

      // 日/週/月すべてのビューボタンが表示される
      expect(
        screen.getByRole("button", { name: "日ビュー" })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "週ビュー" })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "月ビュー" })
      ).toBeInTheDocument();
    });

    it("デスクトップ表示時にツールバーが横方向レイアウトを使用する", () => {
      render(<CalendarToolbar {...defaultProps} isMobile={false} />);

      const toolbar = screen.getByTestId("calendar-toolbar");
      expect(toolbar).toHaveAttribute("data-mobile", "false");
    });
  });

  describe("Task 8.2: モバイル向けレイアウトとデフォルトビュー (Req 6.3, 6.4)", () => {
    it("モバイル表示時にツールバーがコンパクト化される", () => {
      render(<CalendarToolbar {...defaultProps} isMobile={true} />);

      const toolbar = screen.getByTestId("calendar-toolbar");
      expect(toolbar).toHaveAttribute("data-mobile", "true");
    });

    it("モバイル表示時に全てのナビゲーションボタンがアクセス可能", async () => {
      const user = userEvent.setup();
      const onNavigate = vi.fn();

      render(
        <CalendarToolbar
          {...defaultProps}
          isMobile={true}
          onNavigate={onNavigate}
        />
      );

      // タップ操作のテスト（クリックで代替）
      await user.click(screen.getByRole("button", { name: "前へ" }));
      expect(onNavigate).toHaveBeenCalledWith("PREV");

      await user.click(screen.getByRole("button", { name: "今日" }));
      expect(onNavigate).toHaveBeenCalledWith("TODAY");

      await user.click(screen.getByRole("button", { name: "次へ" }));
      expect(onNavigate).toHaveBeenCalledWith("NEXT");
    });

    it("モバイル表示時にビューモードボタンがタップ可能", async () => {
      const user = userEvent.setup();
      const onViewChange = vi.fn();

      render(
        <CalendarToolbar
          {...defaultProps}
          isMobile={true}
          onViewChange={onViewChange}
        />
      );

      // 日ビューボタンをタップ
      await user.click(screen.getByRole("button", { name: "日ビュー" }));
      expect(onViewChange).toHaveBeenCalledWith("day");
    });

    it("モバイル表示時に縦方向レイアウトが適用される", () => {
      render(<CalendarToolbar {...defaultProps} isMobile={true} />);

      const toolbar = screen.getByTestId("calendar-toolbar");
      // data-mobile属性でレイアウト方向を判定
      expect(toolbar).toHaveAttribute("data-mobile", "true");
    });
  });

  describe("アクセシビリティ (Req 8.2)", () => {
    it("すべてのボタンに適切なARIAラベルを設定する", () => {
      render(<CalendarToolbar {...defaultProps} />);

      const buttons = screen.getAllByRole("button");
      for (const button of buttons) {
        expect(button).toHaveAccessibleName();
      }
    });

    it("キーボード操作でボタンにフォーカスできる", () => {
      render(<CalendarToolbar {...defaultProps} />);

      const dayButton = screen.getByRole("button", { name: "日ビュー" });
      dayButton.focus();
      expect(dayButton).toHaveFocus();
    });
  });

  describe("Task 4.3: CalendarToolbarコンポーネントの統合 (Req 1.5, 2.4)", () => {
    it("ビュー切り替えとナビゲーションが1つのツールバーコンポーネントに統合されている", () => {
      render(<CalendarToolbar {...defaultProps} />);

      // 単一のツールバー要素にすべての機能が含まれている
      const toolbar = screen.getByTestId("calendar-toolbar");
      expect(toolbar).toBeInTheDocument();

      // ナビゲーションコントロール（前へ/今日/次へ）が存在する
      expect(screen.getByRole("button", { name: "前へ" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "今日" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "次へ" })).toBeInTheDocument();

      // ビューモード切り替え（日/週/月）が存在する
      expect(
        screen.getByRole("button", { name: "日ビュー" })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "週ビュー" })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "月ビュー" })
      ).toBeInTheDocument();

      // 日付範囲ラベルが存在する
      expect(screen.getByTestId("date-range-label")).toBeInTheDocument();
    });

    it("CalendarContainerからpropsを受け取り、ビューモード変更を通知する", async () => {
      const user = userEvent.setup();
      const onViewChange = vi.fn();

      render(<CalendarToolbar {...defaultProps} onViewChange={onViewChange} />);

      // 週ビューに変更
      await user.click(screen.getByRole("button", { name: "週ビュー" }));
      expect(onViewChange).toHaveBeenCalledWith("week");

      // 日ビューに変更
      await user.click(screen.getByRole("button", { name: "日ビュー" }));
      expect(onViewChange).toHaveBeenCalledWith("day");
    });

    it("CalendarContainerからpropsを受け取り、ナビゲーション操作を通知する", async () => {
      const user = userEvent.setup();
      const onNavigate = vi.fn();

      render(<CalendarToolbar {...defaultProps} onNavigate={onNavigate} />);

      // 前へ操作
      await user.click(screen.getByRole("button", { name: "前へ" }));
      expect(onNavigate).toHaveBeenCalledWith("PREV");

      // 今日操作
      await user.click(screen.getByRole("button", { name: "今日" }));
      expect(onNavigate).toHaveBeenCalledWith("TODAY");

      // 次へ操作
      await user.click(screen.getByRole("button", { name: "次へ" }));
      expect(onNavigate).toHaveBeenCalledWith("NEXT");
    });

    it("モバイル向けのコンパクトレイアウトを準備する", () => {
      const { rerender } = render(<CalendarToolbar {...defaultProps} />);

      // デスクトップレイアウト
      let toolbar = screen.getByTestId("calendar-toolbar");
      expect(toolbar).toHaveAttribute("data-mobile", "false");

      // モバイルレイアウトに切り替え
      rerender(<CalendarToolbar {...defaultProps} isMobile={true} />);
      toolbar = screen.getByTestId("calendar-toolbar");
      expect(toolbar).toHaveAttribute("data-mobile", "true");
    });

    it("モバイルレイアウトでは縦方向に要素を配置する", () => {
      render(<CalendarToolbar {...defaultProps} isMobile={true} />);

      const toolbar = screen.getByTestId("calendar-toolbar");
      expect(toolbar).toHaveAttribute("data-mobile", "true");

      // すべての主要要素が表示されている
      expect(screen.getByRole("button", { name: "前へ" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "今日" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "次へ" })).toBeInTheDocument();
      expect(screen.getByTestId("date-range-label")).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "日ビュー" })
      ).toBeInTheDocument();
    });

    it("propsの変更に応じて表示が更新される", () => {
      const { rerender } = render(<CalendarToolbar {...defaultProps} />);

      // 初期表示: 月ビュー
      expect(screen.getByText("2025年12月")).toBeInTheDocument();
      const monthButton = screen.getByRole("button", { name: "月ビュー" });
      expect(monthButton).toHaveAttribute("data-active", "true");

      // 週ビューに変更 & 日付変更
      rerender(
        <CalendarToolbar
          {...defaultProps}
          selectedDate={new Date("2025-11-15T12:00:00Z")}
          viewMode="week"
        />
      );
      const dateRange = screen.getByTestId("date-range-label");
      expect(dateRange.textContent).toContain("2025");
      expect(dateRange.textContent).toContain("11");

      const weekButton = screen.getByRole("button", { name: "週ビュー" });
      expect(weekButton).toHaveAttribute("data-active", "true");
    });
  });
});
