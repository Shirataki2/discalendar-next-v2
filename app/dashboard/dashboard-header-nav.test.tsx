/**
 * ダッシュボードヘッダー ナビゲーションリンク テスト
 *
 * Task 3: ダッシュボードヘッダーにユーザーページへのナビゲーションリンクを追加する
 * - ダッシュボードヘッダーのアバター部分をクリック可能にし、ユーザーページへのリンクにする
 * - hover時の視覚的フィードバックを追加する
 * - 既存のアバター表示ロジックは変更しない
 *
 * Requirements: 1.3
 */
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

// CalendarContainerのモック
vi.mock("@/components/calendar/calendar-container", () => ({
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

import type { DashboardUser } from "./page";
import { DashboardPageLayout } from "./page";

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

describe("Task 3: ヘッダーのユーザーページナビゲーションリンク", () => {
  it("アバターと表示名がユーザーページへのリンクになっている", () => {
    render(
      <DashboardPageLayout guilds={[]} invitableGuilds={[]} user={mockUser} />
    );

    const link = screen.getByRole("link", { name: /Test User/ });
    expect(link).toHaveAttribute("href", "/dashboard/user");
  });

  it("アバター画像がリンク内に含まれている", () => {
    render(
      <DashboardPageLayout guilds={[]} invitableGuilds={[]} user={mockUser} />
    );

    const link = screen.getByRole("link", { name: /Test User/ });
    const avatar = link.querySelector("img");
    expect(avatar).toBeInTheDocument();
  });

  it("アバターなしの場合もリンクが表示される", () => {
    render(
      <DashboardPageLayout
        guilds={[]}
        invitableGuilds={[]}
        user={mockUserNoAvatar}
      />
    );

    const link = screen.getByRole("link", { name: /No Avatar/ });
    expect(link).toHaveAttribute("href", "/dashboard/user");
  });

  it("アバターなしの場合はイニシャルフォールバックがリンク内に含まれている", () => {
    render(
      <DashboardPageLayout
        guilds={[]}
        invitableGuilds={[]}
        user={mockUserNoAvatar}
      />
    );

    const link = screen.getByRole("link", { name: /No Avatar/ });
    expect(link).toHaveTextContent("N");
  });
});
