"use client";

/**
 * @file CalendarViewSettingPanel コンポーネント
 * @description カレンダーデフォルトビュー（月/週/日）を選択・永続化するパネル。
 * useUserPreferences フックを利用してデフォルトビュー値の読み取りと更新を行う。
 *
 * Features:
 * - 3つのビューオプション（月/週/日）をカードグリッドで表示
 * - 現在選択中のビューを視覚的にハイライト
 * - 選択変更時に永続化を実行し保存完了フィードバックを表示
 * - 保存失敗時にエラーメッセージを表示
 * - フィードバックは3秒後に自動消去
 *
 * Requirements: 3.1, 3.2, 3.3, 5.4, 6.1, 6.2, 6.3
 */

import { Calendar, CalendarDays, CalendarRange, Check } from "lucide-react";
import type { ComponentType } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  type CalendarViewMode,
  useUserPreferences,
} from "@/hooks/use-user-preferences";

type SaveStatus = "idle" | "success" | "error";

interface ViewOptionConfig {
  value: CalendarViewMode;
  label: string;
  icon: ComponentType<{ className?: string }>;
}

const VIEW_OPTIONS: readonly ViewOptionConfig[] = [
  { value: "month", label: "月", icon: Calendar },
  { value: "week", label: "週", icon: CalendarRange },
  { value: "day", label: "日", icon: CalendarDays },
] as const;

const FEEDBACK_DURATION_MS = 3000;

/**
 * カレンダーデフォルトビュー選択パネルコンポーネント
 *
 * 「表示設定」セクション内に配置し、月・週・日の3つのビューを
 * カードグリッド形式で選択できるUIを提供する。
 */
export function CalendarViewSettingPanel() {
  const { defaultCalendarView, setDefaultCalendarView } = useUserPreferences();
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // タイマークリーンアップ
  useEffect(
    () => () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    },
    []
  );

  const handleSelect = useCallback(
    (view: CalendarViewMode) => {
      try {
        setDefaultCalendarView(view);
        setSaveStatus("success");
      } catch {
        setSaveStatus("error");
      }

      // 前のタイマーをクリア
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      timerRef.current = setTimeout(() => {
        setSaveStatus("idle");
        timerRef.current = null;
      }, FEEDBACK_DURATION_MS);
    },
    [setDefaultCalendarView]
  );

  return (
    <div data-testid="calendar-view-setting-panel">
      <div className="grid grid-cols-3 gap-3">
        {VIEW_OPTIONS.map((option) => {
          const isActive = defaultCalendarView === option.value;
          const Icon = option.icon;
          return (
            <button
              className={`flex flex-col items-center gap-2 rounded-lg border-2 p-4 transition-colors ${
                isActive
                  ? "border-primary bg-primary/5 text-primary"
                  : "border-border bg-card text-muted-foreground hover:border-primary/50 hover:bg-accent/50"
              }`}
              data-active={isActive}
              data-testid={`view-option-${option.value}`}
              key={option.value}
              onClick={() => handleSelect(option.value)}
              type="button"
            >
              <Icon className="h-6 w-6" />
              <span className="font-medium text-sm">{option.label}</span>
            </button>
          );
        })}
      </div>

      {saveStatus === "success" && (
        <div className="mt-3 flex items-center gap-1.5 text-green-600 text-sm">
          <Check className="h-4 w-4" />
          <span>保存しました</span>
        </div>
      )}

      {saveStatus === "error" && (
        <div className="mt-3 text-destructive text-sm">
          <span>保存に失敗しました</span>
        </div>
      )}
    </div>
  );
}
