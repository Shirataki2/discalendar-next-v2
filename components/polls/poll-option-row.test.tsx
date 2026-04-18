import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PollOptionRow } from "./poll-option-row";

const option = {
  id: "opt-1",
  poll_id: "poll-1",
  starts_at: "2026-04-20T03:00:00Z",
  ends_at: "2026-04-20T04:00:00Z",
  position: 0,
  created_at: "2026-04-18T00:00:00Z",
};

describe("PollOptionRow", () => {
  it("counts を ○/△/× 形式で表示する", () => {
    render(
      <PollOptionRow
        aggregate={{
          optionId: "opt-1",
          counts: { yes: 3, maybe: 1, no: 2 },
          yesVoters: ["u1"],
        }}
        option={option}
      />
    );
    expect(screen.getByText("○ 3")).toBeInTheDocument();
    expect(screen.getByText("△ 1")).toBeInTheDocument();
    expect(screen.getByText("× 2")).toBeInTheDocument();
  });

  it("yes が 20 名超の場合は 他 N 名を表示する", () => {
    const voters = Array.from({ length: 23 }, (_, idx) => `u${idx + 1}`);
    render(
      <PollOptionRow
        aggregate={{
          optionId: "opt-1",
          counts: { yes: 23, maybe: 0, no: 0 },
          yesVoters: voters,
        }}
        option={option}
      />
    );
    expect(screen.getByText("他 3 名")).toBeInTheDocument();
  });

  it("isWinner のとき Badge と強調を表示する", () => {
    render(
      <PollOptionRow
        aggregate={{
          optionId: "opt-1",
          counts: { yes: 1, maybe: 0, no: 0 },
          yesVoters: [],
        }}
        isWinner
        option={option}
      />
    );
    expect(screen.getByText("確定")).toBeInTheDocument();
  });

  it("onSelect が与えられたときはボタンとして振る舞う", () => {
    const onSelect = vi.fn();
    render(
      <PollOptionRow
        aggregate={undefined}
        onSelect={onSelect}
        option={option}
      />
    );
    const button = screen.getByRole("button", { name: "候補 1 を選択" });
    button.click();
    expect(onSelect).toHaveBeenCalledWith("opt-1");
  });
});
