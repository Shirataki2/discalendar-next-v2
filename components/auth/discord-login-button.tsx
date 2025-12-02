"use client";

import { Loader2 } from "lucide-react";
import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { type AuthError, logAuthError } from "@/lib/auth/types";
import { createClient } from "@/lib/supabase/client";

/**
 * Discord OAuth認証のスコープ
 * - identify: ユーザーの基本情報（ID、ユーザー名、アバター）
 * - email: ユーザーのメールアドレス
 */
const DISCORD_SCOPES = "identify email";

/**
 * デフォルトのリダイレクト先パス
 */
const DEFAULT_REDIRECT_PATH = "/dashboard";

/**
 * DiscordLoginButtonのProps
 */
export type DiscordLoginButtonProps = {
  /** OAuth完了後のリダイレクト先（オプション、デフォルトは/dashboard） */
  redirectTo?: string;
  /** ローディング状態のコールバック */
  onLoadingChange?: (loading: boolean) => void;
};

/**
 * Discord SVGロゴアイコン
 * Discordブランドガイドラインに基づくロゴ
 */
function DiscordIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="currentColor"
      viewBox="0 0 127.14 96.36"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M107.7,8.07A105.15,105.15,0,0,0,81.47,0a72.06,72.06,0,0,0-3.36,6.83A97.68,97.68,0,0,0,49,6.83,72.37,72.37,0,0,0,45.64,0,105.89,105.89,0,0,0,19.39,8.09C2.79,32.65-1.71,56.6.54,80.21h0A105.73,105.73,0,0,0,32.71,96.36,77.7,77.7,0,0,0,39.6,85.25a68.42,68.42,0,0,1-10.85-5.18c.91-.66,1.8-1.34,2.66-2a75.57,75.57,0,0,0,64.32,0c.87.71,1.76,1.39,2.66,2a68.68,68.68,0,0,1-10.87,5.19,77,77,0,0,0,6.89,11.1A105.25,105.25,0,0,0,126.6,80.22h0C129.24,52.84,122.09,29.11,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53s5-12.74,11.43-12.74S54,46,53.89,53,48.84,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.25,60,73.25,53s5-12.74,11.44-12.74S96.23,46,96.12,53,91.08,65.69,84.69,65.69Z" />
    </svg>
  );
}

/**
 * Supabase経由でDiscord OAuth認証を開始する
 *
 * @param redirectTo - OAuth完了後のリダイレクト先パス
 * @throws AuthError - 認証開始に失敗した場合
 */
async function signInWithDiscord(redirectTo?: string): Promise<void> {
  const supabase = createClient();

  // コールバックURLを構築（ブラウザの現在のオリジンを使用）
  const callbackUrl = `${window.location.origin}/auth/callback`;
  const nextPath = redirectTo ?? DEFAULT_REDIRECT_PATH;
  const redirectToWithNext = `${callbackUrl}?next=${encodeURIComponent(nextPath)}`;

  const { error } = await supabase.auth.signInWithOAuth({
    provider: "discord",
    options: {
      redirectTo: redirectToWithNext,
      scopes: DISCORD_SCOPES,
    },
  });

  if (error) {
    const authError: AuthError = {
      code: "auth_failed",
      message: "認証の開始に失敗しました。",
      details: error.message,
    };
    logAuthError(authError);
    throw error;
  }
}

/**
 * Discordログインボタンコンポーネント
 *
 * Discordブランドカラー（#5865F2）を使用したログインボタン。
 * ボタンクリックでSupabase AuthのOAuth認証フローを開始する。
 *
 * 要件対応:
 * - 1.1: ログインページにDiscordログインボタンを表示
 * - 1.2: Discordブランドカラーとロゴを表示
 * - 1.3: フォーカス時に視覚的フィードバックを表示
 * - 1.4: キーボード操作（Enter/Space）でアクティベート可能
 * - 2.1: Supabase Auth経由でDiscord OAuth認可画面にリダイレクト
 * - 2.2: identify, emailスコープをリクエスト
 */
export function DiscordLoginButton({
  redirectTo,
  onLoadingChange,
}: DiscordLoginButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = useCallback(async () => {
    // 既にローディング中の場合は何もしない（ボタン連打防止）
    if (isLoading) {
      return;
    }

    setIsLoading(true);
    onLoadingChange?.(true);

    try {
      await signInWithDiscord(redirectTo);
      // リダイレクトが発生するため、ここには到達しない想定
    } catch (_error) {
      // エラー発生時はボタンを再度有効化（エラーはlogAuthErrorで既にログ済み）
      setIsLoading(false);
      onLoadingChange?.(false);
    }
  }, [isLoading, redirectTo, onLoadingChange]);

  return (
    <Button
      className="w-full focus-visible:ring-2 focus-visible:ring-[#5865F2] focus-visible:ring-offset-2"
      disabled={isLoading}
      onClick={handleLogin}
      style={{ backgroundColor: "#5865f2" }}
    >
      {isLoading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" data-testid="loader" />
          <span>ログイン中...</span>
        </>
      ) : (
        <>
          <DiscordIcon className="mr-2 h-4 w-4" />
          <span>Discordでログイン</span>
        </>
      )}
    </Button>
  );
}
