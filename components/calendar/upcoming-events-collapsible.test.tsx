import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock useLocalStorage with useState
vi.mock("@/hooks/use-local-storage", () => ({
  useLocalStorage: <T,>(
    _key: string,
    defaultValue: T
  ): [T, (value: T | ((prev: T) => T)) => void] => {
    const [state, setState] = useState<T>(defaultValue);
    return [state, setState];
  },
}));

import { UpcomingEventsCollapsible } from "./upcoming-events-collapsible";

describe("UpcomingEventsCollapsible", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("デフォルトで children を表示する", () => {
    render(
      <UpcomingEventsCollapsible>
        <div data-testid="child-content">予定一覧</div>
      </UpcomingEventsCollapsible>
    );

    expect(screen.getByTestId("child-content")).toBeInTheDocument();
  });

  it("セクションヘッダーに「直近の予定」を表示する", () => {
    render(
      <UpcomingEventsCollapsible>
        <div>content</div>
      </UpcomingEventsCollapsible>
    );

    expect(screen.getByText("直近の予定")).toBeInTheDocument();
  });

  it("トグルボタンが表示される", () => {
    render(
      <UpcomingEventsCollapsible>
        <div>content</div>
      </UpcomingEventsCollapsible>
    );

    const toggle = screen.getByRole("button", {
      name: /直近の予定を非表示/,
    });
    expect(toggle).toBeInTheDocument();
  });

  it("トグルボタンをクリックすると children が非表示になる", async () => {
    const user = userEvent.setup();
    render(
      <UpcomingEventsCollapsible>
        <div data-testid="child-content">予定一覧</div>
      </UpcomingEventsCollapsible>
    );

    const toggle = screen.getByRole("button", {
      name: /直近の予定を非表示/,
    });
    await user.click(toggle);

    expect(screen.queryByTestId("child-content")).not.toBeInTheDocument();
  });

  it("非表示状態でトグルすると再表示される", async () => {
    const user = userEvent.setup();
    render(
      <UpcomingEventsCollapsible>
        <div data-testid="child-content">予定一覧</div>
      </UpcomingEventsCollapsible>
    );

    const hideToggle = screen.getByRole("button", {
      name: /直近の予定を非表示/,
    });
    await user.click(hideToggle);

    expect(screen.queryByTestId("child-content")).not.toBeInTheDocument();

    const showToggle = screen.getByRole("button", {
      name: /直近の予定を表示/,
    });
    await user.click(showToggle);

    expect(screen.getByTestId("child-content")).toBeInTheDocument();
  });

  it("展開時に aria-expanded=true が設定される", () => {
    render(
      <UpcomingEventsCollapsible>
        <div>content</div>
      </UpcomingEventsCollapsible>
    );

    const toggle = screen.getByRole("button", {
      name: /直近の予定を非表示/,
    });
    expect(toggle).toHaveAttribute("aria-expanded", "true");
  });

  it("折りたたみ時に aria-expanded=false が設定される", async () => {
    const user = userEvent.setup();
    render(
      <UpcomingEventsCollapsible>
        <div>content</div>
      </UpcomingEventsCollapsible>
    );

    const toggle = screen.getByRole("button", {
      name: /直近の予定を非表示/,
    });
    await user.click(toggle);

    const collapsedToggle = screen.getByRole("button", {
      name: /直近の予定を表示/,
    });
    expect(collapsedToggle).toHaveAttribute("aria-expanded", "false");
  });
});
