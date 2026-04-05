# Research & Design Decisions

## Summary
- **Feature**: `sentry-session-replay`
- **Discovery Scope**: Extension（既存Sentry設定への機能追加）
- **Key Findings**:
  - Session Replayはクライアント（ブラウザ）専用。`sentry.client.config.ts` のみ変更が必要
  - `@sentry/nextjs` v10.39.0 に `replayIntegration` が同梱済み。追加パッケージ不要
  - プライバシー設定は `replayIntegration()` のオプションで制御（`maskAllText`, `blockAllMedia`）

## Research Log

### Session Replay API（@sentry/nextjs v10）
- **Context**: 既存Sentry設定に Session Replay を追加する方法の確認
- **Sources Consulted**: [Sentry Docs - Set Up Session Replay for Next.js](https://docs.sentry.io/platforms/javascript/guides/nextjs/session-replay/)
- **Findings**:
  - `Sentry.replayIntegration()` を `integrations` 配列に追加
  - `replaysSessionSampleRate`（通常セッション）と `replaysOnErrorSampleRate`（エラーセッション）を `init()` に設定
  - 公式ドキュメントは `instrumentation-client.ts` を推奨するが、本プロジェクトは `sentry.client.config.ts` パターンを採用済み
- **Implications**: 既存の `sentry.client.config.ts` に統合する。新規ファイル作成は不要

### プライバシーオプション
- **Context**: 個人情報マスキングの設定方法
- **Sources Consulted**: [Sentry Docs - Session Replay Configuration](https://docs.sentry.io/platforms/javascript/guides/nextjs/session-replay/configuration/)
- **Findings**:
  - `maskAllText: true` — テキストをアスタリスクに置換（デフォルト `true`）
  - `maskAllInputs: true` — フォーム入力をマスク（デフォルト `true`）
  - `blockAllMedia: true` — 画像・動画をプレースホルダーに置換（デフォルト `true`）
  - 既存の `sendDefaultPii: false` と併用可能
- **Implications**: Sentryのデフォルト設定が既にプライバシー保護的。明示的に `true` を設定して意図を明確にする

### 既存設定の互換性
- **Context**: 既存の `sentry.client.config.ts` への影響確認
- **Findings**:
  - 現在 `init()` から直接 `init({...})` を呼んでいるが、`integrations` は未指定
  - `replayIntegration()` 追加時、`import` を `* as Sentry` に変更する必要がある
  - `enabled: Boolean(dsn) && isProduction` の既存条件でReplayの環境分離も自動的に制御される
- **Implications**: `enabled` フラグが既にあるため、Replay固有の環境分離ロジックは不要

## Design Decisions

### Decision: `sentry.client.config.ts` の既存パターンを維持
- **Context**: Sentry公式は `instrumentation-client.ts` を推奨するが、本プロジェクトは `sentry.client.config.ts` を使用中
- **Alternatives Considered**:
  1. `instrumentation-client.ts` に移行 — 公式推奨だがリファクタリングが必要
  2. `sentry.client.config.ts` に追加 — 既存パターンを維持
- **Selected Approach**: 既存ファイルに追加
- **Rationale**: Session Replay有効化のスコープに移行作業を含めるべきではない。既存パターンの動作に問題がないため
- **Trade-offs**: 公式推奨からは若干乖離するが、一貫性を優先

### Decision: import スタイルの変更
- **Context**: `replayIntegration` は名前空間アクセス `Sentry.replayIntegration()` で呼ぶのが一般的
- **Selected Approach**: `import * as Sentry from "@sentry/nextjs"` に変更し、`Sentry.init()` + `Sentry.replayIntegration()` を使用
- **Rationale**: 公式ドキュメントのパターンに準拠。将来の integration 追加時にも対応しやすい

## Risks & Mitigations
- **バンドルサイズ増加**: Session Replay SDKがクライアントバンドルに追加される → `replaysSessionSampleRate` を低く設定し、lazy-loadingはSentry SDKが内部で処理
- **パフォーマンス影響**: DOM変更の記録によるオーバーヘッド → サンプリングレートで制御。エラー時のみ100%記録

## References
- [Set Up Session Replay | Sentry for Next.js](https://docs.sentry.io/platforms/javascript/guides/nextjs/session-replay/)
- [Session Replay Configuration](https://docs.sentry.io/platforms/javascript/guides/nextjs/session-replay/configuration/)
- [Replay Integration API](https://docs.sentry.io/platforms/javascript/guides/nextjs/configuration/integrations/replay/)
