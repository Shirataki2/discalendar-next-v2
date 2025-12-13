import { createBrowserClient } from "@supabase/ssr";

/**
 * ブラウザ用Supabaseクライアントを作成
 *
 * @supabase/ssrのcreateBrowserClientは自動的にdocument.cookieからセッションを読み込みます。
 * Next.jsのApp Routerでは、Middleware（proxy.ts）でセッションが更新されることを前提としています。
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}
