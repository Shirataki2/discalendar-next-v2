import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { UpcomingEventsSkeleton } from "./upcoming-events-skeleton";

describe("UpcomingEventsSkeleton", () => {
  it("スケルトン要素が表示される", () => {
    render(<UpcomingEventsSkeleton />);
    const skeletons = screen.getAllByTestId("upcoming-event-skeleton-row");
    expect(skeletons.length).toBeGreaterThanOrEqual(3);
    expect(skeletons.length).toBeLessThanOrEqual(5);
  });

  it("セクションヘッダーのスケルトンが表示される", () => {
    render(<UpcomingEventsSkeleton />);
    expect(
      screen.getByTestId("upcoming-events-skeleton-header")
    ).toBeInTheDocument();
  });

  it("aria-busyが設定される", () => {
    render(<UpcomingEventsSkeleton />);
    const container = screen.getByTestId("upcoming-events-skeleton");
    expect(container).toHaveAttribute("aria-busy", "true");
  });
});
