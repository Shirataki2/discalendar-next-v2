/**
 * GuildIconButton テスト
 *
 * アイコンのみ表示のギルド選択ボタンのテストスイート。
 */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { Guild } from "@/lib/guilds/types";
import { GuildIconButton } from "./guild-icon-button";

describe("GuildIconButton", () => {
  const mockGuildWithAvatar: Guild = {
    id: 1,
    guildId: "123456789",
    name: "テストサーバー",
    avatarUrl: "https://cdn.discordapp.com/icons/123/abc.png",
    locale: "ja",
  };

  const mockGuildWithoutAvatar: Guild = {
    id: 2,
    guildId: "987654321",
    name: "アイコンなしサーバー",
    avatarUrl: null,
    locale: "ja",
  };

  it("アイコン画像が表示されること", () => {
    const onSelect = vi.fn();
    render(
      <GuildIconButton
        guild={mockGuildWithAvatar}
        isSelected={false}
        onSelect={onSelect}
      />
    );

    const image = screen.getByAltText("テストサーバーのアイコン");
    expect(image).toBeInTheDocument();
    const avatarUrl = mockGuildWithAvatar.avatarUrl;
    if (avatarUrl) {
      expect(image).toHaveAttribute(
        "src",
        expect.stringContaining(encodeURIComponent(avatarUrl))
      );
    }
  });

  it("アイコンなしの場合イニシャルが表示されること", () => {
    const onSelect = vi.fn();
    render(
      <GuildIconButton
        guild={mockGuildWithoutAvatar}
        isSelected={false}
        onSelect={onSelect}
      />
    );

    expect(screen.getByText("ア")).toBeInTheDocument();
  });

  it("クリックで onSelect が呼ばれること", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(
      <GuildIconButton
        guild={mockGuildWithAvatar}
        isSelected={false}
        onSelect={onSelect}
      />
    );

    const button = screen.getByRole("button", { name: "テストサーバー" });
    await user.click(button);

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith("123456789");
  });

  it("選択状態で ring スタイルが適用されること", () => {
    const onSelect = vi.fn();
    render(
      <GuildIconButton
        guild={mockGuildWithAvatar}
        isSelected={true}
        onSelect={onSelect}
      />
    );

    const button = screen.getByRole("button");
    expect(button).toHaveAttribute("aria-pressed", "true");
    expect(button).toHaveAttribute("data-selected", "true");
  });

  it("未選択状態で aria-pressed が false になること", () => {
    const onSelect = vi.fn();
    render(
      <GuildIconButton
        guild={mockGuildWithAvatar}
        isSelected={false}
        onSelect={onSelect}
      />
    );

    const button = screen.getByRole("button");
    expect(button).toHaveAttribute("aria-pressed", "false");
    expect(button).toHaveAttribute("data-selected", "false");
  });

  it("title 属性にギルド名が設定されること", () => {
    const onSelect = vi.fn();
    render(
      <GuildIconButton
        guild={mockGuildWithAvatar}
        isSelected={false}
        onSelect={onSelect}
      />
    );

    const button = screen.getByRole("button");
    expect(button).toHaveAttribute("title", "テストサーバー");
  });
});
