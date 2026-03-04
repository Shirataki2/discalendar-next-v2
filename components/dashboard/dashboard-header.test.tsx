import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

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

// Mock UserMenu component
vi.mock("@/components/dashboard/user-menu", () => ({
  UserMenu: ({ user }: { user: { fullName: string | null } }) => (
    <div data-testid="user-menu">UserMenu: {user.fullName}</div>
  ),
}));

// Mock ThemeSwitcher component
vi.mock("@/components/theme-switcher", () => ({
  ThemeSwitcher: () => (
    <button data-testid="theme-switcher" type="button">
      テーマ切替
    </button>
  ),
}));

import type { DashboardUser } from "@/types/user";
import { DashboardHeader } from "./dashboard-header";

const LOGO_PATTERN = /discalendar/i;

const mockUserWithAvatar: DashboardUser = {
  id: "user-1",
  email: "test@example.com",
  fullName: "Test User",
  avatarUrl: "https://cdn.discordapp.com/avatars/123/abc.png",
};

describe("DashboardHeader", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render logo link to home", () => {
    render(<DashboardHeader user={mockUserWithAvatar} />);

    const logoLink = screen.getByRole("link", { name: LOGO_PATTERN });
    expect(logoLink).toHaveAttribute("href", "/");
  });

  it("should render ThemeSwitcher", () => {
    render(<DashboardHeader user={mockUserWithAvatar} />);

    expect(screen.getByTestId("theme-switcher")).toBeInTheDocument();
  });

  it("should render UserMenu component", () => {
    render(<DashboardHeader user={mockUserWithAvatar} />);

    expect(screen.getByTestId("user-menu")).toBeInTheDocument();
  });

  it("should pass user prop to UserMenu", () => {
    render(<DashboardHeader user={mockUserWithAvatar} />);

    expect(screen.getByTestId("user-menu")).toHaveTextContent("Test User");
  });

  it("should not render standalone LogoutButton", () => {
    render(<DashboardHeader user={mockUserWithAvatar} />);

    expect(screen.queryByTestId("logout-button")).not.toBeInTheDocument();
  });

  it("should not render direct avatar link to profile", () => {
    render(<DashboardHeader user={mockUserWithAvatar} />);

    // ロゴリンクのみが存在し、プロフィールへの直接リンクは存在しない
    const links = screen.getAllByRole("link");
    const profileLinks = links.filter(
      (link) => link.getAttribute("href") === "/dashboard/user"
    );
    expect(profileLinks).toHaveLength(0);
  });
});
