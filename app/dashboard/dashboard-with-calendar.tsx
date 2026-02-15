/**
 * DashboardWithCalendar - ダッシュボードとカレンダー統合コンポーネント
 *
 * Task 10.1: ダッシュボードページへのカレンダー統合
 * Task 5.1 (bot-invite-flow): Props 拡張と未参加ギルドセクションの追加
 * Task 5.2 (bot-invite-flow): useGuildRefresh の統合
 *
 * Requirements: 5.1, 5.2, bot-invite-flow 1.1, 1.2, 1.4, 4.1, 4.2, 5.1, 5.2
 */
"use client";

import { Loader2, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { CalendarContainer } from "@/components/calendar/calendar-container";
import { GuildIconButton } from "@/components/guilds/guild-icon-button";
import { GuildSettingsPanel } from "@/components/guilds/guild-settings-panel";
import { InvitableGuildCard } from "@/components/guilds/invitable-guild-card";
import { SelectableGuildCard } from "@/components/guilds/selectable-guild-card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useGuildPermissions } from "@/hooks/guilds/use-guild-permissions";
import { useGuildRefresh } from "@/hooks/guilds/use-guild-refresh";
import { useLocalStorage } from "@/hooks/use-local-storage";
import type { Guild, GuildListError, InvitableGuild } from "@/lib/guilds/types";
import { cn } from "@/lib/utils";

/** BOT 招待ベース URL（環境変数から取得） */
const BOT_INVITE_URL = process.env.NEXT_PUBLIC_BOT_INVITE_URL ?? null;

/**
 * ギルドごとの権限情報（Server Component からシリアライズ可能な形式）
 */
export type GuildPermissionInfo = {
  /** Discord 権限ビットフィールド文字列 */
  permissionsBitfield: string;
  /** guild_config の restricted フラグ */
  restricted: boolean;
};

/**
 * DashboardWithCalendarのProps
 */
export type DashboardWithCalendarProps = {
  /** ユーザーが所属するギルド一覧 */
  guilds: Guild[];
  /** BOT 未参加（招待対象）ギルド一覧 */
  invitableGuilds?: InvitableGuild[];
  /** ギルド取得時のエラー（オプション） */
  guildError?: GuildListError;
  /** ギルドごとの権限情報マップ（guildId → 権限情報） */
  guildPermissions?: Record<string, GuildPermissionInfo>;
};

/**
 * ギルド名のアルファベット順でソートする
 */
function sortByName<T extends { name: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => a.name.localeCompare(b.name));
}

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
 * BOT 未参加ギルドセクション（デスクトップ展開時用）
 */
function InvitableGuildSection({
  invitableGuilds,
}: {
  invitableGuilds: InvitableGuild[];
}) {
  if (invitableGuilds.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      <h4 className="font-medium text-muted-foreground text-xs">
        BOT 未参加サーバー
      </h4>
      {invitableGuilds.map((guild) => (
        <InvitableGuildCard
          botInviteUrl={BOT_INVITE_URL}
          guild={guild}
          key={guild.guildId}
        />
      ))}
    </div>
  );
}

/**
 * モバイル用ギルド選択コンポーネント
 */
function MobileGuildSelector({
  guilds,
  invitableGuilds,
  guildError,
  selectedGuildId,
  onGuildSelect,
}: {
  guilds: Guild[];
  invitableGuilds: InvitableGuild[];
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

        {/* bot-invite-flow: モバイル用未参加ギルドセクション */}
        <InvitableGuildSection invitableGuilds={invitableGuilds} />
      </section>
    </div>
  );
}

/**
 * サイドバーヘッダー（トグルボタン + タイトル）
 */
