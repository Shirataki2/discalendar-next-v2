/**
 * Dashboard用ユーザー情報の型
 *
 * Supabase Auth の user_metadata から抽出した表示用情報。
 * Server Component / Client Component 双方で使用可能。
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
