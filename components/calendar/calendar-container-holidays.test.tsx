/**
 * CalendarContainer 祝日統合テスト
 *
 * Task 6.3: CalendarContainer 統合テスト
 * - CalendarContainer 経由で祝日が表示されることをテストする
 * - 祝日トグル操作で表示→非表示→再表示のフローが正しく動作することをテストする
 *
 * Requirements: 5.2, 5.3
 */
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// localStorage mock
const store = new Map<string, string>();
const localStorageMock = {
  getItem: vi.fn((key: string) => store.get(key) ?? null),
  setItem: vi.fn((key: string, value: string) => {
    store.set(key, value);
  }),
  removeItem: vi.fn((key: string) => {
    store.delete(key);
  }),
  clear: vi.fn(() => {
    store.clear();
  }),
  get length() {
    return store.size;
  },
  key: vi.fn((_index: number) => null),
};
Object.defineProperty(window, "localStorage", {
  value: localStorageMock,
  writable: true,
});

// Mock child UI components
vi.mock("@/components/calendar/calendar-grid", () => ({
  CalendarGrid: vi.fn(
    (props: {
      events?: Array<{ id: string }>;
      holidayMap?: { size: number };
    }) => {
      const holidayCount = (props.events ?? []).filter((e) =>
        e.id.startsWith("holiday-")
      ).length;
      return (
        <div
          data-holiday-events-count={holidayCount}
          data-holiday-map-size={props.holidayMap ? props.holidayMap.size : -1}
          data-testid="calendar-grid"
        />
      );
    }
  ),
}));

vi.mock("@/components/calendar/calendar-toolbar", () => ({
  CalendarToolbar: vi.fn(
    (props: { showHolidays?: boolean; onToggleHolidays?: () => void }) => (
      <div data-testid="calendar-toolbar">
        <span
          data-testid="show-holidays-value"
          data-value={String(props.showHolidays ?? "undefined")}
        />
        {props.onToggleHolidays ? (
          <button
            data-testid="holiday-toggle"
            onClick={props.onToggleHolidays}
            type="button"
          >
            toggle
          </button>
        ) : null}
      </div>
    )
  ),
}));

vi.mock("@/components/calendar/event-popover", () => ({
  EventPopover: () => null,
}));
vi.mock("@/components/calendar/event-dialog", () => ({
  EventDialog: () => null,
}));
vi.mock("@/components/calendar/confirm-dialog", () => ({
  ConfirmDialog: () => null,
}));
vi.mock("@/components/calendar/edit-scope-dialog", () => ({
  EditScopeDialog: () => null,
}));
vi.mock("@/components/calendar/calendar-error-display", () => ({
  CalendarErrorDisplay: () => null,
}));

// Mock Supabase & EventService
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      getSession: () =>
        Promise.resolve({
          data: { session: { access_token: "test-token" } },
          error: null,
        }),
    },
  }),
}));
vi.mock("@/lib/calendar/event-service", () => ({
  createEventService: () => ({
    fetchEventsWithSeries: () => Promise.resolve({ success: true, data: [] }),
  }),
}));

// Mock analytics
vi.mock("@/lib/analytics/events", () => ({
  trackEvent: vi.fn(),
  mapNavigationDirection: vi.fn(),
}));

// Mock hooks (keep useUserPreferences and useHolidays real)
vi.mock("@/hooks/calendar/use-calendar-url-sync", () => ({
  useCalendarUrlSync: () => ({
    viewMode: "month" as const,
    selectedDate: new Date(2026, 0, 15),
    setViewMode: vi.fn(),
    setSelectedDate: vi.fn(),
  }),
}));

vi.mock("@/hooks/calendar/use-calendar-state", () => ({
  useCalendarState: () => ({
    state: {
      isLoading: false,
      error: null,
      events: [],
      viewMode: "month",
      selectedDate: new Date(2026, 0, 15),
    },
    actions: {
      setViewMode: vi.fn(),
      setSelectedDate: vi.fn(),
      clearEvents: vi.fn(),
      startFetching: vi.fn(),
      completeFetchingSuccess: vi.fn(),
      completeFetchingError: vi.fn(),
      setEvents: vi.fn(),
    },
  }),
}));

