import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { CalendarEvent } from "@/lib/calendar/types";
import { EventBlock, type EventBlockProps } from "./event-block";

const TIME_1400_PATTERN = /14:00/;
const TIME_FORMAT_PATTERN = /\d{1,2}:\d{2}/;

function renderWithTooltip(ui: React.ReactElement) {
  return render(<TooltipProvider>{ui}</TooltipProvider>);
}

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

  describe("Task 6.1: EventBlockカスタムレンダラー", () => {
    it("イベント名を表示する", () => {
      renderWithTooltip(<EventBlock {...defaultProps} />);

      expect(screen.getByText("テストイベント")).toBeInTheDocument();
    });

    it("デフォルトでは開始時刻を表示しない", () => {
      renderWithTooltip(<EventBlock {...defaultProps} />);

      expect(screen.queryByText("10:00")).not.toBeInTheDocument();
    });

    it("showTime=true の場合は開始時刻を表示する", () => {
      renderWithTooltip(<EventBlock {...defaultProps} showTime />);

      expect(screen.getByText("10:00")).toBeInTheDocument();
    });

    it("長いイベント名は省略して表示する", () => {
      const longTitleEvent: CalendarEvent = {
        ...mockEvent,
        title:
          "これはとても長いイベント名で、表示領域を超える可能性があります。この場合は省略記号で切り詰めて表示します。",
      };

      renderWithTooltip(
        <EventBlock
          {...defaultProps}
          event={longTitleEvent}
          title={longTitleEvent.title}
        />
      );

      const eventElement = screen.getByText(longTitleEvent.title);
      expect(eventElement).toBeInTheDocument();
      expect(eventElement).toHaveClass("truncate");
    });

    it("イベントカラーを背景色として適用する", () => {
      renderWithTooltip(<EventBlock {...defaultProps} />);

      const eventElement = screen.getByTestId("event-block");
      expect(eventElement).toHaveStyle({ backgroundColor: "#3b82f6" });
    });

    it("キーボード操作（Enter）でイベントを選択できる", async () => {
      const user = userEvent.setup();
      const onClick = vi.fn();

      renderWithTooltip(<EventBlock {...defaultProps} onClick={onClick} />);

      const eventElement = screen.getByTestId("event-block");
      eventElement.focus();
      await user.keyboard("{Enter}");

      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it("キーボード操作（Space）でイベントを選択できる", async () => {
      const user = userEvent.setup();
      const onClick = vi.fn();

      renderWithTooltip(<EventBlock {...defaultProps} onClick={onClick} />);

      const eventElement = screen.getByTestId("event-block");
      eventElement.focus();
      await user.keyboard(" ");

      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it("クリック操作でイベントを選択できる", async () => {
      const user = userEvent.setup();
      const onClick = vi.fn();

      renderWithTooltip(<EventBlock {...defaultProps} onClick={onClick} />);

      const eventElement = screen.getByTestId("event-block");
      await user.click(eventElement);

      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it("フォーカス可能である (tabIndex=0)", () => {
      renderWithTooltip(<EventBlock {...defaultProps} />);

      const eventElement = screen.getByTestId("event-block");
      expect(eventElement).toHaveAttribute("tabIndex", "0");
    });

    it("適切なARIAロールが設定されている", () => {
      renderWithTooltip(<EventBlock {...defaultProps} />);

      const eventElement = screen.getByRole("button", {
        name: "テストイベント",
      });
      expect(eventElement).toBeInTheDocument();
    });

    it("イベント名がARIAラベルとして設定されている", () => {
      renderWithTooltip(<EventBlock {...defaultProps} />);

      const eventElement = screen.getByTestId("event-block");
      expect(eventElement).toHaveAttribute("aria-label", "テストイベント");
    });
  });

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

    it("終日イベントと時間指定イベントを視覚的に区別する", () => {
      const { rerender } = renderWithTooltip(
        <EventBlock event={allDayEvent} title={allDayEvent.title} />
      );

      const allDayElement = screen.getByTestId("event-block");
      expect(allDayElement).toHaveAttribute("data-all-day", "true");

      rerender(
        <TooltipProvider>
          <EventBlock event={timedEvent} title={timedEvent.title} />
        </TooltipProvider>
      );

      const timedElement = screen.getByTestId("event-block");
      expect(timedElement).toHaveAttribute("data-all-day", "false");
    });

    it("終日イベントには専用のスタイルクラスが適用される", () => {
      renderWithTooltip(
        <EventBlock event={allDayEvent} title={allDayEvent.title} />
      );

      const eventElement = screen.getByTestId("event-block");
      expect(eventElement).toHaveClass("event-block-all-day");
    });

    it("時間指定イベントには専用のスタイルクラスが適用される", () => {
      renderWithTooltip(
        <EventBlock event={timedEvent} title={timedEvent.title} />
      );

      const eventElement = screen.getByTestId("event-block");
      expect(eventElement).toHaveClass("event-block-timed");
    });

    it("終日イベントはバー形式で表示される", () => {
      renderWithTooltip(
        <EventBlock event={allDayEvent} title={allDayEvent.title} />
      );

      const eventElement = screen.getByTestId("event-block");
      expect(eventElement).toHaveClass("event-block-bar");
    });

    it("時間指定イベントは時刻を表示する", () => {
      renderWithTooltip(
        <EventBlock event={timedEvent} showTime title={timedEvent.title} />
      );

      expect(screen.getByText(TIME_1400_PATTERN)).toBeInTheDocument();
    });

    it("終日イベントには時刻が表示されない", () => {
      renderWithTooltip(
        <EventBlock event={allDayEvent} showTime title={allDayEvent.title} />
      );

      expect(screen.queryByText(TIME_FORMAT_PATTERN)).not.toBeInTheDocument();
    });

    it("イベントブロックに正しいカラーが適用される", () => {
      renderWithTooltip(
        <EventBlock event={allDayEvent} title={allDayEvent.title} />
      );

      const eventElement = screen.getByTestId("event-block");
      expect(eventElement).toHaveStyle({ backgroundColor: "#10b981" });
    });

    it("テキストカラーは白で読みやすく表示される", () => {
      renderWithTooltip(<EventBlock {...defaultProps} />);

      const eventElement = screen.getByTestId("event-block");
      expect(eventElement).toHaveStyle({ color: "#ffffff" });
    });
  });

  describe("エッジケース", () => {
    it("説明文が設定されている場合もイベント名のみ表示する", () => {
      const eventWithDescription: CalendarEvent = {
        ...mockEvent,
        description: "これはイベントの説明文です",
      };

      renderWithTooltip(
        <EventBlock
          event={eventWithDescription}
          title={eventWithDescription.title}
        />
      );

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

      renderWithTooltip(
        <EventBlock event={eventWithLocation} title={eventWithLocation.title} />
      );

      expect(screen.getByText("テストイベント")).toBeInTheDocument();
      expect(screen.queryByText("東京都渋谷区")).not.toBeInTheDocument();
    });

    it("空のイベント名でもレンダリングされる", () => {
      const emptyTitleEvent: CalendarEvent = {
        ...mockEvent,
        title: "",
      };

      renderWithTooltip(
        <EventBlock event={emptyTitleEvent} title={emptyTitleEvent.title} />
      );

      const eventElement = screen.getByTestId("event-block");
      expect(eventElement).toBeInTheDocument();
    });
  });
});
