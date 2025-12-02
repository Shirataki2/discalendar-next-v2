import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Regex constants for top-level performance
const LOGIN_REGEX = /ログイン/i;
const LOGIN_EXACT_REGEX = /ログイン$/i;
const SIGNUP_REGEX = /無料で始める/i;
const LOGOUT_REGEX = /ログアウト/i;
const DASHBOARD_REGEX = /ダッシュボード/i;
const FEATURES_REGEX = /機能/i;
const HOW_TO_USE_REGEX = /使い方/i;
const PRICING_REGEX = /料金/i;

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

      const loginLink = screen.getByRole("link", { name: LOGIN_REGEX });
      expect(loginLink).toBeInTheDocument();
      expect(loginLink).toHaveAttribute("href", "/auth/login");
    });

    it("should display signup button with correct href", async () => {
      const header = await Header();
      render(header);

      const signupLink = screen.getByRole("link", { name: SIGNUP_REGEX });
      expect(signupLink).toBeInTheDocument();
      expect(signupLink).toHaveAttribute("href", "/auth/login");
    });

    it("should not display logout button when unauthenticated", async () => {
      const header = await Header();
      render(header);

      const logoutButton = screen.queryByRole("button", {
        name: LOGOUT_REGEX,
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

      const logoutButton = screen.getByRole("button", { name: LOGOUT_REGEX });
      expect(logoutButton).toBeInTheDocument();
    });

    it("should display dashboard link when authenticated", async () => {
      const header = await Header();
      render(header);

      const dashboardLink = screen.getByRole("link", {
        name: DASHBOARD_REGEX,
      });
      expect(dashboardLink).toBeInTheDocument();
      expect(dashboardLink).toHaveAttribute("href", "/dashboard");
    });

    it("should not display login button when authenticated", async () => {
      const header = await Header();
      render(header);

      const loginLink = screen.queryByRole("link", { name: LOGIN_EXACT_REGEX });
      expect(loginLink).not.toBeInTheDocument();
    });

    it("should not display signup button when authenticated", async () => {
      const header = await Header();
      render(header);

      const signupLink = screen.queryByRole("link", { name: SIGNUP_REGEX });
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

      expect(
        screen.getByRole("link", { name: FEATURES_REGEX })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("link", { name: HOW_TO_USE_REGEX })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("link", { name: PRICING_REGEX })
      ).toBeInTheDocument();
    });
  });
});
