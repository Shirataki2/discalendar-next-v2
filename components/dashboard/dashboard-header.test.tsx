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
  LogoutButton: () => (
    <button data-testid="logout-button" type="button">
      ログアウト
    </button>
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

import type { DashboardUser } from "@/app/dashboard/page";
import { DashboardHeader } from "./dashboard-header";

const LOGO_PATTERN = /discalendar/i;
const USER_NAME_PATTERN = /test user/i;
const AVATAR_PATTERN = /アバター/i;

const mockUserWithAvatar: DashboardUser = {
  id: "user-1",
  email: "test@example.com",
  fullName: "Test User",
  avatarUrl: "https://cdn.discordapp.com/avatars/123/abc.png",
};

const mockUserWithoutAvatar: DashboardUser = {
  id: "user-2",
  email: "noavatar@example.com",
  fullName: "No Avatar",
  avatarUrl: null,
};

const mockUserWithoutFullName: DashboardUser = {
  id: "user-3",
  email: "nofullname@example.com",
  fullName: null,
  avatarUrl: null,
};

describe("DashboardHeader", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("should render logo link to home", () => {
    render(<DashboardHeader user={mockUserWithAvatar} />);

    const logoLink = screen.getByRole("link", { name: LOGO_PATTERN });
    expect(logoLink).toHaveAttribute("href", "/");
  });

  it("should render user link to profile page", () => {
    render(<DashboardHeader user={mockUserWithAvatar} />);

    const userLink = screen.getByRole("link", { name: USER_NAME_PATTERN });
    expect(userLink).toHaveAttribute("href", "/dashboard/user");
  });

  it("should display avatar image when avatarUrl is provided", () => {
    render(<DashboardHeader user={mockUserWithAvatar} />);

    const avatar = screen.getByRole("img", { name: AVATAR_PATTERN });
    expect(avatar).toBeInTheDocument();
    expect(avatar).toHaveAttribute(
      "src",
      "https://cdn.discordapp.com/avatars/123/abc.png"
    );
  });

  it("should display initials when avatarUrl is null", () => {
    render(<DashboardHeader user={mockUserWithoutAvatar} />);

    expect(screen.queryByRole("img", { name: AVATAR_PATTERN })).toBeNull();
    expect(screen.getByText("N")).toBeInTheDocument();
  });

  it("should display email when fullName is null", () => {
    render(<DashboardHeader user={mockUserWithoutFullName} />);

    expect(screen.getByText("nofullname@example.com")).toBeInTheDocument();
  });

  it("should render ThemeSwitcher", () => {
    render(<DashboardHeader user={mockUserWithAvatar} />);

    expect(screen.getByTestId("theme-switcher")).toBeInTheDocument();
  });

  it("should render LogoutButton", () => {
    render(<DashboardHeader user={mockUserWithAvatar} />);

    expect(screen.getByTestId("logout-button")).toBeInTheDocument();
  });
});