function SidebarHeader({
  isCollapsed,
  hasError,
  onToggleCollapse,
}: {
  isCollapsed: boolean;
  hasError: boolean;
  onToggleCollapse: () => void;
}) {
  return (
    <div
      className={cn(
        "flex items-center",
        isCollapsed ? "justify-center" : "justify-between"
      )}
    >
      {isCollapsed ? null : (
        <h3 className="font-semibold text-lg">サーバー一覧</h3>
      )}
      <Button
        aria-expanded={!isCollapsed}
        aria-label={isCollapsed ? "サイドバーを展開" : "サイドバーを折りたたむ"}
        className="relative"
        onClick={onToggleCollapse}
        size="sm"
        variant="ghost"
      >
        {isCollapsed ? (
          <PanelLeftOpen className="h-4 w-4" />
        ) : (
          <PanelLeftClose className="h-4 w-4" />
        )}
        {isCollapsed === true && hasError ? (
          <span className="absolute top-0 right-0 h-2 w-2 rounded-full bg-destructive" />
        ) : null}
      </Button>
    </div>
  );
}

/**
 * デスクトップ用ギルド一覧サイドバーコンポーネント
 */
function DesktopGuildSidebar({
  guilds,
  invitableGuilds,
  guildError,
  selectedGuildId,
  isCollapsed,
  isRefreshing,
  onGuildSelect,
  onToggleCollapse,
}: {
  guilds: Guild[];
  invitableGuilds: InvitableGuild[];
  guildError?: GuildListError;
  selectedGuildId: string | null;
  isCollapsed: boolean;
  isRefreshing: boolean;
  onGuildSelect: (guildId: string) => void;
  onToggleCollapse: () => void;
}) {
  const hasError = guildError !== undefined;
  const hasGuilds = guilds.length > 0;

  return (
    <aside
      className={cn(
        "hidden shrink-0 overflow-hidden lg:block",
        "transition-[width] duration-300 ease-in-out",
        isCollapsed ? "w-16" : "w-72"
      )}
    >
      <section className="space-y-4">
        <SidebarHeader
          hasError={hasError}
          isCollapsed={isCollapsed}
          onToggleCollapse={onToggleCollapse}
        />

        {isCollapsed ? null : (
          <>
            {hasError ? <ErrorDisplay error={guildError} /> : null}
            {hasError || hasGuilds ? null : <EmptyState />}
          </>
        )}

        {!hasError && hasGuilds && isCollapsed ? (
          <div className="flex flex-col items-center gap-3">
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

        {!hasError && hasGuilds && !isCollapsed ? (
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

        {/* bot-invite-flow: デスクトップ用未参加ギルドセクション */}
        {isCollapsed ? null : (
          <InvitableGuildSection invitableGuilds={invitableGuilds} />
        )}

        {/* bot-invite-flow: 再取得中ローディング */}
        {isRefreshing ? (
          <div className="flex items-center justify-center gap-2 py-2 text-muted-foreground text-xs">
            <Loader2 className="h-3 w-3 animate-spin" />
            <span>更新中...</span>
          </div>
        ) : null}
      </section>
    </aside>
  );
}

/**
 * カレンダー表示エリアコンポーネント
 */
function CalendarArea({
  selectedGuildId,
  canEditEvents,
}: {
  selectedGuildId: string | null;
  canEditEvents: boolean;
}) {
  return (
    <section
      aria-label="カレンダー"
      className="flex min-h-[600px] flex-1 flex-col"
    >
      {selectedGuildId ? (
        <div className="flex flex-1 flex-col rounded-lg border">
          <CalendarContainer
            canEditEvents={canEditEvents}
            guildId={selectedGuildId}
          />
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
 * デスクトップではサイドバーの折りたたみ/展開が可能、モバイルではドロップダウン形式。
 *
 * bot-invite-flow Task 5.1:
 * - invitableGuilds を受け取り、未参加ギルドセクションを表示
 * - 参加済みギルド → 未参加ギルドの順で表示
 * - 各グループ内はギルド名のアルファベット順
 *
 * bot-invite-flow Task 5.2:
 * - useGuildRefresh で招待後の状態更新に対応
 */
export function DashboardWithCalendar({
  guilds: initialGuilds,
  invitableGuilds: initialInvitableGuilds,
  guildError,
  guildPermissions: initialGuildPermissions,
}: DashboardWithCalendarProps) {
  const [selectedGuildId, setSelectedGuildId] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useLocalStorage<boolean>(
    "discalendar:sidebar-collapsed",
    false
  );

  // bot-invite-flow 5.2: リフレッシュ可能な状態管理
  const [currentGuilds, setCurrentGuilds] = useState(initialGuilds);
  const [currentInvitableGuilds, setCurrentInvitableGuilds] = useState(
    initialInvitableGuilds ?? []
  );
  const [currentGuildPermissions, setCurrentGuildPermissions] = useState(
    initialGuildPermissions
  );

  // Req 4.1, 4.2: ソート済みギルド（参加済みが先、各グループ内アルファベット順）
  const sortedGuilds = useMemo(
    () => sortByName(currentGuilds),
    [currentGuilds]
  );
  const sortedInvitableGuilds = useMemo(
    () => sortByName(currentInvitableGuilds),
    [currentInvitableGuilds]
  );

  // bot-invite-flow 5.2: タブ復帰時のギルド再取得
  const handleGuildRefresh = useCallback(
    (result: {
      guilds: Guild[];
      invitableGuilds: InvitableGuild[];
      guildPermissions: Record<string, GuildPermissionInfo>;
    }) => {
      setCurrentGuilds(result.guilds);
      setCurrentInvitableGuilds(result.invitableGuilds);
      setCurrentGuildPermissions(result.guildPermissions);
    },
    []
  );

  const { isRefreshing } = useGuildRefresh({
    onRefresh: handleGuildRefresh,
    enabled: currentInvitableGuilds.length > 0,
  });

  // 選択中ギルドの権限情報を取得
  const selectedPermInfo = selectedGuildId
    ? currentGuildPermissions?.[selectedGuildId]
    : undefined;

  // guild-permissions: 権限状態を計算
  const {
    canManageGuild,
    canEditEvents,
    isLoading: permissionsLoading,
  } = useGuildPermissions(
    selectedGuildId,
    selectedPermInfo?.permissionsBitfield ?? null,
    selectedPermInfo?.restricted ?? false
  );

  const handleGuildSelect = useCallback((guildId: string) => {
    setSelectedGuildId(guildId);
  }, []);

  const handleToggleCollapse = useCallback(() => {
    setSidebarCollapsed((prev) => !prev);
  }, [setSidebarCollapsed]);

  // Req 5.5: ローディング中は操作を無効化
  const effectiveCanEdit = permissionsLoading ? false : canEditEvents;

  return (
    <div className="flex flex-1 flex-col gap-8 lg:flex-row lg:gap-6">
      <MobileGuildSelector
        guildError={guildError}
        guilds={sortedGuilds}
        invitableGuilds={sortedInvitableGuilds}
        onGuildSelect={handleGuildSelect}
        selectedGuildId={selectedGuildId}
      />
      <DesktopGuildSidebar
        guildError={guildError}
        guilds={sortedGuilds}
        invitableGuilds={sortedInvitableGuilds}
        isCollapsed={sidebarCollapsed}
        isRefreshing={isRefreshing}
        onGuildSelect={handleGuildSelect}
        onToggleCollapse={handleToggleCollapse}
        selectedGuildId={selectedGuildId}
      />
      <div className="flex flex-1 flex-col gap-4">
        {/* Req 5.3: 管理権限のあるユーザーにのみ設定パネルを表示 */}
        {selectedGuildId !== null && canManageGuild && selectedPermInfo ? (
          <GuildSettingsPanel
            guildId={selectedGuildId}
            restricted={selectedPermInfo.restricted}
          />
        ) : null}
        <CalendarArea
          canEditEvents={effectiveCanEdit}
          selectedGuildId={selectedGuildId}
        />
      </div>
    </div>
  );
}
