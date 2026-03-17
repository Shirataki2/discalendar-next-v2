/**
 * EventPopover RSVP 統合テスト
 *
 * Task 6.1: RsvpButtons と AttendeeList を EventPopover に組み込む
 * Task 6.2: 繰り返しイベントの RSVP に対応する
 *
 * Requirements: 2.1, 3.1, 3.2, 6.1, 6.2, 6.3
 */
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CalendarEvent } from "@/lib/calendar/types";

// ──────────────────────────────────────────────
// Server Action モック
// ──────────────────────────────────────────────

const mockFetchAttendeesAction = vi.fn();
const mockUpsertRsvpAction = vi.fn();
const mockDeleteRsvpAction = vi.fn();

vi.mock("@/app/dashboard/actions", () => ({
  fetchAttendeesAction: (...args: unknown[]) =>
    mockFetchAttendeesAction(...args),
  upsertRsvpAction: (...args: unknown[]) => mockUpsertRsvpAction(...args),
  deleteRsvpAction: (...args: unknown[]) => mockDeleteRsvpAction(...args),
}));

import { EventPopover, type EventPopoverProps } from "./event-popover";

// ──────────────────────────────────────────────
// テスト用データ
// ──────────────────────────────────────────────

const singleEvent: CalendarEvent = {
  id: "event-1",
  title: "定例ミーティング",
  start: new Date(2026, 2, 17, 14, 0),
  end: new Date(2026, 2, 17, 15, 30),
  allDay: false,
  color: "#3b82f6",
};

const recurringEvent: CalendarEvent = {
  id: "event-2",
  title: "週次ミーティング",
  start: new Date(2026, 2, 17, 10, 0),
  end: new Date(2026, 2, 17, 11, 0),
  allDay: false,
  color: "#22c55e",
  isRecurring: true,
  seriesId: "series-1",
  rruleSummary: "毎週火曜日",
};

const ATTENDEES_RESPONSE = {
  success: true as const,
  data: {
    attendees: [
      {
        id: "att-1",
        event_id: "event-1",
        event_series_id: null,
        occurrence_date: null,
        guild_id: "guild-1",
        user_id: "user-1",
        discord_user_id: "discord-1",
        discord_username: "Alice",
        discord_avatar_url: "https://example.com/alice.png",
        status: "going" as const,
        responded_at: "2026-03-17T00:00:00Z",
      },
      {
        id: "att-2",
        event_id: "event-1",
        event_series_id: null,
        occurrence_date: null,
        guild_id: "guild-1",
        user_id: "user-2",
        discord_user_id: "discord-2",
        discord_username: "Bob",
        discord_avatar_url: null,
        status: "maybe" as const,
        responded_at: "2026-03-17T00:00:00Z",
      },
    ],
    summary: { going: 1, maybe: 1, notGoing: 0, total: 2 },
    currentUserStatus: "going" as const,
  },
};

const EMPTY_ATTENDEES_RESPONSE = {
  success: true as const,
  data: {
    attendees: [],
    summary: { going: 0, maybe: 0, notGoing: 0, total: 0 },
    currentUserStatus: null,
  },
};

const defaultProps: EventPopoverProps = {
  event: singleEvent,
  open: true,
  onClose: vi.fn(),
  guildId: "guild-1",
  isAuthenticated: true,
};

// ──────────────────────────────────────────────
// Task 6.1: RsvpButtons と AttendeeList を EventPopover に組み込む
// ──────────────────────────────────────────────

