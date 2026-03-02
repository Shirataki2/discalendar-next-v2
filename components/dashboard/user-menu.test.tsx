import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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

// Mock signOut server action
const mockSignOut = vi.fn();
vi.mock("@/app/auth/actions", () => ({
  signOut: () => mockSignOut(),
}));

import type { DashboardUser } from "@/types/user";
import { UserMenu } from "./user-menu";

const TRIGGER_PATTERN = /ユーザーメニュー/i;
const AVATAR_PATTERN = /アバター/i;
const PROFILE_PATTERN = /プロフィール/i;
const SETTINGS_PATTERN = /設定/i;
const LOGOUT_PATTERN = /ログアウト/i;

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

describe("UserMenu", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("should render avatar trigger button", () => {
    render(<UserMenu user={mockUserWithAvatar} />);

    const trigger = screen.getByRole("button", { name: TRIGGER_PATTERN });
    expect(trigger).toBeInTheDocument();
  });

  it("should display avatar image when avatarUrl is provided", () => {
    render(<UserMenu user={mockUserWithAvatar} />);

    const avatar = screen.getByRole("img", { name: AVATAR_PATTERN });
    expect(avatar).toBeInTheDocument();
    expect(avatar).toHaveAttribute(
      "src",
      "https://cdn.discordapp.com/avatars/123/abc.png"
    );
  });

  it("should display initials when avatarUrl is null", () => {
    render(<UserMenu user={mockUserWithoutAvatar} />);

    expect(screen.getByText("N")).toBeInTheDocument();
  });

  it("should display user name next to avatar", () => {
    render(<UserMenu user={mockUserWithAvatar} />);

    expect(screen.getByText("Test User")).toBeInTheDocument();
  });

  it("should display email when fullName is null", () => {
    render(<UserMenu user={mockUserWithoutFullName} />);

    expect(screen.getByText("nofullname@example.com")).toBeInTheDocument();
  });

  it("should open dropdown menu when trigger is clicked", async () => {
    const user = userEvent.setup();
    render(<UserMenu user={mockUserWithAvatar} />);

    const trigger = screen.getByRole("button", { name: TRIGGER_PATTERN });
    await user.click(trigger);

    expect(
      screen.getByRole("menuitem", { name: PROFILE_PATTERN })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("menuitem", { name: SETTINGS_PATTERN })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("menuitem", { name: LOGOUT_PATTERN })
    ).toBeInTheDocument();
  });

  it("should have profile link pointing to /dashboard/user", async () => {
    const user = userEvent.setup();
    render(<UserMenu user={mockUserWithAvatar} />);

    await user.click(screen.getByRole("button", { name: TRIGGER_PATTERN }));

    const profileLink = screen.getByRole("menuitem", {
      name: PROFILE_PATTERN,
    });
    expect(profileLink.closest("a")).toHaveAttribute("href", "/dashboard/user");
  });

  it("should have settings link pointing to /dashboard/user/settings", async () => {
    const user = userEvent.setup();
    render(<UserMenu user={mockUserWithAvatar} />);

    await user.click(screen.getByRole("button", { name: TRIGGER_PATTERN }));

    const settingsLink = screen.getByRole("menuitem", {
      name: SETTINGS_PATTERN,
    });
    expect(settingsLink.closest("a")).toHaveAttribute(
      "href",
      "/dashboard/user/settings"
    );
  });

  it("should call signOut when logout is clicked", async () => {
    const user = userEvent.setup();
    render(<UserMenu user={mockUserWithAvatar} />);

    await user.click(screen.getByRole("button", { name: TRIGGER_PATTERN }));
    await user.click(screen.getByRole("menuitem", { name: LOGOUT_PATTERN }));

    expect(mockSignOut).toHaveBeenCalledTimes(1);
  });
});
