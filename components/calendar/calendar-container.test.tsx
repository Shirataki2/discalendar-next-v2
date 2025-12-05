/**
 * CalendarContainer テストスイート
 *
 * タスク3.3: CalendarContainerコンポーネントの実装
 * - ギルドIDを受け取りEventServiceでイベントを取得する
 * - ギルド選択変更時にイベントデータを再取得する
 * - ギルド未選択時は空のカレンダーグリッドを表示する
 * - 子コンポーネント（Toolbar, Grid）にデータとハンドラーを配布する
 *
 * Requirements: 5.1, 5.2
 */
import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// EventServiceのモック
vi.mock("@/lib/calendar/event-service", () => ({
  createEventService: vi.fn(() => ({
    fetchEvents: vi.fn().mockResolvedValue({
      success: true,
      data: [],
    }),
  })),
}));

// Supabaseクライアントのモック
vi.mock("@/lib/supabase/client", () => ({
  createClient: vi.fn(() => ({})),
}));

// Next.js navigationのモック
vi.mock("next/navigation", () => ({
  useSearchParams: () => {
    const params = new URLSearchParams();
    params.set("view", "month");
    params.set("date", "2025-12-05");
    return params;
  },
  useRouter: () => ({
    push: vi.fn(),
  }),
  usePathname: () => "/dashboard",
}));

// 子コンポーネントのモック
vi.mock("./calendar-toolbar", () => ({
  CalendarToolbar: ({
    viewMode,
    selectedDate,
  }: {
    viewMode: string;
    selectedDate: Date;
  }) => (
    <div data-testid="calendar-toolbar">
      Toolbar: {viewMode} - {selectedDate.toISOString()}
    </div>
  ),
}));

vi.mock("./calendar-grid", () => ({
  CalendarGrid: ({
    events,
    viewMode,
  }: {
    events: unknown[];
    viewMode: string;
  }) => (
    <div data-testid="calendar-grid">
      Grid: {viewMode} - {events.length} events
    </div>
  ),
}));

import { createEventService } from "@/lib/calendar/event-service";
// Import after mocks
import { CalendarContainer } from "./calendar-container";

describe("CalendarContainer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("ギルド未選択時の動作 (Req 5.2)", () => {
    it("ギルドIDがnullの場合、空のカレンダーグリッドを表示する", () => {
      render(<CalendarContainer guildId={null} />);

      // ツールバーとグリッドが表示されること
      expect(screen.getByTestId("calendar-toolbar")).toBeInTheDocument();
      expect(screen.getByTestId("calendar-grid")).toBeInTheDocument();

      // イベントが0件であること
      expect(screen.getByTestId("calendar-grid")).toHaveTextContent("0 events");
    });

    it("ギルドIDが空文字列の場合、空のカレンダーグリッドを表示する", () => {
      render(<CalendarContainer guildId="" />);

      expect(screen.getByTestId("calendar-grid")).toHaveTextContent("0 events");
    });
  });

  describe("イベントデータの取得 (Req 5.1)", () => {
    it("ギルドIDが指定された場合、EventServiceでイベントを取得する", async () => {
      const mockFetchEvents = vi.fn().mockResolvedValue({
        success: true,
        data: [
          {
            id: "event-1",
            title: "テストイベント",
            start: new Date("2025-12-05T10:00:00Z"),
            end: new Date("2025-12-05T11:00:00Z"),
            allDay: false,
            color: "#3b82f6",
          },
        ],
      });

      vi.mocked(createEventService).mockReturnValue({
        fetchEvents: mockFetchEvents,
      });

      render(<CalendarContainer guildId="test-guild-123" />);

      // イベント取得が完了したらデータが表示されること
      await waitFor(() => {
        expect(screen.getByTestId("calendar-grid")).toHaveTextContent(
          "1 events"
        );
      });

      // fetchEventsが正しいパラメータで呼ばれたこと
      expect(mockFetchEvents).toHaveBeenCalledWith(
        expect.objectContaining({
          guildId: "test-guild-123",
          startDate: expect.any(Date),
          endDate: expect.any(Date),
        })
      );
    });
  });

  describe("エラーハンドリング (Req 5.4)", () => {
    it("イベント取得に失敗した場合、エラーメッセージを表示する", async () => {
      const mockFetchEvents = vi.fn().mockResolvedValue({
        success: false,
        error: {
          code: "FETCH_FAILED",
          message: "イベントの取得に失敗しました。",
        },
      });

      vi.mocked(createEventService).mockReturnValue({
        fetchEvents: mockFetchEvents,
      });

      render(<CalendarContainer guildId="test-guild" />);

      // エラーメッセージが表示されること
      await waitFor(() => {
        expect(
          screen.getByText("イベントの取得に失敗しました。")
        ).toBeInTheDocument();
      });

      // 再試行ボタンが表示されること
      const retryButton = screen.getByRole("button", { name: "再試行" });
      expect(retryButton).toBeInTheDocument();
    });
  });
});
