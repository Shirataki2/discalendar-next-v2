import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Regex constants for top-level performance
const OPEN_MENU_REGEX = /メニューを開く/i;
const CLOSE_MENU_REGEX = /メニューを閉じる/i;
const LOGIN_REGEX = /ログイン/i;
const LOGIN_EXACT_REGEX = /ログイン$/i;
const SIGNUP_REGEX = /無料で始める/i;
const LOGOUT_REGEX = /ログアウト/i;
const DASHBOARD_REGEX = /ダッシュボード/i;
const FEATURES_REGEX = /機能/i;

// Mock the signOut server action
vi.mock("@/app/auth/actions", () => ({
  signOut: vi.fn(),
}));

// Import component after mocking
import { MobileNav } from "./mobile-nav";

/**
 * MobileNav コンポーネントのテスト
 *
 * タスク8: 既存ヘッダーのログインリンクを更新する
 * - ヘッダーのログインリンク先を新しいログインページに変更する
 * - 認証状態に応じてログイン/ログアウトの表示を切り替える
 *
 * Requirements: 1.1
 */
describe("MobileNav", () => {
  const mockLinks = [
    { label: "機能", href: "#features" },
    { label: "使い方", href: "#how-to-use" },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  describe("未認証状態", () => {
    it("should display login button with correct href when menu is open", async () => {
      const user = userEvent.setup();
      render(<MobileNav isAuthenticated={false} links={mockLinks} />);

      // Open the menu
      const menuButton = screen.getByRole("button", {
        name: OPEN_MENU_REGEX,
      });
      await user.click(menuButton);

      const loginLink = screen.getByRole("link", { name: LOGIN_REGEX });
      expect(loginLink).toBeInTheDocument();
      expect(loginLink).toHaveAttribute("href", "/auth/login");
    });

    it("should display signup button with correct href when menu is open", async () => {
      const user = userEvent.setup();
      render(<MobileNav isAuthenticated={false} links={mockLinks} />);

      // Open the menu
      const menuButton = screen.getByRole("button", {
        name: OPEN_MENU_REGEX,
      });
      await user.click(menuButton);

      const signupLink = screen.getByRole("link", { name: SIGNUP_REGEX });
      expect(signupLink).toBeInTheDocument();
      expect(signupLink).toHaveAttribute("href", "/auth/login");
    });

    it("should not display logout button when unauthenticated", async () => {
      const user = userEvent.setup();
      render(<MobileNav isAuthenticated={false} links={mockLinks} />);

      // Open the menu
      const menuButton = screen.getByRole("button", {
        name: OPEN_MENU_REGEX,
      });
      await user.click(menuButton);

      const logoutButton = screen.queryByRole("button", {
        name: LOGOUT_REGEX,
      });
      expect(logoutButton).not.toBeInTheDocument();
    });
  });

  describe("認証済み状態", () => {
    it("should display logout button when authenticated and menu is open", async () => {
      const user = userEvent.setup();
      render(<MobileNav isAuthenticated={true} links={mockLinks} />);

      // Open the menu
      const menuButton = screen.getByRole("button", {
        name: OPEN_MENU_REGEX,
      });
      await user.click(menuButton);

      const logoutButton = screen.getByRole("button", { name: LOGOUT_REGEX });
      expect(logoutButton).toBeInTheDocument();
    });

    it("should display dashboard link when authenticated and menu is open", async () => {
      const user = userEvent.setup();
      render(<MobileNav isAuthenticated={true} links={mockLinks} />);

      // Open the menu
      const menuButton = screen.getByRole("button", {
        name: OPEN_MENU_REGEX,
      });
      await user.click(menuButton);

      const dashboardLink = screen.getByRole("link", {
        name: DASHBOARD_REGEX,
      });
      expect(dashboardLink).toBeInTheDocument();
      expect(dashboardLink).toHaveAttribute("href", "/dashboard");
    });

    it("should not display login button when authenticated", async () => {
      const user = userEvent.setup();
      render(<MobileNav isAuthenticated={true} links={mockLinks} />);

      // Open the menu
      const menuButton = screen.getByRole("button", {
        name: OPEN_MENU_REGEX,
      });
      await user.click(menuButton);

      const loginLink = screen.queryByRole("link", { name: LOGIN_EXACT_REGEX });
      expect(loginLink).not.toBeInTheDocument();
    });

    it("should not display signup button when authenticated", async () => {
      const user = userEvent.setup();
      render(<MobileNav isAuthenticated={true} links={mockLinks} />);

      // Open the menu
      const menuButton = screen.getByRole("button", {
        name: OPEN_MENU_REGEX,
      });
      await user.click(menuButton);

      const signupLink = screen.queryByRole("link", { name: SIGNUP_REGEX });
      expect(signupLink).not.toBeInTheDocument();
    });
  });

  describe("メニュー開閉", () => {
    it("should toggle menu visibility on button click", async () => {
      const user = userEvent.setup();
      render(<MobileNav isAuthenticated={false} links={mockLinks} />);

      const menuButton = screen.getByRole("button", {
        name: OPEN_MENU_REGEX,
      });

      // Initially closed
      expect(
        screen.queryByRole("link", { name: FEATURES_REGEX })
      ).not.toBeInTheDocument();

      // Open menu
      await user.click(menuButton);
      expect(
        screen.getByRole("link", { name: FEATURES_REGEX })
      ).toBeInTheDocument();

      // Close menu
      await user.click(screen.getByRole("button", { name: CLOSE_MENU_REGEX }));
      expect(
        screen.queryByRole("link", { name: FEATURES_REGEX })
      ).not.toBeInTheDocument();
    });
  });
});
