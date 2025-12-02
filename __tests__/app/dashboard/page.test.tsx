import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Top-level regex patterns for test matching
const AVATAR_PATTERN = /アバター/i;
const WELCOME_HEADING_PATTERN = /ようこそ.*さん/i;

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

// Mock LogoutButton component
vi.mock("@/components/auth/logout-button", () => ({
  LogoutButton: () => (
    <button data-testid="logout-button" type="button">
      Logout
    </button>
  ),
}));

// Mock Supabase server client
const mockGetUser = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() =>
    Promise.resolve({
      auth: {
        getUser: mockGetUser,
      },
    })
  ),
}));

describe("DashboardPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  describe("Task 7: ダッシュボードページ基本表示", () => {
    it("should render dashboard heading (Requirement 4.2)", async () => {
      // Mock authenticated user
      mockGetUser.mockResolvedValueOnce({
        data: {
          user: {
            id: "user-123",
            email: "test@example.com",
            user_metadata: {
              full_name: "Test User",
              avatar_url: "https://cdn.discordapp.com/avatars/123/abc.png",
            },
          },
        },
        error: null,
      });

      const { DashboardPageClient } = await import("@/app/dashboard/page");
      render(
        <DashboardPageClient
          user={{
            id: "user-123",
            email: "test@example.com",
            fullName: "Test User",
            avatarUrl: "https://cdn.discordapp.com/avatars/123/abc.png",
          }}
        />
      );

      const heading = screen.getByRole("heading", { level: 1 });
      expect(heading).toBeInTheDocument();
    });

    it("should render logout button (Requirement 6.1)", async () => {
      const { DashboardPageClient } = await import("@/app/dashboard/page");
      render(
        <DashboardPageClient
          user={{
            id: "user-123",
            email: "test@example.com",
            fullName: "Test User",
            avatarUrl: null,
          }}
        />
      );

      expect(screen.getByTestId("logout-button")).toBeInTheDocument();
    });

    it("should have main landmark for accessibility", async () => {
      const { DashboardPageClient } = await import("@/app/dashboard/page");
      render(
        <DashboardPageClient
          user={{
            id: "user-123",
            email: "test@example.com",
            fullName: "Test User",
            avatarUrl: null,
          }}
        />
      );

      expect(screen.getByRole("main")).toBeInTheDocument();
    });
  });

  describe("Task 7: ユーザー情報表示 (Requirement 4.2)", () => {
    it("should display user name when available", async () => {
      const { DashboardPageClient } = await import("@/app/dashboard/page");
      render(
        <DashboardPageClient
          user={{
            id: "user-123",
            email: "test@example.com",
            fullName: "Test User",
            avatarUrl: null,
          }}
        />
      );

      expect(screen.getByText("Test User")).toBeInTheDocument();
    });

    it("should display user email when name is not available", async () => {
      const { DashboardPageClient } = await import("@/app/dashboard/page");
      render(
        <DashboardPageClient
          user={{
            id: "user-123",
            email: "test@example.com",
            fullName: null,
            avatarUrl: null,
          }}
        />
      );

      expect(screen.getByText("test@example.com")).toBeInTheDocument();
    });

    it("should display user avatar when available", async () => {
      const { DashboardPageClient } = await import("@/app/dashboard/page");
      render(
        <DashboardPageClient
          user={{
            id: "user-123",
            email: "test@example.com",
            fullName: "Test User",
            avatarUrl: "https://cdn.discordapp.com/avatars/123/abc.png",
          }}
        />
      );

      const avatar = screen.getByRole("img", { name: AVATAR_PATTERN });
      expect(avatar).toBeInTheDocument();
      expect(avatar).toHaveAttribute(
        "src",
        expect.stringContaining("cdn.discordapp.com")
      );
    });

    it("should display fallback avatar when avatar URL is not available", async () => {
      const { DashboardPageClient } = await import("@/app/dashboard/page");
      render(
        <DashboardPageClient
          user={{
            id: "user-123",
            email: "test@example.com",
            fullName: "Test User",
            avatarUrl: null,
          }}
        />
      );

      // Should show user initials or default avatar
      const avatarFallback = screen.getByText("T");
      expect(avatarFallback).toBeInTheDocument();
    });
  });

  describe("Task 7: ダッシュボードレイアウト", () => {
    it("should render welcome message with user name", async () => {
      const { DashboardPageClient } = await import("@/app/dashboard/page");
      render(
        <DashboardPageClient
          user={{
            id: "user-123",
            email: "test@example.com",
            fullName: "Test User",
            avatarUrl: null,
          }}
        />
      );

      // Check for welcome message in h2 heading
      const welcomeHeading = screen.getByRole("heading", { level: 2 });
      expect(welcomeHeading).toHaveTextContent(WELCOME_HEADING_PATTERN);
    });

    it("should have proper structure with header section", async () => {
      const { DashboardPageClient } = await import("@/app/dashboard/page");
      const { container } = render(
        <DashboardPageClient
          user={{
            id: "user-123",
            email: "test@example.com",
            fullName: "Test User",
            avatarUrl: null,
          }}
        />
      );

      // Check for header element or equivalent
      const header = container.querySelector("header");
      expect(header).toBeInTheDocument();
    });
  });

  describe("Task 7: アクセシビリティ", () => {
    it("should have accessible navigation region", async () => {
      const { DashboardPageClient } = await import("@/app/dashboard/page");
      render(
        <DashboardPageClient
          user={{
            id: "user-123",
            email: "test@example.com",
            fullName: "Test User",
            avatarUrl: null,
          }}
        />
      );

      // Check for navigation or banner landmark
      const header = screen.getByRole("banner");
      expect(header).toBeInTheDocument();
    });

    it("should have alt text for user avatar image", async () => {
      const { DashboardPageClient } = await import("@/app/dashboard/page");
      render(
        <DashboardPageClient
          user={{
            id: "user-123",
            email: "test@example.com",
            fullName: "Test User",
            avatarUrl: "https://cdn.discordapp.com/avatars/123/abc.png",
          }}
        />
      );

      const avatar = screen.getByRole("img");
      expect(avatar).toHaveAttribute("alt");
    });
  });
});
