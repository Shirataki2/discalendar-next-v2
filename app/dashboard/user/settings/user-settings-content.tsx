import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { SettingsSection } from "@/components/guilds/settings-section";
import { CalendarViewSettingPanel } from "@/components/settings/calendar-view-setting-panel";
import { ThemeSettingPanel } from "@/components/settings/theme-setting-panel";

/**
 * ユーザー設定ページのコンテンツ
 *
 * テーマ設定パネルとカレンダーデフォルトビュー設定パネルを
 * セクション分けしてレイアウトする。
 * 子コンポーネント（ThemeSettingPanel, CalendarViewSettingPanel）が
 * それぞれ "use client" を宣言しているため、本コンポーネントは Server Component で動作する。
 *
 * Requirements: 1.4, 1.5, 2.1-2.5, 3.1-3.3
 */
export function UserSettingsContent() {
  return (
    <>
      <div className="mb-6 flex items-center gap-2">
        <Link
          className="inline-flex items-center gap-1 text-muted-foreground text-sm transition-colors hover:text-foreground"
          href="/dashboard"
        >
          <ArrowLeft className="h-4 w-4" />
          ダッシュボードに戻る
        </Link>
      </div>

      <h1 className="mb-6 font-bold text-2xl">設定</h1>

      <div className="space-y-6">
        <SettingsSection
          description="アプリケーションの表示テーマを選択します"
          title="テーマ"
        >
          <ThemeSettingPanel />
        </SettingsSection>

        <SettingsSection
          description="カレンダーを開いた時のデフォルト表示を選択します"
          title="カレンダーデフォルトビュー"
        >
          <CalendarViewSettingPanel />
        </SettingsSection>
      </div>
    </>
  );
}
