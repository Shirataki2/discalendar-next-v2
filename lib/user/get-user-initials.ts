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
    return user.fullName.charAt(0).toUpperCase();
  }
  if (user.email) {
    return user.email.charAt(0).toUpperCase();
  }
  return "U";
}
