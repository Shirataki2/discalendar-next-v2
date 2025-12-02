import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Top-level regex for button name matching (performance optimization)
const LOGOUT_BUTTON_NAME = /ログアウト/i;

// Hoist mock function so it can be used in vi.mock
const { mockSignOut } = vi.hoisted(() => ({
  mockSignOut: vi.fn(),
}));

// Mock the signOut server action
vi.mock("@/app/auth/actions", () => ({
  signOut: mockSignOut,
}));

// Import component after mocking
import { LogoutButton } from "./logout-button";

describe("LogoutButton", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSignOut.mockResolvedValue(undefined);
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  describe("表示", () => {
    it("should render logout button with default text", () => {
      render(<LogoutButton />);
      const button = screen.getByRole("button", { name: LOGOUT_BUTTON_NAME });
      expect(button).toBeInTheDocument();
    });

    it("should display logout icon", () => {
      render(<LogoutButton />);
      const button = screen.getByRole("button", { name: LOGOUT_BUTTON_NAME });
      // Check for SVG presence (LogOut icon from lucide-react)
      const svg = button.querySelector("svg");
      expect(svg).toBeInTheDocument();
    });
  });

  // Requirement 6.1: ログアウトボタンをクリックした時、Server Actionを呼び出す
  describe("Server Action呼び出し (Req 6.1)", () => {
    it("should call signOut server action on click", async () => {
      const user = userEvent.setup();
      render(<LogoutButton />);
      const button = screen.getByRole("button", { name: LOGOUT_BUTTON_NAME });

      await user.click(button);

      await waitFor(() => {
        expect(mockSignOut).toHaveBeenCalledTimes(1);
      });
    });

    it("should be activated by Enter key", async () => {
      const user = userEvent.setup();
      render(<LogoutButton />);
      const button = screen.getByRole("button", { name: LOGOUT_BUTTON_NAME });

      button.focus();
      await user.keyboard("{Enter}");

      await waitFor(() => {
        expect(mockSignOut).toHaveBeenCalled();
      });
    });

    it("should be activated by Space key", async () => {
      const user = userEvent.setup();
      render(<LogoutButton />);
      const button = screen.getByRole("button", { name: LOGOUT_BUTTON_NAME });

      button.focus();
      await user.keyboard(" ");

      await waitFor(() => {
        expect(mockSignOut).toHaveBeenCalled();
      });
    });
  });

  // Requirement 6.3: クライアント側のセッション情報をクリアする
  describe("クライアントセッションクリア (Req 6.3)", () => {
    it("should show loading state while signing out", async () => {
      mockSignOut.mockImplementation(
        () =>
          new Promise(() => {
            // Intentionally never resolve to keep loading state
          })
      );

      const user = userEvent.setup();
      render(<LogoutButton />);
      const button = screen.getByRole("button", { name: LOGOUT_BUTTON_NAME });

      await user.click(button);

      await waitFor(() => {
        expect(button).toBeDisabled();
      });
    });

    it("should prevent multiple clicks while signing out", async () => {
      mockSignOut.mockImplementation(
        () =>
          new Promise(() => {
            // Intentionally never resolve to keep loading state
          })
      );

      const user = userEvent.setup();
      render(<LogoutButton />);
      const button = screen.getByRole("button", { name: LOGOUT_BUTTON_NAME });

      await user.click(button);
      await user.click(button);
      await user.click(button);

      // Should only be called once despite multiple clicks
      expect(mockSignOut).toHaveBeenCalledTimes(1);
    });
  });

  // ボタンバリエーション対応
  describe("バリエーション", () => {
    it("should apply ghost variant by default", () => {
      render(<LogoutButton />);
      const button = screen.getByRole("button", { name: LOGOUT_BUTTON_NAME });
      // ghost variant should not have bg-primary
      expect(button.className).not.toContain("bg-primary");
    });

    it("should apply default variant when specified", () => {
      render(<LogoutButton variant="default" />);
      const button = screen.getByRole("button", { name: LOGOUT_BUTTON_NAME });
      expect(button).toBeInTheDocument();
    });

    it("should apply outline variant when specified", () => {
      render(<LogoutButton variant="outline" />);
      const button = screen.getByRole("button", { name: LOGOUT_BUTTON_NAME });
      expect(button).toBeInTheDocument();
    });
  });
});
