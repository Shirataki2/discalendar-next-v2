/**
 * CalendarToolbar - カレンダーツールバー（プレースホルダー）
 *
 * タスク4.3で本実装予定
 * 現在はTask 3.3のテストを通すためのプレースホルダー
 */
"use client";

import type { ViewMode } from "@/hooks/calendar/use-calendar-state";

export type CalendarToolbarProps = {
  viewMode: ViewMode;
  selectedDate: Date;
  onViewChange: (mode: ViewMode) => void;
  onNavigate: (action: "PREV" | "NEXT" | "TODAY") => void;
  isMobile: boolean;
};

export function CalendarToolbar({
  viewMode: _viewMode,
  selectedDate,
  onViewChange,
  onNavigate,
  isMobile,
}: CalendarToolbarProps) {
  return (
    <div className="border-b p-4" data-testid="calendar-toolbar">
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <button onClick={() => onNavigate("PREV")} type="button">
            前へ
          </button>
          <button onClick={() => onNavigate("TODAY")} type="button">
            今日
          </button>
          <button onClick={() => onNavigate("NEXT")} type="button">
            次へ
          </button>
        </div>

        <div className="font-semibold">
          {selectedDate.toLocaleDateString("ja-JP", {
            year: "numeric",
            month: "long",
          })}
        </div>

        <div className="flex gap-2">
          <button onClick={() => onViewChange("day")} type="button">
            日
          </button>
          <button onClick={() => onViewChange("week")} type="button">
            週
          </button>
          <button onClick={() => onViewChange("month")} type="button">
            月
          </button>
        </div>
      </div>

      {isMobile ? <div className="text-xs">Mobile view</div> : null}
    </div>
  );
}
