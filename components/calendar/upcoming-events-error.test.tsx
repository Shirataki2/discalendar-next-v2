import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: mockRefresh,
  }),
}));

const mockRefresh = vi.fn();

// dynamic import after mock
const { UpcomingEventsError } = await import("./upcoming-events-error");

describe("UpcomingEventsError", () => {
  it("エラーメッセージを表示する", () => {
    render(<UpcomingEventsError />);
    expect(screen.getByText(/予定の取得に失敗/)).toBeInTheDocument();
  });

  it("再読み込みボタンを表示する", () => {
    render(<UpcomingEventsError />);
    expect(
      screen.getByRole("button", { name: /再読み込み/ })
    ).toBeInTheDocument();
  });

  it("再読み込みボタンクリックでrouter.refresh()が呼ばれる", async () => {
    const user = userEvent.setup();
    render(<UpcomingEventsError />);

    const button = screen.getByRole("button", { name: /再読み込み/ });
    await user.click(button);

    expect(mockRefresh).toHaveBeenCalledTimes(1);
  });
});
