/**
 * InvitableGuildCard - BOT 未参加ギルドのカードコンポーネント
 *
 * BOT 未参加ギルドを表示し、招待ボタンを提供する。
 * 既存の SelectableGuildCard のレイアウトに準拠。
 *
 * Requirements: bot-invite-flow 1.3, 2.1, 2.2, 2.3, 2.4
 */
"use client";

import { ExternalLink } from "lucide-react";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { InvitableGuild } from "@/lib/guilds/types";

export type InvitableGuildCardProps = {
  /** 招待対象ギルド情報 */
  guild: InvitableGuild;
  /** BOT 招待ベース URL（環境変数から取得） */
  botInviteUrl: string | null;
};

function getGuildInitial(name: string): string {
  if (!name || name.length === 0) {
    return "?";
  }
  return name.charAt(0).toUpperCase();
}

function buildInviteUrl(baseUrl: string, guildId: string): string {
  return `${baseUrl}&guild_id=${guildId}`;
}

export function InvitableGuildCard({
  guild,
  botInviteUrl,
}: InvitableGuildCardProps) {
  const initial = getGuildInitial(guild.name);

  return (
    <Card
      className="overflow-hidden border-dashed"
      data-testid="invitable-guild-card"
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

        {/* ギルド名 + バッジ */}
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-sm">{guild.name}</p>
          <Badge className="mt-1 whitespace-nowrap" variant="outline">
            BOT 未参加
          </Badge>
        </div>

        {/* 招待ボタン */}
        {botInviteUrl ? (
          <a
            className="inline-flex shrink-0 items-center gap-1 rounded-md bg-primary px-3 py-1.5 font-medium text-primary-foreground text-xs transition-colors hover:bg-primary/90"
            href={buildInviteUrl(botInviteUrl, guild.guildId)}
            rel="noopener noreferrer"
            target="_blank"
          >
            招待
            <ExternalLink className="h-3 w-3" />
          </a>
        ) : null}
      </CardContent>
    </Card>
  );
}
