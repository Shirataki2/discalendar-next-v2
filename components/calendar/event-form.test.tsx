/**
 * EventForm - テスト
 *
 * タスク5.1: 予定入力フォームコンポーネントを作成する
 * - タイトル、開始日時、終了日時、説明、終日フラグ、色、場所を入力できるフォームを実装する
 * - HTML5のdatetime-local入力を使用して日時選択を提供する
 * - バリデーションエラーをフィールドごとに表示する
 * - 保存中のローディング状態とキャンセルボタンを提供する
 * - useEventFormフックを使用してフォーム状態を管理する
 *
 * Requirements: 1.3, 1.6, 3.2, 3.5
 */
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { EventForm, type EventFormProps } from "./event-form";

// トップレベルに正規表現を定義（パフォーマンス最適化）
const TITLE_PATTERN = /タイトル/i;
const START_TIME_PATTERN = /開始日時/i;
const END_TIME_PATTERN = /終了日時/i;
const DESCRIPTION_PATTERN = /説明/i;
const ALL_DAY_PATTERN = /終日/i;
const COLOR_PATTERN = /色/i;
const LOCATION_PATTERN = /場所/i;
const SAVE_PATTERN = /保存/i;
const CANCEL_PATTERN = /キャンセル/i;
const TITLE_REQUIRED_ERROR_PATTERN = /タイトルは必須です/i;
const TITLE_MAX_LENGTH_ERROR_PATTERN =
  /タイトルは255文字以内で入力してください/i;
const END_TIME_ERROR_PATTERN = /終了日時は開始日時以降である必要があります/i;
const NOTIFICATION_SECTION_PATTERN = /通知設定/;
const NOTIFICATION_NUM_PATTERN = /通知の数値/;
const ADD_BUTTON_PATTERN = /追加/;

