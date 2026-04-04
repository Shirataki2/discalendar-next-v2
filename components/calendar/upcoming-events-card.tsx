"use client";

import { Calendar } from "lucide-react";
import { useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/**
 * UpcomingEventsCardのProps
 */
export type UpcomingEventsCardProps = {
  /** 選択状態 */
  isSelected: boolean;
  /** 選択時のコールバック */
  onSelect: () => void;
};

/**
 * UpcomingEventsCard コンポーネント
 *
 * サイドバー展開時に「直近の予定」をカード形式で表示するボタン。
 * 選択状態を視覚的に表示し、クリックやキーボード操作で選択できる。
 */
export function UpcomingEventsCard({
  isSelected,
  onSelect,
}: UpcomingEventsCardProps) {
  const handleClick = useCallback(() => {
    onSelect();
  }, [onSelect]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        onSelect();
      }
    },
    [onSelect]
  );

  const selectedClass = isSelected ? "border-primary bg-accent" : "";

  return (
    <Card
      aria-pressed={isSelected}
      className={cn(
        "cursor-pointer overflow-hidden transition-colors",
        "hover:bg-accent/50",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        selectedClass
      )}
      data-selected={isSelected}
      data-testid="upcoming-events-card"
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
    >
      <CardContent className="flex items-center gap-4 p-4">
        {/* カレンダーアイコン */}
        <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted">
          <Calendar className="h-5 w-5 text-muted-foreground" />
        </div>

        {/* テキスト */}
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-sm">直近の予定</p>
        </div>

        {/* 選択インジケーター */}
        {isSelected ? (
          <div className="h-2 w-2 shrink-0 rounded-full bg-primary" />
        ) : null}
      </CardContent>
    </Card>
  );
}
