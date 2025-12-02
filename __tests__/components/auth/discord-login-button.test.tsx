/**
 * Task 9: DiscordログインボタンのセキュリティとエラーログTesting
 *
 * Requirements:
 * - 7.4: 全ての認証エラーをコンソールに記録する
 * - 8.3: PKCEフローを使用する（signInWithOAuth）
 */
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock console.error
const mockConsoleError = vi.fn();
const originalConsoleError = console.error;

// Mock Supabase client
const mockSignInWithOAuth = vi.fn();
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      signInWithOAuth: mockSignInWithOAuth,
    },
  }),
}));

describe("Task 9: DiscordLoginButton Security & Logging", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    console.error = mockConsoleError;
    // Default mock: successful OAuth start (redirect happens)
    mockSignInWithOAuth.mockResolvedValue({ error: null });
  });

  afterEach(() => {
    cleanup();
    console.error = originalConsoleError;
  });

  describe("Requirement 7.4: Error Logging on OAuth Start Failure", () => {
    it("should log error when OAuth initiation fails", async () => {
      const oauthError = { message: "Failed to start OAuth" };
      mockSignInWithOAuth.mockResolvedValue({ error: oauthError });

      const { DiscordLoginButton } = await import(
        "@/components/auth/discord-login-button"
      );
      render(<DiscordLoginButton />);

      const button = screen.getByRole("button");
      fireEvent.click(button);

      // Wait for async operation
      await vi.waitFor(() => {
        expect(mockConsoleError).toHaveBeenCalled();
      });

      expect(mockConsoleError).toHaveBeenCalledWith(
        "[Auth Error]",
        "auth_failed",
        expect.any(String),
        expect.stringContaining("Failed to start OAuth")
      );
    });
  });

  describe("Requirement 8.3: PKCE Flow Usage", () => {
    it("should call signInWithOAuth with discord provider", async () => {
      const { DiscordLoginButton } = await import(
        "@/components/auth/discord-login-button"
      );
      render(<DiscordLoginButton />);

      const button = screen.getByRole("button");
      fireEvent.click(button);

      await vi.waitFor(() => {
        expect(mockSignInWithOAuth).toHaveBeenCalled();
      });

      expect(mockSignInWithOAuth).toHaveBeenCalledWith(
        expect.objectContaining({
          provider: "discord",
        })
      );
    });

    it("should request identify and email scopes", async () => {
      const { DiscordLoginButton } = await import(
        "@/components/auth/discord-login-button"
      );
      render(<DiscordLoginButton />);

      const button = screen.getByRole("button");
      fireEvent.click(button);

      await vi.waitFor(() => {
        expect(mockSignInWithOAuth).toHaveBeenCalled();
      });

      expect(mockSignInWithOAuth).toHaveBeenCalledWith(
        expect.objectContaining({
          options: expect.objectContaining({
            scopes: expect.stringContaining("identify"),
          }),
        })
      );

      expect(mockSignInWithOAuth).toHaveBeenCalledWith(
        expect.objectContaining({
          options: expect.objectContaining({
            scopes: expect.stringContaining("email"),
          }),
        })
      );
    });

    it("should include callback URL with next parameter", async () => {
      const { DiscordLoginButton } = await import(
        "@/components/auth/discord-login-button"
      );
      render(<DiscordLoginButton redirectTo="/settings" />);

      const button = screen.getByRole("button");
      fireEvent.click(button);

      await vi.waitFor(() => {
        expect(mockSignInWithOAuth).toHaveBeenCalled();
      });

      expect(mockSignInWithOAuth).toHaveBeenCalledWith(
        expect.objectContaining({
          options: expect.objectContaining({
            redirectTo: expect.stringContaining("/auth/callback"),
          }),
        })
      );
    });
  });

  describe("Button UI Behavior", () => {
    it("should display Discord branding", async () => {
      const { DiscordLoginButton } = await import(
        "@/components/auth/discord-login-button"
      );
      render(<DiscordLoginButton />);

      expect(screen.getByText("Discordでログイン")).toBeInTheDocument();
    });

    it("should show loading state when clicked", async () => {
      // Make OAuth hang to observe loading state
      mockSignInWithOAuth.mockImplementation(
        () =>
          new Promise(() => {
            /* intentionally never resolves */
          })
      );

      const { DiscordLoginButton } = await import(
        "@/components/auth/discord-login-button"
      );
      render(<DiscordLoginButton />);

      const button = screen.getByRole("button");
      fireEvent.click(button);

      await vi.waitFor(() => {
        expect(screen.getByText("ログイン中...")).toBeInTheDocument();
      });
    });

    it("should disable button when loading", async () => {
      mockSignInWithOAuth.mockImplementation(
        () =>
          new Promise(() => {
            /* intentionally never resolves */
          })
      );

      const { DiscordLoginButton } = await import(
        "@/components/auth/discord-login-button"
      );
      render(<DiscordLoginButton />);

      const button = screen.getByRole("button");
      fireEvent.click(button);

      await vi.waitFor(() => {
        expect(button).toBeDisabled();
      });
    });

    it("should re-enable button on error", async () => {
      const oauthError = { message: "Network error" };
      mockSignInWithOAuth.mockResolvedValue({ error: oauthError });

      const { DiscordLoginButton } = await import(
        "@/components/auth/discord-login-button"
      );
      render(<DiscordLoginButton />);

      const button = screen.getByRole("button");
      fireEvent.click(button);

      await vi.waitFor(() => {
        expect(button).not.toBeDisabled();
      });
    });
  });

  describe("Accessibility", () => {
    it("should be focusable via keyboard", async () => {
      const { DiscordLoginButton } = await import(
        "@/components/auth/discord-login-button"
      );
      render(<DiscordLoginButton />);

      const button = screen.getByRole("button");
      button.focus();

      expect(document.activeElement).toBe(button);
    });

    it("should have visible focus indicator class", async () => {
      const { DiscordLoginButton } = await import(
        "@/components/auth/discord-login-button"
      );
      render(<DiscordLoginButton />);

      const button = screen.getByRole("button");

      // Check for focus-visible ring class
      expect(button.className).toContain("focus-visible:ring");
    });
  });
});
