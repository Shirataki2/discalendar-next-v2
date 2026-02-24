/**
 * CalendarContainer アナリティクストラッキング 統合テスト
 *
 * Task 6.1: CRUD操作成功後に対応するカスタムイベントがキャプチャされることを検証する
 * PostHog SDKをモック化し、capture関数の呼び出しを検証する
 *
 * Requirements: 3.3, 3.4, 3.5, 5.2, 5.3
 */
import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// アナリティクスモジュールのモック（trackEventのスパイ）
const mockTrackEvent = vi.fn();
const mockMapNavigationDirection = vi.fn(
  (action: string) =>
    ({ PREV: "prev", NEXT: "next", TODAY: "today" })[action] as
      | "prev"
      | "next"
      | "today"
);
vi.mock("@/lib/analytics/events", () => ({
  trackEvent: (...args: unknown[]) => mockTrackEvent(...args),
  mapNavigationDirection: (...args: unknown[]) =>
    mockMapNavigationDirection(...args),
  getChangedEventFields: () => [],
}));

// CalendarToolbar コールバックキャプチャ用
let capturedOnViewChange:
  | ((mode: "day" | "week" | "month") => void)
  | undefined;
let capturedOnNavigate:
  | ((action: "PREV" | "NEXT" | "TODAY") => void)
  | undefined;

// CalendarGrid コールバックキャプチャ用
let capturedOnEventDrop:
  | ((args: {
      event: { id: string };
      start: Date;
      end: Date;
      isAllDay?: boolean;
    }) => void)
  | undefined;
let capturedOnEventResize:
  | ((args: { event: { id: string }; start: Date; end: Date }) => void)
  | undefined;

// EventPopover コールバックキャプチャ用
type MockEventType = {
  id: string;
  title: string;
  start: Date;
  end: Date;
  allDay: boolean;
  color: string;
};
let capturedOnDelete: ((event: MockEventType) => void) | undefined;

// Server Actionsのモック
const mockDeleteEventAction = vi.fn();
const mockUpdateEventAction = vi.fn();
vi.mock("@/app/dashboard/actions", () => ({
  createEventAction: vi.fn().mockResolvedValue({ success: true, data: {} }),
  updateEventAction: (...args: unknown[]) => mockUpdateEventAction(...args),
  deleteEventAction: (...args: unknown[]) => mockDeleteEventAction(...args),
  createRecurringEventAction: vi
    .fn()
    .mockResolvedValue({ success: true, data: {} }),
  updateOccurrenceAction: vi
    .fn()
    .mockResolvedValue({ success: true, data: {} }),
  deleteOccurrenceAction: vi
    .fn()
    .mockResolvedValue({ success: true, data: undefined }),
}));

// EventServiceのモック（読み取り専用: fetchEventsWithSeries のみ使用）
const mockFetchEventsWithSeries = vi.fn().mockResolvedValue({
  success: true,
  data: [],
});

vi.mock("@/lib/calendar/event-service", () => ({
  createEventService: vi.fn(() => ({
    fetchEventsWithSeries: mockFetchEventsWithSeries,
  })),
}));

// Supabaseクライアントのモック
vi.mock("@/lib/supabase/client", () => ({
  createClient: vi.fn(() => ({
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: {
          session: {
            user: { id: "test-user-id" },
            expires_at: Date.now() + 3_600_000,
          },
        },
        error: null,
      }),
    },
  })),
}));

// Next.js navigationのモック
vi.mock("next/navigation", () => ({
  useSearchParams: () => {
    const params = new URLSearchParams();
    params.set("view", "month");
    params.set("date", "2026-01-05");
    return params;
  },
  useRouter: () => ({
    push: vi.fn(),
  }),
  usePathname: () => "/dashboard",
}));

// CalendarToolbarのモック
vi.mock("@/components/calendar/calendar-toolbar", () => ({
  CalendarToolbar: ({
    onViewChange,
    onNavigate,
    onAddClick,
  }: {
    viewMode: string;
    selectedDate: Date;
    isMobile: boolean;
    onViewChange: (mode: "day" | "week" | "month") => void;
    onNavigate: (action: "PREV" | "NEXT" | "TODAY") => void;
    onAddClick?: () => void;
  }) => {
    capturedOnViewChange = onViewChange;
    capturedOnNavigate = onNavigate;
    return (
      <div data-testid="calendar-toolbar">
        {onAddClick ? (
          <button
            data-testid="mock-add-button"
            onClick={onAddClick}
            type="button"
          >
            追加
          </button>
        ) : null}
      </div>
    );
  },
}));

