/**
 * signOut Server Action の Sentry captureException テスト
 *
 * DIS-154: signOut でエラーが発生した場合に captureException が呼ばれることを検証
 *
 * Requirements: 1.2, 2.1, 3.3
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

// ──────────────────────────────────────────────
// Mocks
// ──────────────────────────────────────────────

const mockSignOut = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: {
      signOut: mockSignOut,
    },
  })),
}));

const mockCaptureException = vi.fn();
vi.mock("@sentry/nextjs", () => ({
  captureException: mockCaptureException,
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn(() => {
    throw new Error("NEXT_REDIRECT");
  }),
}));

describe("signOut Sentry captureException", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("signOut 成功時に captureException を呼ばない", async () => {
    mockSignOut.mockResolvedValue({ error: null });

    const { signOut } = await import("@/app/auth/actions");

    await expect(signOut()).rejects.toThrow("NEXT_REDIRECT");

    expect(mockCaptureException).not.toHaveBeenCalled();
  });

  it("signOut エラー時に captureException を呼ぶ", async () => {
    mockSignOut.mockResolvedValue({
      error: { message: "session not found" },
    });

    const { signOut } = await import("@/app/auth/actions");

    await expect(signOut()).rejects.toThrow("NEXT_REDIRECT");

    expect(mockCaptureException).toHaveBeenCalledOnce();
    expect(mockCaptureException).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining("[signOut]"),
      })
    );
    expect(mockCaptureException).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining("session not found"),
      })
    );
  });
});
