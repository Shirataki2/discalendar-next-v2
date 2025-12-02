"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * ログアウトServer Action
 *
 * サーバー側でSupabaseセッションを破棄し、ログインページへリダイレクトする。
 *
 * 要件対応:
 * - 6.1: Supabaseセッションを破棄する
 * - 6.2: ログアウト完了後、ログインページにリダイレクトする
 * - 7.4: エラーをコンソールに記録する
 */
export async function signOut(): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase.auth.signOut();

  if (error) {
    console.error("[Auth Error] signOut failed:", error.message);
  }

  redirect("/auth/login");
}
