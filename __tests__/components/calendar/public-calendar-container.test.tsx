import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PublicCalendarEvent } from "@/lib/calendar/public-calendar-service";

// Mock dependencies
const mockFetchPublicEvents = vi.fn();
vi.mock("@/lib/calendar/public-calendar-service", () => ({
  createPublicCalendarService: () => ({
    fetchPublicEvents: mockFetchPublicEvents,
  }),
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({}),
}));

vi.mock("@/hooks/calendar/use-media-query", () => ({
  useBreakpoint: () => ({ isMobile: false }),
}));

// CalendarGrid mock
vi.mock("@/components/calendar/calendar-grid", () => ({
  CalendarGrid: (props: {
    events: unknown[];
    onEventClick: unknown;
    onSlotSelect: unknown;
    onEventDrop: unknown;
    onEventResize: unknown;
  }) => (
    <div data-testid="calendar-grid">
      <span data-testid="event-count">{props.events.length}</span>
      <span data-testid="has-slot-select">{String(!!props.onSlotSelect)}</span>
      <span data-testid="has-event-drop">{String(!!props.onEventDrop)}</span>
      <span data-testid="has-event-resize">
        {String(!!props.onEventResize)}
      </span>
    </div>
  ),
}));

// CalendarToolbar mock
vi.mock("@/components/calendar/calendar-toolbar", () => ({
  CalendarToolbar: (props: {
    onAddClick: unknown;
    onSettingsClick: unknown;
    onNavigate: (action: string) => void;
    viewMode: string;
    selectedDate: Date;
  }) => (
    <div data-testid="calendar-toolbar">
      <span data-testid="has-add-click">{String(!!props.onAddClick)}</span>
      <span data-testid="has-settings-click">
        {String(!!props.onSettingsClick)}
      </span>
      <button
        data-testid="nav-prev"
        onClick={() => props.onNavigate("PREV")}
        type="button"
      >
        前
      </button>
      <button
        data-testid="nav-next"
        onClick={() => props.onNavigate("NEXT")}
        type="button"
      >
        次
      </button>
      <button
        data-testid="nav-today"
        onClick={() => props.onNavigate("TODAY")}
        type="button"
      >
        今日
      </button>
    </div>
  ),
}));

// EventPopover mock
vi.mock("@/components/calendar/event-popover", () => ({
  EventPopover: (props: {
    onEdit: unknown;
    onDelete: unknown;
    isAuthenticated: boolean;
  }) => (
    <div data-testid="event-popover">
      <span data-testid="has-edit">{String(!!props.onEdit)}</span>
      <span data-testid="has-delete">{String(!!props.onDelete)}</span>
      <span data-testid="is-authenticated">
        {String(props.isAuthenticated)}
      </span>
    </div>
  ),
}));

const sampleEvents: PublicCalendarEvent[] = [
  {
    id: "evt-1",
    title: "テストイベント1",
    start: new Date("2026-03-15T10:00:00Z"),
    end: new Date("2026-03-15T11:00:00Z"),
    allDay: false,
    color: "#3b82f6",
    description: "テスト説明",
    location: "東京",
  },
  {
    id: "evt-2",
    title: "テストイベント2",
    start: new Date("2026-03-20T09:00:00Z"),
    end: new Date("2026-03-20T17:00:00Z"),
    allDay: true,
    color: "#22c55e",
    description: undefined,
    location: undefined,
  },
];

describe("PublicCalendarContainer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetchPublicEvents.mockResolvedValue({
      success: true,
      data: sampleEvents,
    });
  });

  afterEach(() => {
    cleanup();
  });

  async function renderContainer(
    overrides: Partial<{
      guildId: string;
      guildName: string;
      initialEvents: PublicCalendarEvent[];
    }> = {}
  ) {
    const { PublicCalendarContainer } = await import(
      "@/components/calendar/public-calendar-container"
    );
    return render(
      <PublicCalendarContainer
        guildId={overrides.guildId ?? "guild-123"}
        guildName={overrides.guildName ?? "テストギルド"}
        initialEvents={overrides.initialEvents ?? sampleEvents}
      />
    );
  }

  it("初期イベントでカレンダーグリッドを表示する", async () => {
    await renderContainer();

    expect(screen.getByTestId("calendar-grid")).toBeInTheDocument();
    expect(screen.getByTestId("event-count")).toHaveTextContent("2");
  });

  it("ギルド名をヘッダーに表示する", async () => {
    await renderContainer({ guildName: "MyGuild" });

    expect(screen.getByText("MyGuild")).toBeInTheDocument();
  });

  it("追加ボタンハンドラーを渡さない（読み取り専用）", async () => {
    await renderContainer();

    expect(screen.getByTestId("has-add-click")).toHaveTextContent("false");
  });

  it("設定ボタンハンドラーを渡さない（読み取り専用）", async () => {
    await renderContainer();

    expect(screen.getByTestId("has-settings-click")).toHaveTextContent("false");
  });

  it("スロット選択ハンドラーを渡さない（読み取り専用）", async () => {
    await renderContainer();

    expect(screen.getByTestId("has-slot-select")).toHaveTextContent("false");
  });

  it("ドラッグ&ドロップハンドラーを渡さない（読み取り専用）", async () => {
    await renderContainer();

    expect(screen.getByTestId("has-event-drop")).toHaveTextContent("false");
    expect(screen.getByTestId("has-event-resize")).toHaveTextContent("false");
  });

  it("EventPopoverに編集・削除ハンドラーを渡さない", async () => {
    await renderContainer();

    expect(screen.getByTestId("has-edit")).toHaveTextContent("false");
    expect(screen.getByTestId("has-delete")).toHaveTextContent("false");
  });

  it("EventPopoverにisAuthenticated=falseを渡す", async () => {
    await renderContainer();

    expect(screen.getByTestId("is-authenticated")).toHaveTextContent("false");
  });

  it("ナビゲーション時にクライアントサイドでイベントを再フェッチする", async () => {
    const user = userEvent.setup();
    await renderContainer();

    // 初期レンダリングでは fetchPublicEvents は呼ばれない（initialEvents を使用）
    expect(mockFetchPublicEvents).not.toHaveBeenCalled();

    // 次月へナビゲーション
    await user.click(screen.getByTestId("nav-next"));

    // ナビゲーション後にfetchPublicEventsが呼ばれる
    await waitFor(() => {
      expect(mockFetchPublicEvents).toHaveBeenCalledTimes(1);
    });
  });

  it("ナビゲーション時にギルドIDと日付範囲でイベントを取得する", async () => {
    const user = userEvent.setup();
    await renderContainer({ guildId: "guild-abc" });

    await user.click(screen.getByTestId("nav-next"));

    await waitFor(() => {
      expect(mockFetchPublicEvents).toHaveBeenCalledWith(
        "guild-abc",
        expect.any(Date),
        expect.any(Date)
      );
    });
  });
});
