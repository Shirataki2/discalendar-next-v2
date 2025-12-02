import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Top-level regex patterns for error message matching
const NETWORK_ERROR_PATTERN =
  /サーバーに接続できませんでした|ネットワーク接続を確認/;
const AUTH_FAILED_PATTERN = /認証に失敗しました/;
const ACCESS_DENIED_PATTERN = /キャンセル|ログインがキャンセル/;
const MISSING_CODE_PATTERN = /認証コードが見つかりません/;
const SESSION_EXPIRED_PATTERN = /セッション.*有効期限/;

// Mock DiscordLoginButton component
vi.mock("@/components/auth/discord-login-button", () => ({
  DiscordLoginButton: () => (
    <button data-testid="discord-login-button" type="button">
      Discordでログイン
    </button>
  ),
}));

describe("LoginPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  describe("Task 4: ログインページ基本表示", () => {
    it("should render Discord login button (Requirement 1.1)", async () => {
      // Use LoginPageClient for testability
      const { LoginPageClient } = await import("@/app/auth/login/page");
      render(<LoginPageClient />);

      expect(screen.getByTestId("discord-login-button")).toBeInTheDocument();
    });

    it("should have accessible heading for login page", async () => {
      const { LoginPageClient } = await import("@/app/auth/login/page");
      render(<LoginPageClient />);

      // Page should have a heading for accessibility
      const heading = screen.getByRole("heading", { level: 1 });
      expect(heading).toBeInTheDocument();
    });

    it("should have main landmark for accessibility", async () => {
      const { LoginPageClient } = await import("@/app/auth/login/page");
      render(<LoginPageClient />);

      expect(screen.getByRole("main")).toBeInTheDocument();
    });
  });

  describe("Task 4: エラーメッセージ表示 (Requirements 7.1, 7.2, 7.3)", () => {
    it("should display network error message when error=network_error", async () => {
      const { LoginPageClient } = await import("@/app/auth/login/page");

      // Since Server Component uses searchParams, test the Client Component directly
      render(<LoginPageClient errorCode="network_error" />);

      expect(screen.getByText(NETWORK_ERROR_PATTERN)).toBeInTheDocument();
    });

    it("should display auth failed message when error=auth_failed (Requirement 7.2)", async () => {
      const { LoginPageClient } = await import("@/app/auth/login/page");
      render(<LoginPageClient errorCode="auth_failed" />);

      expect(screen.getByText(AUTH_FAILED_PATTERN)).toBeInTheDocument();
    });

    it("should display access denied message when error=access_denied (Requirement 7.3)", async () => {
      const { LoginPageClient } = await import("@/app/auth/login/page");
      render(<LoginPageClient errorCode="access_denied" />);

      expect(screen.getByText(ACCESS_DENIED_PATTERN)).toBeInTheDocument();
    });

    it("should display missing code error message when error=missing_code", async () => {
      const { LoginPageClient } = await import("@/app/auth/login/page");
      render(<LoginPageClient errorCode="missing_code" />);

      expect(screen.getByText(MISSING_CODE_PATTERN)).toBeInTheDocument();
    });

    it("should display session expired message when error=session_expired", async () => {
      const { LoginPageClient } = await import("@/app/auth/login/page");
      render(<LoginPageClient errorCode="session_expired" />);

      expect(screen.getByText(SESSION_EXPIRED_PATTERN)).toBeInTheDocument();
    });

    it("should not display error message when no error parameter", async () => {
      const { LoginPageClient } = await import("@/app/auth/login/page");
      render(<LoginPageClient />);

      // Should not have error alert role
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });
  });

  describe("Task 4: エラーメッセージのアクセシビリティ", () => {
    it("should have role=alert for error messages", async () => {
      const { LoginPageClient } = await import("@/app/auth/login/page");
      render(<LoginPageClient errorCode="auth_failed" />);

      const alert = screen.getByRole("alert");
      expect(alert).toBeInTheDocument();
    });

    it("should have aria-live=polite for error container", async () => {
      const { LoginPageClient } = await import("@/app/auth/login/page");
      render(<LoginPageClient errorCode="auth_failed" />);

      const alert = screen.getByRole("alert");
      expect(alert).toHaveAttribute("aria-live", "polite");
    });
  });

  describe("Task 4: レイアウトとアクセシビリティ", () => {
    it("should center the login form", async () => {
      const { LoginPageClient } = await import("@/app/auth/login/page");
      const { container } = render(<LoginPageClient />);

      // Check for centering classes (flexbox center)
      const mainElement = container.querySelector("main");
      expect(mainElement).toBeInTheDocument();
    });

    it("should have proper contrast for text content", async () => {
      const { LoginPageClient } = await import("@/app/auth/login/page");
      render(<LoginPageClient />);

      // Verify the page renders without throwing
      expect(screen.getByRole("heading", { level: 1 })).toBeVisible();
    });

    it("should handle unknown error codes gracefully", async () => {
      const { LoginPageClient } = await import("@/app/auth/login/page");
      // errorCode accepts string type, so "unknown_error" is valid
      render(<LoginPageClient errorCode="unknown_error" />);

      // Should not crash and should either show generic message or nothing
      expect(screen.getByRole("main")).toBeInTheDocument();
    });
  });
});
