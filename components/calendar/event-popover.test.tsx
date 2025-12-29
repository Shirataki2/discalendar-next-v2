/**
 * EventPopover - テスト
 *
 * タスク7.1: EventPopoverコンポーネントの作成
 * - shadcn/ui Popoverをベースにイベント詳細表示を実装する
 * - イベント名、開始/終了日時、説明文を表示する
 * - 終日イベントの場合は時刻ではなく「終日」と表示する
 * - 場所情報とDiscordチャンネル情報を条件付きで表示する
 * Requirements: 4.1, 4.2, 4.3, 4.4, 9.5
 *
 * タスク7.2: ポップオーバーの表示位置と閉じ動作
 * - クリックしたイベント要素の近くにポップオーバーを表示する
 * - 画面端での表示位置を自動調整し、はみ出しを防止する
 * - ポップオーバー外クリックで閉じる動作を実装する
 * - Escキー押下で閉じる動作を実装する
 * Requirements: 4.5, 4.6, 4.7
 */
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { CalendarEvent } from "@/lib/calendar/types";
import { EventPopover, type EventPopoverProps } from "./event-popover";

// トップレベルに正規表現を定義（パフォーマンス最適化）
const LOCATION_PATTERN = /場所:.*会議室A/;
const DATE_2025_12_5_PATTERN = /2025年12月5日/;
const DATE_2025_12_29_PATTERN = /2025年12月29日/;
const DATE_2025_12_31_PATTERN = /2025年12月31日/;
const TIME_1400_PATTERN = /14:00/;
const TIME_1530_PATTERN = /15:30/;
const TIME_0000_PATTERN = /00:00/;
const ALL_DAY_PATTERN = /終日/;
const LOCATION_LABEL_PATTERN = /場所/;
const CHANNEL_PATTERN = /general/;
const CHANNEL_LABEL_PATTERN = /チャンネル/;
const DESCRIPTION_LABEL_PATTERN = /説明/;
const CLOSE_BUTTON_PATTERN = /閉じる/;
const EDIT_BUTTON_PATTERN = /編集/;
const DELETE_BUTTON_PATTERN = /削除/;