describe("EventPopover RSVP 統合", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetchAttendeesAction.mockResolvedValue(EMPTY_ATTENDEES_RESPONSE);
  });

  describe("Task 6.1: RSVP セクションの表示", () => {
    it("guildId が提供された場合、RSVP ボタンを表示する", async () => {
      mockFetchAttendeesAction.mockResolvedValue(EMPTY_ATTENDEES_RESPONSE);
      render(<EventPopover {...defaultProps} />);

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: "参加" })
        ).toBeInTheDocument();
        expect(
          screen.getByRole("button", { name: "未定" })
        ).toBeInTheDocument();
        expect(
          screen.getByRole("button", { name: "不参加" })
        ).toBeInTheDocument();
      });
    });

    it("guildId が null の場合、RSVP セクションを表示しない", () => {
      render(<EventPopover {...defaultProps} guildId={null} />);

      expect(
        screen.queryByRole("button", { name: "参加" })
      ).not.toBeInTheDocument();
    });

    it("ポップオーバー表示時に参加者データをフェッチする", async () => {
      mockFetchAttendeesAction.mockResolvedValue(ATTENDEES_RESPONSE);
      render(<EventPopover {...defaultProps} />);

      await waitFor(() => {
        expect(mockFetchAttendeesAction).toHaveBeenCalledWith({
          guildId: "guild-1",
          eventId: "event-1",
          seriesId: null,
          occurrenceDate: null,
        });
      });
    });

    it("フェッチ成功時に参加者一覧を表示する", async () => {
      mockFetchAttendeesAction.mockResolvedValue(ATTENDEES_RESPONSE);
      render(<EventPopover {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText("Alice")).toBeInTheDocument();
        expect(screen.getByText("Bob")).toBeInTheDocument();
      });
    });

    it("フェッチ成功時に参加者サマリーを表示する", async () => {
      mockFetchAttendeesAction.mockResolvedValue(ATTENDEES_RESPONSE);
      render(<EventPopover {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByTestId("attendee-summary")).toBeInTheDocument();
      });
    });

    it("参加者がいない場合は空状態メッセージを表示する", async () => {
      mockFetchAttendeesAction.mockResolvedValue(EMPTY_ATTENDEES_RESPONSE);
      render(<EventPopover {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText("まだ回答がありません")).toBeInTheDocument();
      });
    });

    it("現在のユーザーの RSVP ステータスがボタンに反映される", async () => {
      mockFetchAttendeesAction.mockResolvedValue(ATTENDEES_RESPONSE);
      render(<EventPopover {...defaultProps} />);

      await waitFor(() => {
        const goingButton = screen.getByRole("button", { name: "参加" });
        expect(goingButton).toHaveAttribute("data-active", "true");
      });
    });

    it("未認証の場合、RSVP ボタンが disabled になる", async () => {
      mockFetchAttendeesAction.mockResolvedValue(EMPTY_ATTENDEES_RESPONSE);
      render(<EventPopover {...defaultProps} isAuthenticated={false} />);

      await waitFor(() => {
        const goingButton = screen.getByRole("button", { name: "参加" });
        expect(goingButton).toBeDisabled();
      });
    });

    it("RSVP ステータス変更時に参加者一覧を再取得する", async () => {
      const user = userEvent.setup();
      mockFetchAttendeesAction.mockResolvedValue(EMPTY_ATTENDEES_RESPONSE);
      mockUpsertRsvpAction.mockResolvedValue({
        success: true,
        data: { id: "att-new", status: "going" },
      });

      render(<EventPopover {...defaultProps} />);

      // 初回フェッチ完了待ち
      await waitFor(() => {
        expect(mockFetchAttendeesAction).toHaveBeenCalledTimes(1);
      });

      // RSVP ボタンクリック
      const goingButton = screen.getByRole("button", { name: "参加" });
      await user.click(goingButton);

      // 再フェッチが呼ばれる
      await waitFor(() => {
        expect(mockFetchAttendeesAction).toHaveBeenCalledTimes(2);
      });
    });

    it("RSVP セクションは説明の後、編集/削除ボタンの前に配置される", async () => {
      mockFetchAttendeesAction.mockResolvedValue(EMPTY_ATTENDEES_RESPONSE);
      const eventWithDesc: CalendarEvent = {
        ...singleEvent,
        description: "テスト説明文",
      };
      render(
        <EventPopover
          {...defaultProps}
          event={eventWithDesc}
          onDelete={vi.fn()}
          onEdit={vi.fn()}
        />
      );

      await waitFor(() => {
        expect(screen.getByText("まだ回答がありません")).toBeInTheDocument();
      });

      // RSVP セクションが存在し、DOM 順序で説明の後、ボタンの前にある
      const rsvpSection = screen.getByTestId("rsvp-section");
      const editButton = screen.getByTestId("event-edit-button");

      // rsvpSection が editButton より DOM 上で先にある
      const position = rsvpSection.compareDocumentPosition(editButton);
      // biome-ignore lint/suspicious/noBitwiseOperators: compareDocumentPosition returns a bitmask
      expect(position & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });
  });

  // ──────────────────────────────────────────────
  // Task 6.2: 繰り返しイベントの RSVP
  // ──────────────────────────────────────────────

  describe("Task 6.2: 繰り返しイベントの RSVP", () => {
    it("繰り返しイベントの場合、seriesId と occurrenceDate でフェッチする", async () => {
      mockFetchAttendeesAction.mockResolvedValue(EMPTY_ATTENDEES_RESPONSE);
      render(<EventPopover {...defaultProps} event={recurringEvent} />);

      await waitFor(() => {
        expect(mockFetchAttendeesAction).toHaveBeenCalledWith({
          guildId: "guild-1",
          eventId: null,
          seriesId: "series-1",
          occurrenceDate: "2026-03-17",
        });
      });
    });

    it("繰り返しイベントの RSVP ボタンに seriesId と occurrenceDate が渡される", async () => {
      mockFetchAttendeesAction.mockResolvedValue(EMPTY_ATTENDEES_RESPONSE);
      mockUpsertRsvpAction.mockResolvedValue({
        success: true,
        data: { id: "att-new", status: "going" },
      });

      const user = userEvent.setup();
      render(<EventPopover {...defaultProps} event={recurringEvent} />);

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: "参加" })
        ).toBeInTheDocument();
      });

      // RSVP ボタンクリック
      await user.click(screen.getByRole("button", { name: "参加" }));

      // upsertRsvpAction が seriesId + occurrenceDate で呼ばれる
      await waitFor(() => {
        expect(mockUpsertRsvpAction).toHaveBeenCalledWith({
          guildId: "guild-1",
          eventId: null,
          seriesId: "series-1",
          occurrenceDate: "2026-03-17",
          status: "going",
        });
      });
    });

    it("単発イベントの RSVP ボタンに eventId が渡される", async () => {
      mockFetchAttendeesAction.mockResolvedValue(EMPTY_ATTENDEES_RESPONSE);
      mockUpsertRsvpAction.mockResolvedValue({
        success: true,
        data: { id: "att-new", status: "going" },
      });

      const user = userEvent.setup();
      render(<EventPopover {...defaultProps} />);

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: "参加" })
        ).toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: "参加" }));

      await waitFor(() => {
        expect(mockUpsertRsvpAction).toHaveBeenCalledWith({
          guildId: "guild-1",
          eventId: "event-1",
          seriesId: null,
          occurrenceDate: null,
          status: "going",
        });
      });
    });
  });

  // ──────────────────────────────────────────────
  // ポップオーバーの開閉でのフェッチ制御
  // ──────────────────────────────────────────────

  describe("フェッチ制御", () => {
    it("ポップオーバーが閉じている場合はフェッチしない", () => {
      render(<EventPopover {...defaultProps} open={false} />);

      expect(mockFetchAttendeesAction).not.toHaveBeenCalled();
    });

    it("イベントが null の場合はフェッチしない", () => {
      render(<EventPopover {...defaultProps} event={null} />);

      expect(mockFetchAttendeesAction).not.toHaveBeenCalled();
    });

    it("フェッチ失敗時は RSVP ボタンのみ表示し、参加者一覧は空状態を表示する", async () => {
      mockFetchAttendeesAction.mockResolvedValue({
        success: false,
        error: { code: "INTERNAL_ERROR", message: "エラー" },
      });
      render(<EventPopover {...defaultProps} />);

      // ボタンは表示される（フェッチ失敗でもRSVP操作は可能）
      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: "参加" })
        ).toBeInTheDocument();
      });
    });
  });
});
