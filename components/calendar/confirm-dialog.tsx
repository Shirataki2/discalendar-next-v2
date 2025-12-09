"use client";

/**
 * ConfirmDialog - 削除確認ダイアログコンポーネント
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

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

/**
 * ConfirmDialogコンポーネントのProps
 */
export type ConfirmDialogProps = {
  /** ダイアログの開閉状態 */
  open: boolean;
  /** ダイアログの開閉状態変更コールバック */
  onOpenChange: (open: boolean) => void;
  /** 削除対象のイベントタイトル */
  eventTitle: string;
  /** 削除確認時のコールバック */
  onConfirm: () => void;
  /** 削除処理中かどうか */
  isLoading?: boolean;
};

/**
 * 削除確認ダイアログコンポーネント
 *
 * 破壊的操作（削除）の確認ダイアログを提供します。
 * イベント名を含む確認メッセージを表示し、
 * 確認・キャンセルボタンで操作を選択できます。
 *
 * @example
 * ```tsx
 * <ConfirmDialog
 *   open={isOpen}
 *   onOpenChange={setIsOpen}
 *   eventTitle="会議の予定"
 *   onConfirm={handleDelete}
 *   isLoading={isDeleting}
 * />
 * ```
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  eventTitle,
  onConfirm,
  isLoading = false,
}: ConfirmDialogProps) {
  /**
   * キャンセルボタンのクリックハンドラー
   */
  function handleCancel() {
    onOpenChange(false);
  }

  /**
   * 確認ボタンのクリックハンドラー
   */
  function handleConfirm() {
    onConfirm();
  }

  return (
    <AlertDialog onOpenChange={onOpenChange} open={open}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>予定を削除</AlertDialogTitle>
          <AlertDialogDescription>
            「{eventTitle}」を削除しますか？この操作は取り消せません。
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading} onClick={handleCancel}>
            キャンセル
          </AlertDialogCancel>
          <AlertDialogAction disabled={isLoading} onClick={handleConfirm}>
            削除
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
