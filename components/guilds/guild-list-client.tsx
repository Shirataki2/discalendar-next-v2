"use client";

/**
 * GuildListClient コンポーネント
 *
 * ギルド一覧のUI表示とローディング・エラー状態管理を担当するClient Component。
 *
 * Requirements:
 * - 4.1: ギルドの一覧をカード形式で表示する
 * - 4.4: ユーザーが所属するDiscalendar登録済みギルドが存在しない場合、
 *        「利用可能なサーバーがありません」というメッセージを表示する
 * - 4.5: ギルド一覧を取得中、ローディングインジケーターを表示する（Suspense対応）
 *
 * Dependencies:
 * - GuildCard - 単一ギルド表示
 */

import { GuildCard } from "@/components/guilds/guild-card";
import type { Guild, GuildListError } from "@/lib/guilds/types";

/**
 * GuildListClientコンポーネントのProps
 */
export type GuildListClientProps = {
  /** 表示するギルド一覧 */
  guilds: Guild[];
  /** エラー状態（オプション） */
  error?: GuildListError;
};

/**
 * エラーメッセージを取得する
 *
 * @param error エラー情報
 * @returns 表示用エラーメッセージ
 */
function getErrorMessage(error: GuildListError): string {
  switch (error.type) {
    case "api_error":
      return error.message;
    case "token_expired":
      return "セッションの有効期限が切れました。再度ログインしてください。";
    case "no_token":
      return "Discord連携が無効です。再度ログインしてください。";
    default: {
      // 型安全性のための exhaustive check
      const _exhaustiveCheck: never = error;
      return _exhaustiveCheck;
    }
  }
}

/**
 * エラーコンポーネント
 */
function ErrorDisplay({ error }: { error: GuildListError }) {
  const message = getErrorMessage(error);
  const showLoginLink =
    error.type === "token_expired" || error.type === "no_token";

  return (
    <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6">
      <p className="text-destructive text-sm">{message}</p>
      {showLoginLink ? (
        <a
          className="mt-2 inline-block text-primary text-sm underline hover:text-primary/80"
          href="/auth/login"
        >
          ログインページへ
        </a>
      ) : null}
    </div>
  );
}

/**
 * 空状態コンポーネント
 */
function EmptyState() {
  return (
    <div className="rounded-lg border p-6 text-center">
      <p className="text-muted-foreground text-sm">
        利用可能なサーバーがありません
      </p>
      <p className="mt-2 text-muted-foreground text-xs">
        DiscalendarにBot導入済みのサーバーに参加すると、ここに表示されます。
      </p>
    </div>
  );
}

/**
 * GuildListClient コンポーネント
 *
 * ギルド配列をグリッドレイアウトでカード形式表示。
 * エラー状態や空状態の表示も担当。
 */
export function GuildListClient({ guilds, error }: GuildListClientProps) {
  const hasError = error !== undefined;
  const hasGuilds = guilds.length > 0;

  return (
    <section className="space-y-4">
      <h3 className="font-semibold text-lg">参加中のサーバー</h3>

      {/* エラー表示 */}
      {hasError ? <ErrorDisplay error={error} /> : null}

      {/* 空状態表示 */}
      {hasError || hasGuilds ? null : <EmptyState />}

      {/* ギルド一覧グリッド */}
      {!hasError && hasGuilds ? (
        <div
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
          data-testid="guild-list-grid"
        >
          {guilds.map((guild) => (
            <GuildCard guild={guild} key={guild.guildId} />
          ))}
        </div>
      ) : null}
    </section>
  );
}
