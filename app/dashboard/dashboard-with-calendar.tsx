/**
 * DashboardWithCalendar - ダッシュボードとカレンダー統合コンポーネント
 *
 * Task 10.1: ダッシュボードページへのカレンダー統合
 * - ダッシュボードページにCalendarContainerを配置する
 * - ギルドセレクターとカレンダーを連携させる
 * - ギルド選択変更時にカレンダーを更新する
 * - 初期ロード時のデータ取得フローを確立する
 * - デスクトップ: リスト表示とアイコンのみ表示を切り替え可能
 * - モバイル: ドロップダウン形式でサーバー選択
 *
 * Requirements: 5.1, 5.2
 */
"use client";

import { Grid3x3, List } from "lucide-react";
import { useCallback, useState } from "react";
import { CalendarContainer } from "@/components/calendar/calendar-container";
import { GuildIconButton } from "@/components/guilds/guild-icon-button";
import { SelectableGuildCard } from "@/components/guilds/selectable-guild-card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Guild, GuildListError } from "@/lib/guilds/types";

/**
 * デスクトップでの表示モード
 */
type ViewMode = "list" | "icons";

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
 * エラー表示コンポーネント
 */
function ErrorDisplay({ error }: { error: GuildListError }) {
  const message = getErrorMessage(error);
  const showLoginLink =
    error.type === "token_expired" || error.type === "no_token";

  return (
    <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
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
 * 空状態表示コンポーネント
 */
function EmptyState() {
  return (
    <div className="rounded-lg border p-4 text-center">
      <p className="text-muted-foreground text-sm">
        利用可能なサーバーがありません
      </p>
    </div>
  );
}

/**
 * モバイル用ギルド選択コンポーネント
 */
function MobileGuildSelector({
  guilds,
  guildError,
  selectedGuildId,
  onGuildSelect,
}: {
  guilds: Guild[];
  guildError?: GuildListError;
  selectedGuildId: string | null;
  onGuildSelect: (guildId: string) => void;
}) {
  const hasError = guildError !== undefined;
  const hasGuilds = guilds.length > 0;

  return (
    <div className="w-full lg:hidden">
      <section className="space-y-4">
        <h3 className="font-semibold text-lg">サーバー選択</h3>

        {hasError ? <ErrorDisplay error={guildError} /> : null}
        {hasError || hasGuilds ? null : <EmptyState />}

        {!hasError && hasGuilds ? (
          <Select
            onValueChange={onGuildSelect}
            value={selectedGuildId ?? undefined}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="サーバーを選択..." />
            </SelectTrigger>
            <SelectContent>
              {guilds.map((guild) => (
                <SelectItem key={guild.guildId} value={guild.guildId}>
                  {guild.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null}
      </section>
    </div>
  );
}

/**
 * デスクトップ用ギルド一覧サイドバーコンポーネント
 */
function DesktopGuildSidebar({
  guilds,
  guildError,
  selectedGuildId,
  viewMode,
  onGuildSelect,
  onViewModeToggle,
}: {
  guilds: Guild[];
  guildError?: GuildListError;
  selectedGuildId: string | null;
  viewMode: ViewMode;
  onGuildSelect: (guildId: string) => void;
  onViewModeToggle: () => void;
}) {
  const hasError = guildError !== undefined;
  const hasGuilds = guilds.length > 0;

  return (
    <aside className="hidden w-full shrink-0 lg:block lg:w-72">
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-lg">サーバー一覧</h3>
          {!hasError && hasGuilds ? (
            <Button
              aria-label={
                viewMode === "list"
                  ? "アイコン表示に切り替え"
                  : "リスト表示に切り替え"
              }
              onClick={onViewModeToggle}
              size="sm"
              variant="ghost"
            >
              {viewMode === "list" ? (
                <Grid3x3 className="h-4 w-4" />
              ) : (
                <List className="h-4 w-4" />
              )}
            </Button>
          ) : null}
        </div>

        {hasError ? <ErrorDisplay error={guildError} /> : null}
        {hasError || hasGuilds ? null : <EmptyState />}

        {!hasError && hasGuilds && viewMode === "list" ? (
          <div className="space-y-2">
            {guilds.map((guild) => (
              <SelectableGuildCard
                guild={guild}
                isSelected={selectedGuildId === guild.guildId}
                key={guild.guildId}
                onSelect={onGuildSelect}
              />
            ))}
          </div>
        ) : null}

        {!hasError && hasGuilds && viewMode === "icons" ? (
          <div className="flex flex-wrap gap-3">
            {guilds.map((guild) => (
              <GuildIconButton
                guild={guild}
                isSelected={selectedGuildId === guild.guildId}
                key={guild.guildId}
                onSelect={onGuildSelect}
              />
            ))}
          </div>
        ) : null}
      </section>
    </aside>
  );
}

/**
 * カレンダー表示エリアコンポーネント
 */
function CalendarArea({ selectedGuildId }: { selectedGuildId: string | null }) {
  return (
    <section
      aria-label="カレンダー"
      className="flex min-h-[600px] flex-1 flex-col"
    >
      {selectedGuildId ? (
        <div className="flex flex-1 flex-col rounded-lg border">
          <CalendarContainer guildId={selectedGuildId} />
        </div>
      ) : (
        <div className="flex min-h-[500px] flex-col items-center justify-center rounded-lg border border-dashed p-8 lg:min-h-[600px]">
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
  );
}

/**
 * DashboardWithCalendar コンポーネント
 *
 * ギルド選択とカレンダー表示を統合したダッシュボードメインコンテンツ。
 * ギルドカードをクリックすることでカレンダーに表示するギルドを切り替える。
 * デスクトップではリスト/アイコン表示を切り替え可能、モバイルではドロップダウン形式。
 */
export function DashboardWithCalendar({
  guilds,
  guildError,
}: DashboardWithCalendarProps) {
  const [selectedGuildId, setSelectedGuildId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("list");

  const handleGuildSelect = useCallback((guildId: string) => {
    setSelectedGuildId(guildId);
  }, []);

  const handleViewModeToggle = useCallback(() => {
    setViewMode((prev) => (prev === "list" ? "icons" : "list"));
  }, []);

  return (
    <div className="flex flex-1 flex-col gap-8 lg:flex-row lg:gap-6">
      <MobileGuildSelector
        guildError={guildError}
        guilds={guilds}
        onGuildSelect={handleGuildSelect}
        selectedGuildId={selectedGuildId}
      />
      <DesktopGuildSidebar
        guildError={guildError}
        guilds={guilds}
        onGuildSelect={handleGuildSelect}
        onViewModeToggle={handleViewModeToggle}
        selectedGuildId={selectedGuildId}
        viewMode={viewMode}
      />
      <CalendarArea selectedGuildId={selectedGuildId} />
    </div>
  );
}
