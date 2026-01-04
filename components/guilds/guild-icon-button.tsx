/**
 * GuildIconButton - アイコンのみ表示のギルドボタンコンポーネント
 *
 * 最小化表示用のギルド選択ボタン。
 * アイコンのみを表示し、ホバー時にギルド名をツールチップで表示。
 */
"use client";

import Image from "next/image";
import { useCallback } from "react";
import { Button } from "@/components/ui/button";
import type { Guild } from "@/lib/guilds/types";
import { cn } from "@/lib/utils";

/**
 * GuildIconButtonのProps
 */
export type GuildIconButtonProps = {
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
 * GuildIconButton コンポーネント
 *
 * アイコンのみの最小化表示。クリックでギルドを選択。
 */
export function GuildIconButton({
  guild,
  isSelected,
  onSelect,
}: GuildIconButtonProps) {
  const initial = getGuildInitial(guild.name);

  const handleClick = useCallback(() => {
    onSelect(guild.guildId);
  }, [onSelect, guild.guildId]);

  return (
    <Button
      aria-label={guild.name}
      aria-pressed={isSelected}
      className={cn(
        "relative h-12 w-12 rounded-full p-0",
        "transition-transform hover:scale-110",
        isSelected ? "ring-2 ring-primary ring-offset-2" : ""
      )}
      data-selected={isSelected}
      onClick={handleClick}
      title={guild.name}
      type="button"
      variant={isSelected ? "default" : "outline"}
    >
      <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-full">
        {guild.avatarUrl ? (
          <Image
            alt={`${guild.name}のアイコン`}
            className="h-full w-full object-cover"
            height={48}
            src={guild.avatarUrl}
            width={48}
          />
        ) : (
          <span className="font-semibold text-lg">{initial}</span>
        )}
      </div>
    </Button>
  );
}
