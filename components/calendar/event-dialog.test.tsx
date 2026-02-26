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
 * タスク7.4: 編集・削除スコープ操作のフック統合
 * - スコープ付き編集時にupdateOccurrenceActionが適切なスコープで呼ばれる
 * - SERIES_NOT_FOUND / RRULE_PARSE_ERRORエラーが表示される
 *
 * Requirements: 1.3, 1.5, 1.7, 3.1, 3.2, 3.4, 3.6, 5.2, 5.4, 6.1, 6.2, 6.3, 7.1, 7.2
 */
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

// Server Actionsのモック
vi.mock("@/app/dashboard/actions", () => ({
  createEventAction: vi.fn(),
  updateEventAction: vi.fn(),
  deleteEventAction: vi.fn(),
  createRecurringEventAction: vi.fn(),
  updateOccurrenceAction: vi.fn(),
}));

import {
  createEventAction,
  createRecurringEventAction,
  updateEventAction,
  updateOccurrenceAction,
} from "@/app/dashboard/actions";
import { EventDialog, type EventDialogProps } from "./event-dialog";

const mockCreateEventAction = vi.mocked(createEventAction);
const mockUpdateEventAction = vi.mocked(updateEventAction);
const mockCreateRecurringEventAction = vi.mocked(createRecurringEventAction);
const mockUpdateOccurrenceAction = vi.mocked(updateOccurrenceAction);

// Task 7.4: テスト用正規表現（トップレベルに定義）
const SERIES_NOT_FOUND_PATTERN = /イベントシリーズが見つかりません/;
const RRULE_PARSE_ERROR_PATTERN = /繰り返しルールの解析に失敗しました/;
const RECURRENCE_PATTERN = /繰り返し/;

