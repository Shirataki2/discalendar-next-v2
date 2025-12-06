/**
 * DashboardWithCalendar - ダッシュボードとカレンダー統合コンポーネント
 *
 * Task 10.1: ダッシュボードページへのカレンダー統合
 * - ダッシュボードページにCalendarContainerを配置する
 * - ギルドセレクターとカレンダーを連携させる
 * - ギルド選択変更時にカレンダーを更新する
 * - 初期ロード時のデータ取得フローを確立する
 *
 * Requirements: 5.1, 5.2
 */
"use client";

import { useCallback, useState } from "react";
import { CalendarContainer } from "@/components/calendar/calendar-container";
import { SelectableGuildCard } from "@/components/guilds/selectable-guild-card";
import type { Guild, GuildListError } from "@/lib/guilds/types";

/**
 * DashboardWithCalendarのProps
 */
export type DashboardWithCalendarProps = {
  /** ユーザーが所属するギルド一覧 */
  guilds: Guild[];
  /** ギルド取得時のエラー（オプション） */
  guildError?: GuildListError;
};

/**
 * エラーメッセージを取得する
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
      const _exhaustiveCheck: never = error;
      return _exhaustiveCheck;
    }
  }
}

/**
 * DashboardWithCalendar コンポーネント
 *
 * ギルド選択とカレンダー表示を統合したダッシュボードメインコンテンツ。
 * ギルドカードをクリックすることでカレンダーに表示するギルドを切り替える。
 */
export function DashboardWithCalendar({
  guilds,
  guildError,
}: DashboardWithCalendarProps) {
  const [selectedGuildId, setSelectedGuildId] = useState<string | null>(null);

  const handleGuildSelect = useCallback((guildId: string) => {
    setSelectedGuildId(guildId);
  }, []);

  const hasError = guildError !== undefined;
  const hasGuilds = guilds.length > 0;

  return (
    <div className="flex flex-col gap-8 lg:flex-row lg:gap-6">
      {/* 左サイドバー: ギルド一覧 */}
      <aside className="w-full shrink-0 lg:w-72">
        <section className="space-y-4">
          <h3 className="font-semibold text-lg">サーバー一覧</h3>

          {/* エラー表示 */}
          {hasError ? (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
              <p className="text-destructive text-sm">
                {getErrorMessage(guildError)}
              </p>
              {(guildError.type === "token_expired" ||
                guildError.type === "no_token") && (
                <a
                  className="mt-2 inline-block text-primary text-sm underline hover:text-primary/80"
                  href="/auth/login"
                >
                  ログインページへ
                </a>
              )}
            </div>
          ) : null}

          {/* 空状態表示 */}
          {hasError || hasGuilds ? null : (
            <div className="rounded-lg border p-4 text-center">
              <p className="text-muted-foreground text-sm">
                利用可能なサーバーがありません
              </p>
            </div>
          )}

          {/* ギルド一覧 */}
          {!hasError && hasGuilds ? (
            <div className="space-y-2">
              {guilds.map((guild) => (
                <SelectableGuildCard
                  guild={guild}
                  isSelected={selectedGuildId === guild.guildId}
                  key={guild.guildId}
                  onSelect={handleGuildSelect}
                />
              ))}
            </div>
          ) : null}
        </section>
      </aside>

      {/* カレンダーエリア */}
      <section aria-label="カレンダー" className="min-h-[600px] flex-1">
        {/* ギルド未選択時のプロンプト */}
        {selectedGuildId ? (
          <div className="h-full rounded-lg border">
            <CalendarContainer guildId={selectedGuildId} />
          </div>
        ) : (
          <div className="flex h-full flex-col items-center justify-center rounded-lg border border-dashed p-8">
            <div className="text-center">
              <p className="text-muted-foreground">
                サーバーを選択してカレンダーを表示
              </p>
              <p className="mt-2 text-muted-foreground text-sm">
                左のサーバー一覧からサーバーを選択してください
              </p>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
