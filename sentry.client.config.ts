// クライアント（ブラウザ）環境向けのSentry初期化設定
// サーバー/Edge設定と同一構造だが、将来ランタイム固有の設定が必要になった場合に分岐するため個別ファイルとして維持
import { init } from "@sentry/nextjs";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
const isProduction = process.env.NODE_ENV === "production";

init({
  dsn,
  enabled: Boolean(dsn) && isProduction,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
  sendDefaultPii: false,
});
