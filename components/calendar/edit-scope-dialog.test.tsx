/**
 * EditScopeDialog - テスト
 *
 * タスク6.1: 編集スコープ選択ダイアログを実装する
 * - 繰り返しイベントの編集・削除時に「この予定のみ」「すべての予定」「これ以降の予定」の3択を表示する
 * - 削除時には確認メッセージを表示する
 * - 「すべての予定」編集時に個別例外をリセットするかどうかの確認チェックボックスを表示する
 * - 既存の確認ダイアログと同様のUIパターンを踏襲する
 *
 * Requirements: 5.1, 5.3, 6.4
 */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  EditScopeDialog,
  type EditScopeDialogProps,
} from "./edit-scope-dialog";

// 正規表現パターン
const EDIT_TITLE_PATTERN = /繰り返し予定を編集/;
const DELETE_TITLE_PATTERN = /繰り返し予定を削除/;
const EVENT_TITLE_PATTERN = /チームミーティング/;
const IRREVERSIBLE_PATTERN = /この操作は取り消せません/;
const THIS_ONLY_PATTERN = /この予定のみ/;
const ALL_EVENTS_PATTERN = /すべての予定/;
const FOLLOWING_PATTERN = /これ以降の予定/;
const CANCEL_PATTERN = /キャンセル/;
const RESET_EXCEPTIONS_PATTERN = /個別の変更をリセット/;

