/**
 * CalendarToolbar - カレンダーツールバー
 *
 * タスク4.1: ビューモード切り替えUIの作成
 * タスク4.2: 日付ナビゲーションコントロールの作成
 * タスク4.3: CalendarToolbarコンポーネントの統合
 *
 * Requirements: 1.1, 1.2, 1.3, 1.5, 2.1, 2.2, 2.3, 2.4
 */
"use client";

import { endOfWeek, format, startOfWeek } from "date-fns";
import { ja } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ViewMode } from "@/hooks/calendar/use-calendar-state";

export type CalendarToolbarProps = {
  /** 現在のビューモード */
  viewMode: ViewMode;
  /** 選択中の日付 */
  selectedDate: Date;
  /** ビューモード変更ハンドラー */
  onViewChange: (mode: ViewMode) => void;
  /** ナビゲーションハンドラー */
  onNavigate: (action: "PREV" | "NEXT" | "TODAY") => void;
  /** モバイル表示かどうか */
  isMobile: boolean;
};

/**
 * ビューモードと日付から表示ラベルを生成する
 */
function getDateRangeLabel(viewMode: ViewMode, selectedDate: Date): string {
  switch (viewMode) {
    case "day":
      // 日ビュー: '2025年12月5日 (木)'
      return format(selectedDate, "yyyy年M月d日 (E)", { locale: ja });

    case "week": {
      // 週ビュー: '2025年12月1日 - 12月7日'
      const weekStart = startOfWeek(selectedDate, { weekStartsOn: 0 });
      const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 0 });

      // 同じ月の場合
      if (weekStart.getMonth() === weekEnd.getMonth()) {
        return `${format(weekStart, "yyyy年M月d日", { locale: ja })} - ${format(weekEnd, "d日", { locale: ja })}`;
      }

      // 異なる月の場合
      return `${format(weekStart, "yyyy年M月d日", { locale: ja })} - ${format(weekEnd, "M月d日", { locale: ja })}`;
    }

    case "month":
      // 月ビュー: '2025年12月'
      return format(selectedDate, "yyyy年M月", { locale: ja });

    default:
      return "";
  }
}

/**
 * CalendarToolbar コンポーネント
 *
 * ビュー切り替えボタンと日付ナビゲーションコントロールを提供する。
 *
 * @param props - コンポーネントのProps
 *
 * @example
 * ```tsx
 * <CalendarToolbar
 *   viewMode="month"
 *   selectedDate={new Date()}
 *   onViewChange={(mode) => console.log(mode)}
 *   onNavigate={(action) => console.log(action)}
 *   isMobile={false}
 * />
 * ```
 */
export function CalendarToolbar({
  viewMode,
  selectedDate,
  onViewChange,
  onNavigate,
  isMobile,
}: CalendarToolbarProps) {
  const dateRangeLabel = getDateRangeLabel(viewMode, selectedDate);

  return (
    <div
      className="border-b bg-background p-4"
      data-mobile={isMobile}
      data-testid="calendar-toolbar"
    >
      <div
        className={
          isMobile
            ? "flex flex-col gap-3"
            : "flex items-center justify-between gap-4"
        }
      >
        {/* 日付ナビゲーション (Task 4.2) */}
        <div className="flex items-center gap-2">
          <Button
            aria-label="前へ"
            onClick={() => onNavigate("PREV")}
            size="icon"
            type="button"
            variant="outline"
          >
            <ChevronLeft className="size-4" />
          </Button>

          <Button
            aria-label="今日"
            onClick={() => onNavigate("TODAY")}
            size={isMobile ? "sm" : "default"}
            type="button"
            variant="outline"
          >
            今日
          </Button>

          <Button
            aria-label="次へ"
            onClick={() => onNavigate("NEXT")}
            size="icon"
            type="button"
            variant="outline"
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>

        {/* 期間表示ラベル (Task 4.2, Req 2.4) */}
        <div
          className={
            isMobile
              ? "text-center font-semibold text-lg"
              : "font-semibold text-lg"
          }
          data-testid="date-range-label"
        >
          {dateRangeLabel}
        </div>

        {/* ビューモード切り替え (Task 4.1) */}
        <fieldset
          aria-label="ビュー切り替え"
          className="flex items-center gap-1 rounded-md border bg-muted p-1"
        >
          <Button
            aria-label="日ビュー"
            aria-pressed={viewMode === "day"}
            data-active={viewMode === "day"}
            onClick={() => onViewChange("day")}
            size="sm"
            type="button"
            variant={viewMode === "day" ? "secondary" : "ghost"}
          >
            日
          </Button>

          <Button
            aria-label="週ビュー"
            aria-pressed={viewMode === "week"}
            data-active={viewMode === "week"}
            onClick={() => onViewChange("week")}
            size="sm"
            type="button"
            variant={viewMode === "week" ? "secondary" : "ghost"}
          >
            週
          </Button>

          <Button
            aria-label="月ビュー"
            aria-pressed={viewMode === "month"}
            data-active={viewMode === "month"}
            onClick={() => onViewChange("month")}
            size="sm"
            type="button"
            variant={viewMode === "month" ? "secondary" : "ghost"}
          >
            月
          </Button>
        </fieldset>
      </div>
    </div>
  );
}
