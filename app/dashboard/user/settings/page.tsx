import { redirect } from "next/navigation";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { createClient } from "@/lib/supabase/server";
import { buildDashboardUser } from "@/lib/user/build-dashboard-user";
import type { DashboardUser } from "@/types/user";
import { UserSettingsContent } from "./user-settings-content";

// 認証状態を取得するため動的レンダリングを強制
export const dynamic = "force-dynamic";

/**
 * UserSettingsPageLayoutのProps
 */
export type UserSettingsPageLayoutProps = {
  user: DashboardUser;
};

/**
 * ユーザー設定ページのレイアウトコンポーネント（テスト可能な表示層）
 *
 * Requirements: 1.3, 1.4, 1.5
 */
export function UserSettingsPageLayout({ user }: UserSettingsPageLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col">
      <DashboardHeader user={user} />
      <main className="container mx-auto max-w-2xl px-4 py-8">
        <UserSettingsContent />
      </main>
    </div>
  );
}

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
