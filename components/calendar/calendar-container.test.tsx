/**
 * CalendarContainer テストスイート
 *
 * タスク3.3: CalendarContainerコンポーネントの実装
 * - ギルドIDを受け取りEventServiceでイベントを取得する
 * - ギルド選択変更時にイベントデータを再取得する
 * - ギルド未選択時は空のカレンダーグリッドを表示する
 * - 子コンポーネント（Toolbar, Grid）にデータとハンドラーを配布する
 *
 * タスク7.1: 予定作成フローの統合
 * - 新規追加ボタンクリック時にEventDialogを表示
 * - CalendarGridのスロット選択時にEventDialogを表示
 * - 予定保存成功時にfetchEventsを再呼び出し
 *
 * Requirements: 1.1, 1.2, 1.4, 1.5, 5.1, 5.2
 */
import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SlotSelectInfo } from "./calendar-grid";

// コールバックをキャプチャするための変数
let capturedOnAddClick: (() => void) | undefined;
let capturedOnSlotSelect: ((slotInfo: SlotSelectInfo) => void) | undefined;

// EventServiceのモック
const mockCreateEvent = vi.fn();
const mockUpdateEvent = vi.fn();
const mockDeleteEvent = vi.fn();
const mockFetchEvents = vi.fn().mockResolvedValue({
  success: true,
  data: [],
});

