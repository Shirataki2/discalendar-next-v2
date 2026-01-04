import Image from "next/image";
import { redirect } from "next/navigation";
import { LogoutButton } from "@/components/auth/logout-button";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { getUserGuilds } from "@/lib/discord/client";
import {
  getCachedGuilds,
  getOrSetPendingRequest,
  setCachedGuilds,
} from "@/lib/guilds/cache";
import { getJoinedGuilds } from "@/lib/guilds/service";
import type { Guild, GuildListError } from "@/lib/guilds/types";
import { createClient } from "@/lib/supabase/server";
import { DashboardWithCalendar } from "./dashboard-with-calendar";

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
 * DashboardPageClientのProps
 *
 * Requirements:
 * - 5.3: 取得したギルド情報をクライアントコンポーネントに渡す
 */
export type DashboardPageClientProps = {
  /** 認証済みユーザー情報 */
  user: DashboardUser;
  /** ユーザーが所属するDiscalendar登録済みギルド一覧 */
  guilds: Guild[];
  /** ギルド取得時のエラー（オプション） */
  guildError?: GuildListError;
};

/**
 * ユーザーのイニシャルを取得
 */
function getUserInitials(dashboardUser: DashboardUser): string {
  if (dashboardUser.fullName) {
    return dashboardUser.fullName.charAt(0).toUpperCase();
  }
  if (dashboardUser.email) {
    return dashboardUser.email.charAt(0).toUpperCase();
  }
  return "U";
}

/**
 * ダッシュボードページのClient Component
 *
 * 認証後のランディングページとして基本構造を提供。
 * ログアウトボタン、ユーザー情報、ギルド一覧、カレンダーを表示する。
 *
 * 要件対応:
 * - 4.2: Server/Client双方でユーザー情報を参照可能
 * - 5.1, 5.2: ギルド選択とカレンダー連携
 * - 5.3: 取得したギルド情報をクライアントコンポーネントに渡す
 */
export function DashboardPageClient({
  user,
  guilds,
  guildError,
}: DashboardPageClientProps) {
  const displayName = user.fullName ?? user.email;
  const initials = getUserInitials(user);

  return (
    <>
      <header className="border-b">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <a
            className="font-uni-sans-heavy text-2xl transition-colors hover:text-primary"
            href="/"
          >
            Discalendar
          </a>
          <div className="flex items-center gap-4">
            <ThemeSwitcher />
            <div className="flex items-center gap-3">
              {user.avatarUrl ? (
                <Image
                  alt={`${displayName}のアバター`}
                  className="rounded-full"
                  height={32}
                  src={user.avatarUrl}
                  width={32}
                />
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted font-medium text-sm">
                  {initials}
                </div>
              )}
              <span className="font-medium text-sm">{displayName}</span>
            </div>
            <LogoutButton />
          </div>
        </div>
      </header>
      <main className="container mx-auto px-4 py-8">
        <div className="space-y-6">
          <div className="space-y-2">
            <h2 className="font-bold text-2xl">
              ようこそ、{user.fullName ?? "ユーザー"}さん
            </h2>
            <p className="text-muted-foreground">
              Discalendarへようこそ。ここからカレンダーを管理できます。
            </p>
          </div>

          {/* ギルド一覧とカレンダー統合 (Task 10.1) */}
          <DashboardWithCalendar guildError={guildError} guilds={guilds} />
        </div>
      </main>
    </>
  );
}

/**
 * ギルド一覧を取得する（キャッシュ対応）
 *
 * Requirements:
 * - 5.1: Server Componentとしてギルド一覧データを取得する
 * - 5.2: Supabaseクライアント（Server用）を使用してDBクエリを実行する
 * - 2.1: Supabase Authに保存されたDiscordアクセストークンを使用
 * - 2.4: provider_token未取得時は再認証を促すメッセージを表示
 *
 * @param userId ユーザーID（キャッシュキーとして使用）
 * @param providerToken Discord OAuthアクセストークン
 * @returns ギルド一覧またはエラー
 */
export async function fetchGuilds(
  userId: string,
  providerToken: string | null | undefined
): Promise<{ guilds: Guild[]; error?: GuildListError }> {
  // provider_tokenが存在しない場合
  if (!providerToken) {
    return {
      guilds: [],
      error: { type: "no_token" },
    };
  }

  // キャッシュをチェック
  const cachedGuilds = getCachedGuilds(userId);
  if (cachedGuilds !== null) {
    return { guilds: cachedGuilds };
  }

  // エラー情報を保持する変数（factory関数内で設定される）
  let errorInfo: GuildListError | undefined;

  // 進行中のリクエストを取得、または新しいリクエストを設定（Atomic操作で競合状態を防ぐ）
  try {
    const result = await getOrSetPendingRequest(userId, async (requestId) => {
      // Discord APIからユーザー所属ギルドを取得
      const discordResult = await getUserGuilds(providerToken);

      if (!discordResult.success) {
        // エラー情報を保持（DiscordApiResultから直接取得）
        if (discordResult.error.code === "unauthorized") {
          errorInfo = { type: "token_expired" };
        } else {
          errorInfo = {
            type: "api_error",
            message: discordResult.error.message,
          };
        }
        // エラー時はキャッシュせずに空配列を返す
        return { guilds: [] };
      }

      // ギルドIDリストを抽出
      const guildIds = discordResult.data.map((guild) => guild.id);

      if (guildIds.length === 0) {
        const emptyGuilds: Guild[] = [];
        // 空配列もキャッシュする（リクエストIDを渡して一貫性を保つ）
        setCachedGuilds(userId, emptyGuilds, requestId);
        return { guilds: emptyGuilds };
      }

      // DB照合を実行
      try {
        const joinedGuilds = await getJoinedGuilds(guildIds);
        // 成功時のみキャッシュに保存（リクエストIDを渡して古いリクエストの結果で上書きされないようにする）
        setCachedGuilds(userId, joinedGuilds, requestId);
        return { guilds: joinedGuilds };
      } catch (dbError) {
        console.error("[Dashboard] Failed to fetch joined guilds:", dbError);
        // DBエラー情報を保持
        errorInfo = {
          type: "api_error",
          message: "ギルド情報の取得に失敗しました。",
        };
        // DBエラー時も空配列を返す
        return { guilds: [] };
      }
    });

    // エラー情報がある場合は、エラー情報と共に返す
    if (errorInfo) {
      return {
        guilds: result.guilds,
        error: errorInfo,
      };
    }

    // リクエストが成功した場合、キャッシュは既にfetchPromise内で設定されている
    return result;
  } catch (error) {
    // 予期しないエラー（DBエラーなど）を処理
    const errorMessage =
      error instanceof Error
        ? error.message
        : "ギルド情報の取得に失敗しました。";
    return {
      guilds: [],
      error: { type: "api_error", message: errorMessage },
    };
  }
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
    fullName: (user.user_metadata?.full_name as string) ?? null,
    avatarUrl: (user.user_metadata?.avatar_url as string) ?? null,
  };

  // ギルド一覧を取得（ユーザーIDをキーとしてキャッシュを使用）
  const { guilds, error: guildError } = await fetchGuilds(
    user.id,
    providerToken
  );

  return (
    <DashboardPageClient
      guildError={guildError}
      guilds={guilds}
      user={dashboardUser}
    />
  );
}
