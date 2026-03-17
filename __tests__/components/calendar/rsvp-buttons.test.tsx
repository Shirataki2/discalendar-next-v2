/**
 * RsvpButtons コンポーネントのテスト
 *
 * Task 4.1: RSVP ボタン群と楽観的更新を実装する
 * Task 4.2: 未認証ユーザーの RSVP 制御を実装する
 *
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 4.1, 4.2
 */
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { RsvpStatus } from "@/lib/calendar/rsvp-types";

// ──────────────────────────────────────────────
// Server Action モック
// ──────────────────────────────────────────────

const mockUpsertRsvpAction = vi.fn();
const mockDeleteRsvpAction = vi.fn();

vi.mock("@/app/dashboard/actions", () => ({
  upsertRsvpAction: (...args: unknown[]) => mockUpsertRsvpAction(...args),
  deleteRsvpAction: (...args: unknown[]) => mockDeleteRsvpAction(...args),
}));

import { RsvpButtons } from "@/components/calendar/rsvp-buttons";

// ──────────────────────────────────────────────
// テスト用定数・ヘルパー
// ──────────────────────────────────────────────

const DEFAULT_PROPS = {
  guildId: "11111111111111111",
  eventId: "event-1",
  seriesId: null,
  occurrenceDate: null,
  currentStatus: null as RsvpStatus | null,
  isAuthenticated: true,
};

function renderRsvpButtons(overrides?: Partial<typeof DEFAULT_PROPS>) {
  return render(<RsvpButtons {...DEFAULT_PROPS} {...overrides} />);
}

// ──────────────────────────────────────────────
// Task 4.1: RSVP ボタン群と楽観的更新
// ──────────────────────────────────────────────

