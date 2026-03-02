import { Settings } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getUserInitials } from "@/lib/user/get-user-initials";
import type { DashboardUser } from "@/types/user";

export type UserProfileCardProps = {
  user: DashboardUser;
};

const AVATAR_SIZE = 80;

export function UserProfileCard({ user }: UserProfileCardProps) {
  const displayName = user.fullName ?? user.email;
  const initials = getUserInitials(user);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>プロフィール</CardTitle>
        <Link
          className="text-muted-foreground transition-colors hover:text-foreground"
          href="/dashboard/user/settings"
        >
          <Settings className="h-4 w-4" />
          <span className="sr-only">設定</span>
        </Link>
      </CardHeader>
      <CardContent className="flex items-center gap-4">
        <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted">
          {user.avatarUrl ? (
            <Image
              alt={`${displayName}のアバター`}
              className="h-full w-full object-cover"
              height={AVATAR_SIZE}
              src={user.avatarUrl}
              width={AVATAR_SIZE}
            />
          ) : (
            <span className="font-semibold text-2xl text-muted-foreground">
              {initials}
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-lg">{displayName}</p>
          <p className="truncate text-muted-foreground text-sm">{user.email}</p>
        </div>
      </CardContent>
    </Card>
  );
}
