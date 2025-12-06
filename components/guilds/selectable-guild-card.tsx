/**
 * SelectableGuildCard - 選択可能なギルドカードコンポーネント
 *
 * Task 10.1: ダッシュボードページへのカレンダー統合
 * - ギルドカードをクリックしてカレンダーのギルドを選択する
 * - 選択中のギルドを視覚的にハイライトする
 *
 * Requirements: 5.2 (ギルド選択連携)
 */
"use client";

import Image from "next/image";
import { useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import type { Guild } from "@/lib/guilds/types";
import { cn } from "@/lib/utils";

/**
 * SelectableGuildCardのProps
 */
export type SelectableGuildCardProps = {
  /** 表示するギルド情報 */
  guild: Guild;
  /** 選択状態 */
  isSelected: boolean;
  /** 選択時のコールバック */
  onSelect: (guildId: string) => void;
};

/**
 * ギルド名から先頭文字（イニシャル）を取得する
 */
function getGuildInitial(name: string): string {
  if (!name || name.length === 0) {
    return "?";
  }
  return name.charAt(0).toUpperCase();
}

/**
 * SelectableGuildCard コンポーネント
 *
 * クリック可能なギルドカード。選択状態を視覚的に表示し、
 * クリックやキーボード操作でギルドを選択できる。
 */
export function SelectableGuildCard({
  guild,
  isSelected,
  onSelect,
}: SelectableGuildCardProps) {
  const initial = getGuildInitial(guild.name);

  const handleClick = useCallback(() => {
    onSelect(guild.guildId);
  }, [onSelect, guild.guildId]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        onSelect(guild.guildId);
      }
    },
    [onSelect, guild.guildId]
  );

  const selectedClass = isSelected ? "border-primary bg-accent" : "";

  return (
    <Card
      aria-pressed={isSelected}
      className={cn(
        "cursor-pointer overflow-hidden transition-colors",
        "hover:bg-accent/50",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        selectedClass
      )}
      data-selected={isSelected}
      data-testid="guild-card"
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
    >
      <CardContent className="flex items-center gap-4 p-4">
        {/* アイコン表示エリア */}
        <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted">
          {guild.avatarUrl ? (
            <Image
              alt={`${guild.name}のアイコン`}
              className="h-full w-full object-cover"
              height={40}
              src={guild.avatarUrl}
              width={40}
            />
          ) : (
            <span className="font-semibold text-muted-foreground">
              {initial}
            </span>
          )}
        </div>

        {/* ギルド名 */}
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-sm">{guild.name}</p>
        </div>

        {/* 選択インジケーター */}
        {isSelected ? (
          <div className="h-2 w-2 shrink-0 rounded-full bg-primary" />
        ) : null}
      </CardContent>
    </Card>
  );
}