describe("RsvpButtons", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Req 2.1: RSVP ボタン表示", () => {
    it("参加・未定・不参加の3つのボタンを表示する", () => {
      renderRsvpButtons();

      expect(screen.getByRole("button", { name: "参加" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "未定" })).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "不参加" })
      ).toBeInTheDocument();
    });
  });

  describe("Req 2.3: 選択状態表示", () => {
    it("currentStatus が going の場合、参加ボタンが選択状態で表示される", () => {
      renderRsvpButtons({ currentStatus: "going" });

      const goingBtn = screen.getByRole("button", { name: "参加" });
      const maybeBtn = screen.getByRole("button", { name: "未定" });
      const notGoingBtn = screen.getByRole("button", { name: "不参加" });

      expect(goingBtn).toHaveAttribute("data-active", "true");
      expect(maybeBtn).toHaveAttribute("data-active", "false");
      expect(notGoingBtn).toHaveAttribute("data-active", "false");
    });

    it("currentStatus が maybe の場合、未定ボタンが選択状態で表示される", () => {
      renderRsvpButtons({ currentStatus: "maybe" });

      const maybeBtn = screen.getByRole("button", { name: "未定" });
      expect(maybeBtn).toHaveAttribute("data-active", "true");
    });

    it("currentStatus が not_going の場合、不参加ボタンが選択状態で表示される", () => {
      renderRsvpButtons({ currentStatus: "not_going" });

      const notGoingBtn = screen.getByRole("button", { name: "不参加" });
      expect(notGoingBtn).toHaveAttribute("data-active", "true");
    });

    it("currentStatus が null の場合、すべてのボタンが非選択状態で表示される", () => {
      renderRsvpButtons({ currentStatus: null });

      const goingBtn = screen.getByRole("button", { name: "参加" });
      const maybeBtn = screen.getByRole("button", { name: "未定" });
      const notGoingBtn = screen.getByRole("button", { name: "不参加" });

      expect(goingBtn).toHaveAttribute("data-active", "false");
      expect(maybeBtn).toHaveAttribute("data-active", "false");
      expect(notGoingBtn).toHaveAttribute("data-active", "false");
    });
  });

  describe("Req 2.2: ステータス upsert", () => {
    it("ボタンクリックで upsertRsvpAction が呼ばれる", async () => {
      const user = userEvent.setup();
      mockUpsertRsvpAction.mockResolvedValueOnce({
        success: true,
        data: { status: "going" },
      });

      renderRsvpButtons();

      await user.click(screen.getByRole("button", { name: "参加" }));

      await waitFor(() => {
        expect(mockUpsertRsvpAction).toHaveBeenCalledWith({
          guildId: "11111111111111111",
          eventId: "event-1",
          seriesId: null,
          occurrenceDate: null,
          status: "going",
        });
      });
    });

    it("繰り返しイベントの場合、seriesId と occurrenceDate を渡す", async () => {
      const user = userEvent.setup();
      mockUpsertRsvpAction.mockResolvedValueOnce({
        success: true,
        data: { status: "maybe" },
      });

      renderRsvpButtons({
        eventId: null,
        seriesId: "series-1",
        occurrenceDate: "2026-03-20",
      });

      await user.click(screen.getByRole("button", { name: "未定" }));

      await waitFor(() => {
        expect(mockUpsertRsvpAction).toHaveBeenCalledWith({
          guildId: "11111111111111111",
          eventId: null,
          seriesId: "series-1",
          occurrenceDate: "2026-03-20",
          status: "maybe",
        });
      });
    });

    it("クリック後に onStatusChange が呼ばれる", async () => {
      const user = userEvent.setup();
      const onStatusChange = vi.fn();
      mockUpsertRsvpAction.mockResolvedValueOnce({
        success: true,
        data: { status: "going" },
      });

      render(
        <RsvpButtons {...DEFAULT_PROPS} onStatusChange={onStatusChange} />
      );

      await user.click(screen.getByRole("button", { name: "参加" }));

      await waitFor(() => {
        expect(onStatusChange).toHaveBeenCalledWith("going");
      });
    });
  });

  describe("Req 2.4: トグル削除", () => {
    it("同じステータスのボタンを再クリックすると deleteRsvpAction が呼ばれる", async () => {
      const user = userEvent.setup();
      mockDeleteRsvpAction.mockResolvedValueOnce({
        success: true,
        data: undefined,
      });

      renderRsvpButtons({ currentStatus: "going" });

      await user.click(screen.getByRole("button", { name: "参加" }));

      await waitFor(() => {
        expect(mockDeleteRsvpAction).toHaveBeenCalledWith({
          guildId: "11111111111111111",
          eventId: "event-1",
          seriesId: null,
          occurrenceDate: null,
        });
      });
      expect(mockUpsertRsvpAction).not.toHaveBeenCalled();
    });

    it("トグル削除後に onStatusChange(null) が呼ばれる", async () => {
      const user = userEvent.setup();
      const onStatusChange = vi.fn();
      mockDeleteRsvpAction.mockResolvedValueOnce({
        success: true,
        data: undefined,
      });

      render(
        <RsvpButtons
          {...DEFAULT_PROPS}
          currentStatus="going"
          onStatusChange={onStatusChange}
        />
      );

      await user.click(screen.getByRole("button", { name: "参加" }));

      await waitFor(() => {
        expect(onStatusChange).toHaveBeenCalledWith(null);
      });
    });
  });

  describe("Req 2.5: ローディング状態", () => {
    it("処理中は全ボタンが disabled になる", async () => {
      const user = userEvent.setup();
      // 長時間解決しない Promise
      // biome-ignore lint/suspicious/noEmptyBlockStatements: 意図的に解決しないPromise
      mockUpsertRsvpAction.mockReturnValueOnce(new Promise(() => {}));

      renderRsvpButtons();

      await user.click(screen.getByRole("button", { name: "参加" }));

      await waitFor(() => {
        expect(screen.getByRole("button", { name: "参加" })).toBeDisabled();
        expect(screen.getByRole("button", { name: "未定" })).toBeDisabled();
        expect(screen.getByRole("button", { name: "不参加" })).toBeDisabled();
      });
    });
  });

  describe("Req 2.6: エラーロールバック", () => {
    it("Server Action 失敗時にエラーメッセージを表示する", async () => {
      const user = userEvent.setup();
      mockUpsertRsvpAction.mockResolvedValueOnce({
        success: false,
        error: {
          code: "CREATE_FAILED",
          message: "出欠の登録に失敗しました。",
        },
      });

      renderRsvpButtons();

      await user.click(screen.getByRole("button", { name: "参加" }));

      await waitFor(() => {
        expect(
          screen.getByText("出欠の登録に失敗しました。")
        ).toBeInTheDocument();
      });
    });

    it("Server Action 失敗時にステータスが操作前の状態に戻る", async () => {
      const user = userEvent.setup();
      mockUpsertRsvpAction.mockResolvedValueOnce({
        success: false,
        error: {
          code: "CREATE_FAILED",
          message: "出欠の登録に失敗しました。",
        },
      });

      renderRsvpButtons({ currentStatus: null });

      await user.click(screen.getByRole("button", { name: "参加" }));

      // エラー後、元の状態に戻る（全てdata-active=false）
      await waitFor(() => {
        expect(screen.getByRole("button", { name: "参加" })).toHaveAttribute(
          "data-active",
          "false"
        );
      });
    });

    it("削除失敗時にステータスが操作前の状態に戻る", async () => {
      const user = userEvent.setup();
      mockDeleteRsvpAction.mockResolvedValueOnce({
        success: false,
        error: {
          code: "DELETE_FAILED",
          message: "出欠の削除に失敗しました。",
        },
      });

      renderRsvpButtons({ currentStatus: "going" });

      await user.click(screen.getByRole("button", { name: "参加" }));

      // エラー後、元の状態に戻る（going が active）
      await waitFor(() => {
        expect(screen.getByRole("button", { name: "参加" })).toHaveAttribute(
          "data-active",
          "true"
        );
      });
    });
  });

  // ──────────────────────────────────────────────
  // Task 4.2: 未認証ユーザーの RSVP 制御
  // ──────────────────────────────────────────────

  describe("Req 4.1: 未ログイン時のボタン無効化", () => {
    it("未認証時はすべてのボタンが disabled になる", () => {
      renderRsvpButtons({ isAuthenticated: false });

      expect(screen.getByRole("button", { name: "参加" })).toBeDisabled();
      expect(screen.getByRole("button", { name: "未定" })).toBeDisabled();
      expect(screen.getByRole("button", { name: "不参加" })).toBeDisabled();
    });
  });

  describe("Req 4.2: ログイン誘導", () => {
    it("未認証時にログイン誘導テキストが表示される", () => {
      renderRsvpButtons({ isAuthenticated: false });

      expect(screen.getByText("ログインして出欠を回答")).toBeInTheDocument();
    });
  });
});
