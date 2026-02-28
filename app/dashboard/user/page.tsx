import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { UserGuildList } from "@/components/user/user-guild-list";
import { UserProfileCard } from "@/components/user/user-profile-card";
import { getGuildListErrorMessage } from "@/lib/guilds/error-messages";
import { fetchGuilds } from "@/lib/guilds/fetch-guilds";
import type { Guild, GuildListError } from "@/lib/guilds/types";
import { createClient } from "@/lib/supabase/server";
import { buildDashboardUser } from "@/lib/user/build-dashboard-user";
import type { DashboardUser } from "@/types/user";

// 認証状態を取得するため動的レンダリングを強制
export const dynamic = "force-dynamic";

/**
 * UserProfilePageLayoutのProps
 */
export type UserProfilePageLayoutProps = {
  user: DashboardUser;
  guilds: Guild[];
  guildError?: GuildListError;
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
    <div className="flex min-h-screen flex-col">
      <DashboardHeader user={user} />
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
              <p className="text-destructive text-sm">
                {getGuildListErrorMessage(guildError)}
              </p>
            </div>
          ) : (
            <UserGuildList guilds={guilds} />
          )}
        </div>
      </main>
    </div>
  );
}

/**
 * ユーザーページ（Server Component）
 *
 * Supabase Authからユーザー情報を取得し、fetchGuildsでギルド一覧を取得。
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

  const dashboardUser = buildDashboardUser(user);

  // セッションからprovider_tokenを取得してギルド一覧を取得
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const providerToken = session?.provider_token;

  const { guilds: guildsWithPermissions, error: guildError } =
    await fetchGuilds(user.id, providerToken);
  const guilds: Guild[] = guildsWithPermissions.map(
    ({ permissions: _permissions, ...guild }) => guild
  );

  return (
    <UserProfilePageLayout
      guildError={guildError}
      guilds={guilds}
      user={dashboardUser}
    />
  );
}
