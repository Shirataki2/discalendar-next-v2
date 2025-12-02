import Image from "next/image";
import { redirect } from "next/navigation";
import { LogoutButton } from "@/components/auth/logout-button";
import { createClient } from "@/lib/supabase/server";

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
 */
export type DashboardPageClientProps = {
  /** 認証済みユーザー情報 */
  user: DashboardUser;
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
 * ログアウトボタンとユーザー情報を表示する。
 *
 * 要件対応:
 * - 4.2: Server/Client双方でユーザー情報を参照可能
 */
export function DashboardPageClient({ user }: DashboardPageClientProps) {
  const displayName = user.fullName ?? user.email;
  const initials = getUserInitials(user);

  return (
    <>
      <header className="border-b">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <h1 className="font-bold text-xl">Discalendar</h1>
          <div className="flex items-center gap-4">
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
          <div className="rounded-lg border p-6">
            <p className="text-muted-foreground text-sm">
              カレンダー機能は現在開発中です。しばらくお待ちください。
            </p>
          </div>
        </div>
      </main>
    </>
  );
}

/**
 * ダッシュボードページ（Server Component）
 *
 * 認証後のランディングページとして機能する。
 * Supabaseからユーザー情報を取得し、Client Componentに渡す。
 *
 * 要件対応:
 * - 4.2: Server ComponentsとClient Componentsでユーザー情報を参照可能
 *
 * Note: Middlewareで認証済みユーザーのみがアクセスできるよう保護されている。
 * 万が一未認証の場合はログインページへリダイレクト。
 */
export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  // 未認証の場合はログインページへリダイレクト
  // 通常はMiddlewareで処理されるが、フォールバックとして
  if (!user || error) {
    redirect("/auth/login");
  }

  // ユーザー情報を整形
  const dashboardUser: DashboardUser = {
    id: user.id,
    email: user.email ?? "",
    fullName: (user.user_metadata?.full_name as string) ?? null,
    avatarUrl: (user.user_metadata?.avatar_url as string) ?? null,
  };

  return <DashboardPageClient user={dashboardUser} />;
}
