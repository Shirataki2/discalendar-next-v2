"use client";

/**
 * @file ThemeSettingPanel コンポーネント
 * @description テーマ（ライト/ダーク/システム）を選択するパネル。
 * next-themes と直接統合し、DashboardHeader の ThemeSwitcher と同一のテーマ状態を共有する。
 *
 * Features:
 * - 3つのテーマオプション（ライト/ダーク/システム）をカードグリッドで表示
 * - 現在選択中のテーマを視覚的にハイライト
 * - テーマ変更が即座にUI全体に反映
 * - ハイドレーションミスマッチ回避のためマウント状態を管理
 *
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5
 */

import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import type { ComponentType } from "react";
import { useEffect, useState } from "react";

/** テーマオプションの型 */
type ThemeOption = "light" | "dark" | "system";

/** テーマオプション定義 */
interface ThemeOptionConfig {
  value: ThemeOption;
  label: string;
  icon: ComponentType<{ className?: string }>;
}

/** テーマオプション一覧 */
const THEME_OPTIONS: readonly ThemeOptionConfig[] = [
  { value: "light", label: "ライト", icon: Sun },
  { value: "dark", label: "ダーク", icon: Moon },
  { value: "system", label: "システム", icon: Monitor },
] as const;

/**
 * テーマ選択パネルコンポーネント
 *
 * 「表示設定」セクション内に配置し、ライト・ダーク・システムの3つのテーマを
 * カードグリッド形式で選択できるUIを提供する。
 * next-themes の useTheme() を使用するため、ThemeSwitcher と同一のテーマ状態を共有する。
 */
export function ThemeSettingPanel() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // ハイドレーションミスマッチ回避のためマウント状態を管理
  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div data-testid="theme-setting-panel">
      {mounted ? (
        <div className="grid grid-cols-3 gap-3">
          {THEME_OPTIONS.map((option) => {
            const isActive = theme === option.value;
            const Icon = option.icon;
            return (
              <button
                className={`flex flex-col items-center gap-2 rounded-lg border-2 p-4 transition-colors ${
                  isActive
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-border bg-card text-muted-foreground hover:border-primary/50 hover:bg-accent/50"
                }`}
                data-active={isActive}
                data-testid={`theme-option-${option.value}`}
                key={option.value}
                onClick={() => setTheme(option.value)}
                type="button"
              >
                <Icon className="h-6 w-6" />
                <span className="font-medium text-sm">{option.label}</span>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-3">
          {THEME_OPTIONS.map((option) => (
            <div
              className="flex flex-col items-center gap-2 rounded-lg border-2 border-border bg-card p-4"
              key={option.value}
            >
              <div className="h-6 w-6 animate-pulse rounded bg-muted" />
              <div className="h-4 w-12 animate-pulse rounded bg-muted" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
