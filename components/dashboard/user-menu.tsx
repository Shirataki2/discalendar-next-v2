"use client";

import { LogOut, Settings, User } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useTransition } from "react";
import { signOut } from "@/app/auth/actions";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getUserInitials } from "@/lib/user/get-user-initials";
import type { DashboardUser } from "@/types/user";

const AVATAR_SIZE = 32;

export type UserMenuProps = {
  user: DashboardUser;
};

/**
 * ユーザーアバタードロップダウンメニュー
 *
 * DashboardHeader 内に配置し、プロフィール・設定・ログアウトの
 * 3つのメニューアイテムを提供する。
 *
 * Requirements: 4.2, 4.3
 */
export function UserMenu({ user }: UserMenuProps) {
  const displayName = user.fullName ?? user.email;
  const initials = getUserInitials(user);
  const [isPending, startTransition] = useTransition();

  const handleLogout = useCallback(() => {
    if (isPending) {
      return;
    }
    startTransition(async () => {
      await signOut();
    });
  }, [isPending]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          aria-label="ユーザーメニュー"
          className="flex items-center gap-3 rounded-sm transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          type="button"
        >
          {user.avatarUrl ? (
            <Image
              alt={`${displayName}のアバター`}
              className="rounded-full"
              height={AVATAR_SIZE}
              src={user.avatarUrl}
              width={AVATAR_SIZE}
            />
          ) : (
            <div
              aria-hidden="true"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-muted font-medium text-sm"
            >
              {initials}
            </div>
          )}
          <span className="font-medium text-sm">{displayName}</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem asChild>
          <Link href="/dashboard/user">
            <User className="mr-2 h-4 w-4" />
            プロフィール
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/dashboard/user/settings">
            <Settings className="mr-2 h-4 w-4" />
            設定
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled={isPending} onClick={handleLogout}>
          <LogOut className="mr-2 h-4 w-4" />
          ログアウト
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
