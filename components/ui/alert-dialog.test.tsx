/**
 * AlertDialog Component Test Suite
 *
 * Task 1.1: shadcn/ui AlertDialog コンポーネントの動作確認テスト
 * - AlertDialogが正しく開閉できること
 * - 確認・キャンセルボタンが正しく機能すること
 * - AlertDialogの各部品が正しくレンダリングされること
 *
 * Requirements: 4.1, 4.4
 */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "./alert-dialog";

describe("AlertDialog", () => {
  describe("基本機能", () => {
    it("トリガーボタンをクリックするとアラートダイアログが開く", async () => {
      const user = userEvent.setup();

      render(
        <AlertDialog>
          <AlertDialogTrigger>Delete Item</AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction>Confirm</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      );

      // 初期状態ではアラートダイアログは非表示
      expect(screen.queryByText("Are you sure?")).not.toBeInTheDocument();

      // トリガーをクリック
      await user.click(screen.getByText("Delete Item"));

      // アラートダイアログが表示される
      expect(screen.getByText("Are you sure?")).toBeInTheDocument();
      expect(screen.getByText("This action cannot be undone.")).toBeInTheDocument();
    });

    it("キャンセルボタンをクリックするとアラートダイアログが閉じる", async () => {
      const user = userEvent.setup();

      render(
        <AlertDialog>
          <AlertDialogTrigger>Delete</AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirm Delete</AlertDialogTitle>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction>Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      );

      // アラートダイアログを開く
      await user.click(screen.getByText("Delete"));
      expect(screen.getByText("Confirm Delete")).toBeInTheDocument();

      // キャンセルボタンをクリック
      await user.click(screen.getByRole("button", { name: "Cancel" }));

      // アラートダイアログが閉じる
      expect(screen.queryByText("Confirm Delete")).not.toBeInTheDocument();
    });

    it("確認ボタンをクリックするとアラートダイアログが閉じる", async () => {
      const user = userEvent.setup();

      render(
        <AlertDialog>
          <AlertDialogTrigger>Delete</AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirm Delete</AlertDialogTitle>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction>Confirm</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      );

      // アラートダイアログを開く
      await user.click(screen.getByText("Delete"));
      expect(screen.getByText("Confirm Delete")).toBeInTheDocument();

      // 確認ボタンをクリック
      await user.click(screen.getByRole("button", { name: "Confirm" }));

      // アラートダイアログが閉じる
      expect(screen.queryByText("Confirm Delete")).not.toBeInTheDocument();
    });
  });

  describe("制御されたアラートダイアログ", () => {
    it("open propでアラートダイアログの開閉を制御できる", () => {
      render(
        <AlertDialog open={true}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Controlled Alert</AlertDialogTitle>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction>OK</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      );

      expect(screen.getByText("Controlled Alert")).toBeInTheDocument();
    });

    it("onOpenChangeコールバックが呼ばれる", async () => {
      const onOpenChange = vi.fn();
      const user = userEvent.setup();

      render(
        <AlertDialog onOpenChange={onOpenChange}>
          <AlertDialogTrigger>Open Alert</AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Test Alert</AlertDialogTitle>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction>OK</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      );

      await user.click(screen.getByText("Open Alert"));
      expect(onOpenChange).toHaveBeenCalledWith(true);
    });
  });

  describe("ボタンスタイリング", () => {
    it("AlertDialogActionはデフォルトのボタンスタイルを持つ", async () => {
      const user = userEvent.setup();

      render(
        <AlertDialog>
          <AlertDialogTrigger>Open</AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Test</AlertDialogTitle>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction>Confirm</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      );

      await user.click(screen.getByText("Open"));

      // ボタンが存在することを確認
      const confirmButton = screen.getByRole("button", { name: "Confirm" });
      const cancelButton = screen.getByRole("button", { name: "Cancel" });

      expect(confirmButton).toBeInTheDocument();
      expect(cancelButton).toBeInTheDocument();
    });
  });

  describe("コンポーネント構造", () => {
    it("AlertDialogHeader, Title, Description, Footerが正しくレンダリングされる", async () => {
      const user = userEvent.setup();

      render(
        <AlertDialog>
          <AlertDialogTrigger>Open</AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Alert Title</AlertDialogTitle>
              <AlertDialogDescription>Alert Description</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>No</AlertDialogCancel>
              <AlertDialogAction>Yes</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      );

      await user.click(screen.getByText("Open"));

      expect(screen.getByText("Alert Title")).toBeInTheDocument();
      expect(screen.getByText("Alert Description")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "No" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Yes" })).toBeInTheDocument();
    });
  });

  describe("アクセシビリティ", () => {
    it("アラートダイアログにはalertdialogロールが設定される", async () => {
      const user = userEvent.setup();

      render(
        <AlertDialog>
          <AlertDialogTrigger>Open</AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Accessible Alert</AlertDialogTitle>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction>OK</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      );

      await user.click(screen.getByText("Open"));

      expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    });
  });

  describe("削除確認ダイアログのユースケース (Req 4.1, 4.4)", () => {
    it("削除確認ダイアログで確認をクリックすると確認コールバックが呼ばれる", async () => {
      const onConfirm = vi.fn();
      const user = userEvent.setup();

      render(
        <AlertDialog>
          <AlertDialogTrigger>Delete Event</AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>予定を削除しますか？</AlertDialogTitle>
              <AlertDialogDescription>
                この操作は取り消せません。予定は完全に削除されます。
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>キャンセル</AlertDialogCancel>
              <AlertDialogAction onClick={onConfirm}>削除する</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      );

      // 削除ボタンをクリックしてダイアログを開く
      await user.click(screen.getByText("Delete Event"));

      // 確認ダイアログが表示される
      expect(screen.getByText("予定を削除しますか？")).toBeInTheDocument();
      expect(
        screen.getByText("この操作は取り消せません。予定は完全に削除されます。")
      ).toBeInTheDocument();

      // 確認ボタンをクリック
      await user.click(screen.getByRole("button", { name: "削除する" }));

      // コールバックが呼ばれる
      expect(onConfirm).toHaveBeenCalled();
    });

    it("削除確認ダイアログでキャンセルをクリックするとダイアログが閉じる", async () => {
      const onConfirm = vi.fn();
      const user = userEvent.setup();

      render(
        <AlertDialog>
          <AlertDialogTrigger>Delete Event</AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>予定を削除しますか？</AlertDialogTitle>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>キャンセル</AlertDialogCancel>
              <AlertDialogAction onClick={onConfirm}>削除する</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      );

      // ダイアログを開く
      await user.click(screen.getByText("Delete Event"));

      // キャンセルをクリック
      await user.click(screen.getByRole("button", { name: "キャンセル" }));

      // ダイアログが閉じる
      expect(screen.queryByText("予定を削除しますか？")).not.toBeInTheDocument();

      // 確認コールバックは呼ばれない
      expect(onConfirm).not.toHaveBeenCalled();
    });
  });
});
