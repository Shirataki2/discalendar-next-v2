import Link from "next/link";
import { UserMenu } from "@/components/dashboard/user-menu";
import { ThemeSwitcher } from "@/components/theme-switcher";
import type { DashboardUser } from "@/types/user";

export type DashboardHeaderProps = {
  user: DashboardUser;
};

/**
 * ダッシュボード共通ヘッダー
 *
 * ロゴ、ThemeSwitcher、UserMenu（ドロップダウン）を表示する。
 * /dashboard と /dashboard/user の両方で使用。
 */
export function DashboardHeader({ user }: DashboardHeaderProps) {
  return (
    <header className="border-b">
      <div className="container mx-auto flex items-center justify-between px-4 py-4">
        <Link
          className="font-uni-sans-heavy text-2xl transition-colors hover:text-primary"
          href="/"
        >
          Discalendar
        </Link>
        <div className="flex items-center gap-4">
          <ThemeSwitcher />
          <UserMenu user={user} />
        </div>
      </div>
    </header>
  );
}
