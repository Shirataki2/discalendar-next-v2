import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock Next.js Image component
vi.mock("next/image", () => ({
  default: ({
    src,
    alt,
    width,
    height,
    ...props
  }: {
    src: string;
    alt: string;
    width?: number;
    height?: number;
    [key: string]: unknown;
  }) => (
    // biome-ignore lint/performance/noImgElement: Mock component for testing
    <img alt={alt} height={height} src={src} width={width} {...props} />
  ),
}));

// Mock Next.js Link component
vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: React.ReactNode;
    [key: string]: unknown;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

// Mock LogoutButton component
vi.mock("@/components/auth/logout-button", () => ({
  LogoutButton: ({ variant }: { variant?: string }) => (
    <button data-testid="logout-button" data-variant={variant} type="button">
      ログアウト
    </button>
  ),
}));

import type { DashboardUser } from "@/app/dashboard/page";
import { UserProfilePageLayout } from "@/app/dashboard/user/page";
import type { Guild } from "@/lib/guilds/types";

const mockUser: DashboardUser = {
  id: "user-123",
  email: "test@example.com",
  fullName: "Test User",
  avatarUrl: "https://cdn.discordapp.com/avatars/123/abc.png",
};

const mockGuilds: Guild[] = [
  {
    id: 1,
    guildId: "123456789012345678",
    name: "Test Server 1",
    avatarUrl: "https://cdn.discordapp.com/icons/123/abc.png",
    locale: "ja",
  },
  {
    id: 2,
    guildId: "987654321098765432",
    name: "Test Server 2",
    avatarUrl: null,
    locale: "ja",
  },
];

describe("UserProfilePageLayout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  describe("ページ構造とレイアウト (Req 1.1, 5.1, 5.2)", () => {
    it("should render page heading", () => {
      render(<UserProfilePageLayout guilds={mockGuilds} user={mockUser} />);

      const heading = screen.getByRole("heading", { name: /ユーザーページ/i });
      expect(heading).toBeInTheDocument();
    });

    it("should render main content area", () => {
      render(<UserProfilePageLayout guilds={mockGuilds} user={mockUser} />);

      expect(screen.getByRole("main")).toBeInTheDocument();
    });

    it("should render back link to dashboard", () => {
      render(<UserProfilePageLayout guilds={mockGuilds} user={mockUser} />);

      const backLink = screen.getByRole("link", { name: /ダッシュボード/i });
      expect(backLink).toBeInTheDocument();
      expect(backLink).toHaveAttribute("href", "/dashboard");
    });
  });

  describe("プロフィール表示 (Req 2.1-2.4)", () => {
    it("should render UserProfileCard with user data", () => {
      render(<UserProfilePageLayout guilds={mockGuilds} user={mockUser} />);

      const main = screen.getByRole("main");
      expect(main).toHaveTextContent("プロフィール");
      expect(main).toHaveTextContent("Test User");
      expect(main).toHaveTextContent("test@example.com");
    });

    it("should display avatar image", () => {
      render(<UserProfilePageLayout guilds={mockGuilds} user={mockUser} />);

      // ヘッダーとプロフィールの両方にアバターがあるため、複数存在を確認
      const avatars = screen.getAllByRole("img", { name: /アバター/i });
      expect(avatars.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("参加ギルド一覧 (Req 3.1-3.3)", () => {
    it("should render UserGuildList with guilds", () => {
      render(<UserProfilePageLayout guilds={mockGuilds} user={mockUser} />);

      expect(screen.getByText("参加ギルド")).toBeInTheDocument();
      expect(screen.getByText("Test Server 1")).toBeInTheDocument();
      expect(screen.getByText("Test Server 2")).toBeInTheDocument();
    });

    it("should display empty message when no guilds", () => {
      render(<UserProfilePageLayout guilds={[]} user={mockUser} />);

      expect(
        screen.getByText("参加しているギルドがありません")
      ).toBeInTheDocument();
    });

    it("should render guild links with correct href", () => {
      render(<UserProfilePageLayout guilds={mockGuilds} user={mockUser} />);

      const link = screen.getByRole("link", { name: /Test Server 1/ });
      expect(link).toHaveAttribute(
        "href",
        "/dashboard?guild=123456789012345678"
      );
    });
  });

  describe("ログアウト (Req 4.1-4.3)", () => {
    it("should render LogoutButton", () => {
      render(<UserProfilePageLayout guilds={mockGuilds} user={mockUser} />);

      expect(screen.getByTestId("logout-button")).toBeInTheDocument();
    });
  });

  describe("ギルド取得エラー時のフォールバック", () => {
    it("should display profile even when guildError is provided", () => {
      render(
        <UserProfilePageLayout
          guildError="ギルド情報の取得に失敗しました"
          guilds={[]}
          user={mockUser}
        />
      );

      // プロフィールは表示される
      const main = screen.getByRole("main");
      expect(main).toHaveTextContent("プロフィール");
      expect(main).toHaveTextContent("Test User");
    });

    it("should display error message in guild section when guildError is provided", () => {
      render(
        <UserProfilePageLayout
          guildError="ギルド情報の取得に失敗しました"
          guilds={[]}
          user={mockUser}
        />
      );

      expect(
        screen.getByText("ギルド情報の取得に失敗しました")
      ).toBeInTheDocument();
    });
  });
});