vi.mock("@/lib/calendar/event-service", () => ({
  createEventService: vi.fn(() => ({
    fetchEvents: mockFetchEvents,
    createEvent: mockCreateEvent,
    updateEvent: mockUpdateEvent,
    deleteEvent: mockDeleteEvent,
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
    isMobile,
    onAddClick,
  }: {
    viewMode: string;
    selectedDate: Date;
    isMobile: boolean;
    onAddClick?: () => void;
  }) => {
    // onAddClickをキャプチャ
    capturedOnAddClick = onAddClick;
    return (
      <div data-mobile={isMobile} data-testid="calendar-toolbar">
        Toolbar: {viewMode} - {selectedDate.toISOString()} - mobile:{" "}
        {isMobile.toString()}
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

vi.mock("./calendar-grid", () => ({
  CalendarGrid: ({
    events,
    viewMode,
    onSlotSelect,
  }: {
    events: unknown[];
    viewMode: string;
    onSlotSelect?: (slotInfo: SlotSelectInfo) => void;
  }) => {
    // onSlotSelectをキャプチャ
    capturedOnSlotSelect = onSlotSelect;
    return (
      <div data-testid="calendar-grid">
        Grid: {viewMode} - {events.length} events
      </div>
    );
  },
}));

// EventDialogのモック
vi.mock("./event-dialog", () => ({
  EventDialog: ({
    open,
    mode,
    initialData,
    eventId,
    onClose,
    onSuccess,
  }: {
    open: boolean;
    mode: "create" | "edit";
    initialData?: { startAt?: Date; endAt?: Date; title?: string };
    eventId?: string;
    onClose: () => void;
    onSuccess: () => void;
  }) => {
    if (!open) {
      return null;
    }
    return (
      <div data-mode={mode} data-testid="event-dialog">
        <span data-testid="dialog-mode">{mode}</span>
        {eventId ? <span data-testid="dialog-event-id">{eventId}</span> : null}
        {initialData?.title ? (
          <span data-testid="dialog-title">{initialData.title}</span>
        ) : null}
        {initialData?.startAt ? (
          <span data-testid="dialog-start-at">
            {initialData.startAt.toISOString()}
          </span>
        ) : null}
        {initialData?.endAt ? (
          <span data-testid="dialog-end-at">
            {initialData.endAt.toISOString()}
          </span>
        ) : null}
        <button data-testid="dialog-close" onClick={onClose} type="button">
          閉じる
        </button>
        <button data-testid="dialog-success" onClick={onSuccess} type="button">
          保存成功
        </button>
      </div>
    );
  },
}));

// EventPopoverのモック用型
type MockEventType = { id: string; title: string };

// EventPopoverのモック
vi.mock("./event-popover", () => ({
  EventPopover: ({
    event: popoverEvent,
    open,
    onEdit,
    onDelete,
  }: {
    event: MockEventType | null;
    open: boolean;
    onClose: () => void;
    onEdit?: (evt: MockEventType) => void;
    onDelete?: (evt: MockEventType) => void;
  }) => {
    // コールバックをキャプチャ
    capturedOnEdit = onEdit as ((evt: MockEventType) => void) | undefined;
    capturedOnDelete = onDelete as ((evt: MockEventType) => void) | undefined;

    if (!open) {
      return null;
    }
    if (!popoverEvent) {
      return null;
    }
    return (
      <div data-testid="event-popover">
        <span data-testid="popover-event-title">{popoverEvent.title}</span>
        {onEdit ? (
          <button
            data-testid="popover-edit-button"
            onClick={() => onEdit(popoverEvent)}
            type="button"
          >
            編集
          </button>
        ) : null}
        {onDelete ? (
          <button
            data-testid="popover-delete-button"
            onClick={() => onDelete(popoverEvent)}
            type="button"
          >
            削除
          </button>
        ) : null}
      </div>
    );
  },
}));

// ConfirmDialogのモック
vi.mock("./confirm-dialog", () => ({
  ConfirmDialog: ({
    open,
    eventTitle,
    onConfirm,
    onOpenChange,
    isLoading,
  }: {
    open: boolean;
    eventTitle: string;
    onConfirm: () => void;
    onOpenChange: (open: boolean) => void;
    isLoading?: boolean;
  }) => {
    if (!open) {
      return null;
    }
    return (
      <div data-testid="confirm-dialog">
        <span data-testid="confirm-dialog-title">{eventTitle}</span>
        <button
          data-testid="confirm-dialog-confirm"
          disabled={isLoading}
          onClick={onConfirm}
          type="button"
        >
          削除
        </button>
        <button
          data-testid="confirm-dialog-cancel"
          disabled={isLoading}
          onClick={() => onOpenChange(false)}
          type="button"
        >
          キャンセル
        </button>
      </div>
    );
  },
}));

import { createEventService } from "@/lib/calendar/event-service";
import type { CalendarEvent } from "@/lib/calendar/types";
// Import after mocks
import { CalendarContainer } from "./calendar-container";

// EventPopoverのコールバックをキャプチャするための変数
let capturedOnEdit: ((event: CalendarEvent) => void) | undefined;
let capturedOnDelete: ((event: CalendarEvent) => void) | undefined;

// matchMediaのモック
const createMatchMediaMock = (matches: boolean) =>
  vi.fn().mockImplementation((query: string) => ({
    matches,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));

describe("CalendarContainer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // デフォルトはデスクトップサイズ
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: createMatchMediaMock(true),
    });
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      value: 1200,
    });
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
      const localMockFetchEvents = vi.fn().mockResolvedValue({
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
        fetchEvents: localMockFetchEvents,
        createEvent: mockCreateEvent,
        updateEvent: mockUpdateEvent,
        deleteEvent: mockDeleteEvent,
      });

      render(<CalendarContainer guildId="test-guild-123" />);

      // イベント取得が完了したらデータが表示されること
      await waitFor(() => {
        expect(screen.getByTestId("calendar-grid")).toHaveTextContent(
          "1 events"
        );
      });

      // fetchEventsが正しいパラメータで呼ばれたこと
      expect(localMockFetchEvents).toHaveBeenCalledWith(
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
      const localMockFetchEvents = vi.fn().mockResolvedValue({
        success: false,
        error: {
          code: "FETCH_FAILED",
          message: "イベントの取得に失敗しました。",
        },
      });

      vi.mocked(createEventService).mockReturnValue({
        fetchEvents: localMockFetchEvents,
        createEvent: mockCreateEvent,
        updateEvent: mockUpdateEvent,
        deleteEvent: mockDeleteEvent,
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

  describe("Task 8: レスポンシブデザイン", () => {
    describe("Task 8.1: デスクトップとタブレット向けレイアウト (Req 6.1, 6.2, 6.5)", () => {
      it("デスクトップ画面幅でisMobileがfalseとしてツールバーに渡される", () => {
        Object.defineProperty(window, "innerWidth", {
          writable: true,
          value: 1200,
        });

        render(<CalendarContainer guildId={null} />);

        const toolbar = screen.getByTestId("calendar-toolbar");
        expect(toolbar).toHaveAttribute("data-mobile", "false");
      });

      it("タブレット画面幅でisMobileがfalseとしてツールバーに渡される", () => {
        Object.defineProperty(window, "innerWidth", {
          writable: true,
          value: 800,
        });

        render(<CalendarContainer guildId={null} />);

        const toolbar = screen.getByTestId("calendar-toolbar");
        expect(toolbar).toHaveAttribute("data-mobile", "false");
      });
    });

    describe("Task 8.2: モバイル向けレイアウトとデフォルトビュー (Req 6.3, 6.4)", () => {
      it("モバイル画面幅でisMobileがtrueとしてツールバーに渡される", () => {
        Object.defineProperty(window, "innerWidth", {
          writable: true,
          value: 600,
        });

        render(<CalendarContainer guildId={null} />);

        const toolbar = screen.getByTestId("calendar-toolbar");
        expect(toolbar).toHaveAttribute("data-mobile", "true");
      });

      it("カレンダーグリッドがレンダリングされる", () => {
        render(<CalendarContainer guildId={null} />);

        expect(screen.getByTestId("calendar-grid")).toBeInTheDocument();
      });
    });
  });

  describe("Task 7.1: 予定作成フローの統合 (Req 1.1, 1.2, 1.4, 1.5)", () => {
    beforeEach(() => {
      // キャプチャ変数をリセット
      capturedOnAddClick = undefined;
      capturedOnSlotSelect = undefined;

      // mockFetchEventsをリセットして成功を返すようにする
      mockFetchEvents.mockResolvedValue({
        success: true,
        data: [],
      });

      // createEventServiceのモックをリセット
      vi.mocked(createEventService).mockReturnValue({
        fetchEvents: mockFetchEvents,
        createEvent: mockCreateEvent,
        updateEvent: mockUpdateEvent,
        deleteEvent: mockDeleteEvent,
      });
    });

    describe("新規追加ボタンによるダイアログ表示 (Req 1.2)", () => {
      it("ギルドID指定時、ToolbarにonAddClickハンドラーが渡される", async () => {
        render(<CalendarContainer guildId="test-guild" />);

        await waitFor(() => {
          expect(capturedOnAddClick).toBeDefined();
        });
      });

      it("新規追加ボタンクリック時にEventDialogが表示される", async () => {
        render(<CalendarContainer guildId="test-guild" />);

        // 初期状態ではダイアログは非表示
        expect(screen.queryByTestId("event-dialog")).not.toBeInTheDocument();

        // ツールバーの追加ボタンをクリック
        await waitFor(() => {
          expect(capturedOnAddClick).toBeDefined();
        });

        // onAddClickを呼び出し
        if (capturedOnAddClick) {
          capturedOnAddClick();
        }

        // ダイアログが表示される
        await waitFor(() => {
          expect(screen.getByTestId("event-dialog")).toBeInTheDocument();
        });

        // 作成モードで開かれる
        expect(screen.getByTestId("dialog-mode")).toHaveTextContent("create");
      });

      it("ギルド未選択時は追加ボタンがnull（無効化）", () => {
        render(<CalendarContainer guildId={null} />);

        // ギルド未選択時はonAddClickがundefinedで渡される
        expect(capturedOnAddClick).toBeUndefined();
      });
    });

    describe("スロット選択によるダイアログ表示 (Req 1.1)", () => {
      it("CalendarGridにonSlotSelectハンドラーが渡される", async () => {
        render(<CalendarContainer guildId="test-guild" />);

        await waitFor(() => {
          expect(capturedOnSlotSelect).toBeDefined();
        });
      });

      it("スロット選択時にEventDialogが選択期間を初期値として表示される", async () => {
        render(<CalendarContainer guildId="test-guild" />);

        // 初期状態ではダイアログは非表示
        expect(screen.queryByTestId("event-dialog")).not.toBeInTheDocument();

        await waitFor(() => {
          expect(capturedOnSlotSelect).toBeDefined();
        });

        // スロット選択をシミュレート
        const startDate = new Date("2025-12-10T10:00:00Z");
        const endDate = new Date("2025-12-10T11:00:00Z");

        if (capturedOnSlotSelect) {
          capturedOnSlotSelect({ start: startDate, end: endDate });
        }

        // ダイアログが表示される
        await waitFor(() => {
          expect(screen.getByTestId("event-dialog")).toBeInTheDocument();
        });

        // 作成モードで開かれる
        expect(screen.getByTestId("dialog-mode")).toHaveTextContent("create");

        // 選択期間が初期値として設定される
        expect(screen.getByTestId("dialog-start-at")).toHaveTextContent(
          startDate.toISOString()
        );
        expect(screen.getByTestId("dialog-end-at")).toHaveTextContent(
          endDate.toISOString()
        );
      });
    });

    describe("ダイアログの閉じる動作", () => {
      it("閉じるボタンクリックでダイアログが閉じる", async () => {
        render(<CalendarContainer guildId="test-guild" />);

        // 追加ボタンでダイアログを開く
        await waitFor(() => {
          expect(capturedOnAddClick).toBeDefined();
        });

        if (capturedOnAddClick) {
          capturedOnAddClick();
        }

        await waitFor(() => {
          expect(screen.getByTestId("event-dialog")).toBeInTheDocument();
        });

        // 閉じるボタンをクリック
        const closeButton = screen.getByTestId("dialog-close");
        closeButton.click();

        // ダイアログが閉じる
        await waitFor(() => {
          expect(screen.queryByTestId("event-dialog")).not.toBeInTheDocument();
        });
      });
    });

    describe("予定保存成功時の動作 (Req 1.4, 1.5)", () => {
      it("保存成功時にfetchEventsが再呼び出しされてカレンダー表示が更新される", async () => {
        render(<CalendarContainer guildId="test-guild" />);

        // 初回fetchEventsの呼び出しを待つ
        await waitFor(() => {
          expect(mockFetchEvents).toHaveBeenCalled();
        });

        const initialCallCount = mockFetchEvents.mock.calls.length;

        // 追加ボタンでダイアログを開く
        await waitFor(() => {
          expect(capturedOnAddClick).toBeDefined();
        });

        if (capturedOnAddClick) {
          capturedOnAddClick();
        }

        await waitFor(() => {
          expect(screen.getByTestId("event-dialog")).toBeInTheDocument();
        });

        // 保存成功ボタンをクリック（onSuccessコールバックをトリガー）
        const successButton = screen.getByTestId("dialog-success");
        successButton.click();

        // fetchEventsが再呼び出しされる
        await waitFor(() => {
          expect(mockFetchEvents.mock.calls.length).toBeGreaterThan(
            initialCallCount
          );
        });

        // ダイアログが閉じる
        await waitFor(() => {
          expect(screen.queryByTestId("event-dialog")).not.toBeInTheDocument();
        });
      });
    });
  });

  describe("Task 7.2: 予定編集・削除フローの統合 (Req 2.3, 3.1, 3.3, 3.4, 4.1, 4.2, 4.3)", () => {
    beforeEach(() => {
      // キャプチャ変数をリセット
      capturedOnAddClick = undefined;
      capturedOnSlotSelect = undefined;
      capturedOnEdit = undefined;
      capturedOnDelete = undefined;

      // mockFetchEventsをリセットして成功を返すようにする
      mockFetchEvents.mockResolvedValue({
        success: true,
        data: [],
      });

      // createEventServiceのモックをリセット
      vi.mocked(createEventService).mockReturnValue({
        fetchEvents: mockFetchEvents,
        createEvent: mockCreateEvent,
        updateEvent: mockUpdateEvent,
        deleteEvent: mockDeleteEvent,
      });
    });

    describe("編集フローの統合 (Req 2.3, 3.1, 3.3, 3.4)", () => {
      it("EventPopoverにonEditコールバックが渡される", async () => {
        render(<CalendarContainer guildId="test-guild" />);

        await waitFor(() => {
          expect(capturedOnEdit).toBeDefined();
        });
      });

      it("編集ボタンクリック時にEventDialogが編集モードで表示される", async () => {
        render(<CalendarContainer guildId="test-guild" />);

        // onEditコールバックが渡されていることを確認
        await waitFor(() => {
          expect(capturedOnEdit).toBeDefined();
        });

        // 初期状態ではダイアログは非表示
        expect(screen.queryByTestId("event-dialog")).not.toBeInTheDocument();

        // 編集ボタンクリックをシミュレート（onEditを呼び出し）
        const mockEvent = {
          id: "event-123",
          title: "テストイベント",
          start: new Date("2025-12-10T10:00:00Z"),
          end: new Date("2025-12-10T11:00:00Z"),
          allDay: false,
          color: "#3b82f6",
        };

        if (capturedOnEdit) {
          capturedOnEdit(mockEvent as CalendarEvent);
        }

        // EventDialogが編集モードで表示される
        await waitFor(() => {
          expect(screen.getByTestId("event-dialog")).toBeInTheDocument();
        });

        expect(screen.getByTestId("dialog-mode")).toHaveTextContent("edit");
        expect(screen.getByTestId("dialog-event-id")).toHaveTextContent(
          "event-123"
        );
      });

      it("編集ダイアログに既存データが初期値として設定される", async () => {
        render(<CalendarContainer guildId="test-guild" />);

        await waitFor(() => {
          expect(capturedOnEdit).toBeDefined();
        });

        const mockEvent = {
          id: "event-456",
          title: "既存イベント",
          start: new Date("2025-12-15T14:00:00Z"),
          end: new Date("2025-12-15T15:30:00Z"),
          allDay: false,
          color: "#ef4444",
          description: "イベントの説明",
        };

        if (capturedOnEdit) {
          capturedOnEdit(mockEvent as CalendarEvent);
        }

        await waitFor(() => {
          expect(screen.getByTestId("event-dialog")).toBeInTheDocument();
        });

        // 既存データが初期値として設定されている
        expect(screen.getByTestId("dialog-title")).toHaveTextContent(
          "既存イベント"
        );
        expect(screen.getByTestId("dialog-start-at")).toHaveTextContent(
          "2025-12-15T14:00:00.000Z"
        );
        expect(screen.getByTestId("dialog-end-at")).toHaveTextContent(
          "2025-12-15T15:30:00.000Z"
        );
      });

      it("予定更新成功時にfetchEventsが再呼び出しされてカレンダー表示が更新される", async () => {
        render(<CalendarContainer guildId="test-guild" />);

        // 初回fetchEventsの呼び出しを待つ
        await waitFor(() => {
          expect(mockFetchEvents).toHaveBeenCalled();
        });

        const initialCallCount = mockFetchEvents.mock.calls.length;

        await waitFor(() => {
          expect(capturedOnEdit).toBeDefined();
        });

        // 編集ダイアログを開く
        const mockEvent = {
          id: "event-789",
          title: "更新対象イベント",
          start: new Date("2025-12-20T09:00:00Z"),
          end: new Date("2025-12-20T10:00:00Z"),
          allDay: false,
          color: "#22c55e",
        };

        if (capturedOnEdit) {
          capturedOnEdit(mockEvent as CalendarEvent);
        }

        await waitFor(() => {
          expect(screen.getByTestId("event-dialog")).toBeInTheDocument();
        });

        // 保存成功ボタンをクリック
        const successButton = screen.getByTestId("dialog-success");
        successButton.click();

        // fetchEventsが再呼び出しされる
        await waitFor(() => {
          expect(mockFetchEvents.mock.calls.length).toBeGreaterThan(
            initialCallCount
          );
        });

        // ダイアログが閉じる
        await waitFor(() => {
          expect(screen.queryByTestId("event-dialog")).not.toBeInTheDocument();
        });
      });
    });

    describe("削除フローの統合 (Req 4.1, 4.2, 4.3)", () => {
      it("EventPopoverにonDeleteコールバックが渡される", async () => {
        render(<CalendarContainer guildId="test-guild" />);

        await waitFor(() => {
          expect(capturedOnDelete).toBeDefined();
        });
      });

      it("削除ボタンクリック時にConfirmDialogが表示される", async () => {
        render(<CalendarContainer guildId="test-guild" />);

        await waitFor(() => {
          expect(capturedOnDelete).toBeDefined();
        });

        // 初期状態ではConfirmDialogは非表示
        expect(screen.queryByTestId("confirm-dialog")).not.toBeInTheDocument();

        // 削除ボタンクリックをシミュレート
        const mockEvent = {
          id: "event-delete-1",
          title: "削除対象イベント",
          start: new Date("2025-12-25T10:00:00Z"),
          end: new Date("2025-12-25T11:00:00Z"),
          allDay: false,
          color: "#f97316",
        };

        if (capturedOnDelete) {
          capturedOnDelete(mockEvent as CalendarEvent);
        }

        // ConfirmDialogが表示される
        await waitFor(() => {
          expect(screen.getByTestId("confirm-dialog")).toBeInTheDocument();
        });

        // イベント名が表示されている
        expect(screen.getByTestId("confirm-dialog-title")).toHaveTextContent(
          "削除対象イベント"
        );
      });

      it("削除確認後にfetchEventsが再呼び出しされてカレンダー表示が更新される", async () => {
        // 削除成功のモックを設定
        mockDeleteEvent.mockResolvedValue({
          success: true,
          data: undefined,
        });

        render(<CalendarContainer guildId="test-guild" />);

        // 初回fetchEventsの呼び出しを待つ
        await waitFor(() => {
          expect(mockFetchEvents).toHaveBeenCalled();
        });

        const initialCallCount = mockFetchEvents.mock.calls.length;

        await waitFor(() => {
          expect(capturedOnDelete).toBeDefined();
        });

        // 削除ダイアログを開く
        const mockEvent = {
          id: "event-delete-2",
          title: "削除確定イベント",
          start: new Date("2025-12-30T10:00:00Z"),
          end: new Date("2025-12-30T11:00:00Z"),
          allDay: false,
          color: "#8b5cf6",
        };

        if (capturedOnDelete) {
          capturedOnDelete(mockEvent as CalendarEvent);
        }

        await waitFor(() => {
          expect(screen.getByTestId("confirm-dialog")).toBeInTheDocument();
        });

        // 確認ボタンをクリック
        const confirmButton = screen.getByTestId("confirm-dialog-confirm");
        confirmButton.click();

        // fetchEventsが再呼び出しされる
        await waitFor(() => {
          expect(mockFetchEvents.mock.calls.length).toBeGreaterThan(
            initialCallCount
          );
        });

        // ConfirmDialogが閉じる
        await waitFor(() => {
          expect(
            screen.queryByTestId("confirm-dialog")
          ).not.toBeInTheDocument();
        });
      });

      it("削除キャンセル時にConfirmDialogが閉じる", async () => {
        render(<CalendarContainer guildId="test-guild" />);

        await waitFor(() => {
          expect(capturedOnDelete).toBeDefined();
        });

        // 削除ダイアログを開く
        const mockEvent = {
          id: "event-delete-3",
          title: "キャンセルイベント",
          start: new Date("2025-12-31T10:00:00Z"),
          end: new Date("2025-12-31T11:00:00Z"),
          allDay: false,
          color: "#06b6d4",
        };

        if (capturedOnDelete) {
          capturedOnDelete(mockEvent as CalendarEvent);
        }

        await waitFor(() => {
          expect(screen.getByTestId("confirm-dialog")).toBeInTheDocument();
        });

        // キャンセルボタンをクリック
        const cancelButton = screen.getByTestId("confirm-dialog-cancel");
        cancelButton.click();

        // ConfirmDialogが閉じる
        await waitFor(() => {
          expect(
            screen.queryByTestId("confirm-dialog")
          ).not.toBeInTheDocument();
        });
      });
    });

    describe("ギルド未選択時の動作", () => {
      it("ギルド未選択時はonEditとonDeleteがundefined", () => {
        render(<CalendarContainer guildId={null} />);

        // ギルド未選択時はコールバックがundefined
        expect(capturedOnEdit).toBeUndefined();
        expect(capturedOnDelete).toBeUndefined();
      });
    });
  });
});
