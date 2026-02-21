// Node.jsサーバーランタイム向けのSentry初期化設定
// instrumentation.ts の register() から動的importされる
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
