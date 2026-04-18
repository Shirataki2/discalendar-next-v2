"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { PollOptionRecord } from "@/lib/polls/types";

export type PollFinalizeModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  candidateOptions: PollOptionRecord[];
  onConfirm: (optionId: string) => Promise<void>;
};

function formatRange(option: PollOptionRecord): string {
  const start = new Date(option.starts_at).toLocaleString("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
  return start;
}

export function PollFinalizeModal({
  open,
  onOpenChange,
  candidateOptions,
  onConfirm,
}: PollFinalizeModalProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleConfirm = async () => {
    if (!selectedId) {
      return;
    }
    setSubmitting(true);
    try {
      await onConfirm(selectedId);
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>候補の選択が必要です</DialogTitle>
          <DialogDescription>
            複数の候補が同数の yes
            票で並んでいます。確定する候補を選択してください。
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2 py-2">
          {candidateOptions.map((option) => (
            <button
              className={`rounded border p-2 text-left text-sm ${
                selectedId === option.id ? "border-primary" : "border-border"
              }`}
              key={option.id}
              onClick={() => setSelectedId(option.id)}
              type="button"
            >
              候補 {option.position + 1}: {formatRange(option)}
            </button>
          ))}
        </div>
        <DialogFooter>
          <Button
            disabled={submitting}
            onClick={() => onOpenChange(false)}
            variant="outline"
          >
            キャンセル
          </Button>
          <Button disabled={!selectedId || submitting} onClick={handleConfirm}>
            {submitting ? "確定中..." : "この候補で確定"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
