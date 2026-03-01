"use client";

/**
 * GuildSettingsForm - ギルド設定フォームのメインクライアントコンポーネント
 *
 * ギルド情報ヘッダーと設定セクション群を表示する。
 * ギルド情報（名前・アイコン）は読み取り専用。
 * 各設定セクションは SettingsSection ラッパーで区切る。
 *
 * Requirements: 2.1, 2.2, 2.3, 2.4, 4.2, 5.4, 6.1, 6.2, 6.3
 */

import { ArrowLeft } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { GuildSettingsPanel } from "@/components/guilds/guild-settings-panel";
import { SettingsSection } from "@/components/guilds/settings-section";

export type GuildSettingsFormProps = {
  guild: {
    guildId: string;
    name: string;
    avatarUrl: string | null;
  };
  restricted: boolean;
};

function getGuildInitial(name: string): string {
  if (!name) {
    return "?";
  }
  return name.charAt(0).toUpperCase();
}

export function GuildSettingsForm({
  guild,
  restricted,
}: GuildSettingsFormProps) {
  return (
    <div className="mx-auto w-full max-w-2xl space-y-6">
      {/* カレンダーに戻るリンク */}
      <Link
        className="inline-flex items-center gap-1.5 text-muted-foreground text-sm hover:text-foreground"
        href={`/dashboard?guild=${guild.guildId}`}
      >
        <ArrowLeft className="h-4 w-4" />
        カレンダーに戻る
      </Link>

      {/* ギルド情報ヘッダー（読み取り専用） */}
      <div className="flex items-center gap-4">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted">
          {guild.avatarUrl ? (
            <Image
              alt={`${guild.name}のアイコン`}
              className="h-full w-full object-cover"
              height={64}
              src={guild.avatarUrl}
              width={64}
            />
          ) : (
            <span className="font-semibold text-2xl text-muted-foreground">
              {getGuildInitial(guild.name)}
            </span>
          )}
        </div>
        <h1 className="font-bold text-2xl">{guild.name}</h1>
      </div>

      {/* 権限設定セクション */}
      <SettingsSection
        description="イベント編集の制限を管理します。"
        title="権限設定"
      >
        <GuildSettingsPanel guildId={guild.guildId} restricted={restricted} />
      </SettingsSection>
    </div>
  );
}
