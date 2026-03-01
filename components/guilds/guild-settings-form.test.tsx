import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

// updateGuildConfig Server Action のモック
vi.mock("@/app/dashboard/actions", () => ({
  updateGuildConfig: vi.fn(),
}));

import { GuildSettingsForm } from "./guild-settings-form";

describe("GuildSettingsForm", () => {
  const defaultProps = {
    guild: {
      guildId: "123456789",
      name: "テストサーバー",
      avatarUrl: "https://cdn.discordapp.com/icons/123/abc.png",
    },
    restricted: false,
  };

  describe("ギルド情報ヘッダー", () => {
    it("ギルド名を表示する", () => {
      render(<GuildSettingsForm {...defaultProps} />);

      expect(
        screen.getByRole("heading", { name: "テストサーバー" })
      ).toBeInTheDocument();
    });

    it("ギルドアイコンを表示する", () => {
      render(<GuildSettingsForm {...defaultProps} />);

      const icon = screen.getByAltText("テストサーバーのアイコン");
      expect(icon).toBeInTheDocument();
    });

    it("アイコンが未設定の場合、ギルド名のイニシャルを表示する", () => {
      render(
        <GuildSettingsForm
          {...defaultProps}
          guild={{ ...defaultProps.guild, avatarUrl: null }}
        />
      );

      expect(screen.queryByRole("img")).not.toBeInTheDocument();
      expect(screen.getByText("テ")).toBeInTheDocument();
    });

    it("空のギルド名の場合、?をフォールバックとして表示する", () => {
      render(
        <GuildSettingsForm
          {...defaultProps}
          guild={{ ...defaultProps.guild, name: "", avatarUrl: null }}
        />
      );

      expect(screen.getByText("?")).toBeInTheDocument();
    });
  });

  describe("セクション構成", () => {
    it("権限設定セクションを表示する", () => {
      render(<GuildSettingsForm {...defaultProps} />);

      expect(screen.getByText("権限設定")).toBeInTheDocument();
      expect(
        screen.getByText("イベント編集の制限を管理します。")
      ).toBeInTheDocument();
    });

    it("restricted トグルを表示する", () => {
      render(<GuildSettingsForm {...defaultProps} />);

      expect(
        screen.getByText("イベント編集を管理者のみに制限")
      ).toBeInTheDocument();
      expect(screen.getByRole("switch")).toBeInTheDocument();
    });
  });

  describe("ナビゲーション", () => {
    it("カレンダーに戻るリンクを表示する", () => {
      render(<GuildSettingsForm {...defaultProps} />);

      const backLink = screen.getByText("カレンダーに戻る");
      expect(backLink).toBeInTheDocument();
      expect(backLink.closest("a")).toHaveAttribute(
        "href",
        "/dashboard?guild=123456789"
      );
    });
  });
});
