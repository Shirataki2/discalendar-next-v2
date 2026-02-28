import type { User } from "@supabase/supabase-js";
import type { DashboardUser } from "@/types/user";

/**
 * Supabase Auth の User オブジェクトから DashboardUser を構築する
 *
 * user_metadata から Discord の full_name / avatar_url を型安全に抽出する。
 * 複数の Server Component ページで共通的に使用される。
 */
export function buildDashboardUser(user: User): DashboardUser {
  return {
    id: user.id,
    email: user.email ?? "",
    fullName:
      typeof user.user_metadata?.full_name === "string"
        ? user.user_metadata.full_name
        : null,
    avatarUrl:
      typeof user.user_metadata?.avatar_url === "string"
        ? user.user_metadata.avatar_url
        : null,
  };
}
