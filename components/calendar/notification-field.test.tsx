/**
 * NotificationField - テスト
 *
 * タスク2.1: 通知設定 UI の構築とアクセシビリティ対応
 * - 数値入力（1〜99）と単位選択で通知タイミングを入力
 * - チップ形式で表示・削除
 * - 10件上限制御
 * - バリデーション（範囲外・重複）
 * - ARIA属性・ライブリージョン・キーボード操作
 *
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 4.1, 4.2, 4.3, 4.4, 5.1
 */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { NotificationSetting } from "@/lib/calendar/types";
import {
  NotificationField,
  type NotificationFieldProps,
} from "./notification-field";

// テスト用の通知設定ヘルパー
function createNotification(
  num: number,
  unit: NotificationSetting["unit"],
  key = `key-${num}-${unit}`
): NotificationSetting {
  return { key, num, unit };
}

// トップレベルに正規表現を定義（パフォーマンス最適化）
const ADD_BUTTON_PATTERN = /追加/i;
const NUM_INPUT_PATTERN = /通知の数値/i;
const UNIT_SELECT_PATTERN = /通知の単位/i;
const ONE_HOUR_BEFORE_PATTERN = /1時間前/;
const THREE_DAYS_BEFORE_PATTERN = /3日前/;
const DELETE_ONE_HOUR_PATTERN = /1時間前の通知を削除/i;
const LIMIT_MESSAGE_PATTERN = /通知は最大10件まで設定できます/i;
const RANGE_ERROR_PATTERN = /1以上99以下/i;
const DUPLICATE_ERROR_PATTERN = /同じ通知設定が既に存在します/i;
const COUNT_PATTERN = /2件.*10件/i;
const ADDED_PATTERN = /追加/i;

