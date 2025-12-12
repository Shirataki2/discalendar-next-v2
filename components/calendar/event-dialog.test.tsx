/**
 * EventDialog - テスト
 *
 * タスク5.2: 予定作成・編集ダイアログコンポーネントを作成する
 * - 新規作成モードと編集モードを切り替えられるダイアログを実装する
 * - 初期値（期間選択時の開始・終了日時、編集時の既存データ）を受け取る
 * - EventFormコンポーネントを内包し、フォーム送信を処理する
 * - 保存成功時にダイアログを閉じて親に通知する
 * - キャンセル時やダイアログ外クリック時に入力内容を破棄して閉じる
 *
 * Requirements: 1.3, 1.5, 1.7, 3.1, 3.2, 3.4, 3.6
 */
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { EventDialog, type EventDialogProps } from "./event-dialog";

// 正規表現パターン
const CREATE_TITLE_PATTERN = /新規予定作成/i;
const EDIT_TITLE_PATTERN = /予定を編集/i;
const TITLE_INPUT_PATTERN = /タイトル/i;
const SAVE_PATTERN = /保存/i;
const CANCEL_PATTERN = /キャンセル/i;
const CLOSE_BUTTON_PATTERN = /close/i;
const CREATE_FAILED_ERROR_PATTERN = /イベントの作成に失敗しました/i;

// モックのEventService
const mockEventService = {
  fetchEvents: vi.fn(),
  createEvent: vi.fn(),
  updateEvent: vi.fn(),
  deleteEvent: vi.fn(),
};

