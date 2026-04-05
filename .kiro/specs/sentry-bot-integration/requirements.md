# Requirements Document

## Introduction
Discord Bot (`packages/bot`) に `@sentry/node` を導入し、Bot側で発生するエラーをSentryで捕捉・報告する。既にWeb側ではSentry統合が完了しており（`sentry.client.config.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts`）、同一Sentryダッシュボードで両方のエラーを一元管理できるようにする。Bot の `config.ts` には `sentryDsn` フィールドが既に存在するが、SDK初期化は未実装。

## Requirements

### Requirement 1: Sentry SDK初期化
**Objective:** 開発者として、BotプロセスでSentry SDKを初期化したい。エラー発生時にSentryへ自動報告できるようにするため。

#### Acceptance Criteria
1. When Bot プロセスが起動した時, the Sentry SDK shall `config.ts` の `sentryDsn` を使用してSDKを初期化する
2. The Sentry SDK shall `environment`（production/development）と `tracesSampleRate` を設定可能にする
3. If `SENTRY_DSN` 環境変数が未設定の場合, the Bot shall Sentry初期化をスキップし、正常に起動を継続する
4. The Sentry SDK shall Bot の `release` 情報（パッケージバージョン等）を含めてイベントを送信する

### Requirement 2: コマンド実行エラーの捕捉
**Objective:** 開発者として、スラッシュコマンド実行時のエラーをSentryに報告したい。ユーザー影響のあるエラーを迅速に検知するため。

#### Acceptance Criteria
1. When スラッシュコマンドの実行中にエラーが発生した時, the Bot shall エラーを `captureException` でSentryに報告する
2. When エラーをSentryに報告する時, the Bot shall コマンド名・ギルドID・ユーザーIDをコンテキスト情報として付与する
3. While エラーがSentryに報告される間, the Bot shall 既存のユーザー向けエラーレスポンス（Discordへの返信）を維持する

### Requirement 3: イベントハンドラエラーの捕捉
**Objective:** 開発者として、Discordイベントハンドラのエラーをsentryに報告したい。サイレントに失敗するイベント処理を検知するため。

#### Acceptance Criteria
1. When Discordイベントハンドラ（guildCreate, guildDelete等）でエラーが発生した時, the Bot shall エラーを `captureException` でSentryに報告する
2. When イベントハンドラエラーを報告する時, the Bot shall イベント種別とギルド情報をコンテキストに含める

### Requirement 4: 未捕捉エラーの処理
**Objective:** 開発者として、プロセスレベルの未捕捉エラーもSentryで報告したい。予期しないクラッシュを見逃さないため。

#### Acceptance Criteria
1. When `unhandledRejection` が発生した時, the Bot shall エラーをSentryに報告する
2. When `uncaughtException` が発生した時, the Bot shall エラーをSentryに報告する
3. The Sentry SDK shall プロセス終了前に未送信イベントをフラッシュする

### Requirement 5: WebとBotの一元管理
**Objective:** 開発者として、WebとBotのエラーを同一Sentryダッシュボードで確認したい。運用効率を向上させるため。

#### Acceptance Criteria
1. The Bot shall Web側と同一の Sentry プロジェクト（同一DSN）にエラーを送信できる構成とする
2. The Bot shall エラーイベントに `service: "bot"` タグを付与し、Web側のエラーと区別可能にする
