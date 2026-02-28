/**
 * 文字列の先頭文字を大文字で返す共通ヘルパー
 *
 * 空文字列の場合はフォールバック文字を返す。
 */
export function getInitial(name: string, fallback = "?"): string {
  if (name.length === 0) {
    return fallback;
  }
  return name.charAt(0).toUpperCase();
}

/**
 * ユーザーのイニシャルを取得
 *
 * fullName の先頭文字、なければ email の先頭文字、それもなければ "U" を返す。
 */
export function getUserInitials(user: {
  fullName: string | null;
  email: string;
}): string {
  if (user.fullName) {
    return getInitial(user.fullName);
  }
  if (user.email) {
    return getInitial(user.email);
  }
  return "U";
}