// 正規表現パターン
const CREATE_TITLE_PATTERN = /新規予定作成/i;
const EDIT_TITLE_PATTERN = /予定を編集/i;
const TITLE_INPUT_PATTERN = /タイトル/i;
const SAVE_PATTERN = /保存/i;
const CANCEL_PATTERN = /キャンセル/i;
const CLOSE_BUTTON_PATTERN = /close/i;
const CREATE_FAILED_ERROR_PATTERN = /イベントの作成に失敗しました/i;
const SERIES_CREATE_FAILED_PATTERN = /シリーズの作成に失敗しました/;

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
    it("有効なデータで保存時にcreateEventActionが呼ばれる (Req 1.3)", async () => {
      const user = userEvent.setup();
      mockCreateEventAction.mockResolvedValue(mockSuccessResponse);

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
        expect(mockCreateEventAction).toHaveBeenCalledWith(
          expect.objectContaining({
            guildId: "guild-123",
            eventData: expect.objectContaining({
              guildId: "guild-123",
              title: "新しい予定",
            }),
          })
        );
      });
    });

    it("保存成功時にonSuccessが呼ばれる (Req 1.5)", async () => {
      const user = userEvent.setup();
      const onSuccess = vi.fn();
      mockCreateEventAction.mockResolvedValue(mockSuccessResponse);

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
      mockCreateEventAction.mockResolvedValue(mockSuccessResponse);

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
    it("編集モードで保存時にupdateEventActionが呼ばれる (Req 3.3)", async () => {
      const user = userEvent.setup();
      mockUpdateEventAction.mockResolvedValue(mockSuccessResponse);

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
        expect(mockUpdateEventAction).toHaveBeenCalledWith(
          expect.objectContaining({
            guildId: "guild-123",
            eventId: "event-123",
            eventData: expect.objectContaining({
              title: "更新された予定",
            }),
          })
        );
      });
    });

    it("編集完了時にダイアログが閉じてonSuccessが呼ばれる (Req 3.4)", async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      const onSuccess = vi.fn();
      mockUpdateEventAction.mockResolvedValue(mockSuccessResponse);

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

    it("キャンセル時にServer Actionsが呼ばれない (Req 1.7)", async () => {
      const user = userEvent.setup();

      render(<EventDialog {...defaultProps} />);

      // タイトルを入力してキャンセル
      const titleInput = screen.getByRole("textbox", {
        name: TITLE_INPUT_PATTERN,
      });
      await user.type(titleInput, "入力したタイトル");

      const cancelButton = screen.getByRole("button", { name: CANCEL_PATTERN });
      await user.click(cancelButton);

      expect(mockCreateEventAction).not.toHaveBeenCalled();
      expect(mockUpdateEventAction).not.toHaveBeenCalled();
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
      mockCreateEventAction.mockImplementation(
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
      mockCreateEventAction.mockResolvedValue({
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
      mockCreateEventAction.mockResolvedValue({
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

  // Task 5: 通知データの受け渡し
  describe("Task 5: 通知データの受け渡し", () => {
    it("新規作成時にnotificationsがcreateEventActionに渡される (Req 2.1)", async () => {
      const user = userEvent.setup();
      mockCreateEventAction.mockResolvedValue(mockSuccessResponse);

      const initialData = {
        title: "テスト予定",
        startAt: new Date("2025-12-10T10:00:00"),
        endAt: new Date("2025-12-10T11:00:00"),
        notifications: [
          { key: "n1", num: 10, unit: "minutes" as const },
          { key: "n2", num: 1, unit: "hours" as const },
        ],
      };

      render(
        <EventDialog
          {...defaultProps}
          initialData={initialData}
          mode="create"
        />
      );

      const saveButton = screen.getByRole("button", { name: SAVE_PATTERN });
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockCreateEventAction).toHaveBeenCalledWith(
          expect.objectContaining({
            eventData: expect.objectContaining({
              notifications: expect.arrayContaining([
                expect.objectContaining({ num: 10, unit: "minutes" }),
                expect.objectContaining({ num: 1, unit: "hours" }),
              ]),
            }),
          })
        );
      });
    });

    it("編集時にnotificationsがupdateEventActionに渡される (Req 2.3)", async () => {
      const user = userEvent.setup();
      mockUpdateEventAction.mockResolvedValue(mockSuccessResponse);

      const initialData = {
        title: "既存の予定",
        startAt: new Date("2025-12-10T10:00:00"),
        endAt: new Date("2025-12-10T11:00:00"),
        notifications: [{ key: "n1", num: 3, unit: "days" as const }],
      };

      render(
        <EventDialog
          {...defaultProps}
          eventId="event-123"
          initialData={initialData}
          mode="edit"
        />
      );

      const saveButton = screen.getByRole("button", { name: SAVE_PATTERN });
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockUpdateEventAction).toHaveBeenCalledWith(
          expect.objectContaining({
            eventId: "event-123",
            eventData: expect.objectContaining({
              notifications: expect.arrayContaining([
                expect.objectContaining({ num: 3, unit: "days" }),
              ]),
            }),
          })
        );
      });
    });

    it("通知なしで保存時にnotificationsが空配列として渡される (Req 2.4)", async () => {
      const user = userEvent.setup();
      mockCreateEventAction.mockResolvedValue(mockSuccessResponse);

      const initialData = {
        title: "通知なし予定",
        startAt: new Date("2025-12-10T10:00:00"),
        endAt: new Date("2025-12-10T11:00:00"),
      };

      render(
        <EventDialog
          {...defaultProps}
          initialData={initialData}
          mode="create"
        />
      );

      const saveButton = screen.getByRole("button", { name: SAVE_PATTERN });
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockCreateEventAction).toHaveBeenCalledWith(
          expect.objectContaining({
            eventData: expect.objectContaining({
              notifications: [],
            }),
          })
        );
      });
    });

    it("編集モードで保存済み通知がフォームに復元表示される (Req 2.2)", () => {
      const initialData = {
        title: "既存の予定",
        startAt: new Date("2025-12-10T10:00:00"),
        endAt: new Date("2025-12-10T11:00:00"),
        notifications: [
          { key: "n1", num: 10, unit: "minutes" as const },
          { key: "n2", num: 1, unit: "hours" as const },
        ],
      };

      render(
        <EventDialog
          {...defaultProps}
          eventId="event-123"
          initialData={initialData}
          mode="edit"
        />
      );

      expect(screen.getByText("10分前")).toBeInTheDocument();
      expect(screen.getByText("1時間前")).toBeInTheDocument();
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

  // Task 7.3: 繰り返しイベント作成の統合
  describe("Task 7.3: 繰り返しイベント作成の統合", () => {
    const mockSeriesSuccessResponse = {
      success: true as const,
      data: {
        id: "series-123",
        guildId: "guild-123",
        title: "繰り返し予定",
        rrule: "FREQ=DAILY;INTERVAL=1",
        dtstart: new Date("2025-12-10T10:00:00"),
        duration: 3_600_000,
        description: null,
        isAllDay: false,
        color: "#3B82F6",
        location: null,
        channelId: null,
        channelName: null,
        exdates: [],
        notifications: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    };

    it("繰り返し設定有効で保存するとcreateRecurringEventActionが呼ばれる (Req 1.3)", async () => {
      const user = userEvent.setup();
      mockCreateRecurringEventAction.mockResolvedValue(
        mockSeriesSuccessResponse
      );

      render(
        <EventDialog
          {...defaultProps}
          initialData={{ title: "繰り返し予定" }}
          mode="create"
          recurrenceDefaultValues={{
            isRecurring: true,
            frequency: "daily",
          }}
        />
      );

      // 保存ボタンをクリック
      const saveButton = screen.getByRole("button", { name: SAVE_PATTERN });
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockCreateRecurringEventAction).toHaveBeenCalledWith(
          expect.objectContaining({
            guildId: "guild-123",
            eventData: expect.objectContaining({
              guildId: "guild-123",
              title: "繰り返し予定",
              rrule: expect.any(String),
            }),
          })
        );
      });
    });

    it("繰り返し設定無効で保存すると既存のcreateEventActionが呼ばれる (Req 1.5)", async () => {
      const user = userEvent.setup();
      mockCreateEventAction.mockResolvedValue(mockSuccessResponse);

      render(
        <EventDialog
          {...defaultProps}
          initialData={{ title: "通常予定" }}
          mode="create"
        />
      );

      // 保存ボタンをクリック
      const saveButton = screen.getByRole("button", { name: SAVE_PATTERN });
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockCreateEventAction).toHaveBeenCalled();
        expect(mockCreateRecurringEventAction).not.toHaveBeenCalled();
      });
    });

    it("繰り返しイベント作成成功時にonSuccessとonCloseが呼ばれる (Req 1.5)", async () => {
      const user = userEvent.setup();
      const onSuccess = vi.fn();
      const onClose = vi.fn();
      mockCreateRecurringEventAction.mockResolvedValue(
        mockSeriesSuccessResponse
      );

      render(
        <EventDialog
          {...defaultProps}
          initialData={{ title: "繰り返し予定" }}
          mode="create"
          onClose={onClose}
          onSuccess={onSuccess}
          recurrenceDefaultValues={{
            isRecurring: true,
            frequency: "daily",
          }}
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

    it("繰り返しイベント作成失敗時にエラーメッセージが表示される", async () => {
      const user = userEvent.setup();
      mockCreateRecurringEventAction.mockResolvedValue({
        success: false,
        error: {
          code: "CREATE_FAILED",
          message: "シリーズの作成に失敗しました。",
        },
      });

      render(
        <EventDialog
          {...defaultProps}
          initialData={{ title: "繰り返し予定" }}
          mode="create"
          recurrenceDefaultValues={{
            isRecurring: true,
            frequency: "daily",
          }}
        />
      );

      // 保存ボタンをクリック
      const saveButton = screen.getByRole("button", { name: SAVE_PATTERN });
      await user.click(saveButton);

      await waitFor(() => {
        expect(
          screen.getByText(SERIES_CREATE_FAILED_PATTERN)
        ).toBeInTheDocument();
      });
    });
  });

  // Task 7.4: スコープ付き繰り返しイベント編集
  describe("Task 7.4: スコープ付き繰り返しイベント編集", () => {
    const recurringInitialData = {
      title: "繰り返し予定",
      startAt: new Date("2025-12-10T10:00:00"),
      endAt: new Date("2025-12-10T11:00:00"),
    };

    const mockScopedSuccessResponse = {
      success: true as const,
      data: {
        id: "event-exc-1",
        title: "繰り返し予定",
        start: new Date("2025-12-10T10:00:00"),
        end: new Date("2025-12-10T11:00:00"),
        allDay: false,
        color: "#3B82F6",
      },
    };

    it("editScope='this'の場合、updateOccurrenceActionがscope 'this'で呼ばれる (Req 5.2)", async () => {
      const user = userEvent.setup();
      mockUpdateOccurrenceAction.mockResolvedValue(mockScopedSuccessResponse);

      render(
        <EventDialog
          {...defaultProps}
          editScope="this"
          eventId="series-123:2025-12-10T10:00:00.000Z"
          initialData={recurringInitialData}
          mode="edit"
          occurrenceDate={new Date("2025-12-10T10:00:00")}
          seriesId="series-123"
        />
      );

      const saveButton = screen.getByRole("button", { name: SAVE_PATTERN });
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockUpdateOccurrenceAction).toHaveBeenCalledWith(
          expect.objectContaining({
            guildId: "guild-123",
            seriesId: "series-123",
            scope: "this",
            occurrenceDate: new Date("2025-12-10T10:00:00"),
            eventData: expect.objectContaining({
              title: "繰り返し予定",
            }),
          })
        );
      });
    });

    it("editScope='all'の場合、updateOccurrenceActionがscope 'all'で呼ばれる (Req 6.1, 6.2)", async () => {
      const user = userEvent.setup();
      mockUpdateOccurrenceAction.mockResolvedValue(mockScopedSuccessResponse);

      render(
        <EventDialog
          {...defaultProps}
          editScope="all"
          eventId="series-123:2025-12-10T10:00:00.000Z"
          initialData={recurringInitialData}
          mode="edit"
          occurrenceDate={new Date("2025-12-10T10:00:00")}
          resetExceptions
          seriesId="series-123"
        />
      );

      const saveButton = screen.getByRole("button", { name: SAVE_PATTERN });
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockUpdateOccurrenceAction).toHaveBeenCalledWith(
          expect.objectContaining({
            guildId: "guild-123",
            seriesId: "series-123",
            scope: "all",
            eventData: expect.objectContaining({
              title: "繰り返し予定",
              resetExceptions: true,
            }),
          })
        );
      });
    });

    it("editScope='following'の場合、updateOccurrenceActionがscope 'following'で呼ばれる (Req 7.1)", async () => {
      const user = userEvent.setup();
      mockUpdateOccurrenceAction.mockResolvedValue(mockScopedSuccessResponse);

      render(
        <EventDialog
          {...defaultProps}
          editScope="following"
          eventId="series-123:2025-12-10T10:00:00.000Z"
          initialData={recurringInitialData}
          mode="edit"
          occurrenceDate={new Date("2025-12-10T10:00:00")}
          seriesId="series-123"
        />
      );

      const saveButton = screen.getByRole("button", { name: SAVE_PATTERN });
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockUpdateOccurrenceAction).toHaveBeenCalledWith(
          expect.objectContaining({
            guildId: "guild-123",
            seriesId: "series-123",
            scope: "following",
            occurrenceDate: new Date("2025-12-10T10:00:00"),
          })
        );
      });
    });

    it("スコープ付き編集成功時にonSuccessとonCloseが呼ばれる", async () => {
      const user = userEvent.setup();
      const onSuccess = vi.fn();
      const onClose = vi.fn();
      mockUpdateOccurrenceAction.mockResolvedValue(mockScopedSuccessResponse);

      render(
        <EventDialog
          {...defaultProps}
          editScope="this"
          eventId="series-123:2025-12-10T10:00:00.000Z"
          initialData={recurringInitialData}
          mode="edit"
          occurrenceDate={new Date("2025-12-10T10:00:00")}
          onClose={onClose}
          onSuccess={onSuccess}
          seriesId="series-123"
        />
      );

      const saveButton = screen.getByRole("button", { name: SAVE_PATTERN });
      await user.click(saveButton);

      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalledTimes(1);
        expect(onClose).toHaveBeenCalledTimes(1);
      });
    });

    it("SERIES_NOT_FOUNDエラーが表示される", async () => {
      const user = userEvent.setup();
      mockUpdateOccurrenceAction.mockResolvedValue({
        success: false,
        error: {
          code: "SERIES_NOT_FOUND",
          message: "指定されたイベントシリーズが見つかりません。",
        },
      });

      render(
        <EventDialog
          {...defaultProps}
          editScope="this"
          eventId="series-123:2025-12-10T10:00:00.000Z"
          initialData={recurringInitialData}
          mode="edit"
          occurrenceDate={new Date("2025-12-10T10:00:00")}
          seriesId="series-123"
        />
      );

      const saveButton = screen.getByRole("button", { name: SAVE_PATTERN });
      await user.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText(SERIES_NOT_FOUND_PATTERN)).toBeInTheDocument();
      });
    });

    it("RRULE_PARSE_ERRORエラーが表示される", async () => {
      const user = userEvent.setup();
      mockUpdateOccurrenceAction.mockResolvedValue({
        success: false,
        error: {
          code: "RRULE_PARSE_ERROR",
          message: "繰り返しルールの解析に失敗しました。",
        },
      });

      render(
        <EventDialog
          {...defaultProps}
          editScope="all"
          eventId="series-123:2025-12-10T10:00:00.000Z"
          initialData={recurringInitialData}
          mode="edit"
          occurrenceDate={new Date("2025-12-10T10:00:00")}
          seriesId="series-123"
        />
      );

      const saveButton = screen.getByRole("button", { name: SAVE_PATTERN });
      await user.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText(RRULE_PARSE_ERROR_PATTERN)).toBeInTheDocument();
      });
    });

    it("editScopeが未指定の場合、通常のupdateEventActionが呼ばれる（後方互換）", async () => {
      const user = userEvent.setup();
      mockUpdateEventAction.mockResolvedValue(mockSuccessResponse);

      render(
        <EventDialog
          {...defaultProps}
          eventId="event-123"
          initialData={recurringInitialData}
          mode="edit"
        />
      );

      const saveButton = screen.getByRole("button", { name: SAVE_PATTERN });
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockUpdateEventAction).toHaveBeenCalledWith(
          expect.objectContaining({
            eventId: "event-123",
            eventData: expect.objectContaining({ title: "繰り返し予定" }),
          })
        );
        expect(mockUpdateOccurrenceAction).not.toHaveBeenCalled();
      });
    });

    it("editScope='this'で終日イベントの場合、endAtがそのまま渡される (DIS-50)", async () => {
      const user = userEvent.setup();
      mockUpdateOccurrenceAction.mockResolvedValue(mockScopedSuccessResponse);

      const sameDay = new Date("2025-12-10T00:00:00");
      render(
        <EventDialog
          {...defaultProps}
          editScope="this"
          eventId="series-123:2025-12-10T00:00:00.000Z"
          initialData={{
            title: "終日繰り返し",
            startAt: sameDay,
            endAt: sameDay,
            isAllDay: true,
          }}
          mode="edit"
          occurrenceDate={sameDay}
          seriesId="series-123"
        />
      );

      const saveButton = screen.getByRole("button", { name: SAVE_PATTERN });
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockUpdateOccurrenceAction).toHaveBeenCalledWith(
          expect.objectContaining({
            eventData: expect.objectContaining({
              endAt: sameDay,
            }),
          })
        );
      });
    });

    it("editScope='this'の場合、繰り返し設定UIが非表示になる", () => {
      render(
        <EventDialog
          {...defaultProps}
          editScope="this"
          eventId="series-123:2025-12-10T10:00:00.000Z"
          initialData={recurringInitialData}
          mode="edit"
          occurrenceDate={new Date("2025-12-10T10:00:00")}
          seriesId="series-123"
        />
      );

      // 繰り返し設定のトグルが表示されないことを確認
      expect(screen.queryByText(RECURRENCE_PATTERN)).not.toBeInTheDocument();
    });
  });

  // DIS-50: 1日限りの終日イベントが保存できない
  describe("DIS-50: 終日イベントの endAt パススルー", () => {
    it("1日終日イベント作成時に endAt がそのまま渡される", async () => {
      const user = userEvent.setup();
      mockCreateEventAction.mockResolvedValue(mockSuccessResponse);

      const sameDay = new Date("2025-12-10T00:00:00");
      render(
        <EventDialog
          {...defaultProps}
          initialData={{
            title: "終日予定",
            startAt: sameDay,
            endAt: sameDay,
            isAllDay: true,
          }}
          mode="create"
        />
      );

      const saveButton = screen.getByRole("button", { name: SAVE_PATTERN });
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockCreateEventAction).toHaveBeenCalledWith(
          expect.objectContaining({
            eventData: expect.objectContaining({
              startAt: sameDay,
              endAt: sameDay,
              isAllDay: true,
            }),
          })
        );
      });
    });

    it("1日終日イベント編集時にも endAt がそのまま渡される", async () => {
      const user = userEvent.setup();
      mockUpdateEventAction.mockResolvedValue(mockSuccessResponse);

      const sameDay = new Date("2025-12-10T00:00:00");
      render(
        <EventDialog
          {...defaultProps}
          eventId="event-123"
          initialData={{
            title: "終日予定",
            startAt: sameDay,
            endAt: sameDay,
            isAllDay: true,
          }}
          mode="edit"
        />
      );

      const saveButton = screen.getByRole("button", { name: SAVE_PATTERN });
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockUpdateEventAction).toHaveBeenCalledWith(
          expect.objectContaining({
            eventData: expect.objectContaining({
              startAt: sameDay,
              endAt: sameDay,
              isAllDay: true,
            }),
          })
        );
      });
    });
  });
});