vi.mock("@/hooks/calendar/use-event-popover", () => ({
  useEventPopover: () => ({
    selectedEvent: null,
    isOpen: false,
    openPopover: vi.fn(),
    closePopover: vi.fn(),
  }),
}));

vi.mock("@/hooks/calendar/use-event-dialog", () => ({
  useEventDialog: () => ({
    isOpen: false,
    mode: "create",
    eventId: null,
    initialData: undefined,
    editScope: undefined,
    seriesId: undefined,
    occurrenceDate: undefined,
    resetExceptions: undefined,
    openCreateDialog: vi.fn(),
    openEditDialog: vi.fn(),
    openEditDialogWithScope: vi.fn(),
    closeDialog: vi.fn(),
  }),
}));

vi.mock("@/hooks/calendar/use-confirm-dialog", () => ({
  useConfirmDialog: () => ({
    isOpen: false,
    eventToDelete: null,
    openDialog: vi.fn(),
    closeDialog: vi.fn(),
    setIsOpen: vi.fn(),
  }),
}));

vi.mock("@/hooks/calendar/use-edit-scope-dialog", () => ({
  useEditScopeDialog: () => ({
    isOpen: false,
    mode: "edit",
    targetEvent: null,
    isDeleting: false,
    openDialog: vi.fn(),
    setIsOpen: vi.fn(),
    handleSelect: vi.fn(),
  }),
}));

vi.mock("@/hooks/calendar/use-event-mutation", () => ({
  useEventMutation: () => ({
    state: { isDeleting: false },
    updateEvent: vi.fn(),
    deleteEvent: vi.fn(),
  }),
}));

vi.mock("@/hooks/calendar/use-media-query", () => ({
  useBreakpoint: () => ({ isMobile: false }),
}));

import { CalendarContainer } from "@/components/calendar/calendar-container";

describe("CalendarContainer - 祝日統合", () => {
  beforeEach(() => {
    store.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    store.clear();
  });

  it("CalendarGrid の events に祝日イベントが含まれる（Req 5.2）", async () => {
    render(<CalendarContainer guildId="guild-1" />);

    await waitFor(() => {
      const grid = screen.getByTestId("calendar-grid");
      const count = Number(grid.getAttribute("data-holiday-events-count"));
      // 2026年1月: 元日(1/1)、成人の日(1/12) で少なくとも2件
      expect(count).toBeGreaterThanOrEqual(2);
    });
  });

  it("CalendarGrid に holidayMap が渡される（Req 5.2）", async () => {
    render(<CalendarContainer guildId="guild-1" />);

    await waitFor(() => {
      const grid = screen.getByTestId("calendar-grid");
      const size = Number(grid.getAttribute("data-holiday-map-size"));
      expect(size).toBeGreaterThanOrEqual(2);
    });
  });

  it("CalendarToolbar に showHolidays=true と onToggleHolidays が渡される", async () => {
    render(<CalendarContainer guildId="guild-1" />);

    await waitFor(() => {
      const value = screen
        .getByTestId("show-holidays-value")
        .getAttribute("data-value");
      expect(value).toBe("true");
      expect(screen.getByTestId("holiday-toggle")).toBeInTheDocument();
    });
  });

  it("祝日トグルで表示→非表示→再表示のフローが動作する（Req 5.2, 5.3）", async () => {
    const user = userEvent.setup();
    render(<CalendarContainer guildId="guild-1" />);

    // 初期状態: 祝日表示ON
    await waitFor(() => {
      const grid = screen.getByTestId("calendar-grid");
      expect(
        Number(grid.getAttribute("data-holiday-events-count"))
      ).toBeGreaterThan(0);
    });

    // トグルクリック: OFF
    await user.click(screen.getByTestId("holiday-toggle"));

    await waitFor(() => {
      const grid = screen.getByTestId("calendar-grid");
      expect(Number(grid.getAttribute("data-holiday-events-count"))).toBe(0);
      expect(Number(grid.getAttribute("data-holiday-map-size"))).toBe(0);
    });

    // トグルクリック: ON
    await user.click(screen.getByTestId("holiday-toggle"));

    await waitFor(() => {
      const grid = screen.getByTestId("calendar-grid");
      expect(
        Number(grid.getAttribute("data-holiday-events-count"))
      ).toBeGreaterThan(0);
    });
  });
});
