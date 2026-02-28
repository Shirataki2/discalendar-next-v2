import Image from "next/image";
import Link from "next/link";
import type { DashboardUser } from "@/app/dashboard/page";
import { LogoutButton } from "@/components/auth/logout-button";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { getUserInitials } from "@/lib/user/get-user-initials";

const HEADER_AVATAR_SIZE = 32;

type DashboardHeaderProps = {
  user: DashboardUser;
};

/**
 * ダッシュボード共通ヘッダー
 *
 * ロゴ、ThemeSwitcher、アバターリンク、LogoutButton を表示する。
 * /dashboard と /dashboard/user の両方で使用。
 */
export function DashboardHeader({ user }: DashboardHeaderProps) {
  const displayName = user.fullName ?? user.email;
  const initials = getUserInitials(user);

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
          <Link
            className="flex items-center gap-3 transition-opacity hover:opacity-80"
            href="/dashboard/user"
          >
            {user.avatarUrl ? (
              <Image
                alt={`${displayName}のアバター`}
                className="rounded-full"
                height={HEADER_AVATAR_SIZE}
                src={user.avatarUrl}
                width={HEADER_AVATAR_SIZE}
              />
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted font-medium text-sm">
                {initials}
              </div>
            )}
            <span className="font-medium text-sm">{displayName}</span>
          </Link>
          <LogoutButton />
        </div>
      </div>
    </header>
  );
}
