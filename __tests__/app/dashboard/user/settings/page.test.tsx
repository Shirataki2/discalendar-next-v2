import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock Next.js Image component
vi.mock("next/image", () => ({
  default: ({
    src,
    alt,
    width,
    height,
    ...props
  }: {
    src: string;
    alt: string;
    width?: number;
    height?: number;
    [key: string]: unknown;
  }) => (
    // biome-ignore lint/performance/noImgElement: Mock component for testing
    <img alt={alt} height={height} src={src} width={width} {...props} />
  ),
}));

// Mock Next.js Link component
vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: React.ReactNode;
    [key: string]: unknown;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

// Mock ThemeSettingPanel
vi.mock("@/components/settings/theme-setting-panel", () => ({
  ThemeSettingPanel: () => (
    <div data-testid="theme-setting-panel">ThemeSettingPanel</div>
  ),
}));

// Mock CalendarViewSettingPanel
vi.mock("@/components/settings/calendar-view-setting-panel", () => ({
  CalendarViewSettingPanel: () => (
    <div data-testid="calendar-view-setting-panel">
      CalendarViewSettingPanel
    </div>
  ),
}));

import { UserSettingsPageLayout } from "@/app/dashboard/user/settings/user-settings-page-layout";
import type { DashboardUser } from "@/types/user";

const mockUser: DashboardUser = {
  id: "user-123",
  email: "test@example.com",
  fullName: "Test User",
  avatarUrl: "https://cdn.discordapp.com/avatars/123/abc.png",
};

describe("UserSettingsPageLayout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  describe("ページ構造とレイアウト (Req 1.3, 1.4, 1.5)", () => {
    it("should render page heading '設定'", () => {
      render(<UserSettingsPageLayout user={mockUser} />);

      const heading = screen.getByRole("heading", { name: /設定/i });
      expect(heading).toBeInTheDocument();
    });

    it("should render main content area", () => {
      render(<UserSettingsPageLayout user={mockUser} />);

      expect(screen.getByRole("main")).toBeInTheDocument();
    });

    it("should render back link to dashboard", () => {
      render(<UserSettingsPageLayout user={mockUser} />);

      const backLink = screen.getByRole("link", { name: /ダッシュボード/i });
      expect(backLink).toBeInTheDocument();
      expect(backLink).toHaveAttribute("href", "/dashboard");
    });
  });

  describe("DashboardHeader 表示 (Req 1.3)", () => {
    it("should render DashboardHeader with user info", () => {
      render(<UserSettingsPageLayout user={mockUser} />);

      expect(screen.getByText("Discalendar")).toBeInTheDocument();
    });
  });

  describe("設定セクション表示 (Req 1.5)", () => {
    it("should render ThemeSettingPanel", () => {
      render(<UserSettingsPageLayout user={mockUser} />);

      expect(screen.getByTestId("theme-setting-panel")).toBeInTheDocument();
    });

    it("should render CalendarViewSettingPanel", () => {
      render(<UserSettingsPageLayout user={mockUser} />);

      expect(
        screen.getByTestId("calendar-view-setting-panel")
      ).toBeInTheDocument();
    });

    it("should render theme section with title and description", () => {
      render(<UserSettingsPageLayout user={mockUser} />);

      expect(screen.getByText("テーマ")).toBeInTheDocument();
      expect(
        screen.getByText(/アプリケーションの表示テーマを選択します/)
      ).toBeInTheDocument();
    });

    it("should render calendar view section with title and description", () => {
      render(<UserSettingsPageLayout user={mockUser} />);

      expect(
        screen.getByText("カレンダーデフォルトビュー")
      ).toBeInTheDocument();
      expect(
        screen.getByText(/カレンダーを開いた時のデフォルト表示を選択します/)
      ).toBeInTheDocument();
    });
  });
});
