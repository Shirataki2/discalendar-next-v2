import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Server Actions のモック
vi.mock("@/app/dashboard/actions", () => ({
  updateGuildConfig: vi.fn(),
  fetchGuildChannels: vi.fn(),
  updateNotificationChannel: vi.fn(),
}));

import { fetchGuildChannels } from "@/app/dashboard/actions";
import { GuildSettingsForm } from "./guild-settings-form";

const mockedFetchGuildChannels = vi.mocked(fetchGuildChannels);

describe("GuildSettingsForm", () => {
  const defaultProps = {
    guild: {
      guildId: "123456789",
      name: "テストサーバー",
      avatarUrl: "https://cdn.discordapp.com/icons/123/abc.png",
    },
    restricted: false,
    currentChannelId: null as string | null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // NotificationChannelSelect がマウント時にチャンネル取得するので常にモック
    mockedFetchGuildChannels.mockResolvedValue({
      success: true,
      data: [],
    });
  });

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

    it("通知設定セクションを表示する", () => {
      render(<GuildSettingsForm {...defaultProps} />);

      expect(screen.getByText("通知設定")).toBeInTheDocument();
      expect(
        screen.getByText("イベント通知の送信先チャンネルを設定します。")
      ).toBeInTheDocument();
    });

    it("通知チャンネル選択コンポーネントを表示する", async () => {
      render(<GuildSettingsForm {...defaultProps} />);

      // NotificationChannelSelect がチャンネル取得して表示される
      expect(mockedFetchGuildChannels).toHaveBeenCalledWith("123456789");
    });
  });

  describe("読み取り専用", () => {
    it("ギルド名が編集可能な入力要素ではない", () => {
      render(<GuildSettingsForm {...defaultProps} />);

      const nameElement = screen.getByText("テストサーバー");
      expect(nameElement.tagName).not.toBe("INPUT");
      expect(nameElement.tagName).not.toBe("TEXTAREA");
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

  describe("レスポンシブレイアウト", () => {
    it("デスクトップ向けに max-w-2xl で幅を制限する", () => {
      const { container } = render(<GuildSettingsForm {...defaultProps} />);

      const wrapper = container.firstElementChild;
      expect(wrapper?.className).toContain("max-w-2xl");
    });
  });
});
