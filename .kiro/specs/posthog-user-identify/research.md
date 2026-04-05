# Research & Design Decisions

## Summary
- **Feature**: `posthog-user-identify`
- **Discovery Scope**: Extension（既存PostHog基盤の拡張）
- **Key Findings**:
  - `posthog-js` v1.352.0+ で `identify(distinctId, properties)` と `reset()` が利用可能
  - 既存 `SentryUserProvider` パターン（`onAuthStateChange` リスナー）を踏襲できる
  - `signOut` Server Action でクライアント側 `posthog.reset()` を直接呼べないため、`onAuthStateChange` の `SIGNED_OUT` イベントで処理する

## Research Log

### PostHog identify / reset API
- **Context**: PostHog JS SDKの identify / reset の仕様確認
- **Sources Consulted**: posthog-js SDK（既存 `lib/analytics/client.ts` で使用中）
- **Findings**:
  - `posthog.identify(distinctId: string, userProperties?: Record<string, unknown>)` — 匿名IDとユーザーIDを紐づけ。第2引数は `$set` プロパティとして送信される
  - `posthog.reset()` — `distinct_id` をリセットし新しい匿名IDを生成。Cookie/memoryの状態もクリア
  - 既に初期化済みの `posthog` インスタンスを `getPostHogClient()` で取得可能
- **Implications**: 新しいライブラリ追加不要。既存の `getPostHogClient()` ヘルパーを活用する

### 認証状態の監視パターン
- **Context**: ログイン/ログアウトのタイミングでidentify/resetを呼ぶ方法
- **Sources Consulted**: `components/sentry/sentry-user-provider.tsx`, `app/auth/actions.ts`
- **Findings**:
  - SentryUserProvider は `onAuthStateChange` でセッション変化を監視し、`setUser()`/`setUser(null)` を呼ぶ
  - `signOut` Server Action は **サーバー側** で実行されるため、クライアント側の `posthog.reset()` は直接呼べない
  - `onAuthStateChange` はサインアウト時に `SIGNED_OUT` イベントを発火するため、そこで `reset()` を呼べる
- **Implications**: SentryUserProviderと同じパターンで `PostHogIdentifyProvider` を作成する。Server Action側でのreset呼び出しは不要

### guild_count の取得タイミング
- **Context**: ユーザープロパティとしてギルド数を送信する方法
- **Sources Consulted**: `app/dashboard/page.tsx`, `lib/guilds/fetch-guilds.ts`
- **Findings**:
  - ギルドデータはダッシュボードのServer Componentで取得される
  - クライアント側で `onAuthStateChange` 時にギルド数を取得するのは複雑（追加APIコール必要）
  - identify 呼び出し時点ではギルド数が不明な場合がある
- **Implications**: guild_count は identify 時に必須としない。ダッシュボード表示時に別途 `posthog.people.set()` で更新する方が適切

## Architecture Pattern Evaluation

| Option | Description | Strengths | Risks / Limitations | Notes |
|--------|-------------|-----------|---------------------|-------|
| Provider パターン（SentryUserProvider 踏襲） | `onAuthStateChange` でidentify/reset | 既存パターンに統一、テスト実績あり | Providerが増える | **採用** |
| PostHogProvider 内に統合 | 既存の `PostHogProvider` に直接 identify ロジックを追加 | ファイル追加なし | 責務が混在、テストが複雑に | 不採用 |
| カスタムフック | `usePostHogIdentify()` フック | 柔軟性高い | 配置場所に依存、レイアウト全体でのカバーが難しい | 不採用 |

## Design Decisions

### Decision: Provider パターンの採用
- **Context**: PostHog identify をアプリ全体で有効にする方法
- **Alternatives Considered**:
  1. 既存 PostHogProvider に統合 — SDKの初期化と identify を同一コンポーネントに
  2. 専用 Provider を新設 — SentryUserProvider と同じパターン
  3. カスタムフック — ページごとに呼び出し
- **Selected Approach**: 専用 Provider（`PostHogIdentifyProvider`）を `lib/analytics/` に新設
- **Rationale**: SentryUserProvider と同じ検証済みパターン。単一責務。テスト容易性。既存の PostHogProvider を変更せずに拡張可能
- **Trade-offs**: Providerのネストが1つ増えるが、責務分離のメリットが上回る
- **Follow-up**: レイアウト内の Provider 順序（PostHogProvider の内側に配置）

### Decision: guild_count の更新戦略
- **Context**: ユーザープロパティとしてギルド数を送信するタイミング
- **Alternatives Considered**:
  1. identify 時に同時送信 — `onAuthStateChange` 時にギルド数を取得して送信
  2. ダッシュボード表示時に送信 — ギルドデータが利用可能なタイミングで `$set`
- **Selected Approach**: ダッシュボード表示時にギルド数を `posthog.people.set()` で送信するユーティリティ関数を提供。identify 時はユーザーIDのみ
- **Rationale**: `onAuthStateChange` 時点ではギルドデータが利用不可。追加APIコールは認証フローに不要な遅延を加える
- **Trade-offs**: 初回ログインからダッシュボード表示までの間は guild_count が未設定

## Risks & Mitigations
- PostHog SDK 未初期化時のエラー → `getPostHogClient()` のnullチェックで吸収（既存パターン）
- `persistence: "memory"` 設定により、ブラウザリロード時にidentifyが失われる → `onAuthStateChange` の `INITIAL_SESSION` イベントで再identify
- Provider ネストの増加 → レイアウトの可読性低下は最小限（1層追加のみ）

## References
- posthog-js SDK: プロジェクト内 `node_modules/posthog-js`（v1.352.0+）
- SentryUserProvider 実装: `components/sentry/sentry-user-provider.tsx`
- PostHog Provider 実装: `lib/analytics/posthog-provider.tsx`
- signOut Server Action: `app/auth/actions.ts`
