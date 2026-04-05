# Research & Design Decisions

## Summary
- **Feature**: `sentry-user-context`
- **Discovery Scope**: Extension（既存Sentry統合にユーザーコンテキストを追加）
- **Key Findings**:
  - `@sentry/nextjs` v10はクライアント・サーバー・Edgeの3ランタイムで `setUser` をサポート
  - Supabaseの `onAuthStateChange` でクライアントサイドの認証状態変化を検知可能
  - サーバーサイドはMiddlewareでセッションが更新されるため、Server ComponentsやServer Actionsで `getUser()` 経由でユーザー情報を取得可能

## Research Log

### Sentry setUser API
- **Context**: Sentryでユーザーコンテキストを設定するAPIの確認
- **Sources Consulted**: @sentry/nextjs v10 SDK
- **Findings**:
  - `Sentry.setUser({ id: string })` でユーザーコンテキスト設定
  - `Sentry.setUser(null)` でクリア
  - クライアント・サーバーそれぞれ独立したスコープを持つ
  - `sendDefaultPii: false` でもsetUserで明示的に設定した情報は送信される
- **Implications**: クライアントとサーバーで別々にsetUserを呼ぶ必要がある

### 既存Sentry構成
- **Context**: 現在のSentry初期化構成の確認
- **Findings**:
  - `sentry.client.config.ts` — ブラウザ用初期化（`sendDefaultPii: false`）
  - `sentry.server.config.ts` — Node.jsサーバー用初期化
  - `sentry.edge.config.ts` — Edgeランタイム用初期化
  - `instrumentation.ts` — サーバー/Edgeの動的import
  - `app/global-error.tsx` — グローバルエラーハンドリング
  - 3つの設定ファイルは同一構造
- **Implications**: 初期化時点ではユーザー情報が利用不可。認証後にsetUserを呼ぶ仕組みが必要

### クライアントサイド認証フロー
- **Context**: ブラウザでの認証状態検知方法
- **Findings**:
  - `lib/supabase/client.ts` で `createBrowserClient` を使用
  - Supabaseクライアントの `onAuthStateChange` でSIGNED_IN / SIGNED_OUT イベントを検知可能
  - 現在 `onAuthStateChange` を直接使用しているコンポーネントはない
  - ダッシュボードレイアウト（`app/dashboard/layout.tsx`）はServer Componentで `getUser()` を呼んでいる
- **Implications**: クライアントサイドでReactコンポーネント（Provider）を使い、`onAuthStateChange` で Sentry ユーザーを設定するのが適切

### サーバーサイド認証フロー
- **Context**: サーバーでのユーザー情報取得方法
- **Findings**:
  - `lib/supabase/proxy.ts` のMiddlewareで毎リクエスト `getClaims()` を実行
  - Server Componentsでは `createClient()` → `getUser()` でユーザー取得
  - Server Actionsも同様
- **Implications**: サーバーサイドのsetUserはMiddlewareまたは各リクエストハンドラで実行可能だが、Middlewareが最適。ただしEdgeランタイムのため`@sentry/nextjs`のEdge互換性に注意

## Architecture Pattern Evaluation

| Option | Description | Strengths | Risks / Limitations | Notes |
|--------|-------------|-----------|---------------------|-------|
| Client Provider | React Providerで `onAuthStateChange` を監視しsetUserを呼ぶ | 認証状態変化を即座に反映、ログアウト時のクリアも自動 | Providerの配置が必要 | 推奨 |
| Sentry init内でsetUser | sentry.client.config.ts内で認証チェック | 初期化時点では認証情報が不明 | 非推奨 | |
| Server Middleware | proxy.tsでサーバーサイドsetUser | 全リクエストでユーザー設定可能 | EdgeランタイムではSentry APIの互換性に制約がある可能性 | サーバーサイドは`instrumentation.ts`経由のみ |

## Design Decisions

### Decision: クライアントサイドはReact Providerパターン
- **Context**: ブラウザでSentryユーザーコンテキストを認証状態と同期する方法
- **Selected Approach**: `SentryUserProvider` をルートレイアウトに配置し、`onAuthStateChange` でsetUser/クリアを実行
- **Rationale**: 認証イベントに反応してリアルタイムに更新でき、ログアウト時のクリアも同一箇所で処理できる
- **Trade-offs**: 新しいProviderコンポーネントが増えるが、責務が明確

### Decision: サーバーサイドはServer Actions/Componentsでの呼び出し
- **Context**: サーバーサイドでSentryユーザーコンテキストを設定する方法
- **Selected Approach**: ダッシュボードレイアウト（Server Component）で `getUser()` 後に `Sentry.setUser()` を呼ぶ。ログアウトServer Action内で `Sentry.setUser(null)` を呼ぶ
- **Rationale**: 既存のユーザー取得ロジックの直後にsetUserを追加するだけで済む。Middlewareはclaims取得後にコードを挟むべきでないという制約がある
- **Trade-offs**: 全てのServer Componentで呼ぶのは冗長なため、ダッシュボードレイアウトに限定

### Decision: ユーザーIDのみ送信
- **Context**: Sentryに送信するユーザー情報の範囲
- **Selected Approach**: Supabaseの `user.id`（UUID）のみをsetUserに渡す
- **Rationale**: `sendDefaultPii: false` のポリシーと整合。UUIDは個人を直接特定しないが、Supabaseダッシュボードで紐づけ可能

## Risks & Mitigations
- クライアント初期ロード時にsetUserが間に合わずエラーがユーザーなしで送信される可能性 — 許容範囲として記録。Sentryイベントの大半はカバーされる
- EdgeランタイムでのSentry setUser互換性 — Edgeは現状Middleware専用で、ユーザーコンテキスト設定は不要と判断

## References
- @sentry/nextjs SDK — setUser API
- Supabase Auth — onAuthStateChange
