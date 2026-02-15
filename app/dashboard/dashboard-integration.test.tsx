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
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
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

// refreshGuilds Server Action モック
const mockRefreshGuilds = vi.fn();
vi.mock("@/app/dashboard/actions", () => ({
  refreshGuilds: (...args: unknown[]) => mockRefreshGuilds(...args),
}));

// 動的インポート
import type { Guild, InvitableGuild } from "@/lib/guilds/types";
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

      // エラーメッセージはモバイルとデスクトップの両方に表示される
      const errorMessages = screen.getAllByText("サーバーエラー");
      expect(errorMessages.length).toBeGreaterThan(0);
    });
  });
});

// ──────────────────────────────────────────────
// bot-invite-flow Task 5.1 & 5.2
// ──────────────────────────────────────────────

const mockInvitableGuilds: InvitableGuild[] = [
  {
    guildId: "inv-1",
    name: "Invitable Server A",
    avatarUrl: null,
  },
  {
    guildId: "inv-2",
    name: "Invitable Server B",
    avatarUrl: "https://example.com/icon2.png",
  },
];

describe("Task 5.1: Props 拡張と未参加ギルドセクション", () => {
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
    mockFetchEvents.mockResolvedValue({ success: true, data: [] });
  });

  it("invitableGuilds が渡された場合「BOT 未参加サーバー」セクションが表示される", () => {
    render(
      <DashboardWithCalendar
        guilds={mockGuilds}
        invitableGuilds={mockInvitableGuilds}
      />
    );

    // モバイル + デスクトップの両ビューに表示される
    const headings = screen.getAllByText("BOT 未参加サーバー");
    expect(headings.length).toBeGreaterThanOrEqual(1);
    // 2ギルド × 2ビュー(モバイル+デスクトップ) = 4カード
    const invitableCards = screen.getAllByTestId("invitable-guild-card");
    expect(invitableCards).toHaveLength(4);
  });

  it("invitableGuilds が空の場合は未参加セクションを非表示にする", () => {
    render(<DashboardWithCalendar guilds={mockGuilds} invitableGuilds={[]} />);

    expect(screen.queryByText("BOT 未参加サーバー")).not.toBeInTheDocument();
    expect(
      screen.queryByTestId("invitable-guild-card")
    ).not.toBeInTheDocument();
  });

  it("invitableGuilds が未指定の場合は未参加セクションを非表示にする", () => {
    render(<DashboardWithCalendar guilds={mockGuilds} />);

    expect(screen.queryByText("BOT 未参加サーバー")).not.toBeInTheDocument();
  });

  it("デスクトップサイドバーで参加済みギルドが先頭に、未参加が後に表示される", () => {
    const { container } = render(
      <DashboardWithCalendar
        guilds={mockGuilds}
        invitableGuilds={mockInvitableGuilds}
      />
    );

    // デスクトップサイドバー内で確認
    // biome-ignore lint/style/noNonNullAssertion: テスト内でのDOM要素取得
    const sidebar = container.querySelector("aside")!;

    const joinedCards = sidebar.querySelectorAll('[data-testid="guild-card"]');
    const invitableCards = sidebar.querySelectorAll(
      '[data-testid="invitable-guild-card"]'
    );

    expect(joinedCards.length).toBe(2);
    expect(invitableCards.length).toBe(2);

    // DOM 上で参加済みが先に来ることを確認
    const allCards = sidebar.querySelectorAll(
      '[data-testid="guild-card"], [data-testid="invitable-guild-card"]'
    );
    const firstJoinedIdx = Array.from(allCards).indexOf(joinedCards[0]);
    const firstInvitableIdx = Array.from(allCards).indexOf(invitableCards[0]);
    expect(firstJoinedIdx).toBeLessThan(firstInvitableIdx);
  });

  it("各グループ内はギルド名のアルファベット順にソートされる", () => {
    const unsortedGuilds: Guild[] = [
      {
        id: 2,
        guildId: "g2",
        name: "Zebra Server",
        avatarUrl: null,
        locale: "ja",
      },
      {
        id: 1,
        guildId: "g1",
        name: "Alpha Server",
        avatarUrl: null,
        locale: "ja",
      },
    ];
    const unsortedInvitable: InvitableGuild[] = [
      { guildId: "i2", name: "Zebra Invite", avatarUrl: null },
      { guildId: "i1", name: "Alpha Invite", avatarUrl: null },
    ];

    render(
      <DashboardWithCalendar
        guilds={unsortedGuilds}
        invitableGuilds={unsortedInvitable}
      />
    );

    // 参加済みギルドがアルファベット順
    const joinedCards = screen.getAllByTestId("guild-card");
    expect(joinedCards[0]).toHaveTextContent("Alpha Server");
    expect(joinedCards[1]).toHaveTextContent("Zebra Server");

    // 未参加ギルドもアルファベット順
    const invitableCards = screen.getAllByTestId("invitable-guild-card");
    expect(invitableCards[0]).toHaveTextContent("Alpha Invite");
    expect(invitableCards[1]).toHaveTextContent("Zebra Invite");
  });
});