describe("EventPopover", () => {
  // 通常のイベント（時間指定）
  const timedEvent: CalendarEvent = {
    id: "1",
    title: "定例ミーティング",
    start: new Date(2025, 11, 5, 14, 0),
    end: new Date(2025, 11, 5, 15, 30),
    allDay: false,
    color: "#3b82f6",
    description: "チームの週次定例ミーティングです。",
    location: "会議室A",
    channel: {
      id: "123456789",
      name: "general",
    },
  };

  // 終日イベント
  const allDayEvent: CalendarEvent = {
    id: "2",
    title: "年末休暇",
    start: new Date(2025, 11, 29),
    end: new Date(2025, 11, 31),
    allDay: true,
    color: "#10b981",
    description: "年末年始のお休みです。",
  };

  // 最小限のイベント（説明文・場所・チャンネルなし）
  const minimalEvent: CalendarEvent = {
    id: "3",
    title: "シンプルなイベント",
    start: new Date(2025, 11, 10, 10, 0),
    end: new Date(2025, 11, 10, 11, 0),
    allDay: false,
    color: "#f59e0b",
  };

  const defaultProps: EventPopoverProps = {
    event: timedEvent,
    open: true,
    onClose: vi.fn(),
  };

  // Task 7.1: EventPopoverコンポーネントの作成
  describe("Task 7.1: EventPopoverコンポーネントの作成", () => {
    it("ユーザーがカレンダー上のイベントをクリックするとイベント詳細のポップオーバーを表示する (Req 4.1)", () => {
      render(<EventPopover {...defaultProps} />);

      // ポップオーバーが表示される
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    it("open=falseの場合はポップオーバーを表示しない", () => {
      render(<EventPopover {...defaultProps} open={false} />);

      // ポップオーバーが表示されない
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("イベント名を表示する (Req 4.2)", () => {
      render(<EventPopover {...defaultProps} />);

      expect(screen.getByText("定例ミーティング")).toBeInTheDocument();
    });

    it("開始日時と終了日時を表示する (Req 4.2)", () => {
      render(<EventPopover {...defaultProps} />);

      // 日付と時刻が表示される
      expect(screen.getByText(DATE_2025_12_5_PATTERN)).toBeInTheDocument();
      expect(screen.getByText(TIME_1400_PATTERN)).toBeInTheDocument();
      expect(screen.getByText(TIME_1530_PATTERN)).toBeInTheDocument();
    });

    it("説明文を表示する (Req 4.2)", () => {
      render(<EventPopover {...defaultProps} />);

      expect(
        screen.getByText("チームの週次定例ミーティングです。")
      ).toBeInTheDocument();
    });

    it("場所情報を表示する (Req 4.3)", () => {
      render(<EventPopover {...defaultProps} />);

      // 場所情報を含むテキストが表示される
      expect(screen.getByText(LOCATION_PATTERN)).toBeInTheDocument();
    });

    it("場所情報がない場合は場所セクションを表示しない (Req 4.3)", () => {
      render(<EventPopover {...defaultProps} event={minimalEvent} />);

      // 場所ラベルが表示されない
      expect(
        screen.queryByText(LOCATION_LABEL_PATTERN)
      ).not.toBeInTheDocument();
    });

    it("Discordチャンネル情報を表示する (Req 4.4)", () => {
      render(<EventPopover {...defaultProps} />);

      expect(screen.getByText(CHANNEL_PATTERN)).toBeInTheDocument();
    });

    it("Discordチャンネル情報がない場合はチャンネルセクションを表示しない (Req 4.4)", () => {
      render(<EventPopover {...defaultProps} event={minimalEvent} />);

      // チャンネルラベルが表示されない
      expect(screen.queryByText(CHANNEL_LABEL_PATTERN)).not.toBeInTheDocument();
    });

    it("終日イベントの場合は時刻ではなく「終日」と表示する (Req 9.5)", () => {
      render(<EventPopover {...defaultProps} event={allDayEvent} />);

      // 「終日」が表示される
      expect(screen.getByText(ALL_DAY_PATTERN)).toBeInTheDocument();

      // 時刻は表示されない
      expect(screen.queryByText(TIME_0000_PATTERN)).not.toBeInTheDocument();
    });

    it("終日イベントの場合は日付範囲を表示する (Req 9.5)", () => {
      render(<EventPopover {...defaultProps} event={allDayEvent} />);

      // 開始日と終了日が表示される
      expect(screen.getByText(DATE_2025_12_29_PATTERN)).toBeInTheDocument();
      expect(screen.getByText(DATE_2025_12_31_PATTERN)).toBeInTheDocument();
    });

    it("イベントのカラーが視覚的に表示される", () => {
      render(<EventPopover {...defaultProps} />);

      // カラーインジケーターが表示される
      const colorIndicator = screen.getByTestId("event-color-indicator");
      expect(colorIndicator).toHaveStyle({ backgroundColor: "#3b82f6" });
    });

    it("説明文がない場合は説明セクションを表示しない", () => {
      render(<EventPopover {...defaultProps} event={minimalEvent} />);

      // 説明ラベルが表示されない
      expect(
        screen.queryByText(DESCRIPTION_LABEL_PATTERN)
      ).not.toBeInTheDocument();
    });
  });

  // Task 7.2: ポップオーバーの表示位置と閉じ動作
  describe("Task 7.2: ポップオーバーの表示位置と閉じ動作", () => {
    it("ポップオーバー外をクリックすると閉じる (Req 4.5)", async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();

      render(<EventPopover {...defaultProps} onClose={onClose} />);

      // ポップオーバーが表示される
      expect(screen.getByRole("dialog")).toBeInTheDocument();

      // ダイアログのオーバーレイをクリック（外側クリック）
      const overlay = document.querySelector('[data-slot="dialog-overlay"]');
      expect(overlay).toBeInTheDocument();
      if (overlay) {
        await user.click(overlay);
      }

      // onCloseが呼ばれる
      await waitFor(() => {
        expect(onClose).toHaveBeenCalled();
      });
    });

    it("Escキーを押下すると閉じる (Req 4.6)", async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();

      render(<EventPopover {...defaultProps} onClose={onClose} />);

      // ポップオーバーが表示される
      expect(screen.getByRole("dialog")).toBeInTheDocument();

      // Escキーを押下
      await user.keyboard("{Escape}");

      // onCloseが呼ばれる
      await waitFor(() => {
        expect(onClose).toHaveBeenCalled();
      });
    });

    it("ポップオーバーにはアクセシブルなaria属性が設定されている (Req 4.7)", () => {
      render(<EventPopover {...defaultProps} />);

      const dialog = screen.getByRole("dialog");
      expect(dialog).toHaveAttribute("aria-label");
    });

    it("閉じるボタンをクリックするとポップオーバーが閉じる", async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();

      render(<EventPopover {...defaultProps} onClose={onClose} />);

      // 閉じるボタンをクリック
      const closeButton = screen.getByRole("button", {
        name: CLOSE_BUTTON_PATTERN,
      });
      await user.click(closeButton);

      // onCloseが呼ばれる
      expect(onClose).toHaveBeenCalled();
    });

    it("ポップオーバー内のコンテンツをクリックしても閉じない", async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();

      render(<EventPopover {...defaultProps} onClose={onClose} />);

      // ポップオーバー内のイベント名をクリック
      const eventTitle = screen.getByText("定例ミーティング");
      await user.click(eventTitle);

      // onCloseが呼ばれない
      expect(onClose).not.toHaveBeenCalled();
    });
  });

  // Task 6.1: 編集・削除ボタンの追加
  describe("Task 6.1: 編集・削除ボタンの追加", () => {
    it("onEditが提供されている場合、編集ボタンを表示する (Req 2.3)", () => {
      const onEdit = vi.fn();
      render(<EventPopover {...defaultProps} onEdit={onEdit} />);

      const editButton = screen.getByTestId("event-edit-button");
      expect(editButton).toBeInTheDocument();
      expect(editButton).toHaveTextContent(EDIT_BUTTON_PATTERN);
    });

    it("onDeleteが提供されている場合、削除ボタンを表示する (Req 2.3)", () => {
      const onDelete = vi.fn();
      render(<EventPopover {...defaultProps} onDelete={onDelete} />);

      const deleteButton = screen.getByTestId("event-delete-button");
      expect(deleteButton).toBeInTheDocument();
      expect(deleteButton).toHaveTextContent(DELETE_BUTTON_PATTERN);
    });

    it("編集ボタンクリック時にonEditコールバックを呼び出す (Req 2.3)", async () => {
      const user = userEvent.setup();
      const onEdit = vi.fn();
      render(<EventPopover {...defaultProps} onEdit={onEdit} />);

      const editButton = screen.getByTestId("event-edit-button");
      await user.click(editButton);

      expect(onEdit).toHaveBeenCalledWith(timedEvent);
      expect(onEdit).toHaveBeenCalledTimes(1);
    });

    it("削除ボタンクリック時にonDeleteコールバックを呼び出す (Req 2.3)", async () => {
      const user = userEvent.setup();
      const onDelete = vi.fn();
      render(<EventPopover {...defaultProps} onDelete={onDelete} />);

      const deleteButton = screen.getByTestId("event-delete-button");
      await user.click(deleteButton);

      expect(onDelete).toHaveBeenCalledWith(timedEvent);
      expect(onDelete).toHaveBeenCalledTimes(1);
    });

    it("onEditもonDeleteも提供されていない場合、ボタンを表示しない", () => {
      render(<EventPopover {...defaultProps} />);

      expect(screen.queryByTestId("event-edit-button")).not.toBeInTheDocument();
      expect(
        screen.queryByTestId("event-delete-button")
      ).not.toBeInTheDocument();
    });

    it("onEditのみ提供されている場合、編集ボタンのみを表示する", () => {
      const onEdit = vi.fn();
      render(<EventPopover {...defaultProps} onEdit={onEdit} />);

      expect(screen.getByTestId("event-edit-button")).toBeInTheDocument();
      expect(
        screen.queryByTestId("event-delete-button")
      ).not.toBeInTheDocument();
    });

    it("onDeleteのみ提供されている場合、削除ボタンのみを表示する", () => {
      const onDelete = vi.fn();
      render(<EventPopover {...defaultProps} onDelete={onDelete} />);

      expect(screen.queryByTestId("event-edit-button")).not.toBeInTheDocument();
      expect(screen.getByTestId("event-delete-button")).toBeInTheDocument();
    });

    it("既存のプレビュー表示機能を維持する", () => {
      const onEdit = vi.fn();
      const onDelete = vi.fn();
      render(
        <EventPopover {...defaultProps} onDelete={onDelete} onEdit={onEdit} />
      );

      // タイトル、日時、説明が正しく表示される
      expect(screen.getByText("定例ミーティング")).toBeInTheDocument();
      expect(screen.getByText(DATE_2025_12_5_PATTERN)).toBeInTheDocument();
      expect(screen.getByText(TIME_1400_PATTERN)).toBeInTheDocument();
      expect(
        screen.getByText("チームの週次定例ミーティングです。")
      ).toBeInTheDocument();
    });
  });

  // エッジケース
  describe("エッジケース", () => {
    it("event=nullの場合はポップオーバーを表示しない", () => {
      // @ts-expect-error - テスト用にnullを渡す
      render(<EventPopover {...defaultProps} event={null} />);

      // ポップオーバーが表示されない
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("非常に長いイベント名も正しく表示される", () => {
      const longTitleEvent: CalendarEvent = {
        ...timedEvent,
        title:
          "これはとても長いイベント名で、ポップオーバーの幅を超える可能性がありますが、適切に折り返して表示されるべきです。",
      };

      render(<EventPopover {...defaultProps} event={longTitleEvent} />);

      expect(screen.getByText(longTitleEvent.title)).toBeInTheDocument();
    });

    it("非常に長い説明文も正しく表示される", () => {
      const longDescription =
        "これはとても長い説明文です。ポップオーバー内で適切に表示され、ユーザーが内容を読むことができるようにする必要があります。改行やスクロールが必要な場合も適切に処理されます。";
      const longDescEvent: CalendarEvent = {
        ...timedEvent,
        description: longDescription,
      };

      render(<EventPopover {...defaultProps} event={longDescEvent} />);

      expect(screen.getByText(longDescription)).toBeInTheDocument();
    });

    it("同日の開始と終了の場合、日付は1回のみ表示される", () => {
      render(<EventPopover {...defaultProps} event={timedEvent} />);

      // 同日のイベントなので日付は1回のみ
      const dateMatches = screen.getAllByText(DATE_2025_12_5_PATTERN);
      expect(dateMatches).toHaveLength(1);
    });
  });
});
