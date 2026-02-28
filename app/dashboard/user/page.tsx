import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { DashboardUser } from "@/app/dashboard/page";
import { LogoutButton } from "@/components/auth/logout-button";
import { UserGuildList } from "@/components/user/user-guild-list";
import { UserProfileCard } from "@/components/user/user-profile-card";
import { getJoinedGuilds } from "@/lib/guilds/service";
import type { Guild } from "@/lib/guilds/types";
import { createClient } from "@/lib/supabase/server";

// 認証状態を取得するため動的レンダリングを強制
export const dynamic = "force-dynamic";

/**
 * UserProfilePageLayoutのProps
 */
export type UserProfilePageLayoutProps = {
  user: DashboardUser;
  guilds: Guild[];
  guildError?: string;
};

/**
 * ユーザーページのレイアウトコンポーネント（テスト可能な表示層）
 *
 * Requirements: 1.1, 4.1, 5.1, 5.2
 */
export function UserProfilePageLayout({
  user,
  guilds,
  guildError,
}: UserProfilePageLayoutProps) {
  return (
    <main className="container mx-auto max-w-2xl px-4 py-8">
      <div className="mb-6 flex items-center gap-2">
        <Link
          className="inline-flex items-center gap-1 text-muted-foreground text-sm transition-colors hover:text-foreground"
          href="/dashboard"
        >
          <ArrowLeft className="h-4 w-4" />
          ダッシュボードに戻る
        </Link>
      </div>

      <h1 className="mb-6 font-bold text-2xl">ユーザーページ</h1>

      <div className="space-y-6">
        <UserProfileCard user={user} />

        {guildError ? (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
            <p className="text-destructive text-sm">{guildError}</p>
          </div>
        ) : (
          <UserGuildList guilds={guilds} />
        )}

        <div className="flex justify-end">
          <LogoutButton variant="outline" />
        </div>
      </div>
    </main>
  );
}

/**
 * ユーザーページ（Server Component）
 *
 * Supabase Authからユーザー情報を取得し、Guild Serviceからギルド一覧を取得。
 * dashboardページのデータ取得パターンを踏襲。
 *
 * Requirements: 1.1, 1.2, 2.1-2.4, 3.1-3.3, 4.1-4.3, 5.1-5.3
 */
export default async function UserProfilePage() {
  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (!user || error) {
    redirect("/auth/login");
  }

  const dashboardUser: DashboardUser = {
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

  // セッションからprovider_tokenを取得してギルド一覧を取得
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const providerToken = session?.provider_token;

  let guilds: Guild[] = [];
  let guildError: string | undefined;

  if (providerToken) {
    try {
      // Discord APIからユーザーの所属ギルドIDリストを取得
      const { getUserGuilds } = await import("@/lib/discord/client");
      const discordResult = await getUserGuilds(providerToken);

      if (discordResult.success) {
        const guildIds = discordResult.data.map((guild) => guild.id);
        if (guildIds.length > 0) {
          guilds = await getJoinedGuilds(guildIds);
        }
      } else {
        guildError = "ギルド情報の取得に失敗しました";
      }
    } catch {
      guildError = "ギルド情報の取得に失敗しました";
    }
  } else {
    guildError = "Discord連携が無効です。再ログインしてください。";
  }

  return (
    <UserProfilePageLayout
      guildError={guildError}
      guilds={guilds}
      user={dashboardUser}
    />
  );
}
