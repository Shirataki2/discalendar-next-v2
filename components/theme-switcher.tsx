"use client";

/**
 * @file ThemeSwitcher コンポーネント
 * @description ライトテーマ・ダークテーマ・システム設定を切り替えるドロップダウンメニュー
 *
 * Features:
 * - next-themes を使用したテーマ切り替え
 * - ライト、ダーク、システム設定の3つのオプション
 * - 現在のテーマを視覚的に表示
 * - lucide-react のアイコンを使用
 */

import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/**
 * ThemeSwitcher コンポーネント
 *
 * ヘッダーやナビゲーションバーに配置してテーマを切り替えるためのコンポーネント。
 * ドロップダウンメニューから「ライト」「ダーク」「システム」の3つのテーマを選択可能。
 */
export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // クライアントサイドでのみレンダリングするためのマウント状態管理
  // ハイドレーションミスマッチを防ぐ
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Button disabled size="icon" variant="ghost">
        <Sun className="h-[1.2rem] w-[1.2rem]" />
        <span className="sr-only">テーマを切り替える</span>
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          data-testid="theme-switcher-trigger"
          size="icon"
          variant="ghost"
        >
          <Sun className="dark:-rotate-90 h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:scale-0" />
          <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">テーマを切り替える</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          data-active={theme === "light"}
          data-testid="theme-light"
          onClick={() => setTheme("light")}
        >
          <Sun className="mr-2 h-4 w-4" />
          <span>ライト</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          data-active={theme === "dark"}
          data-testid="theme-dark"
          onClick={() => setTheme("dark")}
        >
          <Moon className="mr-2 h-4 w-4" />
          <span>ダーク</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          data-active={theme === "system"}
          data-testid="theme-system"
          onClick={() => setTheme("system")}
        >
          <Monitor className="mr-2 h-4 w-4" />
          <span>システム</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
