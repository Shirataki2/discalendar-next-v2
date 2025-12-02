/**
 * 認証エラーコードの定義
 * 各エラーコードは認証フローで発生する特定のエラー状況を表す
 */
export const AUTH_ERROR_CODES = [
  "missing_code",
  "auth_failed",
  "access_denied",
  "network_error",
  "session_expired",
] as const;

/**
 * 認証エラーコードの型
 */
export type AuthErrorCode = (typeof AUTH_ERROR_CODES)[number];

/**
 * 認証エラーオブジェクトの型定義
 */
export interface AuthError {
  /** エラーコード */
  code: AuthErrorCode;
  /** ユーザーに表示するメッセージ */
  message: string;
  /** デバッグ用の詳細情報（オプション） */
  details?: string;
}

/**
 * エラーコードからユーザーフレンドリーなメッセージへのマッピング
 *
 * 要件との対応:
 * - 7.1: network_error -> 「サーバーに接続できませんでした」
 * - 7.2: auth_failed -> 「認証に失敗しました」
 * - 7.3: access_denied -> 「ログインがキャンセルされました」
 */
export const AUTH_ERROR_MESSAGES: Record<AuthErrorCode, string> = {
  missing_code: "認証コードが見つかりません。再度ログインしてください。",
  auth_failed: "認証に失敗しました。再度お試しください。",
  access_denied: "ログインがキャンセルされました。",
  network_error:
    "サーバーに接続できませんでした。ネットワーク接続を確認してください。",
  session_expired:
    "セッションの有効期限が切れました。再度ログインしてください。",
};

/**
 * デフォルトのエラーメッセージ（未知のエラーコード用）
 */
const DEFAULT_ERROR_MESSAGE = "予期しないエラーが発生しました。";

/**
 * エラーコードからユーザーフレンドリーなメッセージを取得する
 *
 * @param code - 認証エラーコード
 * @returns ユーザーに表示するメッセージ
 */
export function getAuthErrorMessage(code: AuthErrorCode): string {
  return AUTH_ERROR_MESSAGES[code] ?? DEFAULT_ERROR_MESSAGE;
}

/**
 * 認証エラーをコンソールにログ記録する
 * 要件7.4: すべての認証エラーはコンソールにログ記録
 *
 * @param error - 認証エラーオブジェクト
 */
export function logAuthError(error: AuthError): void {
  if (error.details) {
    console.error("[Auth Error]", error.code, error.message, error.details);
  } else {
    console.error("[Auth Error]", error.code, error.message);
  }
}
