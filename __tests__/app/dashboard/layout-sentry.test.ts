import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockGetUser, mockRedirect, mockSetUser } = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockRedirect: vi.fn(),
  mockSetUser: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: mockRedirect,
}));

vi.mock("@sentry/nextjs", () => ({
  setUser: mockSetUser,
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() =>
    Promise.resolve({
      auth: {
        getUser: mockGetUser,
      },
    })
  ),
}));

import DashboardLayout from "@/app/dashboard/layout";

describe("DashboardLayout Sentry user context", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("認証済みユーザーのIDでSentry.setUserが呼ばれる", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-uuid-789" } },
    });

    await DashboardLayout({ children: null });

    expect(mockSetUser).toHaveBeenCalledWith({ id: "user-uuid-789" });
  });

  it("未認証の場合はリダイレクトされSentry.setUserが呼ばれない", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
    });
    mockRedirect.mockImplementation(() => {
      throw new Error("NEXT_REDIRECT");
    });

    await expect(DashboardLayout({ children: null })).rejects.toThrow(
      "NEXT_REDIRECT"
    );

    expect(mockSetUser).not.toHaveBeenCalled();
    expect(mockRedirect).toHaveBeenCalledWith("/auth/login");
  });
});
