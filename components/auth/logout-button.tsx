"use client";

import { LogOut } from "lucide-react";
import { useCallback, useState, useTransition } from "react";
import { signOut } from "@/app/auth/actions";
import { Button } from "@/components/ui/button";

/**
 * LogoutButtonのProps
 */
export type LogoutButtonProps = {
  /** ボタンのvariant（デフォルトはghost） */
  variant?: "default" | "ghost" | "outline";
};

/**
 * ログアウトボタンコンポーネント
 *
 * ログアウトボタンを表示し、Server Actionを呼び出してセッションを破棄する。
 *
 * 要件対応:
 * - 6.1: ログアウトボタンクリックでSupabaseセッションを破棄
 * - 6.2: ログアウト完了後、ログインページへリダイレクト
 * - 6.3: クライアント側のセッション情報をクリア
 */
export function LogoutButton({ variant = "ghost" }: LogoutButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [isLoading, setIsLoading] = useState(false);

  const handleLogout = useCallback(() => {
    // 既にローディング中の場合は何もしない（ボタン連打防止）
    if (isLoading || isPending) {
      return;
    }

    setIsLoading(true);

    startTransition(async () => {
      await signOut();
      // redirectが発生するため、ここには到達しない想定
    });
  }, [isLoading, isPending]);

  return (
    <Button
      disabled={isLoading || isPending}
      onClick={handleLogout}
      variant={variant}
    >
      <LogOut className="mr-2 h-4 w-4" />
      <span>ログアウト</span>
    </Button>
  );
}
