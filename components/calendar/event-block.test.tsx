/**
 * EventBlock - テスト
 *
 * タスク6.1: EventBlockカスタムレンダラーの作成
 * - react-big-calendarのcomponents.eventでカスタムレンダラーを設定する
 * - イベント名を表示し、長いテキストは省略する
 * - イベントカラーを背景色として適用する
 * - クリックとキーボード操作でのイベント選択に対応する
 * Requirements: 3.7, 8.4
 *
 * タスク6.2: 終日イベントの視覚的区別
 * - 終日イベントと時間指定イベントを異なるスタイルで表示する
 * - 月ビューで終日イベントを日付セル上部にバー形式で配置する
 * - 週/日ビューで終日イベントを時間軸上部の専用エリアに表示する
 * - 同一日の複数終日イベントを縦に積み重ねて表示する
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.6
 */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { CalendarEvent } from "@/lib/calendar/types";
import { EventBlock, type EventBlockProps } from "./event-block";

// トップレベルに正規表現を定義（パフォーマンス最適化）
const TIME_1400_PATTERN = /14:00/;
const TIME_FORMAT_PATTERN = /\d{1,2}:\d{2}/;

describe("EventBlock", () => {
  const mockEvent: CalendarEvent = {
    id: "1",
    title: "テストイベント",
    start: new Date(2025, 11, 5, 10, 0),
    end: new Date(2025, 11, 5, 11, 0),
    allDay: false,
    color: "#3b82f6",
  };

  const defaultProps: EventBlockProps = {
    event: mockEvent,
    title: "テストイベント",
  };

  // Task 6.1: EventBlockカスタムレンダラーの作成
  describe("Task 6.1: EventBlockカスタムレンダラー", () => {
    it("イベント名を表示する (Req 3.7)", () => {
      render(<EventBlock {...defaultProps} />);

      expect(screen.getByText("テストイベント")).toBeInTheDocument();
    });

    it("長いイベント名は省略して表示する (Req 3.7)", () => {
      const longTitleEvent: CalendarEvent = {
        ...mockEvent,
        title:
          "これはとても長いイベント名で、表示領域を超える可能性があります。この場合は省略記号で切り詰めて表示します。",
      };

      render(
        <EventBlock
          {...defaultProps}
          event={longTitleEvent}
          title={longTitleEvent.title}
        />
      );

      // イベント名が表示される
      const eventElement = screen.getByText(longTitleEvent.title);
      expect(eventElement).toBeInTheDocument();

      // テキストオーバーフロー時に省略されるスタイルが適用される
      expect(eventElement).toHaveClass("truncate");
    });

    it("イベントカラーを背景色として適用する (Req 3.7)", () => {
      render(<EventBlock {...defaultProps} />);

      const eventElement = screen.getByTestId("event-block");
      expect(eventElement).toHaveStyle({ backgroundColor: "#3b82f6" });
    });

    it("キーボード操作（Enter）でイベントを選択できる (Req 8.4)", async () => {
      const user = userEvent.setup();
      const onClick = vi.fn();

      render(<EventBlock {...defaultProps} onClick={onClick} />);

      const eventElement = screen.getByTestId("event-block");

      // フォーカスしてEnterキーを押す
      eventElement.focus();
      await user.keyboard("{Enter}");

      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it("キーボード操作（Space）でイベントを選択できる (Req 8.4)", async () => {
      const user = userEvent.setup();
      const onClick = vi.fn();

      render(<EventBlock {...defaultProps} onClick={onClick} />);

      const eventElement = screen.getByTestId("event-block");

      // フォーカスしてSpaceキーを押す
      eventElement.focus();
      await user.keyboard(" ");

      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it("クリック操作でイベントを選択できる", async () => {
      const user = userEvent.setup();
      const onClick = vi.fn();

      render(<EventBlock {...defaultProps} onClick={onClick} />);

      const eventElement = screen.getByTestId("event-block");
      await user.click(eventElement);

      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it("フォーカス可能である (tabIndex=0)", () => {
      render(<EventBlock {...defaultProps} />);

      const eventElement = screen.getByTestId("event-block");
      expect(eventElement).toHaveAttribute("tabIndex", "0");
    });

    it("適切なARIAロールが設定されている", () => {
      render(<EventBlock {...defaultProps} />);

      // button要素は暗黙的にbutton roleを持つ
      const eventElement = screen.getByRole("button", {
        name: "テストイベント",
      });
      expect(eventElement).toBeInTheDocument();
    });

    it("イベント名がARIAラベルとして設定されている (Req 8.4)", () => {
      render(<EventBlock {...defaultProps} />);

      const eventElement = screen.getByTestId("event-block");
      expect(eventElement).toHaveAttribute("aria-label", "テストイベント");
    });
  });

  // Task 6.2: 終日イベントの視覚的区別
  describe("Task 6.2: 終日イベントの視覚的区別", () => {
    const allDayEvent: CalendarEvent = {
      id: "2",
      title: "終日イベント",
      start: new Date(2025, 11, 6),
      end: new Date(2025, 11, 6),
      allDay: true,
      color: "#10b981",
    };

    const timedEvent: CalendarEvent = {
      id: "3",
      title: "時間指定イベント",
      start: new Date(2025, 11, 6, 14, 0),
      end: new Date(2025, 11, 6, 15, 0),
      allDay: false,
      color: "#f59e0b",
    };

    it("終日イベントと時間指定イベントを視覚的に区別する (Req 9.1)", () => {
      const { rerender } = render(
        <EventBlock event={allDayEvent} title={allDayEvent.title} />
      );

      // 終日イベントの要素を取得
      const allDayElement = screen.getByTestId("event-block");
      expect(allDayElement).toHaveAttribute("data-all-day", "true");

      // 時間指定イベントに再レンダリング
      rerender(<EventBlock event={timedEvent} title={timedEvent.title} />);

      // 時間指定イベントの要素を取得
      const timedElement = screen.getByTestId("event-block");
      expect(timedElement).toHaveAttribute("data-all-day", "false");
    });

    it("終日イベントには専用のスタイルクラスが適用される (Req 9.1)", () => {
      render(<EventBlock event={allDayEvent} title={allDayEvent.title} />);

      const eventElement = screen.getByTestId("event-block");
      expect(eventElement).toHaveClass("event-block-all-day");
    });

    it("時間指定イベントには専用のスタイルクラスが適用される (Req 9.1)", () => {
      render(<EventBlock event={timedEvent} title={timedEvent.title} />);

      const eventElement = screen.getByTestId("event-block");
      expect(eventElement).toHaveClass("event-block-timed");
    });

    it("終日イベントはバー形式で表示される (Req 9.2)", () => {
      render(<EventBlock event={allDayEvent} title={allDayEvent.title} />);

      const eventElement = screen.getByTestId("event-block");
      // バー形式のスタイル（幅100%、高さが固定）
      expect(eventElement).toHaveClass("event-block-bar");
    });

    it("時間指定イベントは時刻を表示する", () => {
      render(
        <EventBlock event={timedEvent} showTime title={timedEvent.title} />
      );

      // 時間が表示される
      expect(screen.getByText(TIME_1400_PATTERN)).toBeInTheDocument();
    });

    it("終日イベントには時刻が表示されない", () => {
      render(
        <EventBlock event={allDayEvent} showTime title={allDayEvent.title} />
      );

      // 終日イベントには時刻が表示されない
      expect(screen.queryByText(TIME_FORMAT_PATTERN)).not.toBeInTheDocument();
    });

    it("イベントブロックに正しいカラーが適用される", () => {
      render(<EventBlock event={allDayEvent} title={allDayEvent.title} />);

      const eventElement = screen.getByTestId("event-block");
      expect(eventElement).toHaveStyle({ backgroundColor: "#10b981" });
    });

    it("テキストカラーは白で読みやすく表示される", () => {
      render(<EventBlock {...defaultProps} />);

      const eventElement = screen.getByTestId("event-block");
      expect(eventElement).toHaveStyle({ color: "#ffffff" });
    });
  });

  // エッジケース
  describe("エッジケース", () => {
    it("説明文が設定されている場合もイベント名のみ表示する", () => {
      const eventWithDescription: CalendarEvent = {
        ...mockEvent,
        description: "これはイベントの説明文です",
      };

      render(
        <EventBlock
          event={eventWithDescription}
          title={eventWithDescription.title}
        />
      );

      // イベント名のみ表示（説明文はポップオーバーで表示）
      expect(screen.getByText("テストイベント")).toBeInTheDocument();
      expect(
        screen.queryByText("これはイベントの説明文です")
      ).not.toBeInTheDocument();
    });

    it("場所情報が設定されている場合もイベント名のみ表示する", () => {
      const eventWithLocation: CalendarEvent = {
        ...mockEvent,
        location: "東京都渋谷区",
      };

      render(
        <EventBlock event={eventWithLocation} title={eventWithLocation.title} />
      );

      // イベント名のみ表示
      expect(screen.getByText("テストイベント")).toBeInTheDocument();
      expect(screen.queryByText("東京都渋谷区")).not.toBeInTheDocument();
    });

    it("空のイベント名でもレンダリングされる", () => {
      const emptyTitleEvent: CalendarEvent = {
        ...mockEvent,
        title: "",
      };

      render(
        <EventBlock event={emptyTitleEvent} title={emptyTitleEvent.title} />
      );

      const eventElement = screen.getByTestId("event-block");
      expect(eventElement).toBeInTheDocument();
    });
  });
});
