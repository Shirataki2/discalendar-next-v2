/**
 * RsvpButtons - RSVP ステータス選択ボタン群
 *
 * Task 4.1: RSVP ボタン群と楽観的更新を実装する
 * Task 4.2: 未認証ユーザーの RSVP 制御を実装する
 *
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 4.1, 4.2
 */
"use client";

import { Check, HelpCircle, X } from "lucide-react";
import { useCallback, useState, useTransition } from "react";
import { deleteRsvpAction, upsertRsvpAction } from "@/app/dashboard/actions";
import { Button } from "@/components/ui/button";
import type { RsvpStatus } from "@/lib/calendar/rsvp-types";

export type RsvpButtonsProps = {
  guildId: string;
  eventId: string | null;
  seriesId: string | null;
  occurrenceDate: string | null;
  currentStatus: RsvpStatus | null;
  isAuthenticated: boolean;
  onStatusChange?: (newStatus: RsvpStatus | null) => void;
};

const RSVP_OPTIONS: {
  status: RsvpStatus;
  label: string;
  icon: typeof Check;
}[] = [
  { status: "going", label: "参加", icon: Check },
  { status: "maybe", label: "未定", icon: HelpCircle },
  { status: "not_going", label: "不参加", icon: X },
];

export function RsvpButtons({
  guildId,
  eventId,
  seriesId,
  occurrenceDate,
  currentStatus,
  isAuthenticated,
  onStatusChange,
}: RsvpButtonsProps) {
  const [optimisticStatus, setOptimisticStatus] = useState(currentStatus);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleClick = useCallback(
    (status: RsvpStatus) => {
      if (!isAuthenticated || isPending) {
        return;
      }

      setError(null);
      const previousStatus = optimisticStatus;
      const isToggle = optimisticStatus === status;

      // 楽観的更新
      setOptimisticStatus(isToggle ? null : status);

      startTransition(async () => {
        const result = isToggle
          ? await deleteRsvpAction({
              guildId,
              eventId,
              seriesId,
              occurrenceDate,
            })
          : await upsertRsvpAction({
              guildId,
              eventId,
              seriesId,
              occurrenceDate,
              status,
            });

        if (result.success) {
          onStatusChange?.(isToggle ? null : status);
        } else {
          // ロールバック
          setOptimisticStatus(previousStatus);
          setError(result.error.message);
        }
      });
    },
    [
      isAuthenticated,
      isPending,
      optimisticStatus,
      guildId,
      eventId,
      seriesId,
      occurrenceDate,
      onStatusChange,
    ]
  );

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        {RSVP_OPTIONS.map(({ status, label, icon: Icon }) => {
          const isActive = optimisticStatus === status;
          return (
            <Button
              data-active={String(isActive)}
              disabled={!isAuthenticated || isPending}
              key={status}
              onClick={() => handleClick(status)}
              size="sm"
              variant={isActive ? "default" : "outline"}
            >
              <Icon className="mr-1 h-4 w-4" />
              {label}
            </Button>
          );
        })}
      </div>
      {isAuthenticated ? null : (
        <p className="text-muted-foreground text-xs">ログインして出欠を回答</p>
      )}
      {error ? <p className="text-destructive text-xs">{error}</p> : null}
    </div>
  );
}
