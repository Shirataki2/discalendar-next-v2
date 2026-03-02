/**
 * ダッシュボードヘッダー ナビゲーション テスト
 *
 * DashboardHeader 内の UserMenu ドロップダウンから
 * ユーザーページへのナビゲーションが可能であることを検証する。
 *
 * Requirements: 1.3, 4.2
 */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

// CalendarContainerのモック
vi.mock("@/components/calendar/calendar-container", () => ({
  // biome-ignore lint/correctness/noUnusedFunctionParameters: mock signature
  CalendarContainer: ({ guildId }: { guildId: string | null }) => (
    <div data-testid="calendar-container">Calendar</div>
  ),
}));

// Supabaseクライアントのモック
vi.mock("@/lib/supabase/client", () => ({
  createClient: vi.fn(() => ({})),
}));

// Next.js navigationのモック
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => "/dashboard",
}));

// refreshGuilds Server Action モック
vi.mock("@/app/dashboard/actions", () => ({
  refreshGuilds: vi.fn(),
}));

// signOut Server Action モック
vi.mock("@/app/auth/actions", () => ({
  signOut: vi.fn(),
}));

import type { DashboardUser } from "./page";
import { DashboardPageLayout } from "./page";

const USER_MENU_PATTERN = /ユーザーメニュー/i;
const PROFILE_PATTERN = /プロフィール/i;
const SETTINGS_PATTERN = /設定/i;

const mockUser: DashboardUser = {
  id: "user-1",
  email: "test@example.com",
  fullName: "Test User",
  avatarUrl: "https://cdn.discordapp.com/avatars/123/abc.png",
};

const mockUserNoAvatar: DashboardUser = {
  id: "user-2",
  email: "noavatar@example.com",
  fullName: "No Avatar",
  avatarUrl: null,
};

describe("ヘッダーのユーザーメニューナビゲーション", () => {
  it("ユーザーメニューボタンに表示名が含まれている", () => {
    render(
      <DashboardPageLayout guilds={[]} invitableGuilds={[]} user={mockUser} />
    );

    const menuButton = screen.getByRole("button", {
      name: USER_MENU_PATTERN,
    });
    expect(menuButton).toBeInTheDocument();
    expect(menuButton).toHaveTextContent("Test User");
  });

  it("ユーザーメニューを開くとプロフィールリンクが表示される", async () => {
    const user = userEvent.setup();
    render(
      <DashboardPageLayout guilds={[]} invitableGuilds={[]} user={mockUser} />
    );

    await user.click(screen.getByRole("button", { name: USER_MENU_PATTERN }));

    const profileItem = screen.getByRole("menuitem", {
      name: PROFILE_PATTERN,
    });
    expect(profileItem.closest("a")).toHaveAttribute("href", "/dashboard/user");
  });

  it("ユーザーメニューを開くと設定リンクが表示される", async () => {
    const user = userEvent.setup();
    render(
      <DashboardPageLayout guilds={[]} invitableGuilds={[]} user={mockUser} />
    );

    await user.click(screen.getByRole("button", { name: USER_MENU_PATTERN }));

    const settingsItem = screen.getByRole("menuitem", {
      name: SETTINGS_PATTERN,
    });
    expect(settingsItem.closest("a")).toHaveAttribute(
      "href",
      "/dashboard/user/settings"
    );
  });

  it("アバターなしの場合もユーザーメニューが表示される", () => {
    render(
      <DashboardPageLayout
        guilds={[]}
        invitableGuilds={[]}
        user={mockUserNoAvatar}
      />
    );

    const menuButton = screen.getByRole("button", {
      name: USER_MENU_PATTERN,
    });
    expect(menuButton).toBeInTheDocument();
    expect(menuButton).toHaveTextContent("No Avatar");
  });
});
