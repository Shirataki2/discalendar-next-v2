import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { buildDashboardUser } from "@/lib/user/build-dashboard-user";
import { UserSettingsPageLayout } from "./user-settings-page-layout";

// 認証状態を取得するため動的レンダリングを強制
export const dynamic = "force-dynamic";

/**
 * ユーザー設定ページ（Server Component）
 *
 * Supabase Authからユーザー情報を取得し、設定ページレイアウトをレンダリングする。
 * 既存の UserProfilePage と同一の認証パターンを踏襲。
 *
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5
 */
export default async function UserSettingsPage() {
  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (!user || error) {
    redirect("/auth/login");
  }

  const dashboardUser = buildDashboardUser(user);

  return <UserSettingsPageLayout user={dashboardUser} />;
}