describe("EditScopeDialog", () => {
  const defaultEditProps: EditScopeDialogProps = {
    open: true,
    onOpenChange: vi.fn(),
    mode: "edit",
    eventTitle: "チームミーティング",
    onSelect: vi.fn(),
  };

  const defaultDeleteProps: EditScopeDialogProps = {
    open: true,
    onOpenChange: vi.fn(),
    mode: "delete",
    eventTitle: "チームミーティング",
    onSelect: vi.fn(),
  };

  afterEach(() => {
    vi.clearAllMocks();
  });

  // Task 6.1: ダイアログの表示
  describe("Task 6.1: ダイアログの表示", () => {
    it("openがtrueの場合、ダイアログが表示される (Req 5.1)", () => {
      render(<EditScopeDialog {...defaultEditProps} />);

      expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    });

    it("openがfalseの場合、ダイアログが表示されない", () => {
      render(<EditScopeDialog {...defaultEditProps} open={false} />);

      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    });

    it("編集モードのタイトルが表示される (Req 5.1)", () => {
      render(<EditScopeDialog {...defaultEditProps} />);

      expect(screen.getByText(EDIT_TITLE_PATTERN)).toBeInTheDocument();
    });

    it("削除モードのタイトルが表示される (Req 5.3)", () => {
      render(<EditScopeDialog {...defaultDeleteProps} />);

      expect(screen.getByText(DELETE_TITLE_PATTERN)).toBeInTheDocument();
    });

    it("イベント名を含む説明が表示される", () => {
      render(<EditScopeDialog {...defaultEditProps} />);

      expect(screen.getByText(EVENT_TITLE_PATTERN)).toBeInTheDocument();
    });

    it("削除モード時に確認メッセージが表示される (Req 5.3)", () => {
      render(<EditScopeDialog {...defaultDeleteProps} />);

      expect(screen.getByText(IRREVERSIBLE_PATTERN)).toBeInTheDocument();
    });
  });

  // Task 6.1: スコープ選択肢の表示
  describe("Task 6.1: スコープ選択肢の表示", () => {
    it("「この予定のみ」オプションが表示される (Req 5.1)", () => {
      render(<EditScopeDialog {...defaultEditProps} />);

      expect(
        screen.getByRole("button", { name: THIS_ONLY_PATTERN })
      ).toBeInTheDocument();
    });

    it("「すべての予定」オプションが表示される (Req 5.1)", () => {
      render(<EditScopeDialog {...defaultEditProps} />);

      expect(
        screen.getByRole("button", { name: ALL_EVENTS_PATTERN })
      ).toBeInTheDocument();
    });

    it("「これ以降の予定」オプションが表示される (Req 5.1)", () => {
      render(<EditScopeDialog {...defaultEditProps} />);

      expect(
        screen.getByRole("button", { name: FOLLOWING_PATTERN })
      ).toBeInTheDocument();
    });

    it("キャンセルボタンが表示される", () => {
      render(<EditScopeDialog {...defaultEditProps} />);

      expect(
        screen.getByRole("button", { name: CANCEL_PATTERN })
      ).toBeInTheDocument();
    });
  });

  // Task 6.1: スコープ選択操作
  describe("Task 6.1: スコープ選択操作", () => {
    it("「この予定のみ」をクリックするとonSelectが'this'で呼ばれる (Req 5.1)", async () => {
      const user = userEvent.setup();
      const onSelect = vi.fn();

      render(<EditScopeDialog {...defaultEditProps} onSelect={onSelect} />);

      await user.click(screen.getByRole("button", { name: THIS_ONLY_PATTERN }));

      expect(onSelect).toHaveBeenCalledWith("this", {
        resetExceptions: false,
      });
    });

    it("「すべての予定」をクリックするとonSelectが'all'で呼ばれる (Req 5.1)", async () => {
      const user = userEvent.setup();
      const onSelect = vi.fn();

      render(<EditScopeDialog {...defaultEditProps} onSelect={onSelect} />);

      await user.click(
        screen.getByRole("button", { name: ALL_EVENTS_PATTERN })
      );

      expect(onSelect).toHaveBeenCalledWith("all", {
        resetExceptions: false,
      });
    });

    it("「これ以降の予定」をクリックするとonSelectが'following'で呼ばれる (Req 5.1)", async () => {
      const user = userEvent.setup();
      const onSelect = vi.fn();

      render(<EditScopeDialog {...defaultEditProps} onSelect={onSelect} />);

      await user.click(screen.getByRole("button", { name: FOLLOWING_PATTERN }));

      expect(onSelect).toHaveBeenCalledWith("following", {
        resetExceptions: false,
      });
    });

    it("キャンセルボタンクリック時にonOpenChangeがfalseで呼ばれる", async () => {
      const user = userEvent.setup();
      const onOpenChange = vi.fn();

      render(
        <EditScopeDialog {...defaultEditProps} onOpenChange={onOpenChange} />
      );

      await user.click(screen.getByRole("button", { name: CANCEL_PATTERN }));

      expect(onOpenChange).toHaveBeenCalledWith(false);
    });

    it("キャンセル時にonSelectが呼ばれない", async () => {
      const user = userEvent.setup();
      const onSelect = vi.fn();

      render(<EditScopeDialog {...defaultEditProps} onSelect={onSelect} />);

      await user.click(screen.getByRole("button", { name: CANCEL_PATTERN }));

      expect(onSelect).not.toHaveBeenCalled();
    });
  });

  // Task 6.1: 例外リセットチェックボックス (Req 6.4)
  describe("Task 6.1: 例外リセットチェックボックス (Req 6.4)", () => {
    it("編集モードで例外リセットチェックボックスが表示される", () => {
      render(<EditScopeDialog {...defaultEditProps} />);

      expect(
        screen.getByRole("checkbox", { name: RESET_EXCEPTIONS_PATTERN })
      ).toBeInTheDocument();
    });

    it("削除モードでは例外リセットチェックボックスが表示されない", () => {
      render(<EditScopeDialog {...defaultDeleteProps} />);

      expect(
        screen.queryByRole("checkbox", { name: RESET_EXCEPTIONS_PATTERN })
      ).not.toBeInTheDocument();
    });

    it("チェックボックスのデフォルト状態はオフ", () => {
      render(<EditScopeDialog {...defaultEditProps} />);

      const checkbox = screen.getByRole("checkbox", {
        name: RESET_EXCEPTIONS_PATTERN,
      });
      expect(checkbox).not.toBeChecked();
    });

    it("チェックボックスをオンにして「すべての予定」を選択するとresetExceptions: trueで呼ばれる", async () => {
      const user = userEvent.setup();
      const onSelect = vi.fn();

      render(<EditScopeDialog {...defaultEditProps} onSelect={onSelect} />);

      const checkbox = screen.getByRole("checkbox", {
        name: RESET_EXCEPTIONS_PATTERN,
      });
      await user.click(checkbox);

      await user.click(
        screen.getByRole("button", { name: ALL_EVENTS_PATTERN })
      );

      expect(onSelect).toHaveBeenCalledWith("all", {
        resetExceptions: true,
      });
    });

    it("チェックボックスをオンにして「この予定のみ」を選択するとresetExceptionsは無視される", async () => {
      const user = userEvent.setup();
      const onSelect = vi.fn();

      render(<EditScopeDialog {...defaultEditProps} onSelect={onSelect} />);

      const checkbox = screen.getByRole("checkbox", {
        name: RESET_EXCEPTIONS_PATTERN,
      });
      await user.click(checkbox);

      await user.click(screen.getByRole("button", { name: THIS_ONLY_PATTERN }));

      expect(onSelect).toHaveBeenCalledWith("this", {
        resetExceptions: false,
      });
    });
  });

  // Task 6.1: ローディング状態
  describe("Task 6.1: ローディング状態", () => {
    it("isLoadingがtrueの場合、すべてのボタンが無効になる", () => {
      render(<EditScopeDialog {...defaultEditProps} isLoading />);

      const buttons = screen.getAllByRole("button");
      for (const button of buttons) {
        expect(button).toBeDisabled();
      }
    });

    it("isLoadingがfalseの場合、ボタンは有効", () => {
      render(<EditScopeDialog {...defaultEditProps} isLoading={false} />);

      expect(
        screen.getByRole("button", { name: THIS_ONLY_PATTERN })
      ).not.toBeDisabled();
      expect(
        screen.getByRole("button", { name: ALL_EVENTS_PATTERN })
      ).not.toBeDisabled();
      expect(
        screen.getByRole("button", { name: FOLLOWING_PATTERN })
      ).not.toBeDisabled();
    });
  });

  // アクセシビリティ
  describe("アクセシビリティ", () => {
    it("ダイアログに適切なrole属性が設定されている", () => {
      render(<EditScopeDialog {...defaultEditProps} />);

      expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    });

    it("ダイアログにaria-labelledby属性が設定されている", () => {
      render(<EditScopeDialog {...defaultEditProps} />);

      const dialog = screen.getByRole("alertdialog");
      expect(dialog).toHaveAttribute("aria-labelledby");
    });

    it("ダイアログにaria-describedby属性が設定されている", () => {
      render(<EditScopeDialog {...defaultEditProps} />);

      const dialog = screen.getByRole("alertdialog");
      expect(dialog).toHaveAttribute("aria-describedby");
    });
  });
});
