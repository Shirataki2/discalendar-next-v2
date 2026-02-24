"use client";

/**
 * EditScopeDialog - 編集スコープ選択ダイアログコンポーネント
 *
 * タスク6.1: 編集スコープ選択ダイアログを実装する
 * - 繰り返しイベントの編集・削除時に「この予定のみ」「すべての予定」「これ以降の予定」の3択を表示する
 * - 削除時には確認メッセージを表示する
 * - 「すべての予定」編集時に個別例外をリセットするかどうかの確認チェックボックスを表示する
 * - 既存の確認ダイアログと同様のUIパターンを踏襲する
 *
 * Requirements: 5.1, 5.3, 6.4
 */

import { useState } from "react";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import type { EditScope } from "@/lib/calendar/types";

/**
 * スコープ選択時のオプション
 */
export type EditScopeOptions = {
  /** 個別例外をリセットするか（「すべての予定」編集時のみ有効） */
  resetExceptions: boolean;
};

/**
 * EditScopeDialogコンポーネントのProps
 */
export type EditScopeDialogProps = {
  /** ダイアログの開閉状態 */
  open: boolean;
  /** ダイアログの開閉状態変更コールバック */
  onOpenChange: (open: boolean) => void;
  /** 操作モード */
  mode: "edit" | "delete";
  /** 対象イベントのタイトル */
  eventTitle: string;
  /** スコープ選択時のコールバック */
  onSelect: (scope: EditScope, options: EditScopeOptions) => void;
  /** 処理中かどうか */
  isLoading?: boolean;
};

/**
 * 編集スコープ選択ダイアログコンポーネント
 *
 * 繰り返しイベントの編集・削除時に対象範囲を選択する確認ダイアログを提供します。
 *
 * @example
 * ```tsx
 * <EditScopeDialog
 *   open={isOpen}
 *   onOpenChange={setIsOpen}
 *   mode="edit"
 *   eventTitle="チームミーティング"
 *   onSelect={handleScopeSelect}
 *   isLoading={isProcessing}
 * />
 * ```
 */
export function EditScopeDialog({
  open,
  onOpenChange,
  mode,
  eventTitle,
  onSelect,
  isLoading = false,
}: EditScopeDialogProps) {
  const [resetExceptions, setResetExceptions] = useState(false);

  const isEdit = mode === "edit";
  const title = isEdit ? "繰り返し予定を編集" : "繰り返し予定を削除";
  const description = isEdit
    ? `「${eventTitle}」の編集対象を選択してください。`
    : `「${eventTitle}」を削除しますか？この操作は取り消せません。`;

  function handleSelect(scope: EditScope) {
    const options: EditScopeOptions = {
      resetExceptions: scope === "all" ? resetExceptions : false,
    };
    onSelect(scope, options);
  }

  function handleCancel() {
    onOpenChange(false);
  }

  return (
    <AlertDialog onOpenChange={onOpenChange} open={open}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>

        <div className="flex flex-col gap-2">
          <Button
            disabled={isLoading}
            onClick={() => handleSelect("this")}
            variant="outline"
          >
            この予定のみ
          </Button>
          <Button
            disabled={isLoading}
            onClick={() => handleSelect("all")}
            variant="outline"
          >
            すべての予定
          </Button>
          <Button
            disabled={isLoading}
            onClick={() => handleSelect("following")}
            variant="outline"
          >
            これ以降の予定
          </Button>
        </div>

        {isEdit ? (
          <div className="flex items-center gap-2">
            <Checkbox
              aria-label="個別の変更をリセット"
              checked={resetExceptions}
              disabled={isLoading}
              id="reset-exceptions"
              onCheckedChange={(checked) =>
                setResetExceptions(checked === true)
              }
            />
            <label
              className="text-muted-foreground text-sm"
              htmlFor="reset-exceptions"
            >
              個別の変更をリセット
            </label>
          </div>
        ) : null}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading} onClick={handleCancel}>
            キャンセル
          </AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