// CalendarGridのモック
vi.mock("@/components/calendar/calendar-grid", () => ({
  CalendarGrid: ({
    onEventDrop,
    onEventResize,
  }: {
    events: unknown[];
    viewMode: string;
    onSlotSelect?: unknown;
    onEventClick?: unknown;
    onEventDrop?: (args: {
      event: { id: string };
      start: Date;
      end: Date;
      isAllDay?: boolean;
    }) => void;
    onEventResize?: (args: {
      event: { id: string };
      start: Date;
      end: Date;
    }) => void;
    onDateChange?: unknown;
    selectedDate?: Date;
    today?: Date;
  }) => {
    capturedOnEventDrop = onEventDrop;
    capturedOnEventResize = onEventResize;
    return <div data-testid="calendar-grid">Grid</div>;
  },
}));

// EventDialogのモック
vi.mock("@/components/calendar/event-dialog", () => ({
  EventDialog: ({ open }: { open: boolean }) => {
    if (!open) {
      return null;
    }
    return <div data-testid="event-dialog">Dialog</div>;
  },
}));

// EventPopoverのモック
vi.mock("@/components/calendar/event-popover", () => ({
  EventPopover: ({
    open,
    onDelete,
  }: {
    event: MockEventType | null;
    open: boolean;
    onClose: () => void;
    onEdit?: unknown;
    onDelete?: (event: MockEventType) => void;
  }) => {
    capturedOnDelete = onDelete;
    if (!open) {
      return null;
    }
    return <div data-testid="event-popover">Popover</div>;
  },
}));

// ConfirmDialogのモック
let _capturedOnConfirm: (() => void) | undefined;
vi.mock("@/components/calendar/confirm-dialog", () => ({
  ConfirmDialog: ({
    open,
    onConfirm,
  }: {
    open: boolean;
    eventTitle: string;
    onConfirm: () => void;
    onOpenChange: (open: boolean) => void;
    isLoading?: boolean;
  }) => {
    _capturedOnConfirm = onConfirm;
    if (!open) {
      return null;
    }
    return (
      <div data-testid="confirm-dialog">
        <button
          data-testid="confirm-delete-btn"
          onClick={onConfirm}
          type="button"
        >
          削除確認
        </button>
      </div>
    );
  },
}));

import { CalendarContainer } from "@/components/calendar/calendar-container";

