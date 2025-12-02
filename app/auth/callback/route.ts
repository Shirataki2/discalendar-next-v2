import { NextResponse } from "next/server";
import { type AuthError, logAuthError } from "@/lib/auth/types";
import { createClient } from "@/lib/supabase/server";

/**
 * OAuth認証コールバックのRoute Handler
 *
 * DiscordからのOAuthコールバックを処理し、セッションを確立する。
 *
 * 要件対応:
 * - 2.3: コールバックURLがSupabase設定と一致することを確認
 * - 3.1: 認可コードを受け取りセッションを確立
 * - 3.2: セッション確立成功時、ダッシュボードまたは指定されたリダイレクト先に遷移
 * - 3.3: OAuth認証失敗時、エラーメッセージを表示してログインページに戻す
 * - 3.4: ユーザーが認可を拒否した場合、ログインページにリダイレクト
 * - 4.1: CookieベースでSupabaseセッションを保存
 * - 7.4: エラーをコンソールにログ記録
 *
 * @param request - OAuthプロバイダからのリダイレクトリクエスト
 * @returns リダイレクトレスポンス
 */
export async function GET(request: Request): Promise<NextResponse> {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next");
  const error = requestUrl.searchParams.get("error");

  // ベースURLを取得
  const baseUrl = `${requestUrl.protocol}//${requestUrl.host}`;

  // リダイレクト先の検証と決定
  const getRedirectUrl = (path: string): string => {
    // 相対パスのみ許可（外部URLへのリダイレクトを防止）
    if (path.startsWith("/") && !path.startsWith("//")) {
      return `${baseUrl}${path}`;
    }
    return `${baseUrl}/dashboard`;
  };

  // 要件3.4: OAuthプロバイダからのエラーを処理
  if (error) {
    const errorCode =
      error === "access_denied" ? "access_denied" : "auth_failed";

    const authError: AuthError = {
      code: errorCode,
      message: `OAuth error: ${error}`,
      details: requestUrl.searchParams.get("error_description") ?? undefined,
    };
    logAuthError(authError);

    return NextResponse.redirect(`${baseUrl}/auth/login?error=${errorCode}`, {
      status: 307,
    });
  }

  // 認可コードが欠落している場合
  if (!code) {
    const authError: AuthError = {
      code: "missing_code",
      message: "Authorization code is missing from callback",
    };
    logAuthError(authError);

    return NextResponse.redirect(`${baseUrl}/auth/login?error=missing_code`, {
      status: 307,
    });
  }

  // 要件3.1: 認可コードをセッショントークンに交換
  const supabase = await createClient();
  const { error: exchangeError } =
    await supabase.auth.exchangeCodeForSession(code);

  // 要件3.3: トークン交換に失敗した場合
  if (exchangeError) {
    const authError: AuthError = {
      code: "auth_failed",
      message: "Failed to exchange code for session",
      details: exchangeError.message,
    };
    logAuthError(authError);

    return NextResponse.redirect(`${baseUrl}/auth/login?error=auth_failed`, {
      status: 307,
    });
  }

  // 要件3.2: セッション確立成功時、リダイレクト
  const redirectTo = next ? getRedirectUrl(next) : `${baseUrl}/dashboard`;
  return NextResponse.redirect(redirectTo, { status: 307 });
}
