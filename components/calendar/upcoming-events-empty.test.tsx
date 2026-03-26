import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { UpcomingEventsEmpty } from "./upcoming-events-empty";

describe("UpcomingEventsEmpty", () => {
  describe("no-events variant", () => {
    it("予定なしメッセージを表示する", () => {
      render(<UpcomingEventsEmpty variant="no-events" />);
      expect(screen.getByText(/直近の予定はありません/)).toBeInTheDocument();
    });

    it("カレンダーアイコンが表示される", () => {
      render(<UpcomingEventsEmpty variant="no-events" />);
      expect(screen.getByTestId("empty-calendar-icon")).toBeInTheDocument();
    });
  });

  describe("no-guilds variant", () => {
    it("Bot招待案内メッセージを表示する", () => {
      render(<UpcomingEventsEmpty variant="no-guilds" />);
      expect(screen.getByText(/Bot.*参加/)).toBeInTheDocument();
    });

    it("Bot招待への導線が表示される", () => {
      render(<UpcomingEventsEmpty variant="no-guilds" />);
      expect(screen.getByTestId("empty-guilds-icon")).toBeInTheDocument();
    });
  });
});
