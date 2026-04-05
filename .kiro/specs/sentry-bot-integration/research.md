# Research & Design Decisions

## Summary
- **Feature**: `sentry-bot-integration`
- **Discovery Scope**: Extension（既存BotシステムへのSentry統合）
- **Key Findings**:
  - `@sentry/node` はESMモード（Bot は `"type": "module"`）で `--import` フラグまたはトップレベルの早期インポートが必要
  - Bot の `config.ts` に `sentryDsn` フィールドが既に存在し、`SENTRY_DSN` 環境変数から読み取る仕組みが整っている
  - Web側の `sentry.server.config.ts` パターン（`enabled: Boolean(dsn) && isProduction`）を踏襲可能

## Research Log

### @sentry/node ESM初期化パターン
- **Context**: Bot は `"type": "module"` のESMプロジェクト。Sentry SDK はモジュール読み込み前の早期初期化が必要
- **Sources Consulted**: https://docs.sentry.io/platforms/javascript/guides/node/
- **Findings**:
  - ESMでは `node --import ./instrument.mjs app.mjs` パターンが推奨
  - ただし Bot は `tsx` で開発実行、`node` でプロダクション実行のため、`instrument.ts` を `index.ts` の最初で動的インポートする方式が最も互換性が高い
  - `Sentry.init()` は他のモジュールのインポート前に呼び出す必要がある
- **Implications**: `src/instrument.ts` を作成し、`src/index.ts` の先頭でインポートする

### Sentry.init() オプション
- **Context**: Bot向けの適切な初期化オプションを決定する
- **Sources Consulted**: https://docs.sentry.io/platforms/javascript/guides/node/configuration/options/
- **Findings**:
  - `dsn`: `config.ts` の `sentryDsn` から取得
  - `environment`: `NODE_ENV` から取得（Web側と同じパターン）
  - `release`: `package.json` の `version` フィールドから取得
  - `enabled`: DSNが設定されている場合のみ有効化
  - `tracesSampleRate`: Web側と同じ `0.1` を採用
  - `initialScope.tags`: `{ service: "bot" }` でWeb側と区別
  - `shutdownTimeout`: デフォルト2000ms、グレースフルシャットダウンに十分
- **Implications**: Web側の設定パターンを踏襲しつつ、`service` タグで区別

### 既存Botエラーハンドリングパターン
- **Context**: 既存の catch ブロックに Sentry 報告を追加する方式の検討
- **Sources Consulted**: `packages/bot/src/bot.ts`, `packages/bot/src/events/guild.ts`
- **Findings**:
  - `bot.ts` の `handleInteraction` に既に try-catch + `logger.error` + `safeReplyError` パターンが存在
  - イベントハンドラ（guildCreate/Delete/Update）にも try-catch + `logger.error` が存在
  - 既存の catch ブロックに `captureException` を追加する形で最小限の変更で統合可能
  - ユーティリティ関数 `captureError(error, context)` を作成し、ロガーと Sentry を一元化
- **Implications**: 既存のエラーハンドリングフローを壊さず、`captureException` を追加挿入

## Architecture Pattern Evaluation

| Option | Description | Strengths | Risks / Limitations | Notes |
|--------|-------------|-----------|---------------------|-------|
| 直接統合 | 各 catch ブロックに `Sentry.captureException` を直接呼び出し | シンプル、依存少 | Sentry API への直接依存が分散 | 小規模なら問題なし |
| ユーティリティラッパー | `captureError` ユーティリティで logger + Sentry を統合 | 一元管理、テスト容易 | 薄い抽象化レイヤー追加 | **採用** |

## Design Decisions

### Decision: ユーティリティラッパー方式
- **Context**: 既存の catch ブロックが多数存在し、各所に `Sentry.captureException` を直接書くと重複が多くなる
- **Alternatives Considered**:
  1. 直接 `Sentry.captureException` を各 catch ブロックに追加
  2. `captureError` ユーティリティ関数を作成し、logger.error と captureException を一元化
- **Selected Approach**: ユーティリティ関数方式（Option 2）
- **Rationale**: 一箇所でコンテキスト付与ロジックを管理でき、テスト時にモック可能。将来的にSentry以外の監視ツールへの切り替えも容易
- **Trade-offs**: 薄い抽象化レイヤーが増えるが、Bot のエラーハンドリング箇所（5箇所以上）を考慮すると管理コスト削減のメリットが上回る
- **Follow-up**: テストで `Sentry.captureException` のモック確認

### Decision: instrument.ts の配置
- **Context**: Sentry SDK は他のモジュールより先に初期化が必要
- **Selected Approach**: `src/instrument.ts` を作成し、`src/index.ts` の先頭でインポート
- **Rationale**: tsx（開発）と node（本番）の両方で動作する最も互換性の高い方式

## Risks & Mitigations
- **DSN未設定時のクラッシュ** — `enabled: Boolean(dsn)` で初期化をスキップ、`captureError` 内で Sentry 未初期化時は no-op
- **パフォーマンスへの影響** — `tracesSampleRate: 0.1` で送信量を制限
- **テスト環境での誤送信** — テスト時は DSN を設定しないことで自動無効化

## References
- [Sentry Node.js Setup](https://docs.sentry.io/platforms/javascript/guides/node/) — SDK初期化ガイド
- [Sentry Node.js Options](https://docs.sentry.io/platforms/javascript/guides/node/configuration/options/) — 設定オプション一覧
- [Sentry v8→v9 Migration](https://docs.sentry.io/platforms/javascript/guides/node/migration/v8-to-v9/) — バージョン移行ガイド
