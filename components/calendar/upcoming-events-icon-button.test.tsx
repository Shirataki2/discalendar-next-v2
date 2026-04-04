/**
 * UpcomingEventsIconButton テスト
 *
 * サイドバー折りたたみ時の「直近の予定」アイコンボタンのテストスイート。
 */
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { UpcomingEventsIconButton } from "./upcoming-events-icon-button";

describe("UpcomingEventsIconButton", () => {
  it("Calendar アイコンが表示されること", () => {
    render(<UpcomingEventsIconButton isSelected={false} onSelect={vi.fn()} />);

    const button = screen.getByTestId("upcoming-events-icon-button");
    expect(button.querySelector("svg")).toBeInTheDocument();
  });

  it('aria-label が "直近の予定" であること', () => {
    render(<UpcomingEventsIconButton isSelected={false} onSelect={vi.fn()} />);

    const button = screen.getByRole("button", { name: "直近の予定" });
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute("aria-label", "直近の予定");
  });

  it("未選択時に data-selected が false であること", () => {
    render(<UpcomingEventsIconButton isSelected={false} onSelect={vi.fn()} />);

    const button = screen.getByRole("button", { name: "直近の予定" });
    expect(button).toHaveAttribute("data-selected", "false");
    expect(button).toHaveAttribute("aria-pressed", "false");
  });

  it("選択時に data-selected が true かつ ring スタイルが適用されること", () => {
    render(<UpcomingEventsIconButton isSelected={true} onSelect={vi.fn()} />);

    const button = screen.getByRole("button", { name: "直近の予定" });
    expect(button).toHaveAttribute("data-selected", "true");
    expect(button).toHaveAttribute("aria-pressed", "true");
    expect(button.className).toContain("ring-2");
    expect(button.className).toContain("ring-primary");
    expect(button.className).toContain("ring-offset-2");
  });

  it("クリックで onSelect が呼ばれること", () => {
    const onSelect = vi.fn();
    render(<UpcomingEventsIconButton isSelected={false} onSelect={onSelect} />);

    const button = screen.getByRole("button", { name: "直近の予定" });
    fireEvent.click(button);

    expect(onSelect).toHaveBeenCalledTimes(1);
  });
});
