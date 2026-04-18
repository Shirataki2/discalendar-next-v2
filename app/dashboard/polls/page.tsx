import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PollCard } from "@/components/polls/poll-card";
import { getCachedGuilds } from "@/lib/guilds/cache";
import { listPolls } from "@/lib/polls/poll-service";
import type { PollRecord } from "@/lib/polls/types";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "投票一覧 | Discalendar",
};

export default async function PollsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const cached = getCachedGuilds(user.id);
  const memberGuildIds = Array.from(
    new Set(cached?.guilds.map((g) => g.guildId) ?? [])
  );

  // 所属ギルドを並列にフェッチしてレイテンシの線形悪化を避ける
  const results = await Promise.all(
    memberGuildIds.map((guildId) => listPolls(supabase, guildId))
  );

  const polls: PollRecord[] = results
    .flatMap((r) => (r.success ? r.data : []))
    .sort((a, b) => b.created_at.localeCompare(a.created_at));

  return (
    <div className="container mx-auto max-w-4xl px-4 py-6">
      <h1 className="mb-6 font-semibold text-2xl">投票一覧</h1>
      {polls.length === 0 ? (
        <p className="text-muted-foreground">
          所属するギルドに投票はまだありません。Discord で{" "}
          <code>/poll create</code> から作成できます。
        </p>
      ) : (
        <div className="grid gap-3">
          {polls.map((poll) => (
            <PollCard key={poll.id} poll={poll} />
          ))}
        </div>
      )}
    </div>
  );
}
