/**
 * ConfirmDialog - テスト
 *
 * タスク5.3: 削除確認ダイアログコンポーネントを作成する
 * - 削除操作の確認メッセージを表示するダイアログを実装する
 * - イベント名を含む確認メッセージを表示する
 * - 確認ボタンとキャンセルボタンを提供する
 * - 確認時にコールバックを実行し、キャンセル時はダイアログを閉じる
 * - 削除処理中のローディング状態を表示する
 *
 * Requirements: 4.1, 4.4
 */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ConfirmDialog, type ConfirmDialogProps } from "./confirm-dialog";

// 正規表現パターン
const DELETE_TITLE_PATTERN = /予定を削除/i;
const CONFIRM_BUTTON_PATTERN = /削除/i;
const CANCEL_BUTTON_PATTERN = /キャンセル/i;
const MEETING_EVENT_PATTERN = /会議の予定/;

describe("ConfirmDialog", () => {
  const defaultProps: ConfirmDialogProps = {
    open: true,
    onOpenChange: vi.fn(),
    eventTitle: "テスト予定",
    onConfirm: vi.fn(),
  };

  afterEach(() => {
    vi.clearAllMocks();
  });

  // Task 5.3: ダイアログの表示
  describe("Task 5.3: ダイアログの表示", () => {
    it("openがtrueの場合、ダイアログが表示される (Req 4.1)", () => {
      render(<ConfirmDialog {...defaultProps} open />);

      expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    });

    it("openがfalseの場合、ダイアログが表示されない", () => {
      render(<ConfirmDialog {...defaultProps} open={false} />);

      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    });

    it("削除確認のタイトルが表示される (Req 4.1)", () => {
      render(<ConfirmDialog {...defaultProps} />);

      expect(screen.getByText(DELETE_TITLE_PATTERN)).toBeInTheDocument();
    });

    it("イベント名を含む確認メッセージが表示される (Req 4.1)", () => {
      render(<ConfirmDialog {...defaultProps} eventTitle="会議の予定" />);

      expect(screen.getByText(MEETING_EVENT_PATTERN)).toBeInTheDocument();
    });
  });

  // Task 5.3: ボタンの表示
  describe("Task 5.3: ボタンの表示", () => {
    it("確認ボタンが表示される (Req 4.1)", () => {
      render(<ConfirmDialog {...defaultProps} />);

      expect(
        screen.getByRole("button", { name: CONFIRM_BUTTON_PATTERN })
      ).toBeInTheDocument();
    });

    it("キャンセルボタンが表示される (Req 4.4)", () => {
      render(<ConfirmDialog {...defaultProps} />);

      expect(
        screen.getByRole("button", { name: CANCEL_BUTTON_PATTERN })
      ).toBeInTheDocument();
    });
  });

  // Task 5.3: 確認操作
  describe("Task 5.3: 確認操作", () => {
    it("確認ボタンクリック時にonConfirmが呼ばれる (Req 4.1)", async () => {
      const user = userEvent.setup();
      const onConfirm = vi.fn();

      render(<ConfirmDialog {...defaultProps} onConfirm={onConfirm} />);

      const confirmButton = screen.getByRole("button", {
        name: CONFIRM_BUTTON_PATTERN,
      });
      await user.click(confirmButton);

      expect(onConfirm).toHaveBeenCalledTimes(1);
    });
  });

  // Task 5.3: キャンセル操作
  describe("Task 5.3: キャンセル操作", () => {
    it("キャンセルボタンクリック時にonOpenChangeがfalseで呼ばれる (Req 4.4)", async () => {
      const user = userEvent.setup();
      const onOpenChange = vi.fn();

      render(<ConfirmDialog {...defaultProps} onOpenChange={onOpenChange} />);

      const cancelButton = screen.getByRole("button", {
        name: CANCEL_BUTTON_PATTERN,
      });
      await user.click(cancelButton);

      expect(onOpenChange).toHaveBeenCalledWith(false);
    });

    it("キャンセル時にonConfirmが呼ばれない (Req 4.4)", async () => {
      const user = userEvent.setup();
      const onConfirm = vi.fn();

      render(<ConfirmDialog {...defaultProps} onConfirm={onConfirm} />);

      const cancelButton = screen.getByRole("button", {
        name: CANCEL_BUTTON_PATTERN,
      });
      await user.click(cancelButton);

      expect(onConfirm).not.toHaveBeenCalled();
    });
  });

  // Task 5.3: ローディング状態
  describe("Task 5.3: ローディング状態", () => {
    it("isLoadingがtrueの場合、確認ボタンが無効になる", () => {
      render(<ConfirmDialog {...defaultProps} isLoading />);

      const confirmButton = screen.getByRole("button", {
        name: CONFIRM_BUTTON_PATTERN,
      });
      expect(confirmButton).toBeDisabled();
    });

    it("isLoadingがtrueの場合、キャンセルボタンが無効になる", () => {
      render(<ConfirmDialog {...defaultProps} isLoading />);

      const cancelButton = screen.getByRole("button", {
        name: CANCEL_BUTTON_PATTERN,
      });
      expect(cancelButton).toBeDisabled();
    });

    it("isLoadingがfalseの場合、ボタンは有効", () => {
      render(<ConfirmDialog {...defaultProps} isLoading={false} />);

      const confirmButton = screen.getByRole("button", {
        name: CONFIRM_BUTTON_PATTERN,
      });
      const cancelButton = screen.getByRole("button", {
        name: CANCEL_BUTTON_PATTERN,
      });

      expect(confirmButton).not.toBeDisabled();
      expect(cancelButton).not.toBeDisabled();
    });
  });

  // アクセシビリティ
  describe("アクセシビリティ", () => {
    it("ダイアログに適切なrole属性が設定されている", () => {
      render(<ConfirmDialog {...defaultProps} />);

      expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    });

    it("ダイアログにaria-labelledby属性が設定されている", () => {
      render(<ConfirmDialog {...defaultProps} />);

      const dialog = screen.getByRole("alertdialog");
      expect(dialog).toHaveAttribute("aria-labelledby");
    });

    it("ダイアログにaria-describedby属性が設定されている", () => {
      render(<ConfirmDialog {...defaultProps} />);

      const dialog = screen.getByRole("alertdialog");
      expect(dialog).toHaveAttribute("aria-describedby");
    });
  });
});
