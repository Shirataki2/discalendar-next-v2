/**
 * CalendarTestPage - E2Eテスト専用のカレンダー表示ページ
 *
 * 認証なしでカレンダーコンポーネントをテストするためのページです。
 * 実際のダッシュボードと同様のレイアウトでカレンダーを表示します。
 */
"use client";

import { useCallback, useState } from "react";
import { CalendarContainer } from "@/components/calendar/calendar-container";

// テスト用のモックギルドデータ
const MOCK_GUILDS = [
  { guildId: "test-guild-1", name: "Test Guild 1" },
  { guildId: "test-guild-2", name: "Test Guild 2" },
];

/**
 * CalendarTestPage コンポーネント
 *
 * ダッシュボードと同様のレイアウトでカレンダーをレンダリングします。
 * E2Eテストでカレンダーの機能（ビュー切り替え、ナビゲーション等）を検証できます。
 */
export function CalendarTestPage() {
  const [selectedGuildId, setSelectedGuildId] = useState<string>(
    MOCK_GUILDS[0].guildId
  );

  const handleGuildSelect = useCallback((guildId: string) => {
    setSelectedGuildId(guildId);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <h1 className="font-bold text-xl">E2E Test - Calendar</h1>
          <span className="rounded bg-yellow-100 px-2 py-1 text-sm text-yellow-800">
            Test Mode
          </span>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="flex flex-col gap-8 lg:flex-row lg:gap-6">
          {/* 左サイドバー: テスト用ギルド一覧 */}
          <aside className="w-full shrink-0 lg:w-72">
            <section className="space-y-4">
              <h3 className="font-semibold text-lg">テスト用サーバー</h3>
              <div className="space-y-2">
                {MOCK_GUILDS.map((guild) => (
                  <button
                    className={`w-full rounded-lg border p-4 text-left transition-colors ${
                      selectedGuildId === guild.guildId
                        ? "border-primary bg-primary/5"
                        : "hover:bg-muted"
                    }`}
                    data-testid="guild-card"
                    key={guild.guildId}
                    onClick={() => handleGuildSelect(guild.guildId)}
                    type="button"
                  >
                    <span className="font-medium">{guild.name}</span>
                  </button>
                ))}
              </div>
            </section>
          </aside>

          {/* カレンダーエリア */}
          <section aria-label="カレンダー" className="min-h-[600px] flex-1">
            <div className="h-full rounded-lg border">
              <CalendarContainer guildId={selectedGuildId} />
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
