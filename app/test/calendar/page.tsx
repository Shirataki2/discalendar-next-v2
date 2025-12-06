/**
 * E2Eテスト専用カレンダーページ
 *
 * このページは認証なしでカレンダーコンポーネントをテストするために使用します。
 * 本番環境ではアクセスできないよう、NODE_ENV === 'production' では404を返します。
 */
import { notFound } from "next/navigation";
import { CalendarTestPage } from "./calendar-test-page";

export default function TestCalendarPage() {
  // 本番環境ではアクセス不可
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  return <CalendarTestPage />;
}
