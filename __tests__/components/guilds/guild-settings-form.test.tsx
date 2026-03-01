import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

// Mock next/image
vi.mock("next/image", () => ({
  default: (props: Record<string, unknown>) => {
    // eslint-disable-next-line @next/next/no-img-element
    return <img {...props} />;
  },
}));

// Mock GuildSettingsPanel to isolate GuildSettingsForm tests
vi.mock("@/components/guilds/guild-settings-panel", () => ({
  GuildSettingsPanel: ({
    guildId,
    restricted,
  }: {
    guildId: string;
    restricted: boolean;
  }) => (
    <div data-guild-id={guildId} data-testid="guild-settings-panel">
      restricted: {String(restricted)}
    </div>
  ),
}));

import { GuildSettingsForm } from "@/components/guilds/guild-settings-form";

describe("GuildSettingsForm", () => {
  const defaultProps = {
    guild: {
      guildId: "guild-123",
      name: "Test Server",
      avatarUrl: "https://cdn.discordapp.com/icons/guild-123/abc.png",
    },
    restricted: false,
  };

  describe("Requirement 2.1: ギルド名表示", () => {
    it("should display the guild name", () => {
      render(<GuildSettingsForm {...defaultProps} />);
      expect(screen.getByText("Test Server")).toBeInTheDocument();
    });
  });

  describe("Requirement 2.2: ギルドアイコン表示", () => {
    it("should display guild icon when avatarUrl is provided", () => {
      render(<GuildSettingsForm {...defaultProps} />);
      const img = screen.getByAltText("Test Serverのアイコン");
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute("src", defaultProps.guild.avatarUrl);
    });
  });

  describe("Requirement 2.3: アイコン未設定時のフォールバック", () => {
    it("should display guild initial when avatarUrl is null", () => {
      render(
        <GuildSettingsForm
          {...defaultProps}
          guild={{ ...defaultProps.guild, avatarUrl: null }}
        />
      );
      expect(screen.getByText("T")).toBeInTheDocument();
    });

    it("should display '?' when guild name is empty", () => {
      render(
        <GuildSettingsForm
          {...defaultProps}
          guild={{ ...defaultProps.guild, name: "", avatarUrl: null }}
        />
      );
      expect(screen.getByText("?")).toBeInTheDocument();
    });
  });

  describe("Requirement 2.4: 読み取り専用", () => {
    it("should not have editable inputs for guild name", () => {
      render(<GuildSettingsForm {...defaultProps} />);
      const nameElement = screen.getByText("Test Server");
      expect(nameElement.tagName).not.toBe("INPUT");
      expect(nameElement.tagName).not.toBe("TEXTAREA");
    });
  });

  describe("Requirement 3.1: 権限設定セクション", () => {
    it("should render GuildSettingsPanel with correct props", () => {
      render(<GuildSettingsForm {...defaultProps} />);
      const panel = screen.getByTestId("guild-settings-panel");
      expect(panel).toBeInTheDocument();
      expect(panel).toHaveAttribute("data-guild-id", "guild-123");
    });
  });

  describe("Requirement 4.1: セクション構成", () => {
    it("should render permission settings within a section", () => {
      render(<GuildSettingsForm {...defaultProps} />);
      expect(screen.getByText("権限設定")).toBeInTheDocument();
    });
  });

  describe("Requirement 5.4: カレンダーに戻るリンク", () => {
    it("should render a link back to dashboard with guild parameter", () => {
      render(<GuildSettingsForm {...defaultProps} />);
      const link = screen.getByRole("link", { name: /カレンダーに戻る/ });
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute("href", "/dashboard?guild=guild-123");
    });
  });

  describe("Requirement 6.1/6.2: レスポンシブレイアウト", () => {
    it("should have max-w-2xl for desktop constraint", () => {
      const { container } = render(<GuildSettingsForm {...defaultProps} />);
      const wrapper = container.firstElementChild;
      expect(wrapper?.className).toContain("max-w-2xl");
    });
  });
});
