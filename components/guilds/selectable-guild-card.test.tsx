/**
 * SelectableGuildCard テストスイート
 *
 * Task 10.1: ダッシュボードページへのカレンダー統合
 * - ギルドカードをクリックしてカレンダーのギルドを選択する
 * - 選択中のギルドを視覚的にハイライトする
 *
 * Requirements: 5.2 (ギルド選択連携)
 */
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { Guild } from "@/lib/guilds/types";
import { SelectableGuildCard } from "./selectable-guild-card";

const mockGuild: Guild = {
  id: 1,
  guildId: "guild-123",
  name: "Test Server",
  avatarUrl: null,
  locale: "ja",
};

const mockGuildWithAvatar: Guild = {
  id: 2,
  guildId: "guild-456",
  name: "Avatar Server",
  avatarUrl: "https://cdn.discordapp.com/icons/456/abc.png",
  locale: "ja",
};

describe("SelectableGuildCard", () => {
  describe("表示", () => {
    it("ギルド名が表示される", () => {
      render(
        <SelectableGuildCard
          guild={mockGuild}
          isSelected={false}
          onSelect={vi.fn()}
        />
      );

      expect(screen.getByText("Test Server")).toBeInTheDocument();
    });

    it("アイコンがない場合はイニシャルが表示される", () => {
      render(
        <SelectableGuildCard
          guild={mockGuild}
          isSelected={false}
          onSelect={vi.fn()}
        />
      );

      expect(screen.getByText("T")).toBeInTheDocument();
    });

    it("アイコンがある場合は画像が表示される", () => {
      render(
        <SelectableGuildCard
          guild={mockGuildWithAvatar}
          isSelected={false}
          onSelect={vi.fn()}
        />
      );

      const img = screen.getByRole("img", { name: "Avatar Serverのアイコン" });
      expect(img).toBeInTheDocument();
    });
  });

  describe("選択状態", () => {
    it("選択されていない場合、data-selected属性がfalseになる", () => {
      render(
        <SelectableGuildCard
          guild={mockGuild}
          isSelected={false}
          onSelect={vi.fn()}
        />
      );

      const card = screen.getByTestId("guild-card");
      expect(card).toHaveAttribute("data-selected", "false");
    });

    it("選択されている場合、data-selected属性がtrueになる", () => {
      render(
        <SelectableGuildCard
          guild={mockGuild}
          isSelected={true}
          onSelect={vi.fn()}
        />
      );

      const card = screen.getByTestId("guild-card");
      expect(card).toHaveAttribute("data-selected", "true");
    });

    it("選択されている場合、aria-pressedがtrueになる", () => {
      render(
        <SelectableGuildCard
          guild={mockGuild}
          isSelected={true}
          onSelect={vi.fn()}
        />
      );

      const card = screen.getByTestId("guild-card");
      expect(card).toHaveAttribute("aria-pressed", "true");
    });
  });

  describe("インタラクション", () => {
    it("クリックするとonSelectが呼ばれる", () => {
      const handleSelect = vi.fn();
      render(
        <SelectableGuildCard
          guild={mockGuild}
          isSelected={false}
          onSelect={handleSelect}
        />
      );

      const card = screen.getByTestId("guild-card");
      fireEvent.click(card);

      expect(handleSelect).toHaveBeenCalledWith("guild-123");
    });

    it("Enterキーを押すとonSelectが呼ばれる", () => {
      const handleSelect = vi.fn();
      render(
        <SelectableGuildCard
          guild={mockGuild}
          isSelected={false}
          onSelect={handleSelect}
        />
      );

      const card = screen.getByTestId("guild-card");
      fireEvent.keyDown(card, { key: "Enter" });

      expect(handleSelect).toHaveBeenCalledWith("guild-123");
    });

    it("スペースキーを押すとonSelectが呼ばれる", () => {
      const handleSelect = vi.fn();
      render(
        <SelectableGuildCard
          guild={mockGuild}
          isSelected={false}
          onSelect={handleSelect}
        />
      );

      const card = screen.getByTestId("guild-card");
      fireEvent.keyDown(card, { key: " " });

      expect(handleSelect).toHaveBeenCalledWith("guild-123");
    });
  });

  describe("アクセシビリティ", () => {
    it("role=buttonが設定されている", () => {
      render(
        <SelectableGuildCard
          guild={mockGuild}
          isSelected={false}
          onSelect={vi.fn()}
        />
      );

      expect(screen.getByRole("button")).toBeInTheDocument();
    });

    it("tabIndex=0が設定されフォーカス可能", () => {
      render(
        <SelectableGuildCard
          guild={mockGuild}
          isSelected={false}
          onSelect={vi.fn()}
        />
      );

      const card = screen.getByTestId("guild-card");
      expect(card).toHaveAttribute("tabIndex", "0");
    });
  });
});
