import type { SupabaseClient } from "@supabase/supabase-js";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import {
  canManageGuild,
  type DiscordPermissions,
  parsePermissions,
} from "@/lib/discord/permissions";
import { getCachedGuilds } from "@/lib/guilds/cache";
import { getPollSnapshot } from "@/lib/polls/poll-service";
import { createClient } from "@/lib/supabase/server";
import { PollDetailClient } from "./poll-detail-client";

export const metadata: Metadata = {
  title: "投票詳細 | Discalendar",
};

type Props = {
  params: Promise<{ pollId: string }>;
};

async function fetchGuildPermissionsFromDb(
  supabase: SupabaseClient,
  userId: string,
  guildId: string
): Promise<DiscordPermissions | null> {
  const { data, error } = await supabase
    .from("user_guilds")
    .select("permissions")
    .eq("user_id", userId)
    .eq("guild_id", guildId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }
  return parsePermissions((data as { permissions: string }).permissions);
}

export default async function PollDetailPage({ params }: Props) {
  const { pollId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const cached = getCachedGuilds(user.id);
  const guilds = cached?.guilds ?? [];

  // poll の guild_id を先に引き、そこから所属判定する（RLS が非メンバーを弾く）
  const { data: pollRow } = await supabase
    .from("event_polls")
    .select("guild_id")
    .eq("id", pollId)
    .single();

  if (!pollRow?.guild_id) {
    notFound();
  }

  const matchedGuildId = String(pollRow.guild_id);
  const matchedGuild = guilds.find((g) => g.guildId === matchedGuildId);

  const snapshot = await getPollSnapshot(supabase, matchedGuildId, pollId);
  if (!snapshot.success) {
    notFound();
  }

  // キャッシュは ephemeral なため、cold instance や直接遷移時は user_guilds
  // から permissions を取得する。サーバーアクション側 (authorizeManage) でも
  // 再検証されるためセキュリティではなく UX (ボタン非表示) の問題対策。
  let permissions = matchedGuild?.permissions ?? null;
  if (permissions === null) {
    permissions = await fetchGuildPermissionsFromDb(
      supabase,
      user.id,
      matchedGuildId
    );
  }
  const canManage = permissions !== null && canManageGuild(permissions);

  return (
    <PollDetailClient canManage={canManage} initialSnapshot={snapshot.data} />
  );
}
