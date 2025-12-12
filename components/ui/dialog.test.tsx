/**
 * Dialog Component Test Suite
 *
 * Task 1.1: shadcn/ui Dialog コンポーネントの動作確認テスト
 * - Dialogが正しく開閉できること
 * - Dialogの各部品（Header, Title, Description, Footer）が正しくレンダリングされること
 * - 閉じるボタンが機能すること
 *
 * Requirements: 1.3, 1.7, 3.1, 3.6
 */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./dialog";

describe("Dialog", () => {
  describe("基本機能", () => {
    it("トリガーボタンをクリックするとダイアログが開く", async () => {
      const user = userEvent.setup();

      render(
        <Dialog>
          <DialogTrigger>Open Dialog</DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Test Dialog</DialogTitle>
              <DialogDescription>This is a test dialog</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <DialogClose>Close</DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      );

      // 初期状態ではダイアログコンテンツは非表示
      expect(screen.queryByText("Test Dialog")).not.toBeInTheDocument();

      // トリガーをクリック
      await user.click(screen.getByText("Open Dialog"));

      // ダイアログが表示される
      expect(screen.getByText("Test Dialog")).toBeInTheDocument();
      expect(screen.getByText("This is a test dialog")).toBeInTheDocument();
    });

    it("閉じるボタンをクリックするとダイアログが閉じる", async () => {
      const user = userEvent.setup();

      render(
        <Dialog>
          <DialogTrigger>Open Dialog</DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Test Dialog</DialogTitle>
            </DialogHeader>
            <DialogFooter>
              <DialogClose>Cancel</DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      );

      // ダイアログを開く
      await user.click(screen.getByText("Open Dialog"));
      expect(screen.getByText("Test Dialog")).toBeInTheDocument();

      // カスタム閉じるボタンをクリック
      await user.click(screen.getByText("Cancel"));

      // ダイアログが閉じる
      expect(screen.queryByText("Test Dialog")).not.toBeInTheDocument();
    });

    it("Xボタン（デフォルトの閉じるボタン）をクリックするとダイアログが閉じる", async () => {
      const user = userEvent.setup();

      render(
        <Dialog>
          <DialogTrigger>Open Dialog</DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Test Dialog</DialogTitle>
            </DialogHeader>
          </DialogContent>
        </Dialog>
      );

      // ダイアログを開く
      await user.click(screen.getByText("Open Dialog"));
      expect(screen.getByText("Test Dialog")).toBeInTheDocument();

      // Xボタンをクリック（sr-only "Close" テキストで識別）
      const closeButton = screen.getByRole("button", { name: "Close" });
      await user.click(closeButton);

      // ダイアログが閉じる
      expect(screen.queryByText("Test Dialog")).not.toBeInTheDocument();
    });
  });

  describe("制御されたダイアログ", () => {
    it("open propでダイアログの開閉を制御できる", () => {
      render(
        <Dialog open={true}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Controlled Dialog</DialogTitle>
            </DialogHeader>
          </DialogContent>
        </Dialog>
      );

      expect(screen.getByText("Controlled Dialog")).toBeInTheDocument();
    });

    it("onOpenChangeコールバックが呼ばれる", async () => {
      const onOpenChange = vi.fn();
      const user = userEvent.setup();

      render(
        <Dialog onOpenChange={onOpenChange}>
          <DialogTrigger>Open Dialog</DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Test Dialog</DialogTitle>
            </DialogHeader>
          </DialogContent>
        </Dialog>
      );

      await user.click(screen.getByText("Open Dialog"));
      expect(onOpenChange).toHaveBeenCalledWith(true);
    });
  });

  describe("コンポーネント構造", () => {
    it("DialogHeader, DialogTitle, DialogDescription, DialogFooterが正しくレンダリングされる", async () => {
      const user = userEvent.setup();

      render(
        <Dialog>
          <DialogTrigger>Open</DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Title Text</DialogTitle>
              <DialogDescription>Description Text</DialogDescription>
            </DialogHeader>
            <div>Content Area</div>
            <DialogFooter>
              <button type="button">Footer Button</button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      );

      await user.click(screen.getByText("Open"));

      expect(screen.getByText("Title Text")).toBeInTheDocument();
      expect(screen.getByText("Description Text")).toBeInTheDocument();
      expect(screen.getByText("Content Area")).toBeInTheDocument();
      expect(screen.getByText("Footer Button")).toBeInTheDocument();
    });

    it("showCloseButton=falseでXボタンを非表示にできる", async () => {
      const user = userEvent.setup();

      render(
        <Dialog>
          <DialogTrigger>Open</DialogTrigger>
          <DialogContent showCloseButton={false}>
            <DialogHeader>
              <DialogTitle>No X Button</DialogTitle>
            </DialogHeader>
          </DialogContent>
        </Dialog>
      );

      await user.click(screen.getByText("Open"));

      // Xボタン（sr-only "Close" ボタン）が存在しない
      expect(screen.queryByRole("button", { name: "Close" })).not.toBeInTheDocument();
    });
  });

  describe("アクセシビリティ", () => {
    it("ダイアログにはdialogロールが設定される", async () => {
      const user = userEvent.setup();

      render(
        <Dialog>
          <DialogTrigger>Open</DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Accessible Dialog</DialogTitle>
            </DialogHeader>
          </DialogContent>
        </Dialog>
      );

      await user.click(screen.getByText("Open"));

      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });
  });
});