describe("CalendarContainer アナリティクストラッキング統合テスト", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capturedOnViewChange = undefined;
    capturedOnNavigate = undefined;
    capturedOnEventDrop = undefined;
    capturedOnEventResize = undefined;
    capturedOnDelete = undefined;
    _capturedOnConfirm = undefined;

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

  describe("ビュー切替のトラッキング (Req 5.2)", () => {
    it("ビューモード変更時にview_changedがキャプチャされる", async () => {
      render(<CalendarContainer guildId="test-guild" />);

      await waitFor(() => {
        expect(capturedOnViewChange).toBeDefined();
      });

      capturedOnViewChange?.("week");

      expect(mockTrackEvent).toHaveBeenCalledWith("view_changed", {
        view_type: "week",
      });
    });

    it("日表示に切り替え時にview_type: dayでキャプチャされる", async () => {
      render(<CalendarContainer guildId="test-guild" />);

      await waitFor(() => {
        expect(capturedOnViewChange).toBeDefined();
      });

      capturedOnViewChange?.("day");

      expect(mockTrackEvent).toHaveBeenCalledWith("view_changed", {
        view_type: "day",
      });
    });
  });

  describe("ナビゲーションのトラッキング (Req 5.3)", () => {
    it("前の期間への移動時にcalendar_navigatedがprevでキャプチャされる", async () => {
      render(<CalendarContainer guildId="test-guild" />);

      await waitFor(() => {
        expect(capturedOnNavigate).toBeDefined();
      });

      capturedOnNavigate?.("PREV");

      expect(mockTrackEvent).toHaveBeenCalledWith("calendar_navigated", {
        direction: "prev",
      });
    });

    it("次の期間への移動時にcalendar_navigatedがnextでキャプチャされる", async () => {
      render(<CalendarContainer guildId="test-guild" />);

      await waitFor(() => {
        expect(capturedOnNavigate).toBeDefined();
      });

      capturedOnNavigate?.("NEXT");

      expect(mockTrackEvent).toHaveBeenCalledWith("calendar_navigated", {
        direction: "next",
      });
    });

    it("今日ボタン押下時にcalendar_navigatedがtodayでキャプチャされる", async () => {
      render(<CalendarContainer guildId="test-guild" />);

      await waitFor(() => {
        expect(capturedOnNavigate).toBeDefined();
      });

      capturedOnNavigate?.("TODAY");

      expect(mockTrackEvent).toHaveBeenCalledWith("calendar_navigated", {
        direction: "today",
      });
    });
  });

  describe("イベント削除のトラッキング (Req 3.3)", () => {
    it("削除確認後にevent_deletedがキャプチャされる", async () => {
      mockDeleteEventAction.mockResolvedValue({
        success: true,
        data: undefined,
      });

      render(<CalendarContainer guildId="test-guild" />);

      await waitFor(() => {
        expect(capturedOnDelete).toBeDefined();
      });

      // 削除フローを開始（EventPopoverのonDeleteを呼び出し）
      const mockEvent: MockEventType = {
        id: "event-del-1",
        title: "削除対象",
        start: new Date("2026-01-10T10:00:00"),
        end: new Date("2026-01-10T11:00:00"),
        allDay: false,
        color: "#ef4444",
      };
      capturedOnDelete?.(mockEvent);

      // ConfirmDialogが表示される
      await waitFor(() => {
        expect(screen.getByTestId("confirm-dialog")).toBeInTheDocument();
      });

      // 削除確認ボタンをクリック
      const confirmBtn = screen.getByTestId("confirm-delete-btn");
      confirmBtn.click();

      await waitFor(() => {
        expect(mockTrackEvent).toHaveBeenCalledWith("event_deleted", {});
      });
    });
  });

  describe("ドラッグ操作のトラッキング (Req 3.4, 3.5)", () => {
    it("ドラッグ&ドロップ成功時にevent_movedがキャプチャされる", async () => {
      mockUpdateEventAction.mockResolvedValue({
        success: true,
        data: { id: "event-move-1" },
      });

      render(<CalendarContainer guildId="test-guild" />);

      await waitFor(() => {
        expect(capturedOnEventDrop).toBeDefined();
      });

      // ドラッグ&ドロップをシミュレート
      capturedOnEventDrop?.({
        event: { id: "event-move-1" },
        start: new Date("2026-01-11T10:00:00"),
        end: new Date("2026-01-11T11:00:00"),
      });

      await waitFor(() => {
        expect(mockTrackEvent).toHaveBeenCalledWith("event_moved", {
          method: "drag_and_drop",
        });
      });
    });

    it("ドラッグリサイズ成功時にevent_resizedがキャプチャされる", async () => {
      mockUpdateEventAction.mockResolvedValue({
        success: true,
        data: { id: "event-resize-1" },
      });

      render(<CalendarContainer guildId="test-guild" />);

      await waitFor(() => {
        expect(capturedOnEventResize).toBeDefined();
      });

      // リサイズをシミュレート
      capturedOnEventResize?.({
        event: { id: "event-resize-1" },
        start: new Date("2026-01-10T10:00:00"),
        end: new Date("2026-01-10T12:00:00"),
      });

      await waitFor(() => {
        expect(mockTrackEvent).toHaveBeenCalledWith("event_resized", {});
      });
    });

    it("ドラッグ&ドロップ失敗時にevent_movedがキャプチャされない", async () => {
      mockUpdateEventAction.mockResolvedValue({
        success: false,
        error: { code: "UPDATE_FAILED", message: "更新に失敗しました" },
      });

      render(<CalendarContainer guildId="test-guild" />);

      await waitFor(() => {
        expect(capturedOnEventDrop).toBeDefined();
      });

      capturedOnEventDrop?.({
        event: { id: "event-fail-1" },
        start: new Date("2026-01-11T10:00:00"),
        end: new Date("2026-01-11T11:00:00"),
      });

      // waitForを使って非同期処理完了を待つ
      await waitFor(() => {
        expect(mockFetchEventsWithSeries).toHaveBeenCalled();
      });

      expect(mockTrackEvent).not.toHaveBeenCalledWith(
        "event_moved",
        expect.any(Object)
      );
    });
  });
});
