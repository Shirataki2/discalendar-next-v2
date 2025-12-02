# Research & Design Decisions

---
**Purpose**: Capture discovery findings, architectural investigations, and rationale that inform the technical design.
---

## Summary
- **Feature**: `discord-login`
- **Discovery Scope**: Extension（既存のSupabase SSR設定を拡張してDiscord OAuth認証を追加）
- **Key Findings**:
  - 既存の`lib/supabase/`クライアント設定がPKCE対応済み
  - `lib/supabase/proxy.ts`でMiddleware用セッション更新ロジックが既存
  - 認証UI・ログインページ・コールバックルートが未実装

## Research Log

### Supabase Discord OAuth実装パターン
- **Context**: Discord OAuth認証のNext.js App Router統合方法を調査
- **Sources Consulted**:
  - [Login with Discord | Supabase Docs](https://supabase.com/docs/guides/auth/social-login/auth-discord)
  - [Setting up Server-Side Auth for Next.js | Supabase Docs](https://supabase.com/docs/guides/auth/server-side/nextjs)
  - [Supabase Auth with Next.js App Router](https://supabase.com/docs/guides/auth/auth-helpers/nextjs)
- **Findings**:
  - `signInWithOAuth({ provider: 'discord', options: { redirectTo } })`でOAuthフロー開始
  - PKCE使用時は`/auth/callback`でコード交換が必須
  - `exchangeCodeForSession(code)`でセッション確立
  - Discord OAuth scopeはSupabase側で自動設定（identify, email）
- **Implications**:
  - Route Handlerでコールバック処理実装が必要
  - Client Componentでログインボタン配置
  - 既存のproxyセッション更新ロジックを活用

### 既存Supabaseクライアント構成分析
- **Context**: 既存のSupabase設定がOAuth対応可能か確認
- **Sources Consulted**: プロジェクト内ソースコード分析
- **Findings**:
  - `lib/supabase/client.ts`: ブラウザクライアント（`createBrowserClient`）
  - `lib/supabase/server.ts`: サーバークライアント（`createServerClient` + cookies）
  - `lib/supabase/proxy.ts`: Middleware用セッション更新（`updateSession`関数）
  - 環境変数: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- **Implications**:
  - 既存クライアントはそのまま利用可能
  - Middlewareルート設定（`middleware.ts`）をプロジェクトルートに新規作成
  - proxy.tsは認証保護ルーティングに対応済み（`/login`, `/auth`除外）

### Cookie設定とセキュリティ
- **Context**: セッションCookieのセキュリティ要件確認
- **Sources Consulted**: Supabase SSRドキュメント
- **Findings**:
  - `@supabase/ssr`はHttpOnly, Secure, SameSiteを自動設定
  - PKCE対応で認可コード交換時にCSRF保護
  - トークンリフレッシュはMiddlewareで自動実行
- **Implications**: セキュリティ要件8.2, 8.3, 8.4はSDK組み込み機能で対応

## Architecture Pattern Evaluation

| Option | Description | Strengths | Risks / Limitations | Notes |
|--------|-------------|-----------|---------------------|-------|
| Supabase組み込みOAuth | signInWithOAuthでOAuthフロー完全委任 | 実装最小化、保守性高 | Supabase依存 | 採用：既存設計と整合 |
| カスタムOAuthハンドラ | Discord APIを直接呼び出し | 柔軟性高 | 実装コスト大、セキュリティリスク | 不採用 |

## Design Decisions

### Decision: PKCEフロー採用
- **Context**: OAuth認証のセキュリティ強化
- **Alternatives Considered**:
  1. Implicit Flow — シンプルだがセキュリティ脆弱
  2. PKCE Flow — コード検証によりセキュア
- **Selected Approach**: PKCEフローを採用（Supabase SSRのデフォルト）
- **Rationale**: 要件8.3で明示的にPKCE要求、公開クライアントでの標準
- **Trade-offs**: コールバックルートでのコード交換処理が必要
- **Follow-up**: なし（SDKがPKCEを自動処理）

### Decision: ログインページをapp/auth/loginに配置
- **Context**: 認証関連ルートの構造決定
- **Alternatives Considered**:
  1. `/login` — シンプルだがauth関連の分離が不明確
  2. `/auth/login` — 認証関連ルートをグループ化
- **Selected Approach**: `/auth/login`配下に配置
- **Rationale**: 既存proxy.tsの除外パターン（`/auth`）と整合、将来の認証拡張に対応
- **Trade-offs**: URLが1階層深くなる
- **Follow-up**: Headerのログインリンク更新

### Decision: Client Componentでログインボタン実装
- **Context**: OAuth開始にはブラウザのSupabaseクライアントが必要
- **Alternatives Considered**:
  1. Server Actionでリダイレクト — SSRでは`location.origin`取得不可
  2. Client Componentで直接呼び出し — ブラウザコンテキストで動作
- **Selected Approach**: Client Component（"use client"）でログインフォーム実装
- **Rationale**: `signInWithOAuth`はブラウザリダイレクトを使用
- **Trade-offs**: ハイドレーションが必要
- **Follow-up**: ローディング状態のUI実装

## Risks & Mitigations
- **Risk 1**: Discord APIレート制限 — OAuth開始頻度を制限（連打防止）
- **Risk 2**: コールバックURL未設定エラー — 環境セットアップドキュメント整備
- **Risk 3**: セッション同期ずれ — Middleware必須でcookies更新を保証

## References
- [Login with Discord | Supabase Docs](https://supabase.com/docs/guides/auth/social-login/auth-discord) — Discord OAuth設定手順
- [Setting up Server-Side Auth for Next.js | Supabase Docs](https://supabase.com/docs/guides/auth/server-side/nextjs) — Next.js SSR統合ガイド
- [Use Supabase Auth with Next.js | Supabase Docs](https://supabase.com/docs/guides/auth/quickstarts/nextjs) — クイックスタート
