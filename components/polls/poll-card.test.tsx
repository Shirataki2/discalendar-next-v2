import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PollCard } from "./poll-card";

const basePoll = {
  id: "poll-1",
  guild_id: "123456789012345678",
  title: "次回ミートアップ",
  description: "候補日時を投票で決める",
  status: "open" as const,
  channel_id: "c1",
  message_id: null,
  created_by: "u1",
  finalized_by: null,
  finalized_option_id: null,
  finalized_event_id: null,
  created_at: "2026-04-18T00:00:00Z",
  updated_at: "2026-04-18T00:00:00Z",
};

describe("PollCard", () => {
  it("status ごとに適切なバッジを表示する", () => {
    const { rerender } = render(<PollCard poll={basePoll} />);
    expect(screen.getByText("受付中")).toBeInTheDocument();

    rerender(<PollCard poll={{ ...basePoll, status: "closed" }} />);
    expect(screen.getByText("締切済")).toBeInTheDocument();

    rerender(<PollCard poll={{ ...basePoll, status: "finalized" }} />);
    expect(screen.getByText("確定済")).toBeInTheDocument();
  });

  it("詳細ページへの href を持つ", () => {
    render(<PollCard poll={basePoll} />);
    const link = screen.getByRole("link", {
      name: /詳細ページへ/,
    });
    expect(link).toHaveAttribute("href", "/dashboard/polls/poll-1");
  });
});