describe("NotificationField", () => {
  const defaultProps: NotificationFieldProps = {
    notifications: [],
    onAdd: vi.fn(),
    onRemove: vi.fn(),
  };

  // Task 2.1: 基本レンダリング
  describe("Task 2.1: 基本レンダリング", () => {
    it("数値入力フィールドが表示される (Req 1.2)", () => {
      render(<NotificationField {...defaultProps} />);

      expect(
        screen.getByRole("spinbutton", { name: NUM_INPUT_PATTERN })
      ).toBeInTheDocument();
    });

    it("単位選択ドロップダウンが表示される (Req 1.2)", () => {
      render(<NotificationField {...defaultProps} />);

      expect(
        screen.getByRole("combobox", { name: UNIT_SELECT_PATTERN })
      ).toBeInTheDocument();
    });

    it("追加ボタンが表示される (Req 1.2)", () => {
      render(<NotificationField {...defaultProps} />);

      expect(
        screen.getByRole("button", { name: ADD_BUTTON_PATTERN })
      ).toBeInTheDocument();
    });

    it("通知なしの初期状態ではチップが表示されない (Req 1.3)", () => {
      render(<NotificationField {...defaultProps} />);

      const chips = screen.queryAllByRole("listitem");
      expect(chips).toHaveLength(0);
    });
  });

  // Task 2.1: 通知の追加操作
  describe("Task 2.1: 通知の追加操作", () => {
    it("数値と単位を入力して追加ボタンで通知を追加できる (Req 1.2)", async () => {
      const user = userEvent.setup();
      const onAdd = vi.fn();
      render(<NotificationField {...defaultProps} onAdd={onAdd} />);

      const numInput = screen.getByRole("spinbutton", {
        name: NUM_INPUT_PATTERN,
      });
      await user.clear(numInput);
      await user.type(numInput, "30");

      const addButton = screen.getByRole("button", {
        name: ADD_BUTTON_PATTERN,
      });
      await user.click(addButton);

      expect(onAdd).toHaveBeenCalledWith(
        expect.objectContaining({ num: 30, unit: "minutes" })
      );
    });

    it("追加後に数値入力がリセットされる (Req 1.2)", async () => {
      const user = userEvent.setup();
      const onAdd = vi.fn();
      render(<NotificationField {...defaultProps} onAdd={onAdd} />);

      const numInput = screen.getByRole("spinbutton", {
        name: NUM_INPUT_PATTERN,
      });
      await user.clear(numInput);
      await user.type(numInput, "15");

      const addButton = screen.getByRole("button", {
        name: ADD_BUTTON_PATTERN,
      });
      await user.click(addButton);

      expect(numInput).toHaveValue(10);
    });
  });

  // Task 2.1: チップ表示と削除
  describe("Task 2.1: チップ表示と削除", () => {
    it("設定済み通知がチップとして表示される (Req 1.3)", () => {
      const notifications = [
        createNotification(1, "hours"),
        createNotification(3, "days"),
      ];
      render(
        <NotificationField {...defaultProps} notifications={notifications} />
      );

      expect(screen.getByText(ONE_HOUR_BEFORE_PATTERN)).toBeInTheDocument();
      expect(screen.getByText(THREE_DAYS_BEFORE_PATTERN)).toBeInTheDocument();
    });

    it("チップの削除ボタンで通知を削除できる (Req 1.4)", async () => {
      const user = userEvent.setup();
      const onRemove = vi.fn();
      const notifications = [createNotification(1, "hours", "test-key")];
      render(
        <NotificationField
          {...defaultProps}
          notifications={notifications}
          onRemove={onRemove}
        />
      );

      const deleteButton = screen.getByRole("button", {
        name: DELETE_ONE_HOUR_PATTERN,
      });
      await user.click(deleteButton);

      expect(onRemove).toHaveBeenCalledWith("test-key");
    });
  });

  // Task 2.1: 上限制御
  describe("Task 2.1: 上限制御", () => {
    it("10件に達した場合、追加ボタンが無効化される (Req 1.5)", () => {
      const notifications = Array.from({ length: 10 }, (_, i) =>
        createNotification(i + 1, "minutes")
      );
      render(
        <NotificationField {...defaultProps} notifications={notifications} />
      );

      const addButton = screen.getByRole("button", {
        name: ADD_BUTTON_PATTERN,
      });
      expect(addButton).toBeDisabled();
    });

    it("10件に達した場合、上限メッセージが表示される (Req 1.5)", () => {
      const notifications = Array.from({ length: 10 }, (_, i) =>
        createNotification(i + 1, "minutes")
      );
      render(
        <NotificationField {...defaultProps} notifications={notifications} />
      );

      expect(screen.getByText(LIMIT_MESSAGE_PATTERN)).toBeInTheDocument();
    });

    it("maxNotificationsプロパティでカスタム上限を設定できる (Req 1.5)", () => {
      const notifications = Array.from({ length: 3 }, (_, i) =>
        createNotification(i + 1, "minutes")
      );
      render(
        <NotificationField
          {...defaultProps}
          maxNotifications={3}
          notifications={notifications}
        />
      );

      const addButton = screen.getByRole("button", {
        name: ADD_BUTTON_PATTERN,
      });
      expect(addButton).toBeDisabled();
    });
  });

  // Task 2.1: バリデーション
  describe("Task 2.1: バリデーション", () => {
    it("数値が1未満の場合にエラーメッセージが表示される (Req 1.6)", async () => {
      const user = userEvent.setup();
      const onAdd = vi.fn();
      render(<NotificationField {...defaultProps} onAdd={onAdd} />);

      const numInput = screen.getByRole("spinbutton", {
        name: NUM_INPUT_PATTERN,
      });
      await user.clear(numInput);
      await user.type(numInput, "0");

      const addButton = screen.getByRole("button", {
        name: ADD_BUTTON_PATTERN,
      });
      await user.click(addButton);

      expect(screen.getByText(RANGE_ERROR_PATTERN)).toBeInTheDocument();
      expect(onAdd).not.toHaveBeenCalled();
    });

    it("数値が99を超える場合にエラーメッセージが表示される (Req 1.6)", async () => {
      const user = userEvent.setup();
      const onAdd = vi.fn();
      render(<NotificationField {...defaultProps} onAdd={onAdd} />);

      const numInput = screen.getByRole("spinbutton", {
        name: NUM_INPUT_PATTERN,
      });
      await user.clear(numInput);
      await user.type(numInput, "100");

      const addButton = screen.getByRole("button", {
        name: ADD_BUTTON_PATTERN,
      });
      await user.click(addButton);

      expect(screen.getByText(RANGE_ERROR_PATTERN)).toBeInTheDocument();
      expect(onAdd).not.toHaveBeenCalled();
    });

    it("重複する通知設定がある場合にエラーメッセージが表示される (Req 5.1)", async () => {
      const user = userEvent.setup();
      const onAdd = vi.fn();
      const notifications = [createNotification(30, "minutes")];
      render(
        <NotificationField
          {...defaultProps}
          notifications={notifications}
          onAdd={onAdd}
        />
      );

      const numInput = screen.getByRole("spinbutton", {
        name: NUM_INPUT_PATTERN,
      });
      await user.clear(numInput);
      await user.type(numInput, "30");

      const addButton = screen.getByRole("button", {
        name: ADD_BUTTON_PATTERN,
      });
      await user.click(addButton);

      expect(screen.getByText(DUPLICATE_ERROR_PATTERN)).toBeInTheDocument();
      expect(onAdd).not.toHaveBeenCalled();
    });
  });

  // Task 2.1: アクセシビリティ
  describe("Task 2.1: アクセシビリティ", () => {
    it("各チップに通知内容を説明するARIAラベルが設定される (Req 4.2)", () => {
      const notifications = [createNotification(1, "hours")];
      render(
        <NotificationField {...defaultProps} notifications={notifications} />
      );

      expect(
        screen.getByRole("button", { name: DELETE_ONE_HOUR_PATTERN })
      ).toBeInTheDocument();
    });

    it("セクションに件数を読み上げるARIA属性がある (Req 4.3)", () => {
      const notifications = [
        createNotification(1, "hours"),
        createNotification(3, "days"),
      ];
      render(
        <NotificationField {...defaultProps} notifications={notifications} />
      );

      expect(screen.getByText(COUNT_PATTERN)).toBeInTheDocument();
    });

    it("ライブリージョンが存在する (Req 4.4)", () => {
      render(<NotificationField {...defaultProps} />);

      const liveRegion = screen.getByRole("status");
      expect(liveRegion).toBeInTheDocument();
    });

    it("通知追加時にライブリージョンにメッセージが表示される (Req 4.4)", async () => {
      const user = userEvent.setup();
      const onAdd = vi.fn();
      render(<NotificationField {...defaultProps} onAdd={onAdd} />);

      const numInput = screen.getByRole("spinbutton", {
        name: NUM_INPUT_PATTERN,
      });
      await user.clear(numInput);
      await user.type(numInput, "5");

      const addButton = screen.getByRole("button", {
        name: ADD_BUTTON_PATTERN,
      });
      await user.click(addButton);

      const liveRegion = screen.getByRole("status");
      expect(liveRegion).toHaveTextContent(ADDED_PATTERN);
    });
  });

  // Task 2.1: キーボード操作
  describe("Task 2.1: キーボード操作", () => {
    it("Enterキーで通知を追加できる (Req 4.1)", async () => {
      const user = userEvent.setup();
      const onAdd = vi.fn();
      render(<NotificationField {...defaultProps} onAdd={onAdd} />);

      const numInput = screen.getByRole("spinbutton", {
        name: NUM_INPUT_PATTERN,
      });
      await user.clear(numInput);
      await user.type(numInput, "5");
      await user.keyboard("{Enter}");

      expect(onAdd).toHaveBeenCalledWith(
        expect.objectContaining({ num: 5, unit: "minutes" })
      );
    });

    it("チップ削除ボタンにフォーカスしてEnterで削除できる (Req 4.1)", async () => {
      const user = userEvent.setup();
      const onRemove = vi.fn();
      const notifications = [createNotification(1, "hours", "test-key")];
      render(
        <NotificationField
          {...defaultProps}
          notifications={notifications}
          onRemove={onRemove}
        />
      );

      const deleteButton = screen.getByRole("button", {
        name: DELETE_ONE_HOUR_PATTERN,
      });
      deleteButton.focus();
      await user.keyboard("{Enter}");

      expect(onRemove).toHaveBeenCalledWith("test-key");
    });
  });

  // Task 2.1: エラープロパティ
  describe("Task 2.1: エラープロパティ", () => {
    it("errorプロパティでエラーメッセージが表示される", () => {
      render(
        <NotificationField {...defaultProps} error="カスタムエラーメッセージ" />
      );

      expect(screen.getByText("カスタムエラーメッセージ")).toBeInTheDocument();
    });
  });
});