describe("EventForm", () => {
  const defaultProps: EventFormProps = {
    onSubmit: vi.fn(),
    onCancel: vi.fn(),
    isSubmitting: false,
  };

  // Task 5.1: フォームフィールドのレンダリング
  describe("Task 5.1: フォームフィールドのレンダリング", () => {
    it("タイトル入力フィールドが表示される (Req 1.3)", () => {
      render(<EventForm {...defaultProps} />);

      expect(
        screen.getByRole("textbox", { name: TITLE_PATTERN })
      ).toBeInTheDocument();
    });

    it("開始日時入力フィールドが表示される (Req 1.3)", () => {
      render(<EventForm {...defaultProps} />);

      expect(screen.getByLabelText(START_TIME_PATTERN)).toBeInTheDocument();
    });

    it("終了日時入力フィールドが表示される (Req 1.3)", () => {
      render(<EventForm {...defaultProps} />);

      expect(screen.getByLabelText(END_TIME_PATTERN)).toBeInTheDocument();
    });

    it("説明入力フィールドが表示される (Req 1.3)", () => {
      render(<EventForm {...defaultProps} />);

      expect(screen.getByLabelText(DESCRIPTION_PATTERN)).toBeInTheDocument();
    });

    it("終日フラグのチェックボックスが表示される (Req 1.3)", () => {
      render(<EventForm {...defaultProps} />);

      expect(
        screen.getByRole("checkbox", { name: ALL_DAY_PATTERN })
      ).toBeInTheDocument();
    });

    it("色選択フィールドが表示される (Req 1.3)", () => {
      render(<EventForm {...defaultProps} />);

      expect(screen.getByLabelText(COLOR_PATTERN)).toBeInTheDocument();
    });

    it("場所入力フィールドが表示される (Req 1.3)", () => {
      render(<EventForm {...defaultProps} />);

      expect(screen.getByLabelText(LOCATION_PATTERN)).toBeInTheDocument();
    });

    it("保存ボタンが表示される (Req 1.3)", () => {
      render(<EventForm {...defaultProps} />);

      expect(
        screen.getByRole("button", { name: SAVE_PATTERN })
      ).toBeInTheDocument();
    });

    it("キャンセルボタンが表示される (Req 1.3)", () => {
      render(<EventForm {...defaultProps} />);

      expect(
        screen.getByRole("button", { name: CANCEL_PATTERN })
      ).toBeInTheDocument();
    });
  });

  // Task 5.1: 初期値の設定
  describe("Task 5.1: 初期値の設定", () => {
    it("defaultValuesで初期値が設定される (Req 3.2)", () => {
      const defaultValues = {
        title: "会議",
        description: "週次ミーティング",
        location: "会議室A",
      };

      render(<EventForm {...defaultProps} defaultValues={defaultValues} />);

      expect(screen.getByRole("textbox", { name: TITLE_PATTERN })).toHaveValue(
        "会議"
      );
      expect(screen.getByLabelText(DESCRIPTION_PATTERN)).toHaveValue(
        "週次ミーティング"
      );
      expect(screen.getByLabelText(LOCATION_PATTERN)).toHaveValue("会議室A");
    });

    it("defaultValuesで終日フラグの初期値が設定される (Req 3.2)", () => {
      const defaultValues = {
        isAllDay: true,
      };

      render(<EventForm {...defaultProps} defaultValues={defaultValues} />);

      expect(
        screen.getByRole("checkbox", { name: ALL_DAY_PATTERN })
      ).toBeChecked();
    });

    it("defaultValuesで色の初期値が設定される (Req 3.2)", () => {
      const defaultValues = {
        color: "#ef4444",
      };

      render(<EventForm {...defaultProps} defaultValues={defaultValues} />);

      expect(screen.getByLabelText(COLOR_PATTERN)).toHaveValue("#ef4444");
    });
  });

  // Task 5.1: フォーム入力操作
  describe("Task 5.1: フォーム入力操作", () => {
    it("タイトルを入力できる", async () => {
      const user = userEvent.setup();
      render(<EventForm {...defaultProps} />);

      const titleInput = screen.getByRole("textbox", { name: TITLE_PATTERN });
      await user.type(titleInput, "新しい予定");

      expect(titleInput).toHaveValue("新しい予定");
    });

    it("説明を入力できる", async () => {
      const user = userEvent.setup();
      render(<EventForm {...defaultProps} />);

      const descriptionInput = screen.getByLabelText(DESCRIPTION_PATTERN);
      await user.type(descriptionInput, "予定の説明文");

      expect(descriptionInput).toHaveValue("予定の説明文");
    });

    it("終日フラグを切り替えられる", async () => {
      const user = userEvent.setup();
      render(<EventForm {...defaultProps} />);

      const checkbox = screen.getByRole("checkbox", { name: ALL_DAY_PATTERN });
      expect(checkbox).not.toBeChecked();

      await user.click(checkbox);

      expect(checkbox).toBeChecked();
    });

    it("場所を入力できる", async () => {
      const user = userEvent.setup();
      render(<EventForm {...defaultProps} />);

      const locationInput = screen.getByLabelText(LOCATION_PATTERN);
      await user.type(locationInput, "東京オフィス");

      expect(locationInput).toHaveValue("東京オフィス");
    });
  });

  // Task 5.1: バリデーションエラー表示
  describe("Task 5.1: バリデーションエラー表示", () => {
    it("タイトル未入力で保存時にエラーが表示される (Req 1.6, 3.5)", async () => {
      const user = userEvent.setup();
      render(<EventForm {...defaultProps} />);

      const submitButton = screen.getByRole("button", { name: SAVE_PATTERN });
      await user.click(submitButton);

      await waitFor(() => {
        expect(
          screen.getByText(TITLE_REQUIRED_ERROR_PATTERN)
        ).toBeInTheDocument();
      });
    });

    it("タイトルが255文字を超える場合にエラーが表示される (Req 1.6, 3.5)", async () => {
      const user = userEvent.setup();
      render(<EventForm {...defaultProps} />);

      const titleInput = screen.getByRole("textbox", { name: TITLE_PATTERN });
      await user.type(titleInput, "a".repeat(256));

      const submitButton = screen.getByRole("button", { name: SAVE_PATTERN });
      await user.click(submitButton);

      await waitFor(() => {
        expect(
          screen.getByText(TITLE_MAX_LENGTH_ERROR_PATTERN)
        ).toBeInTheDocument();
      });
    });

    it("終了日時が開始日時より前の場合にエラーが表示される (Req 1.6, 3.5)", async () => {
      const user = userEvent.setup();

      // 開始日時より前の終了日時を設定
      const defaultValues = {
        title: "テスト予定",
        startAt: new Date("2025-12-10T14:00"),
        endAt: new Date("2025-12-10T10:00"), // 開始より前
      };

      render(<EventForm {...defaultProps} defaultValues={defaultValues} />);

      const submitButton = screen.getByRole("button", { name: SAVE_PATTERN });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(END_TIME_ERROR_PATTERN)).toBeInTheDocument();
      });
    });

    it("フィールドのblur時にバリデーションが実行される (Req 1.6)", async () => {
      const user = userEvent.setup();
      render(<EventForm {...defaultProps} />);

      const titleInput = screen.getByRole("textbox", { name: TITLE_PATTERN });

      // フィールドにフォーカスして離れる
      await user.click(titleInput);
      await user.tab();

      await waitFor(() => {
        expect(
          screen.getByText(TITLE_REQUIRED_ERROR_PATTERN)
        ).toBeInTheDocument();
      });
    });
  });

  // Task 5.1: フォーム送信
  describe("Task 5.1: フォーム送信", () => {
    it("有効なデータで保存ボタンクリック時にonSubmitが呼ばれる (Req 1.3)", async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn();

      const defaultValues = {
        title: "テスト予定",
        startAt: new Date("2025-12-10T10:00"),
        endAt: new Date("2025-12-10T11:00"),
        description: "説明文",
        isAllDay: false,
        color: "#3B82F6",
        location: "会議室",
      };

      render(
        <EventForm
          {...defaultProps}
          defaultValues={defaultValues}
          onSubmit={onSubmit}
        />
      );

      const submitButton = screen.getByRole("button", { name: SAVE_PATTERN });
      await user.click(submitButton);

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledTimes(1);
        expect(onSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            title: "テスト予定",
            description: "説明文",
            location: "会議室",
          })
        );
      });
    });

    it("バリデーションエラーがある場合はonSubmitが呼ばれない (Req 1.6)", async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn();

      render(<EventForm {...defaultProps} onSubmit={onSubmit} />);

      const submitButton = screen.getByRole("button", { name: SAVE_PATTERN });
      await user.click(submitButton);

      await waitFor(() => {
        expect(
          screen.getByText(TITLE_REQUIRED_ERROR_PATTERN)
        ).toBeInTheDocument();
      });

      expect(onSubmit).not.toHaveBeenCalled();
    });

    it("キャンセルボタンクリック時にonCancelが呼ばれる (Req 1.3)", async () => {
      const user = userEvent.setup();
      const onCancel = vi.fn();

      render(<EventForm {...defaultProps} onCancel={onCancel} />);

      const cancelButton = screen.getByRole("button", { name: CANCEL_PATTERN });
      await user.click(cancelButton);

      expect(onCancel).toHaveBeenCalledTimes(1);
    });
  });

  // Task 5.1: ローディング状態
  describe("Task 5.1: ローディング状態", () => {
    it("isSubmitting=trueの時、保存ボタンが無効になる (Req 1.3)", () => {
      render(<EventForm {...defaultProps} isSubmitting />);

      const submitButton = screen.getByRole("button", { name: SAVE_PATTERN });
      expect(submitButton).toBeDisabled();
    });

    it("isSubmitting=trueの時、キャンセルボタンが無効になる (Req 1.3)", () => {
      render(<EventForm {...defaultProps} isSubmitting />);

      const cancelButton = screen.getByRole("button", { name: CANCEL_PATTERN });
      expect(cancelButton).toBeDisabled();
    });

    it("isSubmitting=trueの時、フォームフィールドが無効になる (Req 1.3)", () => {
      render(<EventForm {...defaultProps} isSubmitting />);

      const titleInput = screen.getByRole("textbox", { name: TITLE_PATTERN });
      expect(titleInput).toBeDisabled();

      const checkbox = screen.getByRole("checkbox", { name: ALL_DAY_PATTERN });
      expect(checkbox).toBeDisabled();
    });
  });

  // Task 5.1: 終日フラグ動作
  describe("Task 5.1: 終日フラグ動作", () => {
    it("終日フラグがオンの時、日時入力がdate型になる", async () => {
      const user = userEvent.setup();
      render(<EventForm {...defaultProps} />);

      const checkbox = screen.getByRole("checkbox", { name: ALL_DAY_PATTERN });
      await user.click(checkbox);

      const startInput = screen.getByLabelText(START_TIME_PATTERN);
      const endInput = screen.getByLabelText(END_TIME_PATTERN);

      expect(startInput).toHaveAttribute("type", "date");
      expect(endInput).toHaveAttribute("type", "date");
    });

    it("終日フラグがオフの時、日時入力がdatetime-local型になる", () => {
      render(<EventForm {...defaultProps} />);

      const startInput = screen.getByLabelText(START_TIME_PATTERN);
      const endInput = screen.getByLabelText(END_TIME_PATTERN);

      expect(startInput).toHaveAttribute("type", "datetime-local");
      expect(endInput).toHaveAttribute("type", "datetime-local");
    });
  });

  // アクセシビリティ
  describe("アクセシビリティ", () => {
    it("フォームフィールドに適切なラベルが関連付けられている", () => {
      render(<EventForm {...defaultProps} />);

      // 各フィールドがラベルと関連付けられていることを確認
      expect(screen.getByLabelText(TITLE_PATTERN)).toBeInTheDocument();
      expect(screen.getByLabelText(START_TIME_PATTERN)).toBeInTheDocument();
      expect(screen.getByLabelText(END_TIME_PATTERN)).toBeInTheDocument();
      expect(screen.getByLabelText(DESCRIPTION_PATTERN)).toBeInTheDocument();
      expect(screen.getByLabelText(ALL_DAY_PATTERN)).toBeInTheDocument();
      expect(screen.getByLabelText(COLOR_PATTERN)).toBeInTheDocument();
      expect(screen.getByLabelText(LOCATION_PATTERN)).toBeInTheDocument();
    });

    it("必須フィールドにaria-required属性が設定されている", () => {
      render(<EventForm {...defaultProps} />);

      const titleInput = screen.getByRole("textbox", { name: TITLE_PATTERN });
      expect(titleInput).toHaveAttribute("aria-required", "true");
    });

    it("エラー時にaria-invalid属性が設定される", async () => {
      const user = userEvent.setup();
      render(<EventForm {...defaultProps} />);

      const titleInput = screen.getByRole("textbox", { name: TITLE_PATTERN });
      await user.click(titleInput);
      await user.tab();

      await waitFor(() => {
        expect(titleInput).toHaveAttribute("aria-invalid", "true");
      });
    });

    it("エラーメッセージがaria-describedbyで関連付けられている", async () => {
      const user = userEvent.setup();
      render(<EventForm {...defaultProps} />);

      const titleInput = screen.getByRole("textbox", { name: TITLE_PATTERN });
      await user.click(titleInput);
      await user.tab();

      await waitFor(() => {
        const errorElement = screen.getByText(TITLE_REQUIRED_ERROR_PATTERN);
        expect(errorElement).toHaveAttribute("id");
        const errorId = errorElement.getAttribute("id");
        expect(titleInput).toHaveAttribute("aria-describedby", errorId);
      });
    });
  });

  // Task 5: 通知設定フィールドの統合
  describe("Task 5: 通知設定フィールドの統合", () => {
    it("通知設定セクションが表示される (Req 1.1)", () => {
      render(<EventForm {...defaultProps} />);

      expect(
        screen.getByText(NOTIFICATION_SECTION_PATTERN)
      ).toBeInTheDocument();
    });

    it("defaultValuesで通知設定が復元表示される (Req 2.2)", () => {
      const defaultValues = {
        title: "テスト予定",
        notifications: [
          { key: "n1", num: 10, unit: "minutes" as const },
          { key: "n2", num: 1, unit: "hours" as const },
        ],
      };

      render(<EventForm {...defaultProps} defaultValues={defaultValues} />);

      expect(screen.getByText("10分前")).toBeInTheDocument();
      expect(screen.getByText("1時間前")).toBeInTheDocument();
    });

    it("通知を追加するとチップが表示される (Req 1.2, 1.3)", async () => {
      const user = userEvent.setup();
      render(<EventForm {...defaultProps} />);

      // 数値を入力
      const numInput = screen.getByRole("spinbutton", {
        name: NOTIFICATION_NUM_PATTERN,
      });
      await user.clear(numInput);
      await user.type(numInput, "30");

      // 追加ボタンをクリック
      const addButton = screen.getByRole("button", {
        name: ADD_BUTTON_PATTERN,
      });
      await user.click(addButton);

      expect(screen.getByText("30分前")).toBeInTheDocument();
    });

    it("通知を含むフォーム送信時にnotificationsが含まれる (Req 2.1)", async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn();

      const defaultValues = {
        title: "テスト予定",
        startAt: new Date("2025-12-10T10:00"),
        endAt: new Date("2025-12-10T11:00"),
        notifications: [{ key: "n1", num: 10, unit: "minutes" as const }],
      };

      render(
        <EventForm
          {...defaultProps}
          defaultValues={defaultValues}
          onSubmit={onSubmit}
        />
      );

      const submitButton = screen.getByRole("button", { name: SAVE_PATTERN });
      await user.click(submitButton);

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            notifications: expect.arrayContaining([
              expect.objectContaining({ num: 10, unit: "minutes" }),
            ]),
          })
        );
      });
    });

    it("通知なし（0件）でもイベントを正常に保存できる (Req 5.3)", async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn();

      const defaultValues = {
        title: "テスト予定",
        startAt: new Date("2025-12-10T10:00"),
        endAt: new Date("2025-12-10T11:00"),
      };

      render(
        <EventForm
          {...defaultProps}
          defaultValues={defaultValues}
          onSubmit={onSubmit}
        />
      );

      const submitButton = screen.getByRole("button", { name: SAVE_PATTERN });
      await user.click(submitButton);

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            notifications: [],
          })
        );
      });
    });
  });
});
