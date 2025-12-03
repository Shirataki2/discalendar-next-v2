"use client";

/**
 * GuildCard コンポーネント
 *
 * 単一ギルドの視覚的表示を担当するClient Component。
 *
 * Requirements:
 * - 4.2: 各ギルドカードにギルド名とアイコン画像を表示する
 * - 4.3: ギルドにアイコンが設定されていない場合、ギルド名のイニシャルをフォールバックとして表示する
 *
 * Dependencies:
 * - shadcn/ui Card - UIプリミティブ
 * - Next.js Image - 画像最適化
 */

import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import type { Guild } from "@/lib/guilds/types";

/**
 * GuildCardコンポーネントのProps
 */
export type GuildCardProps = {
  /** 表示するギルド情報 */
  guild: Guild;
};

/**
 * ギルド名から先頭文字（イニシャル）を取得する
 *
 * @param name ギルド名
 * @returns 先頭1文字（大文字）
 */
function getGuildInitial(name: string): string {
  if (!name || name.length === 0) {
    return "?";
  }
  return name.charAt(0).toUpperCase();
}

/**
 * GuildCard コンポーネント
 *
 * ギルド名とアイコン画像を表示するカードUIを提供。
 * アイコン未設定時はギルド名のイニシャルをフォールバック表示。
 */
export function GuildCard({ guild }: GuildCardProps) {
  const initial = getGuildInitial(guild.name);

  return (
    <Card className="overflow-hidden" data-testid="guild-card">
      <CardContent className="flex items-center gap-4 p-4">
        {/* アイコン表示エリア */}
        <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted">
          {guild.avatarUrl ? (
            <Image
              alt={`${guild.name}のアイコン`}
              className="h-full w-full object-cover"
              height={48}
              src={guild.avatarUrl}
              width={48}
            />
          ) : (
            <span className="font-semibold text-lg text-muted-foreground">
              {initial}
            </span>
          )}
        </div>

        {/* ギルド名 */}
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-sm">{guild.name}</p>
        </div>
      </CardContent>
    </Card>
  );
}
