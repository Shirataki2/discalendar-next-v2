"use client";

import { AlertCircle } from "lucide-react";
import { DiscordLoginButton } from "@/components/auth/discord-login-button";
import {
  AUTH_ERROR_CODES,
  type AuthErrorCode,
  getAuthErrorMessage,
} from "@/lib/auth/types";

/**
 * LoginPageClientのProps
 */
export type LoginPageClientProps = {
  /** エラーコード（オプション） */
  errorCode?: AuthErrorCode | string;
};

/**
 * エラーコードが有効なAuthErrorCodeかどうかを判定する
 */
function isValidAuthErrorCode(code: string): code is AuthErrorCode {
  return AUTH_ERROR_CODES.includes(code as AuthErrorCode);
}

/**
 * ログインページのClient Component
 *
 * エラーメッセージ表示とDiscordログインボタンを含む。
 * URLSearchParamsから取得したエラーコードに基づいて適切なメッセージを表示する。
 *
 * 要件対応:
 * - 1.1: Discordログインボタンを表示
 * - 7.1: ネットワークエラーメッセージの表示
 * - 7.2: 認証失敗メッセージの表示
 * - 7.3: 認可キャンセルメッセージの表示
 */
export function LoginPageClient({ errorCode }: LoginPageClientProps) {
  // エラーメッセージを取得（有効なコードの場合のみ）
  const errorMessage =
    errorCode && isValidAuthErrorCode(errorCode)
      ? getAuthErrorMessage(errorCode)
      : null;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        {/* ページタイトル */}
        <div className="space-y-2 text-center">
          <h1 className="font-bold text-2xl tracking-tight">ログイン</h1>
          <p className="text-muted-foreground text-sm">
            Discordアカウントでログインしてください
          </p>
        </div>

        {/* エラーメッセージ */}
        {errorMessage !== null && (
          <div
            aria-live="polite"
            className="flex items-center gap-2 rounded-md border border-red-200 bg-destructive/10 p-4 text-destructive"
            role="alert"
          >
            <AlertCircle aria-hidden="true" className="h-5 w-5 flex-shrink-0" />
            <span className="text-sm">{errorMessage}</span>
          </div>
        )}

        {/* ログインボタン */}
        <DiscordLoginButton />

        {/* フッター */}
        <p className="text-center text-muted-foreground text-xs">
          ログインすることで、利用規約に同意したものとみなされます。
        </p>
      </div>
    </main>
  );
}

/**
 * ログインページ
 *
 * Server ComponentとしてURLSearchParamsを受け取り、
 * Client ComponentのLoginPageClientに渡す。
 *
 * Note: Next.js App RouterのServer Componentでは
 * searchParamsを直接受け取れるが、テスト容易性のため
 * Client Componentを分離している。
 */
export default function LoginPage() {
  // Client Componentとして動作するため、
  // URLSearchParamsはuseSearchParamsで取得する必要がある
  // ただし、このコンポーネントは単純にLoginPageClientをレンダリングする
  // searchParamsの取得は別途実装（Next.js 15の仕様変更に対応）

  return <LoginPageClientWithSearchParams />;
}

/**
 * URLSearchParamsを読み取るClient Component
 */
function LoginPageClientWithSearchParams() {
  // Next.js App RouterのClient Componentではwindow.locationを使用
  // または useSearchParams hookを使用する
  const searchParams =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search)
      : null;
  const errorCode = searchParams?.get("error") ?? undefined;

  return <LoginPageClient errorCode={errorCode} />;
}
