/**
 * CalendarToolbar 祝日トグルのテスト
 *
 * Task 6.2: CalendarToolbar のコンポーネントテスト
 * - 祝日トグルクリックで onToggleHolidays が呼ばれることをテストする
 *
 * Requirements: 5.1
 */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { CalendarToolbar } from "@/components/calendar/calendar-toolbar";

const defaultProps = {
  viewMode: "month" as const,
  selectedDate: new Date(2026, 0, 15),
  onViewChange: vi.fn(),
  onNavigate: vi.fn(),
  isMobile: false,
};

describe("CalendarToolbar - 祝日トグル", () => {
  it("onToggleHolidays が渡された場合に祝日トグルボタンを表示する", () => {
    render(
      <CalendarToolbar
        {...defaultProps}
        onToggleHolidays={vi.fn()}
        showHolidays={true}
      />
    );

    expect(
      screen.getByRole("button", { name: "祝日表示" })
    ).toBeInTheDocument();
  });

  it("onToggleHolidays が未指定の場合に祝日トグルボタンを表示しない", () => {
    render(<CalendarToolbar {...defaultProps} />);

    expect(
      screen.queryByRole("button", { name: "祝日表示" })
    ).not.toBeInTheDocument();
  });

  it("祝日トグルクリックで onToggleHolidays が呼ばれる", async () => {
    const user = userEvent.setup();
    const onToggleHolidays = vi.fn();

    render(
      <CalendarToolbar
        {...defaultProps}
        onToggleHolidays={onToggleHolidays}
        showHolidays={true}
      />
    );

    await user.click(screen.getByRole("button", { name: "祝日表示" }));

    expect(onToggleHolidays).toHaveBeenCalledTimes(1);
  });

  it("showHolidays が true のとき aria-pressed が true になる", () => {
    render(
      <CalendarToolbar
        {...defaultProps}
        onToggleHolidays={vi.fn()}
        showHolidays={true}
      />
    );

    const button = screen.getByRole("button", { name: "祝日表示" });
    expect(button).toHaveAttribute("aria-pressed", "true");
  });

  it("showHolidays が false のとき aria-pressed が false になる", () => {
    render(
      <CalendarToolbar
        {...defaultProps}
        onToggleHolidays={vi.fn()}
        showHolidays={false}
      />
    );

    const button = screen.getByRole("button", { name: "祝日表示" });
    expect(button).toHaveAttribute("aria-pressed", "false");
  });
});
