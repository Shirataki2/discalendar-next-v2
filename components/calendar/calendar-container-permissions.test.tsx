/**
 * CalendarContainer 権限制御テスト
 *
 * Task 7.2: 権限ベースの表示制御
 * - canEditEvents が false の場合、追加ボタンを disabled にする
 * - canEditEvents が false の場合、編集・削除操作を非表示にする
 * - isLoading 時に操作ボタンを一時的に disabled にする
 *
 * Requirements: 5.1, 5.2, 5.5
 */
import { render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// キャプチャ変数
let capturedOnAddClick: (() => void) | undefined;
let capturedIsAddDisabled: boolean | undefined;
let capturedOnEdit: ((event: unknown) => void) | undefined;
let capturedOnDelete: ((event: unknown) => void) | undefined;

// EventServiceのモック
const mockFetchEvents = vi.fn().mockResolvedValue({
  success: true,
  data: [],
});

vi.mock("@/lib/calendar/event-service", () => ({
  createEventService: vi.fn(() => ({
    fetchEvents: mockFetchEvents,
    createEvent: vi.fn(),
    updateEvent: vi.fn(),
    deleteEvent: vi.fn(),
  })),
}));

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

vi.mock("next/navigation", () => ({
  useSearchParams: () => {
    const params = new URLSearchParams();
    params.set("view", "month");
    params.set("date", "2025-12-05");
    return params;
  },
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => "/dashboard",
}));

// CalendarToolbar モック（isAddDisabled をキャプチャ）
vi.mock("./calendar-toolbar", () => ({
  CalendarToolbar: ({
    onAddClick,
    isAddDisabled,
  }: {
    viewMode: string;
    selectedDate: Date;
    isMobile: boolean;
    onAddClick?: () => void;
    isAddDisabled?: boolean;
  }) => {
    capturedOnAddClick = onAddClick;
    capturedIsAddDisabled = isAddDisabled;
    return (
      <div data-testid="calendar-toolbar">
        {onAddClick ? (
          <button
            data-testid="mock-add-button"
            disabled={isAddDisabled}
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

vi.mock("./calendar-grid", () => ({
  CalendarGrid: ({ events }: { events: unknown[] }) => (
    <div data-testid="calendar-grid">{events.length} events</div>
  ),
}));

vi.mock("./event-popover", () => ({
  EventPopover: ({
    onEdit,
    onDelete,
  }: {
    event: unknown;
    open: boolean;
    onClose: () => void;
    onEdit?: (evt: unknown) => void;
    onDelete?: (evt: unknown) => void;
  }) => {
    capturedOnEdit = onEdit;
    capturedOnDelete = onDelete;
    return null;
  },
}));

vi.mock("./event-dialog", () => ({
  EventDialog: () => null,
}));

vi.mock("./confirm-dialog", () => ({
  ConfirmDialog: () => null,
}));

import { CalendarContainer } from "./calendar-container";

describe("CalendarContainer - 権限制御", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capturedOnAddClick = undefined;
    capturedIsAddDisabled = undefined;
    capturedOnEdit = undefined;
    capturedOnDelete = undefined;

    Object.defineProperty(window, "innerWidth", {
      writable: true,
      value: 1200,
    });

    mockFetchEvents.mockResolvedValue({ success: true, data: [] });
  });

  describe("Req 5.1: canEditEvents が false の場合", () => {
    it("追加ボタンは表示されるが disabled になる", async () => {
      render(<CalendarContainer canEditEvents={false} guildId="test-guild" />);

      await waitFor(() => {
        expect(capturedOnAddClick).toBeDefined();
      });

      expect(capturedIsAddDisabled).toBe(true);
    });

    it("編集・削除ハンドラーが undefined になる", async () => {
      render(<CalendarContainer canEditEvents={false} guildId="test-guild" />);

      await waitFor(() => {
        expect(capturedOnEdit).toBeUndefined();
        expect(capturedOnDelete).toBeUndefined();
      });
    });
  });

  describe("canEditEvents が true（デフォルト）の場合", () => {
    it("追加ボタンが有効化される", async () => {
      render(<CalendarContainer canEditEvents={true} guildId="test-guild" />);

      await waitFor(() => {
        expect(capturedOnAddClick).toBeDefined();
      });

      expect(capturedIsAddDisabled).toBeUndefined();
    });

    it("編集・削除ハンドラーが渡される", async () => {
      render(<CalendarContainer canEditEvents={true} guildId="test-guild" />);

      await waitFor(() => {
        expect(capturedOnEdit).toBeDefined();
        expect(capturedOnDelete).toBeDefined();
      });
    });
  });

  describe("canEditEvents 未指定時のデフォルト動作", () => {
    it("従来どおり編集可能（後方互換性）", async () => {
      render(<CalendarContainer guildId="test-guild" />);

      await waitFor(() => {
        expect(capturedOnAddClick).toBeDefined();
        expect(capturedOnEdit).toBeDefined();
        expect(capturedOnDelete).toBeDefined();
      });

      expect(capturedIsAddDisabled).toBeUndefined();
    });
  });
});
