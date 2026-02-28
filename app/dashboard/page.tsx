import { redirect } from "next/navigation";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { fetchGuilds } from "@/lib/guilds/fetch-guilds";
import type {
  Guild,
  GuildListError,
  GuildWithPermissions,
  InvitableGuild,
} from "@/lib/guilds/types";
import { createClient } from "@/lib/supabase/server";
import {
  DashboardWithCalendar,
  type GuildPermissionInfo,
} from "./dashboard-with-calendar";

// 認証状態を取得するため動的レンダリングを強制
export const dynamic = "force-dynamic";

/**
 * Dashboard用ユーザー情報の型
 */
export type DashboardUser = {
  /** ユーザーID */
  id: string;
  /** メールアドレス */
  email: string;
  /** 表示名（Discord full_name） */
  fullName: string | null;
  /** アバターURL（Discord avatar_url） */
  avatarUrl: string | null;
};

/**
 * DashboardPageLayoutのProps
 *
 * Requirements:
 * - 5.3: 取得したギルド情報をクライアントコンポーネントに渡す
 * - guild-permissions 7.2: 権限情報をクライアントに渡す
 */
export type DashboardPageLayoutProps = {
  /** 認証済みユーザー情報 */
  user: DashboardUser;
  /** ユーザーが所属するDiscalendar登録済みギルド一覧 */
  guilds: Guild[];
  /** BOT 未参加（招待対象）ギルド一覧 */
  invitableGuilds: InvitableGuild[];
  /** ギルド取得時のエラー（オプション） */
  guildError?: GuildListError;
  /** ギルドごとの権限情報マップ（guildId → 権限情報） */
  guildPermissions?: Record<string, GuildPermissionInfo>;
};

/**
 * ダッシュボードページのレイアウトコンポーネント
 *
 * 認証後のランディングページとして基本構造を提供。
 * ログアウトボタン、ユーザー情報、ギルド一覧、カレンダーを表示する。
 *
 * 要件対応:
 * - 4.2: Server/Client双方でユーザー情報を参照可能
 * - 5.1, 5.2: ギルド選択とカレンダー連携
 * - 5.3: 取得したギルド情報をクライアントコンポーネントに渡す
 */
export function DashboardPageLayout({
  user,
  guilds,
  invitableGuilds,
  guildError,
  guildPermissions,
}: DashboardPageLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col">
      <DashboardHeader user={user} />
      <main className="container mx-auto flex flex-1 flex-col px-4 py-3">
        <div className="flex flex-1 flex-col">
          {/* ギルド一覧とカレンダー統合 (Task 10.1, guild-permissions 7.2) */}
          <DashboardWithCalendar
            guildError={guildError}
            guildPermissions={guildPermissions}
            guilds={guilds}
            invitableGuilds={invitableGuilds}
          />
        </div>
      </main>
    </div>
  );
}

/**
 * ギルド権限情報マップを構築する
 *
 * GuildWithPermissions 配列から権限ビットフィールド文字列を抽出し、
 * guild_config テーブルから restricted フラグを取得して、
 * クライアントコンポーネントにシリアライズ可能な形式にまとめる。
 *
 * Requirements: guild-permissions 7.2
 */
async function buildGuildPermissions(
  guilds: GuildWithPermissions[],
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<Record<string, GuildPermissionInfo>> {
  if (guilds.length === 0) {
    return {};
  }

  // N+1 クエリを回避: 全ギルドの設定を一括取得
  const guildIds = guilds.map((guild) => guild.guildId);
  const { data, error } = await supabase
    .from("guild_config")
    .select("guild_id, restricted")
    .in("guild_id", guildIds);

  // エラー時はフェイルセーフとして restricted: false で返す
  const restrictedMap = new Map<string, boolean>();
  if (!error && data) {
    for (const row of data) {
      // Supabase の select("guild_id, restricted") は { guild_id: string, restricted: boolean } を返す
      restrictedMap.set(String(row.guild_id), Boolean(row.restricted));
    }
  }

  const permissions: Record<string, GuildPermissionInfo> = {};
  for (const guild of guilds) {
    permissions[guild.guildId] = {
      // BigInt は JSON シリアライズ不可のため文字列に変換
      permissionsBitfield: guild.permissions.raw.toString(),
      restricted: restrictedMap.get(guild.guildId) ?? false,
    };
  }

  return permissions;
}

/**
 * ダッシュボードページ（Server Component）
 *
 * 認証後のランディングページとして機能する。
 * Supabaseからユーザー情報を取得し、Client Componentに渡す。
 *
 * 要件対応:
 * - 5.1: Server Componentとしてギルド一覧データを取得する
 * - 5.2: Supabaseクライアント（Server用）を使用してDBクエリを実行する
 * - 5.3: 取得したギルド情報をクライアントコンポーネントに渡す
 * - 5.4: 未認証ユーザーをログインページへリダイレクト
 * - guild-permissions 7.2: 権限情報をクライアントに渡す
 *
 * Note: Middlewareで認証済みユーザーのみがアクセスできるよう保護されている。
 * 万が一未認証の場合はログインページへリダイレクト。
 */
export default async function DashboardPage() {
  const supabase = await createClient();

  // ユーザー情報とセッションを取得
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  // 未認証の場合はログインページへリダイレクト
  // 通常はMiddlewareで処理されるが、フォールバックとして
  if (!user || error) {
    redirect("/auth/login");
  }

  // セッションからprovider_tokenを取得
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const providerToken = session?.provider_token;

  // ユーザー情報を整形
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

  // ギルド一覧を取得（ユーザーIDをキーとしてキャッシュを使用）
  const {
    guilds,
    invitableGuilds,
    error: guildError,
  } = await fetchGuilds(user.id, providerToken);

  // guild-permissions 7.2: ギルド権限情報マップを構築
  const guildPermissions = await buildGuildPermissions(guilds, supabase);

  return (
    <DashboardPageLayout
      guildError={guildError}
      guildPermissions={guildPermissions}
      guilds={guilds}
      invitableGuilds={invitableGuilds}
      user={dashboardUser}
    />
  );
}
