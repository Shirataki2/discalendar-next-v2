import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock for Server Component patterns
const mockGetUser = vi.fn();

// Mock Supabase server client
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() =>
    Promise.resolve({
      auth: {
        getUser: mockGetUser,
      },
    })
  ),
}));

// Import component after mocking
import { Header } from "./header";

/**
 * Header コンポーネントのテスト
 *
 * タスク8: 既存ヘッダーのログインリンクを更新する
 * - ヘッダーのログインリンク先を新しいログインページに変更する
 * - 認証状態に応じてログイン/ログアウトの表示を切り替える
 *
 * Requirements: 1.1
 */
describe("Header", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  describe("未認証状態", () => {
    beforeEach(() => {
      mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
    });

    it("should display login button with correct href", async () => {
      const header = await Header();
      render(header);

      const loginLink = screen.getByRole("link", { name: /ログイン/i });
      expect(loginLink).toBeInTheDocument();
      expect(loginLink).toHaveAttribute("href", "/auth/login");
    });

    it("should display signup button with correct href", async () => {
      const header = await Header();
      render(header);

      const signupLink = screen.getByRole("link", { name: /無料で始める/i });
      expect(signupLink).toBeInTheDocument();
      expect(signupLink).toHaveAttribute("href", "/auth/login");
    });

    it("should not display logout button when unauthenticated", async () => {
      const header = await Header();
      render(header);

      const logoutButton = screen.queryByRole("button", {
        name: /ログアウト/i,
      });
      expect(logoutButton).not.toBeInTheDocument();
    });
  });

  describe("認証済み状態", () => {
    beforeEach(() => {
      mockGetUser.mockResolvedValue({
        data: {
          user: {
            id: "test-user-id",
            email: "test@example.com",
            user_metadata: {
              full_name: "Test User",
              avatar_url: "https://example.com/avatar.png",
            },
          },
        },
        error: null,
      });
    });

    it("should display logout button when authenticated", async () => {
      const header = await Header();
      render(header);

      const logoutButton = screen.getByRole("button", { name: /ログアウト/i });
      expect(logoutButton).toBeInTheDocument();
    });

    it("should display dashboard link when authenticated", async () => {
      const header = await Header();
      render(header);

      const dashboardLink = screen.getByRole("link", {
        name: /ダッシュボード/i,
      });
      expect(dashboardLink).toBeInTheDocument();
      expect(dashboardLink).toHaveAttribute("href", "/dashboard");
    });

    it("should not display login button when authenticated", async () => {
      const header = await Header();
      render(header);

      const loginLink = screen.queryByRole("link", { name: /ログイン$/i });
      expect(loginLink).not.toBeInTheDocument();
    });

    it("should not display signup button when authenticated", async () => {
      const header = await Header();
      render(header);

      const signupLink = screen.queryByRole("link", { name: /無料で始める/i });
      expect(signupLink).not.toBeInTheDocument();
    });
  });

  describe("基本表示", () => {
    beforeEach(() => {
      mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
    });

    it("should display service name", async () => {
      const header = await Header();
      render(header);

      const logo = screen.getByText("Discalendar");
      expect(logo).toBeInTheDocument();
    });

    it("should display navigation links", async () => {
      const header = await Header();
      render(header);

      expect(screen.getByRole("link", { name: /機能/i })).toBeInTheDocument();
      expect(screen.getByRole("link", { name: /使い方/i })).toBeInTheDocument();
      expect(screen.getByRole("link", { name: /料金/i })).toBeInTheDocument();
    });
  });
});
