import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { canManageGuild } from "@/lib/discord/permissions";
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

  const canManage = matchedGuild
    ? canManageGuild(matchedGuild.permissions)
    : false;

  return (
    <PollDetailClient canManage={canManage} initialSnapshot={snapshot.data} />
  );
}