describe("Task 5.2: useGuildRefresh の統合", () => {
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
    mockFetchEvents.mockResolvedValue({ success: true, data: [] });
  });

  it("invitableGuilds 存在時にタブ復帰で guilds が更新される", async () => {
    mockRefreshGuilds.mockResolvedValueOnce({
      guilds: [
        {
          id: 1,
          guildId: "guild-1",
          name: "Test Server 1",
          avatarUrl: null,
          locale: "ja",
        },
        {
          id: 3,
          guildId: "inv-1",
          name: "Invitable Server A",
          avatarUrl: null,
          locale: "ja",
        },
      ],
      invitableGuilds: [
        {
          guildId: "inv-2",
          name: "Invitable Server B",
          avatarUrl: "https://example.com/icon2.png",
        },
      ],
      guildPermissions: {},
    });

    const { container } = render(
      <DashboardWithCalendar
        guilds={mockGuilds}
        invitableGuilds={mockInvitableGuilds}
      />
    );

    // 初期状態（デスクトップサイドバー内で確認）
    // biome-ignore lint/style/noNonNullAssertion: テスト内でのDOM要素取得
    const sidebar = container.querySelector("aside")!;
    expect(sidebar.querySelectorAll('[data-testid="guild-card"]')).toHaveLength(
      2
    );
    expect(
      sidebar.querySelectorAll('[data-testid="invitable-guild-card"]')
    ).toHaveLength(2);

    // タブ復帰をシミュレート
    Object.defineProperty(document, "visibilityState", {
      value: "visible",
      writable: true,
    });
    // biome-ignore lint/suspicious/useAwait: React act() requires async callback
    await act(async () => {
      document.dispatchEvent(new Event("visibilitychange"));
    });

    // 更新後: 参加済み2 + 未参加1（inv-1 が参加済みに移動）
    await waitFor(() => {
      expect(
        sidebar.querySelectorAll('[data-testid="guild-card"]')
      ).toHaveLength(2);
      expect(
        sidebar.querySelectorAll('[data-testid="invitable-guild-card"]')
      ).toHaveLength(1);
    });
  });

  it("invitableGuilds が空の場合はリフレッシュフックを無効化する", () => {
    const addEventListenerSpy = vi.spyOn(document, "addEventListener");

    render(<DashboardWithCalendar guilds={mockGuilds} invitableGuilds={[]} />);

    // visibilitychange リスナーが登録されていないこと
    expect(addEventListenerSpy).not.toHaveBeenCalledWith(
      "visibilitychange",
      expect.any(Function)
    );

    addEventListenerSpy.mockRestore();
  });

  it("再取得中にローディングインジケーターが表示される", async () => {
    let resolveRefresh: (value: unknown) => void;
    mockRefreshGuilds.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveRefresh = resolve;
      })
    );

    render(
      <DashboardWithCalendar
        guilds={mockGuilds}
        invitableGuilds={mockInvitableGuilds}
      />
    );

    // タブ復帰を開始
    Object.defineProperty(document, "visibilityState", {
      value: "visible",
      writable: true,
    });
    // biome-ignore lint/suspicious/useAwait: React act() requires async callback
    await act(async () => {
      document.dispatchEvent(new Event("visibilitychange"));
    });

    // ローディングインジケーターが表示される
    await waitFor(() => {
      expect(screen.getByText("更新中...")).toBeInTheDocument();
    });

    // resolve して完了
    // biome-ignore lint/suspicious/useAwait: React act() requires async callback
    await act(async () => {
      // biome-ignore lint/style/noNonNullAssertion: テスト内のPromise resolve
      resolveRefresh!({
        guilds: mockGuilds,
        invitableGuilds: mockInvitableGuilds,
        guildPermissions: {},
      });
    });

    // ローディングインジケーターが消える
    expect(screen.queryByText("更新中...")).not.toBeInTheDocument();
  });
});
