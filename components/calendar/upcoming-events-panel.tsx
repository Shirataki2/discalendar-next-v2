import type { ReactNode } from "react";

type UpcomingEventsPanelProps = {
  children: ReactNode;
};

/**
 * 直近の予定パネル
 *
 * 右ペインで直近予定一覧を表示するコンテナコンポーネント。
 * Server Component から渡される ReactNode をそのままレンダリングする。
 * Suspense/エラー/空状態は子コンポーネントが処理する。
 */
export function UpcomingEventsPanel({ children }: UpcomingEventsPanelProps) {
  return (
    <section
      aria-label="直近の予定"
      className="flex min-h-[600px] flex-1 flex-col"
      data-testid="upcoming-events-panel"
    >
      <div className="flex flex-1 flex-col rounded-lg border">
        <h2 className="font-semibold text-lg p-4">直近の予定</h2>
        {children}
      </div>
    </section>
  );
}
