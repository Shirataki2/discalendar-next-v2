/**
 * InvitableGuildCard テストスイート
 *
 * BOT 未参加ギルドのカード表示と招待ボタンのテスト。
 *
 * Requirements: bot-invite-flow 1.3, 2.1, 2.2, 2.3, 2.4
 */
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { InvitableGuild } from "@/lib/guilds/types";
import { InvitableGuildCard } from "./invitable-guild-card";

const mockGuild: InvitableGuild = {
  guildId: "guild-123",
  name: "Test Server",
  avatarUrl: null,
};

const mockGuildWithAvatar: InvitableGuild = {
  guildId: "guild-456",
  name: "Avatar Server",
  avatarUrl: "https://cdn.discordapp.com/icons/456/abc.png",
};

const botInviteUrl =
  "https://discord.com/oauth2/authorize?client_id=12345&permissions=0&scope=bot";

const INVITE_LINK_PATTERN = /招待/i;

describe("InvitableGuildCard", () => {
  describe("表示", () => {
    it("ギルド名が表示される", () => {
      render(
        <InvitableGuildCard botInviteUrl={botInviteUrl} guild={mockGuild} />
      );

      expect(screen.getByText("Test Server")).toBeInTheDocument();
    });

    it("アイコンがない場合はイニシャルが表示される", () => {
      render(
        <InvitableGuildCard botInviteUrl={botInviteUrl} guild={mockGuild} />
      );

      expect(screen.getByText("T")).toBeInTheDocument();
    });

    it("アイコンがある場合は画像が表示される", () => {
      render(
        <InvitableGuildCard
          botInviteUrl={botInviteUrl}
          guild={mockGuildWithAvatar}
        />
      );

      const img = screen.getByRole("img", {
        name: "Avatar Serverのアイコン",
      });
      expect(img).toBeInTheDocument();
    });

    it("BOT 未参加バッジが表示される", () => {
      render(
        <InvitableGuildCard botInviteUrl={botInviteUrl} guild={mockGuild} />
      );

      expect(screen.getByText("BOT 未参加")).toBeInTheDocument();
    });
  });

  describe("招待ボタン", () => {
    it("botInviteUrl が設定されている場合、招待ボタンが表示される", () => {
      render(
        <InvitableGuildCard botInviteUrl={botInviteUrl} guild={mockGuild} />
      );

      expect(
        screen.getByRole("link", { name: INVITE_LINK_PATTERN })
      ).toBeInTheDocument();
    });

    it("botInviteUrl が null の場合、招待ボタンが表示されない", () => {
      render(<InvitableGuildCard botInviteUrl={null} guild={mockGuild} />);

      expect(
        screen.queryByRole("link", { name: INVITE_LINK_PATTERN })
      ).not.toBeInTheDocument();
    });

    it("招待 URL に guild_id パラメータが付加される", () => {
      render(
        <InvitableGuildCard botInviteUrl={botInviteUrl} guild={mockGuild} />
      );

      const link = screen.getByRole("link", { name: INVITE_LINK_PATTERN });
      expect(link).toHaveAttribute(
        "href",
        `${botInviteUrl}&guild_id=guild-123`
      );
    });

    it("招待リンクが新しいタブで開く設定になっている", () => {
      render(
        <InvitableGuildCard botInviteUrl={botInviteUrl} guild={mockGuild} />
      );

      const link = screen.getByRole("link", { name: INVITE_LINK_PATTERN });
      expect(link).toHaveAttribute("target", "_blank");
      expect(link).toHaveAttribute("rel", "noopener noreferrer");
    });
  });

  describe("アクセシビリティ", () => {
    it("カードに data-testid が設定されている", () => {
      render(
        <InvitableGuildCard botInviteUrl={botInviteUrl} guild={mockGuild} />
      );

      expect(screen.getByTestId("invitable-guild-card")).toBeInTheDocument();
    });
  });
});
