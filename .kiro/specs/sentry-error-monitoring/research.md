# Research & Design Decisions

## Summary
- **Feature**: `sentry-error-monitoring`
- **Discovery Scope**: Extension（既存Next.jsアプリへのSentry統合）
- **Key Findings**:
  - `@sentry/nextjs` v8は`instrumentation.ts`パターンを必須とし、`sentry.server.config`/`sentry.edge.config`を動的importで読み込む
  - `onRequestError`エクスポートにより、Server Components・Middleware・プロキシのエラーを自動捕捉可能
  - ソースマップアップロードは`withSentryConfig`のビルド統合で自動化され、`SENTRY_AUTH_TOKEN`環境変数で認証する

## Research Log

### @sentry/nextjs v8 初期化パターン
- **Context**: Next.js App Routerに対応したSentry SDKの最新初期化方式を確認
- **Sources Consulted**: Sentry公式ドキュメント（Context7経由）、v7→v8マイグレーションガイド
- **Findings**:
  - v8では`sentry.server.config`と`sentry.edge.config`を直接読み込まず、`instrumentation.ts`の`register()`関数で動的importする
  - `NEXT_RUNTIME`環境変数でNode.js/Edgeランタイムを判別
  - `onRequestError = Sentry.captureRequestError`をエクスポートすることで、Server Components・Route Handlers・Middlewareのエラーを自動捕捉
  - クライアント側は従来通り`sentry.client.config.ts`で`Sentry.init()`を呼び出す
- **Implications**: `instrumentation.ts`はNext.js 15+の公式パターンであり、Turbopackとも互換性がある

### withSentryConfig ビルド統合
- **Context**: `next.config.ts`のラッピングとソースマップアップロードの仕組みを確認
- **Sources Consulted**: Sentry公式ドキュメント
- **Findings**:
  - `withSentryConfig(nextConfig, sentryOptions)`で設定をラップ
  - `org`、`project`、`authToken`（`SENTRY_AUTH_TOKEN`環境変数）でソースマップアップロードを認証
  - `widenClientFileUpload: true`でより広範なソースマップをアップロード可能
  - `silent: !process.env.CI`でCI環境でのみログを出力
  - `webpack.autoInstrumentAppDirectory: true`（デフォルト）でApp Routerコンポーネントを自動計装
- **Implications**: 既存の`next.config.ts`に`withSentryConfig`をラップするだけで統合可能

### global-error.tsx パターン
- **Context**: クライアントサイドのReactレンダリングエラー捕捉方式を確認
- **Sources Consulted**: Sentry公式ドキュメント
- **Findings**:
  - `app/global-error.tsx`は`"use client"`コンポーネントとして作成
  - `useEffect`内で`Sentry.captureException(error)`を呼び出す
  - `error`と`reset`をpropsとして受け取り、エラーリカバリUIを提供
  - `<html>`と`<body>`タグを含む（ルートレイアウトを置換するため）
- **Implications**: 現在`global-error.tsx`が存在しないため新規作成が必要

### 環境変数と環境分離
- **Context**: DSN管理と開発/本番環境の分離方法を確認
- **Sources Consulted**: Sentry公式ドキュメント
- **Findings**:
  - DSNは`NEXT_PUBLIC_SENTRY_DSN`としてクライアント・サーバー両方でアクセス可能にする
  - `SENTRY_AUTH_TOKEN`はサーバーサイドのみ（ビルド時ソースマップアップロード用）
  - `SENTRY_ORG`、`SENTRY_PROJECT`もビルド時環境変数として設定
  - `enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN`でDSN未設定時にグレースフルに無効化可能
  - `tracesSampleRate`を`NODE_ENV`で切り替え（development: 1.0, production: 0.1）
- **Implications**: `.env.example`にSentry関連の環境変数を追記し、CI secretsにも追加が必要

### 既存コードベースの状態
- **Context**: 変更対象の既存ファイルと新規作成が必要なファイルを特定
- **Findings**:
  - `next.config.ts`: 単純なデフォルトエクスポート → `withSentryConfig`でラップが必要
  - `app/global-error.tsx`: 存在しない → 新規作成
  - `instrumentation.ts`: 存在しない → 新規作成
  - `.env.example`: Supabase変数のみ → Sentry変数を追記
  - `.github/workflows/ci.yml`: buildステップあり → Sentry環境変数を追加

## Design Decisions

### Decision: instrumentation.ts パターンの採用
- **Context**: サーバーサイドのSentry初期化方式の選択
- **Alternatives Considered**:
  1. `_app.tsx`/`_document.tsx`での初期化（Pages Router向け、非推奨）
  2. `instrumentation.ts`の`register()`での動的import（v8推奨）
- **Selected Approach**: `instrumentation.ts`パターン
- **Rationale**: Next.js 16 App Routerの公式パターンであり、Turbopack互換。Sentry v8の必須要件
- **Trade-offs**: `instrumentation.ts`はNext.js固有の仕組みに依存するが、公式サポートにより安定性は高い

### Decision: DSN未設定時のグレースフルデグレード
- **Context**: 開発環境やCIでSentryを使用しない場合の挙動
- **Alternatives Considered**:
  1. `enabled: false`で明示的に無効化
  2. DSN未設定チェックでSentry初期化をスキップ
- **Selected Approach**: `enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN`による条件付き初期化
- **Rationale**: 単一の環境変数でSentry全体の有効/無効を制御でき、開発者の設定負担が最小
- **Trade-offs**: DSNが空文字列の場合の挙動に注意が必要

## Risks & Mitigations
- **ビルド時間増加** — `withSentryConfig`のソースマップアップロードによりCIビルドが遅延する可能性 → `silent: !process.env.CI`で不要なログを抑制、CI cacheを活用
- **バンドルサイズ増加** — Sentry SDKのクライアントバンドルへの影響 → tree-shakingで未使用コードを除去（`treeshake.removeDebugLogging: true`）
- **本番環境での初期設定ミス** — DSNやauth tokenの設定漏れ → `.env.example`での文書化とCIでの環境変数チェック

## References
- [Sentry Next.js SDK公式ドキュメント](https://docs.sentry.io/platforms/javascript/guides/nextjs/) — セットアップガイド、マニュアルセットアップ
- [Sentry v7→v8マイグレーションガイド](https://docs.sentry.io/platforms/javascript/guides/nextjs/migration/v7-to-v8/) — instrumentation.tsパターンへの移行
- [Next.js Instrumentation](https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation) — Next.js公式のinstrumentationフック
