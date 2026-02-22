/**
 * DashboardWithCalendar ギルド切替アナリティクス 統合テスト
 *
 * Task 6.1: guild_switchedイベントが正しいプロパティでキャプチャされることを検証する
 * PostHog SDKをモック化し、capture関数の呼び出しを検証する
 *
 * Requirements: 4.1, 4.2
 */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

// アナリティクスモジュールのモック（trackEventのスパイ）
const mockTrackEvent = vi.fn();
vi.mock("@/lib/analytics/events", () => ({
  trackEvent: (...args: unknown[]) => mockTrackEvent(...args),
}));

// CalendarContainerのモック
vi.mock("@/components/calendar/calendar-container", () => ({
  CalendarContainer: ({ guildId }: { guildId: string | null }) => (
    <div data-testid="calendar-container">Calendar: {guildId ?? "none"}</div>
  ),
}));

// GuildSettingsPanelのモック
vi.mock("@/components/guilds/guild-settings-panel", () => ({
  GuildSettingsPanel: () => <div data-testid="guild-settings-panel" />,
}));

// GuildIconButtonのモック（折りたたみ時のアイコンボタン）
vi.mock("@/components/guilds/guild-icon-button", () => ({
  GuildIconButton: ({
    guild,
    isSelected,
    onSelect,
  }: {
    guild: { guildId: string; name: string };
    isSelected: boolean;
    onSelect: (guildId: string) => void;
  }) => (
    <button
      aria-pressed={isSelected}
      data-testid={`guild-icon-${guild.guildId}`}
      onClick={() => onSelect(guild.guildId)}
      type="button"
    >
      {guild.name}
    </button>
  ),
}));

// SelectableGuildCardのモック（展開時のカード）
vi.mock("@/components/guilds/selectable-guild-card", () => ({
  SelectableGuildCard: ({
    guild,
    isSelected,
    onSelect,
  }: {
    guild: { guildId: string; name: string };
    isSelected: boolean;
    onSelect: (guildId: string) => void;
  }) => (
    <button
      aria-pressed={isSelected}
      data-testid={`guild-card-${guild.guildId}`}
      onClick={() => onSelect(guild.guildId)}
      type="button"
    >
      {guild.name}
    </button>
  ),
}));

// InvitableGuildCardのモック
vi.mock("@/components/guilds/invitable-guild-card", () => ({
  InvitableGuildCard: () => <div data-testid="invitable-guild-card" />,
}));

// shadcn/ui Selectのモック（Radix UIはjsdomで動作しないため）
vi.mock("@/components/ui/select", () => ({
  Select: ({
    children,
    onValueChange: _onValueChange,
    value,
  }: {
    children: React.ReactNode;
    onValueChange?: (value: string) => void;
    value?: string;
  }) => (
    <div data-testid="mock-select" data-value={value}>
      {children}
    </div>
  ),
  SelectContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  SelectItem: ({
    children,
    value,
  }: {
    children: React.ReactNode;
    value: string;
  }) => <div data-value={value}>{children}</div>,
  SelectTrigger: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  SelectValue: ({ placeholder }: { placeholder?: string }) => (
    <span>{placeholder}</span>
  ),
}));

// Hooksのモック
vi.mock("@/hooks/guilds/use-guild-permissions", () => ({
  useGuildPermissions: () => ({
    canManageGuild: false,
    canEditEvents: true,
    isLoading: false,
  }),
}));

vi.mock("@/hooks/guilds/use-guild-refresh", () => ({
  useGuildRefresh: () => ({
    isRefreshing: false,
  }),
}));

vi.mock("@/hooks/use-local-storage", () => ({
  useLocalStorage: (_key: string, defaultValue: unknown) => [
    defaultValue,
    vi.fn(),
  ],
}));

import {
  DashboardWithCalendar,
  type DashboardWithCalendarProps,
} from "@/app/dashboard/dashboard-with-calendar";

const testGuilds = [
  {
    guildId: "guild-aaa",
    name: "テストサーバーA",
    icon: null,
    botJoined: true,
    memberCount: 10,
    features: [],
  },
  {
    guildId: "guild-bbb",
    name: "テストサーバーB",
    icon: null,
    botJoined: true,
    memberCount: 20,
    features: [],
  },
];

describe("DashboardWithCalendar ギルド切替トラッキング統合テスト", () => {
  const defaultProps: DashboardWithCalendarProps = {
    guilds: testGuilds,
    invitableGuilds: [],
    guildPermissions: {},
  };

  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: true,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      value: 1200,
    });
  });

  it("ギルドカードクリック時にguild_switchedがキャプチャされる (Req 4.1)", async () => {
    const user = userEvent.setup();
    render(<DashboardWithCalendar {...defaultProps} />);

    // ギルドカードをクリック
    const guildCard = screen.getByTestId("guild-card-guild-aaa");
    await user.click(guildCard);

    expect(mockTrackEvent).toHaveBeenCalledWith("guild_switched", {
      guild_id: "guild-aaa",
    });
  });

  it("別のギルドに切り替え時にguild_switchedが正しいguild_idでキャプチャされる (Req 4.2)", async () => {
    const user = userEvent.setup();
    render(<DashboardWithCalendar {...defaultProps} />);

    // まずギルドAを選択
    const guildCardA = screen.getByTestId("guild-card-guild-aaa");
    await user.click(guildCardA);

    mockTrackEvent.mockClear();

    // ギルドBに切り替え
    const guildCardB = screen.getByTestId("guild-card-guild-bbb");
    await user.click(guildCardB);

    expect(mockTrackEvent).toHaveBeenCalledWith("guild_switched", {
      guild_id: "guild-bbb",
    });
  });

  it("guild_switchedにギルド名が含まれない（PII除外）(Req 4.2)", async () => {
    const user = userEvent.setup();
    render(<DashboardWithCalendar {...defaultProps} />);

    const guildCard = screen.getByTestId("guild-card-guild-aaa");
    await user.click(guildCard);

    // trackEventコールを取得
    const trackCall = mockTrackEvent.mock.calls.find(
      (call: unknown[]) => call[0] === "guild_switched"
    );
    expect(trackCall).toBeDefined();
    const properties = trackCall?.[1] as Record<string, unknown>;

    // ギルドIDのみが含まれ、名前やその他PIIは含まれない
    expect(properties).toEqual({ guild_id: "guild-aaa" });
    expect(properties).not.toHaveProperty("name");
    expect(properties).not.toHaveProperty("guild_name");
    expect(properties).not.toHaveProperty("icon");
  });
});
