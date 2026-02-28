import Image from "next/image";
import type { DashboardUser } from "@/app/dashboard/page";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export type UserProfileCardProps = {
  user: DashboardUser;
};

const AVATAR_SIZE = 80;

function getUserInitials(user: DashboardUser): string {
  if (user.fullName) {
    return user.fullName.charAt(0).toUpperCase();
  }
  if (user.email) {
    return user.email.charAt(0).toUpperCase();
  }
  return "U";
}

export function UserProfileCard({ user }: UserProfileCardProps) {
  const displayName = user.fullName ?? user.email;
  const initials = getUserInitials(user);

  return (
    <Card>
      <CardHeader>
        <CardTitle>プロフィール</CardTitle>
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
