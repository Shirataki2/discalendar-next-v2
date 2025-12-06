/**
 * ダッシュボード統合テスト
 *
 * Task 10.1: ダッシュボードページへのカレンダー統合
 * - ダッシュボードページにCalendarContainerを配置する
 * - ギルドセレクターとカレンダーを連携させる
 * - ギルド選択変更時にカレンダーを更新する
 * - 初期ロード時のデータ取得フローを確立する
 *
 * Task 10.2: ローディングとエラー状態のUI実装
 * - イベントデータ読み込み中のローディングインジケーターを表示する
 * - データ取得失敗時のエラーメッセージを表示する
 * - 再試行ボタンを提供し、エラーからの回復を可能にする
 *
 * Requirements: 5.1, 5.2, 5.3, 5.4
 */
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// EventServiceのモック
const mockFetchEvents = vi.fn();
vi.mock("@/lib/calendar/event-service", () => ({
  createEventService: vi.fn(() => ({
    fetchEvents: mockFetchEvents,
  })),
}));

// Supabaseクライアントのモック
vi.mock("@/lib/supabase/client", () => ({
  createClient: vi.fn(() => ({})),
}));

// Next.js navigationのモック
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useSearchParams: () => {
    const params = new URLSearchParams();
    params.set("view", "month");
    params.set("date", "2025-12-05");
    return params;
  },
  useRouter: () => ({
    push: mockPush,
  }),
  usePathname: () => "/dashboard",
}));

// CalendarContainerのモック（統合テスト用）
vi.mock("@/components/calendar/calendar-container", () => ({
  CalendarContainer: ({ guildId }: { guildId: string | null }) => (
    <div data-guild-id={guildId ?? "null"} data-testid="calendar-container">
      Calendar for guild: {guildId ?? "none"}
    </div>
  ),
}));

// 動的インポート
import type { Guild } from "@/lib/guilds/types";
import { DashboardWithCalendar } from "./dashboard-with-calendar";

// matchMediaのモック
const createMatchMediaMock = () =>
  vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));

const mockGuilds: Guild[] = [
  {
    id: 1,
    guildId: "guild-1",
    name: "Test Server 1",
    avatarUrl: null,
    locale: "ja",
  },
  {
    id: 2,
    guildId: "guild-2",
    name: "Test Server 2",
    avatarUrl: "https://example.com/icon.png",
    locale: "ja",
  },
];

// 正規表現パターン（トップレベルで定義）
const SELECT_PROMPT_PATTERN = /サーバーを選択してカレンダーを表示/;

describe("Task 10.1: ダッシュボードページへのカレンダー統合", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: createMatchMediaMock(),
    });
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      value: 1200,
    });
    mockFetchEvents.mockResolvedValue({
      success: true,
      data: [],
    });
  });

  describe("Req 5.2: ギルド選択連携", () => {
    it("ギルドカードをクリックするとそのギルドのカレンダーが表示される", async () => {
      render(<DashboardWithCalendar guilds={mockGuilds} />);

      // 初期状態ではカレンダーコンテナが存在しない（プロンプトが表示される）
      expect(
        screen.queryByTestId("calendar-container")
      ).not.toBeInTheDocument();
      expect(screen.getByText(SELECT_PROMPT_PATTERN)).toBeInTheDocument();

      // 最初のギルドカードをクリック
      const guildCards = screen.getAllByTestId("guild-card");
      expect(guildCards.length).toBe(2);

      fireEvent.click(guildCards[0]);

      // カレンダーが選択されたギルドIDで表示されること
      await waitFor(() => {
        expect(screen.getByTestId("calendar-container")).toHaveAttribute(
          "data-guild-id",
          "guild-1"
        );
      });
    });

    it("別のギルドカードをクリックするとカレンダーが更新される", async () => {
      render(<DashboardWithCalendar guilds={mockGuilds} />);

      const guildCards = screen.getAllByTestId("guild-card");

      // 最初のギルドを選択
      fireEvent.click(guildCards[0]);
      await waitFor(() => {
        expect(screen.getByTestId("calendar-container")).toHaveAttribute(
          "data-guild-id",
          "guild-1"
        );
      });

      // 2番目のギルドを選択
      fireEvent.click(guildCards[1]);
      await waitFor(() => {
        expect(screen.getByTestId("calendar-container")).toHaveAttribute(
          "data-guild-id",
          "guild-2"
        );
      });
    });

    it("選択中のギルドカードが視覚的にハイライトされる", async () => {
      render(<DashboardWithCalendar guilds={mockGuilds} />);

      const guildCards = screen.getAllByTestId("guild-card");

      // 初期状態では選択状態なし
      expect(guildCards[0]).not.toHaveAttribute("data-selected", "true");

      // ギルドを選択
      fireEvent.click(guildCards[0]);

      await waitFor(() => {
        expect(guildCards[0]).toHaveAttribute("data-selected", "true");
        expect(guildCards[1]).not.toHaveAttribute("data-selected", "true");
      });
    });
  });

  describe("Req 5.1: 初期ロード時のデータ取得", () => {
    it("ギルド選択後にカレンダーコンテナがダッシュボードに配置される", async () => {
      render(<DashboardWithCalendar guilds={mockGuilds} />);

      // ギルドを選択
      const guildCards = screen.getAllByTestId("guild-card");
      fireEvent.click(guildCards[0]);

      await waitFor(() => {
        expect(screen.getByTestId("calendar-container")).toBeInTheDocument();
      });
    });

    it("ギルド一覧とカレンダーエリアが同時に表示される", async () => {
      render(<DashboardWithCalendar guilds={mockGuilds} />);

      // ギルド一覧が表示されること
      expect(screen.getAllByTestId("guild-card").length).toBe(2);

      // ギルドを選択するとカレンダーが表示されること
      fireEvent.click(screen.getAllByTestId("guild-card")[0]);
      await waitFor(() => {
        expect(screen.getByTestId("calendar-container")).toBeInTheDocument();
      });
    });
  });
});

describe("Task 10.2: ローディングとエラー状態のUI実装", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: createMatchMediaMock(),
    });
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      value: 1200,
    });
  });

  describe("Req 5.3: ローディング状態", () => {
    it("ギルド未選択時は選択を促すメッセージが表示される", () => {
      render(<DashboardWithCalendar guilds={mockGuilds} />);

      expect(screen.getByText(SELECT_PROMPT_PATTERN)).toBeInTheDocument();
    });
  });

  describe("Req 5.4: エラー状態", () => {
    it("ギルド取得エラー時はエラーメッセージが表示される", () => {
      render(
        <DashboardWithCalendar
          guildError={{ type: "api_error", message: "サーバーエラー" }}
          guilds={[]}
        />
      );

      expect(screen.getByText("サーバーエラー")).toBeInTheDocument();
    });
  });
});
