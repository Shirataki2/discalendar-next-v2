# Research & Design Decisions

## Summary
- **Feature**: `analytics-foundation`
- **Discovery Scope**: New Feature（アナリティクスツールの新規導入）
- **Key Findings**:
  - PostHog が Next.js App Router 環境に最適。無料枠（月100万イベント）、カスタムイベント対応、セルフホスト可能
  - Vercel Analytics はカスタムイベント機能が限定的で要件を満たさない。Plausible はプライバシー重視だがカスタムイベントの柔軟性が不足
  - `posthog-js` + `PostHogProvider` パターンで Client Component としてルートレイアウトに統合。SPA遷移のページビューは手動キャプチャが必要

## Research Log

### アナリティクスツール比較
- **Context**: Next.js App Router 環境でカスタムイベント対応のアナリティクスツールを選定
- **Sources Consulted**:
  - [PostHog vs Vercel Web Analytics - Comparison 2025](https://www.stackfix.com/compare/posthog-product-analytics/vercel-product-analytics)
  - [PostHog vs Plausible - Quick Breakdown](https://vemetric.com/blog/posthog-vs-plausible)
  - [PostHog Pricing Breakdown 2025](https://livesession.io/blog/posthog-pricing-breakdown-how-much-does-posthog-cost)
- **Findings**:
  - **PostHog**: 月100万イベント無料、カスタムイベント無制限、セッションリプレイ・Feature Flags・A/Bテスト統合、Next.js公式対応
  - **Vercel Analytics**: 基本的なWebアナリティクスのみ。カスタムイベントは `@vercel/analytics` の `track()` で対応可能だが機能が限定的
  - **Plausible**: プライバシー重視でCookieレス。カスタムイベントは対応するがダッシュボードのカスタマイズ性が低い
- **Implications**: PostHog を選択。将来の Feature Flags、A/Bテスト、セッションリプレイへの拡張パスも確保できる

### PostHog Next.js App Router 統合パターン
- **Context**: PostHog SDK の Next.js App Router での推奨構成を調査
- **Sources Consulted**:
  - [Vercel KB - PostHog Next.js setup](https://vercel.com/kb/guide/posthog-nextjs-vercel-feature-flags-analytics)
  - [posthog-js npm](https://www.npmjs.com/package/posthog-js)
  - [PostHog integration in Next.js App Router](https://reetesh.in/blog/posthog-integration-in-next.js-app-router)
- **Findings**:
  - `posthog-js` パッケージを使用（`next-use-posthog` は deprecated）
  - `"use client"` の Provider コンポーネントで PostHog を初期化
  - `app/layout.tsx`（Server Component）で Provider を wrap
  - SPA遷移のページビューは `usePathname()` + `useSearchParams()` を監視して手動 `capture('$pageview')` が必要
  - Next.js 15+ では `useSearchParams()` を `Suspense` で wrap する必要あり
  - Reverse Proxy（`next.config.js` の `rewrites`）でアドブロッカー回避が可能
- **Implications**: PostHogProvider + PostHogPageView コンポーネントの2層構成を採用

### 既存コードベースの統合ポイント
- **Context**: アナリティクストラッキングを埋め込むべき既存コンポーネントを特定
- **Findings**:
  - **ルートレイアウト**: `app/layout.tsx` — ThemeProvider, TooltipProvider と並列にPostHogProviderを配置
  - **イベントCRUD**: `app/dashboard/actions.ts` — Server Actions（createEventAction, updateEventAction, deleteEventAction）の成功後にクライアント側でトラッキング
  - **カレンダー操作**: `components/calendar/calendar-container.tsx` — handleEventDrop, handleEventResize, handleViewChange, handleNavigate
  - **ギルド切替**: `app/dashboard/dashboard-with-calendar.tsx` — handleGuildSelect（setSelectedGuildId呼び出し箇所）
- **Implications**: Server Actions 自体にはトラッキングを入れず、Client Component のコールバック成功後にキャプチャする方針

## Architecture Pattern Evaluation

| Option | Description | Strengths | Risks / Limitations | Notes |
|--------|-------------|-----------|---------------------|-------|
| 集約ラッパー | `lib/analytics/` にラッパーモジュールを作成し、PostHog APIを抽象化 | ツール切替が容易、型安全なイベント定義 | 抽象化レイヤーの追加 | 採用 |
| 直接呼び出し | 各コンポーネントで `posthog.capture()` を直接呼び出し | シンプル、追加コードなし | ツール切替時の変更範囲が広い、型安全性なし | 不採用 |

## Design Decisions

### Decision: PostHog を採用
- **Context**: アナリティクスツールの選定（PostHog / Vercel Analytics / Plausible）
- **Alternatives Considered**:
  1. Vercel Analytics — Next.js ネイティブだがカスタムイベント機能が限定的
  2. Plausible — プライバシー重視だが分析機能が浅い
  3. PostHog — オールインワンのプロダクトアナリティクス
- **Selected Approach**: PostHog Cloud（`posthog-js` パッケージ）
- **Rationale**: 月100万イベント無料で十分な規模。カスタムイベント、セッションリプレイ、Feature Flagsが統合されており将来の拡張に有利。Next.js App Router の公式対応あり
- **Trade-offs**: Vercel Analytics に比べてバンドルサイズがやや大きい。ただしdynamic importで遅延読み込み可能
- **Follow-up**: 本番トラフィック増加時にコスト推移を監視

### Decision: 薄いラッパーモジュール方式
- **Context**: 各コンポーネントからのトラッキング呼び出し方式
- **Alternatives Considered**:
  1. 直接 `posthog.capture()` 呼び出し — シンプルだが密結合
  2. カスタムフック `useAnalytics()` — 型安全だがフックの制約あり
  3. `lib/analytics/` ラッパー + 型定義 — ツール非依存、型安全
- **Selected Approach**: `lib/analytics/` にラッパーモジュールを作成。イベント名とプロパティの型を定義し、PostHog API を内部で呼び出す
- **Rationale**: ツール変更時の影響を局所化。イベント名のtypoを型レベルで防止。Server Actions等のサーバーコードからは呼ばない前提で、クライアント専用モジュール
- **Trade-offs**: 小規模な抽象化レイヤーが追加されるが、メンテナンス性が向上

### Decision: クライアントサイドのみでトラッキング
- **Context**: SSR/RSC 環境でのトラッキング戦略
- **Selected Approach**: トラッキングはすべてクライアントサイド（`"use client"` コンポーネント）で実行。Server Actions や Server Components ではトラッキングしない
- **Rationale**: PostHog の `posthog-js` はブラウザ専用。Server Actions の成功/失敗はクライアント側のコールバックで検知可能。サーバーサイドトラッキング（`posthog-node`）は現時点では不要
- **Trade-offs**: サーバーサイドのみで完結するフロー（例: Webhook受信）はトラッキングできないが、現要件には該当しない

## Risks & Mitigations
- **アドブロッカーによるブロック**: Reverse Proxy（`/ingest` rewrites）で軽減可能。初期段階では未対応でも可
- **バンドルサイズ増加**: `posthog-js` は約30KB（gzip）。dynamic import で初期読み込みへの影響を最小化
- **PII漏洩リスク**: ラッパーモジュールで送信プロパティを型制約し、意図しないデータ送信を防止
- **SDK読み込み失敗**: PostHogProvider が失敗してもアプリケーション動作に影響しない設計（Requirement 6.4）

## References
- [PostHog Next.js App Router guide (Vercel KB)](https://vercel.com/kb/guide/posthog-nextjs-vercel-feature-flags-analytics)
- [posthog-js npm package](https://www.npmjs.com/package/posthog-js)
- [PostHog Pricing](https://posthog.com/pricing)
- [PostHog vs Vercel Analytics Comparison](https://www.stackfix.com/compare/posthog-product-analytics/vercel-product-analytics)
