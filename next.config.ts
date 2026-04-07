import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";

// 全ページに適用するセキュリティヘッダー。
// CSPは外部サービス(Sentry/PostHog/Vercel Analytics/Supabase等)の動的スクリプト
// 許可リストとnonce戦略の検討が必要なため、別イシューで段階的に導入する。
const securityHeaders = [
  {
    // HTTPSを強制。includeSubDomains + preload でHSTSプリロードリスト登録可能に。
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    // MIMEスニッフィングを無効化してXSSリスクを低減。
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    // クリックジャッキング対策。同一オリジン内でのiframe埋め込みのみ許可。
    key: "X-Frame-Options",
    value: "SAMEORIGIN",
  },
  {
    // クロスオリジン遷移時はoriginのみ送信、同一originではフルURLを送信。
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    // 本アプリで利用しないブラウザAPIを明示的に無効化。
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
];

const nextConfig: NextConfig = {
  // cacheComponents: true, // 認証状態取得のため一時的に無効化
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn.discordapp.com",
        pathname: "/avatars/**",
      },
      {
        protocol: "https",
        hostname: "cdn.discordapp.com",
        pathname: "/icons/**", // ギルドアイコン用
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  widenClientFileUpload: true,
  sourcemaps: {
    deleteSourcemapsAfterUpload: true,
  },
  // CIではSource Mapのアップロードのログを出力してデバッグしやすくするためにverboseに設定
  silent: !process.env.CI,
});