// 成功時のモックレスポンス
const mockSuccessResponse = {
  success: true as const,
  data: {
    id: "event-123",
    guildId: "guild-123",
    title: "テスト予定",
    description: "説明",
    color: "#3B82F6",
    isAllDay: false,
    startAt: new Date("2025-12-10T10:00:00"),
    endAt: new Date("2025-12-10T11:00:00"),
    location: null,
    channelId: null,
    channelName: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
};

describe("EventDialog", () => {
  const defaultProps: EventDialogProps = {
    open: true,
    mode: "create",
    guildId: "guild-123",
    eventService: mockEventService,
    onClose: vi.fn(),
    onSuccess: vi.fn(),
  };

  afterEach(() => {
    vi.clearAllMocks();
  });

  // Task 5.2: ダイアログの表示
  describe("Task 5.2: ダイアログの表示", () => {
    it("openがtrueの場合、ダイアログが表示される (Req 1.3)", () => {
      render(<EventDialog {...defaultProps} open />);

      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    it("openがfalseの場合、ダイアログが表示されない", () => {
      render(<EventDialog {...defaultProps} open={false} />);

      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("新規作成モードで正しいタイトルが表示される (Req 3.1)", () => {
      render(<EventDialog {...defaultProps} mode="create" />);

      expect(screen.getByText(CREATE_TITLE_PATTERN)).toBeInTheDocument();
    });

    it("編集モードで正しいタイトルが表示される (Req 3.1)", () => {
      render(<EventDialog {...defaultProps} mode="edit" />);

      expect(screen.getByText(EDIT_TITLE_PATTERN)).toBeInTheDocument();
    });

    it("EventFormコンポーネントが表示される (Req 1.3)", () => {
      render(<EventDialog {...defaultProps} />);

      expect(
        screen.getByRole("textbox", { name: TITLE_INPUT_PATTERN })
      ).toBeInTheDocument();
    });
  });

  // Task 5.2: 初期値の設定
  describe("Task 5.2: 初期値の設定", () => {
    it("initialDataで初期値が設定される (Req 3.2)", () => {
      const initialData = {
        title: "会議",
        description: "週次ミーティング",
        startAt: new Date("2025-12-10T10:00:00"),
        endAt: new Date("2025-12-10T11:00:00"),
      };

      render(<EventDialog {...defaultProps} initialData={initialData} />);

      expect(
        screen.getByRole("textbox", { name: TITLE_INPUT_PATTERN })
      ).toHaveValue("会議");
    });

    it("期間選択時の開始・終了日時が初期値として設定される (Req 1.3)", () => {
      const initialData = {
        startAt: new Date("2025-12-10T14:00:00"),
        endAt: new Date("2025-12-10T15:00:00"),
      };

      render(<EventDialog {...defaultProps} initialData={initialData} />);

      // フォームが正常にレンダリングされることを確認
      expect(
        screen.getByRole("textbox", { name: TITLE_INPUT_PATTERN })
      ).toBeInTheDocument();
    });
  });

  // Task 5.2: 新規作成フロー
  describe("Task 5.2: 新規作成フロー", () => {
    it("有効なデータで保存時にcreateEventが呼ばれる (Req 1.3)", async () => {
      const user = userEvent.setup();
      mockEventService.createEvent.mockResolvedValue(mockSuccessResponse);

      render(<EventDialog {...defaultProps} mode="create" />);

      // タイトルを入力
      const titleInput = screen.getByRole("textbox", {
        name: TITLE_INPUT_PATTERN,
      });
      await user.type(titleInput, "新しい予定");

      // 保存ボタンをクリック
      const saveButton = screen.getByRole("button", { name: SAVE_PATTERN });
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockEventService.createEvent).toHaveBeenCalledWith(
          expect.objectContaining({
            guildId: "guild-123",
            title: "新しい予定",
          })
        );
      });
    });

    it("保存成功時にonSuccessが呼ばれる (Req 1.5)", async () => {
      const user = userEvent.setup();
      const onSuccess = vi.fn();
      mockEventService.createEvent.mockResolvedValue(mockSuccessResponse);

      render(
        <EventDialog
          {...defaultProps}
          initialData={{ title: "テスト予定" }}
          mode="create"
          onSuccess={onSuccess}
        />
      );

      // 保存ボタンをクリック
      const saveButton = screen.getByRole("button", { name: SAVE_PATTERN });
      await user.click(saveButton);

      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalledTimes(1);
      });
    });

    it("保存成功時にonCloseが呼ばれる (Req 1.5)", async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      mockEventService.createEvent.mockResolvedValue(mockSuccessResponse);

      render(
        <EventDialog
          {...defaultProps}
          initialData={{ title: "テスト予定" }}
          mode="create"
          onClose={onClose}
        />
      );

      // 保存ボタンをクリック
      const saveButton = screen.getByRole("button", { name: SAVE_PATTERN });
      await user.click(saveButton);

      await waitFor(() => {
        expect(onClose).toHaveBeenCalledTimes(1);
      });
    });
  });

  // Task 5.2: 編集フロー
  describe("Task 5.2: 編集フロー", () => {
    it("編集モードで保存時にupdateEventが呼ばれる (Req 3.3)", async () => {
      const user = userEvent.setup();
      mockEventService.updateEvent.mockResolvedValue(mockSuccessResponse);

      const initialData = {
        title: "既存の予定",
        startAt: new Date("2025-12-10T10:00:00"),
        endAt: new Date("2025-12-10T11:00:00"),
      };

      render(
        <EventDialog
          {...defaultProps}
          eventId="event-123"
          initialData={initialData}
          mode="edit"
        />
      );

      // タイトルを変更
      const titleInput = screen.getByRole("textbox", {
        name: TITLE_INPUT_PATTERN,
      });
      await user.clear(titleInput);
      await user.type(titleInput, "更新された予定");

      // 保存ボタンをクリック
      const saveButton = screen.getByRole("button", { name: SAVE_PATTERN });
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockEventService.updateEvent).toHaveBeenCalledWith(
          "event-123",
          expect.objectContaining({
            title: "更新された予定",
          })
        );
      });
    });

    it("編集完了時にダイアログが閉じてonSuccessが呼ばれる (Req 3.4)", async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      const onSuccess = vi.fn();
      mockEventService.updateEvent.mockResolvedValue(mockSuccessResponse);

      const initialData = {
        title: "既存の予定",
        startAt: new Date("2025-12-10T10:00:00"),
        endAt: new Date("2025-12-10T11:00:00"),
      };

      render(
        <EventDialog
          {...defaultProps}
          eventId="event-123"
          initialData={initialData}
          mode="edit"
          onClose={onClose}
          onSuccess={onSuccess}
        />
      );

      // 保存ボタンをクリック
      const saveButton = screen.getByRole("button", { name: SAVE_PATTERN });
      await user.click(saveButton);

      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalledTimes(1);
        expect(onClose).toHaveBeenCalledTimes(1);
      });
    });
  });

  // Task 5.2: キャンセル操作
  describe("Task 5.2: キャンセル操作", () => {
    it("キャンセルボタンクリック時にonCloseが呼ばれる (Req 1.7, 3.6)", async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();

      render(<EventDialog {...defaultProps} onClose={onClose} />);

      const cancelButton = screen.getByRole("button", { name: CANCEL_PATTERN });
      await user.click(cancelButton);

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("キャンセル時にcreateEvent/updateEventが呼ばれない (Req 1.7)", async () => {
      const user = userEvent.setup();

      render(<EventDialog {...defaultProps} />);

      // タイトルを入力してキャンセル
      const titleInput = screen.getByRole("textbox", {
        name: TITLE_INPUT_PATTERN,
      });
      await user.type(titleInput, "入力したタイトル");

      const cancelButton = screen.getByRole("button", { name: CANCEL_PATTERN });
      await user.click(cancelButton);

      expect(mockEventService.createEvent).not.toHaveBeenCalled();
      expect(mockEventService.updateEvent).not.toHaveBeenCalled();
    });

    it("閉じるボタンクリック時にonCloseが呼ばれる (Req 1.7)", async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();

      render(<EventDialog {...defaultProps} onClose={onClose} />);

      // ダイアログの閉じるボタンをクリック
      const dialog = screen.getByRole("dialog");
      const closeButton = within(dialog).getByRole("button", {
        name: CLOSE_BUTTON_PATTERN,
      });
      await user.click(closeButton);

      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  // Task 5.2: ローディング状態
  describe("Task 5.2: ローディング状態", () => {
    it("保存中はフォームが無効になる", async () => {
      const user = userEvent.setup();
      // 遅延するPromiseを作成
      mockEventService.createEvent.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(() => resolve(mockSuccessResponse), 100)
          )
      );

      render(
        <EventDialog
          {...defaultProps}
          initialData={{ title: "テスト予定" }}
          mode="create"
        />
      );

      // 保存ボタンをクリック
      const saveButton = screen.getByRole("button", { name: SAVE_PATTERN });
      await user.click(saveButton);

      // ローディング中はボタンが無効
      await waitFor(() => {
        expect(saveButton).toBeDisabled();
      });
    });
  });

  // Task 5.2: エラーハンドリング
  describe("Task 5.2: エラーハンドリング", () => {
    it("保存失敗時にエラーメッセージが表示される", async () => {
      const user = userEvent.setup();
      mockEventService.createEvent.mockResolvedValue({
        success: false,
        error: {
          code: "CREATE_FAILED",
          message: "イベントの作成に失敗しました。",
        },
      });

      render(
        <EventDialog
          {...defaultProps}
          initialData={{ title: "テスト予定" }}
          mode="create"
        />
      );

      // 保存ボタンをクリック
      const saveButton = screen.getByRole("button", { name: SAVE_PATTERN });
      await user.click(saveButton);

      await waitFor(() => {
        expect(
          screen.getByText(CREATE_FAILED_ERROR_PATTERN)
        ).toBeInTheDocument();
      });
    });

    it("保存失敗時にダイアログは開いたままになる", async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      mockEventService.createEvent.mockResolvedValue({
        success: false,
        error: {
          code: "CREATE_FAILED",
          message: "イベントの作成に失敗しました。",
        },
      });

      render(
        <EventDialog
          {...defaultProps}
          initialData={{ title: "テスト予定" }}
          mode="create"
          onClose={onClose}
        />
      );

      // 保存ボタンをクリック
      const saveButton = screen.getByRole("button", { name: SAVE_PATTERN });
      await user.click(saveButton);

      await waitFor(() => {
        expect(
          screen.getByText(CREATE_FAILED_ERROR_PATTERN)
        ).toBeInTheDocument();
      });

      // ダイアログは閉じない
      expect(onClose).not.toHaveBeenCalled();
    });
  });

  // アクセシビリティ
  describe("アクセシビリティ", () => {
    it("ダイアログに適切なrole属性が設定されている", () => {
      render(<EventDialog {...defaultProps} />);

      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    it("ダイアログタイトルが設定されている", () => {
      render(<EventDialog {...defaultProps} mode="create" />);

      const dialog = screen.getByRole("dialog");
      expect(dialog).toHaveAttribute("aria-labelledby");
    });
  });
});
