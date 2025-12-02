import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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
        name: /メニューを開く/i,
      });
      await user.click(menuButton);

      const loginLink = screen.getByRole("link", { name: /ログイン/i });
      expect(loginLink).toBeInTheDocument();
      expect(loginLink).toHaveAttribute("href", "/auth/login");
    });

    it("should display signup button with correct href when menu is open", async () => {
      const user = userEvent.setup();
      render(<MobileNav isAuthenticated={false} links={mockLinks} />);

      // Open the menu
      const menuButton = screen.getByRole("button", {
        name: /メニューを開く/i,
      });
      await user.click(menuButton);

      const signupLink = screen.getByRole("link", { name: /無料で始める/i });
      expect(signupLink).toBeInTheDocument();
      expect(signupLink).toHaveAttribute("href", "/auth/login");
    });

    it("should not display logout button when unauthenticated", async () => {
      const user = userEvent.setup();
      render(<MobileNav isAuthenticated={false} links={mockLinks} />);

      // Open the menu
      const menuButton = screen.getByRole("button", {
        name: /メニューを開く/i,
      });
      await user.click(menuButton);

      const logoutButton = screen.queryByRole("button", {
        name: /ログアウト/i,
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
        name: /メニューを開く/i,
      });
      await user.click(menuButton);

      const logoutButton = screen.getByRole("button", { name: /ログアウト/i });
      expect(logoutButton).toBeInTheDocument();
    });

    it("should display dashboard link when authenticated and menu is open", async () => {
      const user = userEvent.setup();
      render(<MobileNav isAuthenticated={true} links={mockLinks} />);

      // Open the menu
      const menuButton = screen.getByRole("button", {
        name: /メニューを開く/i,
      });
      await user.click(menuButton);

      const dashboardLink = screen.getByRole("link", {
        name: /ダッシュボード/i,
      });
      expect(dashboardLink).toBeInTheDocument();
      expect(dashboardLink).toHaveAttribute("href", "/dashboard");
    });

    it("should not display login button when authenticated", async () => {
      const user = userEvent.setup();
      render(<MobileNav isAuthenticated={true} links={mockLinks} />);

      // Open the menu
      const menuButton = screen.getByRole("button", {
        name: /メニューを開く/i,
      });
      await user.click(menuButton);

      const loginLink = screen.queryByRole("link", { name: /ログイン$/i });
      expect(loginLink).not.toBeInTheDocument();
    });

    it("should not display signup button when authenticated", async () => {
      const user = userEvent.setup();
      render(<MobileNav isAuthenticated={true} links={mockLinks} />);

      // Open the menu
      const menuButton = screen.getByRole("button", {
        name: /メニューを開く/i,
      });
      await user.click(menuButton);

      const signupLink = screen.queryByRole("link", { name: /無料で始める/i });
      expect(signupLink).not.toBeInTheDocument();
    });
  });

  describe("メニュー開閉", () => {
    it("should toggle menu visibility on button click", async () => {
      const user = userEvent.setup();
      render(<MobileNav isAuthenticated={false} links={mockLinks} />);

      const menuButton = screen.getByRole("button", {
        name: /メニューを開く/i,
      });

      // Initially closed
      expect(
        screen.queryByRole("link", { name: /機能/i })
      ).not.toBeInTheDocument();

      // Open menu
      await user.click(menuButton);
      expect(screen.getByRole("link", { name: /機能/i })).toBeInTheDocument();

      // Close menu
      await user.click(
        screen.getByRole("button", { name: /メニューを閉じる/i })
      );
      expect(
        screen.queryByRole("link", { name: /機能/i })
      ).not.toBeInTheDocument();
    });
  });
});
