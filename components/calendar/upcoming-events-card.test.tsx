import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { UpcomingEventsCard } from "./upcoming-events-card";

describe("UpcomingEventsCard", () => {
  describe("表示", () => {
    it("「直近の予定」テキストが表示される", () => {
      render(<UpcomingEventsCard isSelected={false} onSelect={vi.fn()} />);

      expect(screen.getByText("直近の予定")).toBeInTheDocument();
    });

    it("Calendarアイコンが表示される", () => {
      render(<UpcomingEventsCard isSelected={false} onSelect={vi.fn()} />);

      const card = screen.getByTestId("upcoming-events-card");
      const svg = card.querySelector("svg");
      expect(svg).toBeInTheDocument();
    });
  });

  describe("選択状態", () => {
    it("未選択時にdata-selectedがfalseになる", () => {
      render(<UpcomingEventsCard isSelected={false} onSelect={vi.fn()} />);

      const card = screen.getByTestId("upcoming-events-card");
      expect(card).toHaveAttribute("data-selected", "false");
    });

    it("選択時にdata-selectedがtrueになる", () => {
      render(<UpcomingEventsCard isSelected={true} onSelect={vi.fn()} />);

      const card = screen.getByTestId("upcoming-events-card");
      expect(card).toHaveAttribute("data-selected", "true");
    });
  });

  describe("インタラクション", () => {
    it("クリックでonSelectが呼ばれる", () => {
      const handleSelect = vi.fn();
      render(<UpcomingEventsCard isSelected={false} onSelect={handleSelect} />);

      const card = screen.getByTestId("upcoming-events-card");
      fireEvent.click(card);

      expect(handleSelect).toHaveBeenCalledOnce();
    });

    it("EnterキーでonSelectが呼ばれる", () => {
      const handleSelect = vi.fn();
      render(<UpcomingEventsCard isSelected={false} onSelect={handleSelect} />);

      const card = screen.getByTestId("upcoming-events-card");
      fireEvent.keyDown(card, { key: "Enter" });

      expect(handleSelect).toHaveBeenCalledOnce();
    });

    it("SpaceキーでonSelectが呼ばれる", () => {
      const handleSelect = vi.fn();
      render(<UpcomingEventsCard isSelected={false} onSelect={handleSelect} />);

      const card = screen.getByTestId("upcoming-events-card");
      fireEvent.keyDown(card, { key: " " });

      expect(handleSelect).toHaveBeenCalledOnce();
    });
  });

  describe("アクセシビリティ", () => {
    it("role=buttonが設定されている", () => {
      render(<UpcomingEventsCard isSelected={false} onSelect={vi.fn()} />);

      expect(screen.getByRole("button")).toBeInTheDocument();
    });

    it("tabIndex=0が設定されフォーカス可能", () => {
      render(<UpcomingEventsCard isSelected={false} onSelect={vi.fn()} />);

      const card = screen.getByTestId("upcoming-events-card");
      expect(card).toHaveAttribute("tabIndex", "0");
    });

    it("選択時にaria-pressedがtrueになる", () => {
      render(<UpcomingEventsCard isSelected={true} onSelect={vi.fn()} />);

      const card = screen.getByTestId("upcoming-events-card");
      expect(card).toHaveAttribute("aria-pressed", "true");
    });

    it("未選択時にaria-pressedがfalseになる", () => {
      render(<UpcomingEventsCard isSelected={false} onSelect={vi.fn()} />);

      const card = screen.getByTestId("upcoming-events-card");
      expect(card).toHaveAttribute("aria-pressed", "false");
    });
  });
});
