import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { UpcomingEventsPanel } from "./upcoming-events-panel";

describe("UpcomingEventsPanel", () => {
  it("children が正常にレンダリングされる", () => {
    render(
      <UpcomingEventsPanel>
        <p>テスト予定</p>
      </UpcomingEventsPanel>
    );

    expect(screen.getByText("テスト予定")).toBeInTheDocument();
  });

  it('aria-label が "直近の予定" である', () => {
    render(
      <UpcomingEventsPanel>
        <p>内容</p>
      </UpcomingEventsPanel>
    );

    expect(screen.getByLabelText("直近の予定")).toBeInTheDocument();
  });

  it('data-testid が "upcoming-events-panel" である', () => {
    render(
      <UpcomingEventsPanel>
        <p>内容</p>
      </UpcomingEventsPanel>
    );

    expect(screen.getByTestId("upcoming-events-panel")).toBeInTheDocument();
  });

  it("タイトル「直近の予定」が表示される", () => {
    render(
      <UpcomingEventsPanel>
        <p>内容</p>
      </UpcomingEventsPanel>
    );

    const heading = screen.getByRole("heading", { level: 2 });
    expect(heading).toHaveTextContent("直近の予定");
  });
});
