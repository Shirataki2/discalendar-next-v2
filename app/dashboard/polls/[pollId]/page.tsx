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

  // 全ギルドを対象にスナップショット取得を試みる（RLS が非メンバーを弾く）
  let snapshot: Awaited<ReturnType<typeof getPollSnapshot>> | null = null;
  let matchedGuildId: string | null = null;
  for (const g of guilds) {
    const result = await getPollSnapshot(supabase, g.guildId, pollId);
    if (result.success) {
      snapshot = result;
      matchedGuildId = g.guildId;
      break;
    }
  }

  if (!snapshot?.success) {
    notFound();
  }

  const matchedGuild = guilds.find((g) => g.guildId === matchedGuildId);
  const canManage = matchedGuild
    ? canManageGuild(matchedGuild.permissions)
    : false;

  return (
    <PollDetailClient canManage={canManage} initialSnapshot={snapshot.data} />
  );
}
