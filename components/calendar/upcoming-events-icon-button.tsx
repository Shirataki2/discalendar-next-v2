/**
 * UpcomingEventsIconButton - サイドバー折りたたみ時の「直近の予定」アイコンボタン
 *
 * サイドバーが最小化されたときに表示される、
 * Calendarアイコンのみの円形ボタンコンポーネント。
 */
"use client";

import { Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * UpcomingEventsIconButtonのProps
 */
export type UpcomingEventsIconButtonProps = {
  /** 選択状態 */
  isSelected: boolean;
  /** 選択時のコールバック */
  onSelect: () => void;
};

/**
 * UpcomingEventsIconButton コンポーネント
 *
 * サイドバー折りたたみ時に「直近の予定」をアイコンのみで表示する。
 * クリックで直近の予定セクションの表示/非表示を切り替える。
 */
export function UpcomingEventsIconButton({
  isSelected,
  onSelect,
}: UpcomingEventsIconButtonProps) {
  return (
    <Button
      aria-label="直近の予定"
      aria-pressed={isSelected}
      className={cn(
        "relative h-12 w-12 rounded-full p-0",
        "transition-transform hover:scale-110",
        isSelected ? "ring-2 ring-primary ring-offset-2" : ""
      )}
      data-selected={isSelected}
      data-testid="upcoming-events-icon-button"
      onClick={onSelect}
      title="直近の予定"
      type="button"
      variant={isSelected ? "default" : "outline"}
    >
      <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-full">
        <Calendar className="size-5" />
      </div>
    </Button>
  );
}
