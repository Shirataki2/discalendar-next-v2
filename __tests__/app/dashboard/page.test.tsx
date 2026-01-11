import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Top-level regex patterns for test matching
const AVATAR_PATTERN = /アバター/i;
const WELCOME_HEADING_PATTERN = /ようこそ.*さん/i;
const SERVER_SECTION_PATTERN = /サーバー一覧/i;
const NO_SERVERS_PATTERN = /利用可能なサーバーがありません/;
const SESSION_EXPIRED_PATTERN = /セッションの有効期限が切れました/;
const DISCORD_DISABLED_PATTERN = /Discord連携が無効です/;
const API_ERROR_PATTERN = /APIエラーが発生しました/;

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

// Mock CalendarContainer component (for DashboardWithCalendar)
vi.mock("@/components/calendar/calendar-container", () => ({
  CalendarContainer: ({ guildId }: { guildId: string | null }) => (
    <div data-guild-id={guildId ?? "null"} data-testid="calendar-container">
      Calendar for guild: {guildId ?? "none"}
    </div>
  ),
}));

// Mock Next.js navigation for DashboardWithCalendar
vi.mock("next/navigation", () => ({
  useSearchParams: () => {
    const params = new URLSearchParams();
    params.set("view", "month");
    params.set("date", "2025-12-05");
    return params;
  },
  useRouter: () => ({
    push: vi.fn(),
  }),
  usePathname: () => "/dashboard",
  redirect: vi.fn(),
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
          guilds={[]}
          user={{
            id: "user-123",
            email: "test@example.com",
            fullName: "Test User",
            avatarUrl: "https://cdn.discordapp.com/avatars/123/abc.png",
          }}
        />
      );

      const appTitle = screen.getByRole("link", { name: "Discalendar" });
      expect(appTitle).toBeInTheDocument();
      expect(appTitle).toHaveAttribute("href", "/");
    });

    it("should render logout button (Requirement 6.1)", async () => {
      const { DashboardPageClient } = await import("@/app/dashboard/page");
      render(
        <DashboardPageClient
          guilds={[]}
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
          guilds={[]}
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
          guilds={[]}
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
          guilds={[]}
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
          guilds={[]}
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
          guilds={[]}
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
          guilds={[]}
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
          guilds={[]}
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
          guilds={[]}
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
          guilds={[]}
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

  describe("Task 6.3: ギルド一覧統合", () => {
    it("should render guild list section (Requirement 5.3)", async () => {
      const { DashboardPageClient } = await import("@/app/dashboard/page");
      render(
        <DashboardPageClient
          guilds={[]}
          user={{
            id: "user-123",
            email: "test@example.com",
            fullName: "Test User",
            avatarUrl: null,
          }}
        />
      );

      // サーバー一覧のヘッダーが存在すること（h3で特定）
      const serverHeading = screen.getByRole("heading", {
        level: 3,
        name: SERVER_SECTION_PATTERN,
      });
      expect(serverHeading).toBeInTheDocument();
    });

    it("should display guild cards when guilds are provided (Requirement 5.3)", async () => {
      const mockGuilds = [
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

      const { DashboardPageClient } = await import("@/app/dashboard/page");
      render(
        <DashboardPageClient
          guilds={mockGuilds}
          user={{
            id: "user-123",
            email: "test@example.com",
            fullName: "Test User",
            avatarUrl: null,
          }}
        />
      );

      expect(screen.getByText("Test Server 1")).toBeInTheDocument();
      expect(screen.getByText("Test Server 2")).toBeInTheDocument();
    });

    it("should display empty state when no guilds are available (Requirement 4.4)", async () => {
      const { DashboardPageClient } = await import("@/app/dashboard/page");
      render(
        <DashboardPageClient
          guilds={[]}
          user={{
            id: "user-123",
            email: "test@example.com",
            fullName: "Test User",
            avatarUrl: null,
          }}
        />
      );

      // 空状態メッセージはモバイルとデスクトップの両方に表示される
      const emptyMessages = screen.getAllByText(NO_SERVERS_PATTERN);
      expect(emptyMessages.length).toBeGreaterThan(0);
    });

    it("should display error message when token is expired (Requirement 2.4)", async () => {
      const { DashboardPageClient } = await import("@/app/dashboard/page");
      render(
        <DashboardPageClient
          guildError={{ type: "token_expired" }}
          guilds={[]}
          user={{
            id: "user-123",
            email: "test@example.com",
            fullName: "Test User",
            avatarUrl: null,
          }}
        />
      );

      // エラーメッセージはモバイルとデスクトップの両方に表示される
      const errorMessages = screen.getAllByText(SESSION_EXPIRED_PATTERN);
      expect(errorMessages.length).toBeGreaterThan(0);
    });

    it("should display error message when no token is available (Requirement 2.4)", async () => {
      const { DashboardPageClient } = await import("@/app/dashboard/page");
      render(
        <DashboardPageClient
          guildError={{ type: "no_token" }}
          guilds={[]}
          user={{
            id: "user-123",
            email: "test@example.com",
            fullName: "Test User",
            avatarUrl: null,
          }}
        />
      );

      // エラーメッセージはモバイルとデスクトップの両方に表示される
      const errorMessages = screen.getAllByText(DISCORD_DISABLED_PATTERN);
      expect(errorMessages.length).toBeGreaterThan(0);
    });

    it("should display API error message (Requirement 2.3)", async () => {
      const { DashboardPageClient } = await import("@/app/dashboard/page");
      render(
        <DashboardPageClient
          guildError={{ type: "api_error", message: "APIエラーが発生しました" }}
          guilds={[]}
          user={{
            id: "user-123",
            email: "test@example.com",
            fullName: "Test User",
            avatarUrl: null,
          }}
        />
      );

      // エラーメッセージはモバイルとデスクトップの両方に表示される
      const errorMessages = screen.getAllByText(API_ERROR_PATTERN);
      expect(errorMessages.length).toBeGreaterThan(0);
    });
  });
});
