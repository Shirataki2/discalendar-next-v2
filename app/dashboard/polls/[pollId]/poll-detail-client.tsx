"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  closePollAction,
  finalizePollAction,
} from "@/app/dashboard/polls/actions";
import { PollFinalizeModal } from "@/components/polls/poll-finalize-modal";
import { PollOptionRow } from "@/components/polls/poll-option-row";
import { Button } from "@/components/ui/button";
import { usePollRealtime } from "@/hooks/polls/use-poll-realtime";
import { getPollSnapshot } from "@/lib/polls/poll-service";
import type { PollOptionRecord, PollSnapshot } from "@/lib/polls/types";
import { createClient as createSupabaseBrowserClient } from "@/lib/supabase/client";

export type PollDetailClientProps = {
  initialSnapshot: PollSnapshot;
  canManage: boolean;
};

export function PollDetailClient({
  initialSnapshot,
  canManage,
}: PollDetailClientProps) {
  const router = useRouter();
  const client = useMemo(() => createSupabaseBrowserClient(), []);

  const { snapshot, isLive } = usePollRealtime({
    client,
    guildId: initialSnapshot.poll.guild_id,
    pollId: initialSnapshot.poll.id,
    initialSnapshot,
    fetchSnapshot: async () => {
      const result = await getPollSnapshot(
        client,
        initialSnapshot.poll.guild_id,
        initialSnapshot.poll.id
      );
      return result.success ? result.data : null;
    },
  });

  const [busy, setBusy] = useState(false);
  const [tieCandidates, setTieCandidates] = useState<PollOptionRecord[] | null>(
    null
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isFinalized = snapshot.poll.status === "finalized";
  const isClosed = snapshot.poll.status !== "open";

  const handleClose = async () => {
    setBusy(true);
    setErrorMessage(null);
    try {
      const result = await closePollAction({
        pollId: snapshot.poll.id,
        guildId: snapshot.poll.guild_id,
      });
      if (result.success) {
        router.refresh();
      } else {
        setErrorMessage(result.error.message);
      }
    } finally {
      setBusy(false);
    }
  };

  const handleFinalize = async (optionId: string | null = null) => {
    setBusy(true);
    setErrorMessage(null);
    try {
      const result = await finalizePollAction({
        pollId: snapshot.poll.id,
        guildId: snapshot.poll.guild_id,
        optionId,
      });
      if (!result.success) {
        const err = result.error;
        if (err.code === "TIE_BREAK_REQUIRED") {
          const candidateOptions = snapshot.options.filter((o) =>
            err.candidateOptionIds.includes(o.id)
          );
          setTieCandidates(candidateOptions);
          return;
        }
        setErrorMessage(err.message);
        return;
      }
      router.push(`/dashboard?event=${result.data.eventId}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="container mx-auto max-w-3xl px-4 py-6">
      <header className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="font-semibold text-2xl">{snapshot.poll.title}</h1>
          {snapshot.poll.description ? (
            <p className="mt-1 text-muted-foreground text-sm">
              {snapshot.poll.description}
            </p>
          ) : null}
        </div>
        <span className="text-muted-foreground text-xs">
          {isLive ? "Live" : "Polling"}
        </span>
      </header>

      <div className="grid gap-3">
        {snapshot.options.map((option) => (
          <PollOptionRow
            aggregate={snapshot.aggregates.find(
              (a) => a.optionId === option.id
            )}
            isWinner={snapshot.poll.finalized_option_id === option.id}
            key={option.id}
            option={option}
          />
        ))}
      </div>

      {errorMessage ? (
        <p className="mt-4 text-destructive text-sm">{errorMessage}</p>
      ) : null}

      {canManage && !isFinalized ? (
        <div className="mt-6 flex gap-2">
          <Button
            disabled={busy || isClosed}
            onClick={handleClose}
            variant="outline"
          >
            投票を締め切る
          </Button>
          <Button disabled={busy} onClick={() => handleFinalize()}>
            yes 最多で確定
          </Button>
        </div>
      ) : null}

      <PollFinalizeModal
        candidateOptions={tieCandidates ?? []}
        onConfirm={async (optionId) => {
          await handleFinalize(optionId);
        }}
        onOpenChange={(open) => {
          if (!open) {
            setTieCandidates(null);
          }
        }}
        open={tieCandidates !== null}
      />
    </div>
  );
}
