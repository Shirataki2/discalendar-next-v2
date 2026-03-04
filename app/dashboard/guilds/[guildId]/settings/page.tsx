import { redirect } from "next/navigation";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { GuildSettingsForm } from "@/components/guilds/guild-settings-form";
import { canManageGuild } from "@/lib/discord/permissions";
import { createEventSettingsService } from "@/lib/guilds/event-settings-service";
import { fetchGuilds } from "@/lib/guilds/fetch-guilds";
import { createGuildConfigService } from "@/lib/guilds/guild-config-service";
import { createClient } from "@/lib/supabase/server";
import { buildDashboardUser } from "@/lib/user/build-dashboard-user";

// 認証状態を取得するため動的レンダリングを強制
export const dynamic = "force-dynamic";

/**
 * ギルド設定ページ（Server Component）
 *
 * 認証・権限チェック後にギルド設定フォームを表示する。
 * dashboard/page.tsx と同一の認証パターンを採用。
 *
 * Requirements: 1.1, 1.2, 1.3, 1.4, 2.3 (データ統合)
 */
export default async function GuildSettingsPage({
  params,
}: {
  params: Promise<{ guildId: string }>;
}) {
  const { guildId } = await params;
  const supabase = await createClient();

  // 認証チェック: 未認証なら /auth/login にリダイレクト (Req 1.2)
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (!user || error) {
    redirect("/auth/login");
  }

  // セッションからprovider_tokenを取得
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const providerToken = session?.provider_token;

  // ギルド一覧を取得
  const { guilds } = await fetchGuilds(user.id, providerToken);

  // ギルド存在確認: guildId が一覧に無い場合 /dashboard にリダイレクト (Req 1.4)
  const targetGuild = guilds.find((g) => g.guildId === guildId);
  if (!targetGuild) {
    redirect("/dashboard");
  }

  // 権限チェック: canManageGuild を持たない場合 /dashboard にリダイレクト (Req 1.3)
  if (!canManageGuild(targetGuild.permissions)) {
    redirect("/dashboard");
  }

  // ギルド設定取得
  const guildConfigService = createGuildConfigService(supabase);
  const configResult = await guildConfigService.getGuildConfig(guildId);

  if (!configResult.success) {
    redirect("/dashboard");
  }

  // イベント設定（通知チャンネル）取得
  const eventSettingsService = createEventSettingsService(supabase);
  const eventSettingsResult =
    await eventSettingsService.getEventSettings(guildId);
  const currentChannelId = eventSettingsResult.success
    ? (eventSettingsResult.data?.channelId ?? null)
    : null;

  // ユーザー情報を整形
  const dashboardUser = buildDashboardUser(user);

  return (
    <div className="flex min-h-screen flex-col">
      <DashboardHeader user={dashboardUser} />
      <main className="container mx-auto flex flex-1 flex-col px-4 py-6">
        <GuildSettingsForm
          currentChannelId={currentChannelId}
          guild={{
            guildId: targetGuild.guildId,
            name: targetGuild.name,
            avatarUrl: targetGuild.avatarUrl,
          }}
          restricted={configResult.data.restricted}
        />
      </main>
    </div>
  );
}
