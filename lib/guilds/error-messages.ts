import type { GuildListError } from "@/lib/guilds/types";

/**
 * GuildListError からユーザー向けメッセージを取得する
 *
 * ギルド取得エラーの表示メッセージを一元管理する。
 * exhaustive check により GuildListError の型変更時にコンパイルエラーで検出可能。
 */
export function getGuildListErrorMessage(error: GuildListError): string {
  switch (error.type) {
    case "api_error":
      return error.message;
    case "token_expired":
      return "セッションの有効期限が切れました。再度ログインしてください。";
    case "no_token":
      return "Discord連携が無効です。再度ログインしてください。";
    default: {
      const _exhaustiveCheck: never = error;
      return _exhaustiveCheck;
    }
  }
}
