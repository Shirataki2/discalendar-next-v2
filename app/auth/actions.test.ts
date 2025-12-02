import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Hoist mock functions so they can be used in vi.mock
const { mockRedirect, mockSignOut } = vi.hoisted(() => ({
  mockRedirect: vi.fn(),
  mockSignOut: vi.fn(),
}));

// Mock redirect from next/navigation
vi.mock("next/navigation", () => ({
  redirect: mockRedirect,
}));

// Mock Supabase server client
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() =>
    Promise.resolve({
      auth: {
        signOut: mockSignOut,
      },
    })
  ),
}));

// Import the action after mocks are set up
import { signOut } from "./actions";

describe("signOut Server Action", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSignOut.mockResolvedValue({ error: null });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // Requirement 6.1: Supabaseセッションを破棄する
  describe("セッション破棄 (Req 6.1)", () => {
    it("should call supabase.auth.signOut to destroy the session", async () => {
      await signOut();

      expect(mockSignOut).toHaveBeenCalledTimes(1);
    });

    it("should handle signOut being called", async () => {
      mockSignOut.mockResolvedValue({ error: null });

      await signOut();

      expect(mockSignOut).toHaveBeenCalled();
    });
  });

  // Requirement 6.2: ログアウト完了時、ログインページにリダイレクト
  describe("リダイレクト (Req 6.2)", () => {
    it("should redirect to /auth/login after successful sign out", async () => {
      await signOut();

      expect(mockRedirect).toHaveBeenCalledWith("/auth/login");
    });

    it("should redirect to /auth/login even when signOut fails", async () => {
      mockSignOut.mockResolvedValue({ error: { message: "Sign out failed" } });

      await signOut();

      // Should still redirect even on error
      expect(mockRedirect).toHaveBeenCalledWith("/auth/login");
    });
  });

  // Error logging for Requirement 7.4
  describe("エラーログ (Req 7.4)", () => {
    it("should log error when signOut fails", async () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {
        // Suppress console.error output during test
      });
      mockSignOut.mockResolvedValue({ error: { message: "Sign out failed" } });

      await signOut();

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });
});
