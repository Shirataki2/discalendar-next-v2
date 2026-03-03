import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import type { DashboardUser } from "@/types/user";
import { UserSettingsContent } from "./user-settings-content";

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
