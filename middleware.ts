import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

/**
 * Next.js Middleware
 *
 * Requirements:
 * - 4.3: セッショントークンの有効期限が近づいた時、自動的にトークンをリフレッシュする
 * - 4.4: Middlewareでセッションの更新処理を実行する
 * - 5.1: 未認証ユーザーが保護ルートにアクセス時、ログインページにリダイレクト
 * - 5.2: 認証済みユーザーがログインページにアクセス時、ダッシュボードにリダイレクト
 * - 5.3: Middlewareで全てのルーティング保護を実装する
 */
export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

/**
 * Middleware configuration
 *
 * Matches all routes except:
 * - _next/static (static files)
 * - _next/image (image optimization files)
 * - favicon.ico (favicon file)
 * - Image files (.svg, .png, .jpg, .jpeg, .gif, .webp)
 */
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
