import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Top-level regex patterns for performance
const DISCORD_NAME_PATTERN = /discord/i;
const DISCORD_TEXT_PATTERN = /discordでログイン/i;
const FOCUS_VISIBLE_PATTERN = /focus-visible:/;

// Mock the Supabase client
const mockSignInWithOAuth = vi.fn();

vi.mock("@/lib/supabase/client", () => ({
  createClient: vi.fn(() => ({
    auth: {
      signInWithOAuth: mockSignInWithOAuth,
    },
  })),
}));

// Import component after mocking
import { DiscordLoginButton } from "./discord-login-button";

describe("DiscordLoginButton", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSignInWithOAuth.mockResolvedValue({ data: {}, error: null });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  // Requirement 1.1: ログインページにDiscordログインボタンを表示する
  describe("表示", () => {
    it("should render the Discord login button", () => {
      render(<DiscordLoginButton />);
      const button = screen.getByRole("button", { name: DISCORD_NAME_PATTERN });
      expect(button).toBeInTheDocument();
    });

    it("should display 'Discordでログイン' text", () => {
      render(<DiscordLoginButton />);
      expect(screen.getByText(DISCORD_TEXT_PATTERN)).toBeInTheDocument();
    });
  });

  // Requirement 1.2: ログインボタンにDiscordのブランドカラーとロゴを表示する
  describe("ブランディング (Req 1.2)", () => {
    it("should have Discord brand color (#5865F2) as background", () => {
      render(<DiscordLoginButton />);
      const button = screen.getByRole("button", { name: DISCORD_NAME_PATTERN });
      // Check for the brand color in styles
      expect(button).toHaveStyle({ backgroundColor: "rgb(88, 101, 242)" });
    });

    it("should display Discord logo/icon", () => {
      render(<DiscordLoginButton />);
      const button = screen.getByRole("button", { name: DISCORD_NAME_PATTERN });
      // Check for SVG presence (Discord logo)
      const svg = button.querySelector("svg");
      expect(svg).toBeInTheDocument();
    });
  });

  // Requirement 1.3: ログインボタンがフォーカスされている間、視覚的なフォーカス状態を表示する
  describe("フォーカス状態 (Req 1.3)", () => {
    it("should have visible focus styling when focused", () => {
      render(<DiscordLoginButton />);
      const button = screen.getByRole("button", { name: DISCORD_NAME_PATTERN });
      button.focus();
      expect(button).toHaveFocus();
      // Check for focus-visible classes
      expect(button.className).toMatch(FOCUS_VISIBLE_PATTERN);
    });
  });

  // Requirement 1.4: ログインボタンをキーボード操作で選択可能にする
  describe("キーボード操作 (Req 1.4)", () => {
    it("should be activated by Enter key", async () => {
      const user = userEvent.setup();
      render(<DiscordLoginButton />);
      const button = screen.getByRole("button", { name: DISCORD_NAME_PATTERN });

      button.focus();
      await user.keyboard("{Enter}");

      await waitFor(() => {
        expect(mockSignInWithOAuth).toHaveBeenCalled();
      });
    });

    it("should be activated by Space key", async () => {
      const user = userEvent.setup();
      render(<DiscordLoginButton />);
      const button = screen.getByRole("button", { name: DISCORD_NAME_PATTERN });

      button.focus();
      await user.keyboard(" ");

      await waitFor(() => {
        expect(mockSignInWithOAuth).toHaveBeenCalled();
      });
    });

    it("should be focusable with Tab key", async () => {
      const user = userEvent.setup();
      render(
        <div>
          <button type="button">Before</button>
          <DiscordLoginButton />
        </div>
      );

      await user.tab();
      await user.tab();

      const button = screen.getByRole("button", { name: DISCORD_NAME_PATTERN });
      expect(button).toHaveFocus();
    });
  });

  // Requirement 2.1: Supabase Auth経由でDiscord OAuth認可画面にリダイレクトする
  describe("OAuth認証開始 (Req 2.1)", () => {
    it("should call signInWithOAuth with provider discord on click", async () => {
      const user = userEvent.setup();
      render(<DiscordLoginButton />);
      const button = screen.getByRole("button", { name: DISCORD_NAME_PATTERN });

      await user.click(button);

      await waitFor(() => {
        expect(mockSignInWithOAuth).toHaveBeenCalledWith(
          expect.objectContaining({
            provider: "discord",
          })
        );
      });
    });

    it("should use default redirectTo as /dashboard when not specified", async () => {
      const user = userEvent.setup();
      render(<DiscordLoginButton />);
      const button = screen.getByRole("button", { name: DISCORD_NAME_PATTERN });

      await user.click(button);

      await waitFor(() => {
        expect(mockSignInWithOAuth).toHaveBeenCalledWith(
          expect.objectContaining({
            options: expect.objectContaining({
              redirectTo: expect.stringContaining("/auth/callback"),
            }),
          })
        );
      });
    });

    it("should use custom redirectTo when specified", async () => {
      const user = userEvent.setup();
      render(<DiscordLoginButton redirectTo="/custom-path" />);
      const button = screen.getByRole("button", { name: DISCORD_NAME_PATTERN });

      await user.click(button);

      await waitFor(() => {
        expect(mockSignInWithOAuth).toHaveBeenCalledWith(
          expect.objectContaining({
            options: expect.objectContaining({
              redirectTo: expect.stringContaining("/auth/callback"),
            }),
          })
        );
      });
    });
  });

  // Requirement 2.2: 必要なスコープ（identify, email, guilds）をリクエストする
  describe("OAuth スコープ (Req 2.2)", () => {
    it("should request identify, email, and guilds scopes", async () => {
      const user = userEvent.setup();
      render(<DiscordLoginButton />);
      const button = screen.getByRole("button", { name: DISCORD_NAME_PATTERN });

      await user.click(button);

      await waitFor(() => {
        expect(mockSignInWithOAuth).toHaveBeenCalledWith(
          expect.objectContaining({
            options: expect.objectContaining({
              scopes: "identify email guilds",
            }),
          })
        );
      });
    });
  });

  // ローディング状態
  describe("ローディング状態", () => {
    it("should show loading state when clicked", async () => {
      mockSignInWithOAuth.mockImplementation(
        () =>
          new Promise(() => {
            // Intentionally never resolve to keep loading state
          })
      );

      const user = userEvent.setup();
      render(<DiscordLoginButton />);
      const button = screen.getByRole("button", { name: DISCORD_NAME_PATTERN });

      await user.click(button);

      await waitFor(() => {
        expect(button).toBeDisabled();
      });
    });

    it("should prevent multiple clicks (button mashing)", async () => {
      mockSignInWithOAuth.mockImplementation(
        () =>
          new Promise(() => {
            // Intentionally never resolve to keep loading state
          })
      );

      const user = userEvent.setup();
      render(<DiscordLoginButton />);
      const button = screen.getByRole("button", { name: DISCORD_NAME_PATTERN });

      await user.click(button);
      await user.click(button);
      await user.click(button);

      // Should only be called once despite multiple clicks
      expect(mockSignInWithOAuth).toHaveBeenCalledTimes(1);
    });

    it("should call onLoadingChange callback with true when loading starts", async () => {
      mockSignInWithOAuth.mockImplementation(
        () =>
          new Promise(() => {
            // Intentionally never resolve to keep loading state
          })
      );

      const onLoadingChange = vi.fn();
      const user = userEvent.setup();
      render(<DiscordLoginButton onLoadingChange={onLoadingChange} />);
      const button = screen.getByRole("button", { name: DISCORD_NAME_PATTERN });

      await user.click(button);

      await waitFor(() => {
        expect(onLoadingChange).toHaveBeenCalledWith(true);
      });
    });

    it("should call onLoadingChange callback with false when error occurs", async () => {
      // When error occurs, loading should be set to false
      mockSignInWithOAuth.mockResolvedValue({
        data: null,
        error: { message: "OAuth failed" },
      });

      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {
        // Suppress console.error output during test
      });
      const onLoadingChange = vi.fn();
      const user = userEvent.setup();
      render(<DiscordLoginButton onLoadingChange={onLoadingChange} />);
      const button = screen.getByRole("button", { name: DISCORD_NAME_PATTERN });

      await user.click(button);

      await waitFor(() => {
        expect(onLoadingChange).toHaveBeenLastCalledWith(false);
      });

      consoleSpy.mockRestore();
    });

    it("should show loading indicator (spinner) while authenticating", async () => {
      mockSignInWithOAuth.mockImplementation(
        () =>
          new Promise(() => {
            // Intentionally never resolve to keep loading state
          })
      );

      const user = userEvent.setup();
      render(<DiscordLoginButton />);
      const button = screen.getByRole("button", { name: DISCORD_NAME_PATTERN });

      await user.click(button);

      await waitFor(() => {
        // Check for loader/spinner
        const loader = screen.queryByTestId("loader");
        expect(loader).toBeInTheDocument();
      });
    });
  });

  // エラーハンドリング
  describe("エラーハンドリング", () => {
    it("should log error when OAuth fails", async () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {
        // Suppress console.error output during test
      });
      mockSignInWithOAuth.mockResolvedValue({
        data: null,
        error: { message: "OAuth failed" },
      });

      const user = userEvent.setup();
      render(<DiscordLoginButton />);
      const button = screen.getByRole("button", { name: DISCORD_NAME_PATTERN });

      await user.click(button);

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalled();
      });

      consoleSpy.mockRestore();
    });

    it("should re-enable button after error", async () => {
      mockSignInWithOAuth.mockResolvedValue({
        data: null,
        error: { message: "OAuth failed" },
      });

      const user = userEvent.setup();
      render(<DiscordLoginButton />);
      const button = screen.getByRole("button", { name: DISCORD_NAME_PATTERN });

      await user.click(button);

      await waitFor(() => {
        expect(button).not.toBeDisabled();
      });
    });
  });
});
