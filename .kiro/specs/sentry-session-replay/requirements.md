# Requirements Document

## Introduction
Discalendarでは既にSentry（`@sentry/nextjs`）によるエラー監視が導入されているが、エラー発生時のユーザー操作の再現手順が不明で、デバッグに時間がかかっている。SentryのSession Replay機能を有効化し、エラー発生時にユーザーの操作を動画形式で再現できるようにすることで、エラーの根本原因調査を大幅に効率化する。

## Requirements

### Requirement 1: Session Replay integration の有効化
**Objective:** As a 開発者, I want Sentry Session Replayが既存のSentry設定に統合されている状態, so that エラー発生時にユーザーの操作を動画で再現・確認できる

#### Acceptance Criteria
1. The Discalendar shall `sentry.client.config.ts` に `Sentry.replayIntegration()` を追加してSession Replayを有効化する
2. While 本番環境（`NODE_ENV=production`）で実行中, the Discalendar shall Session Replayのセッション記録を開始する
3. While 開発環境（`NODE_ENV=development`）で実行中, the Discalendar shall Session Replayを無効化する（開発ノイズの混入を防止）

### Requirement 2: サンプリングレート設定
**Objective:** As a 開発者, I want Session Replayのサンプリングレートが適切に設定されている状態, so that コスト・パフォーマンスとデバッグ効率のバランスを保てる

#### Acceptance Criteria
1. The Discalendar shall 通常セッションのリプレイサンプリングレート（`replaysSessionSampleRate`）を低い値（0.1以下）に設定する
2. The Discalendar shall エラー発生セッションのリプレイサンプリングレート（`replaysOnErrorSampleRate`）を1.0（100%）に設定する
3. When エラーが発生したセッションにおいて, the Discalendar shall そのセッションのリプレイを確実にSentryに送信する

### Requirement 3: プライバシー保護設定
**Objective:** As a 開発者, I want ユーザーの個人情報がSession Replayでマスクされている状態, so that プライバシーを保護しつつデバッグに必要な操作フローを記録できる

#### Acceptance Criteria
1. The Discalendar shall Session Replayでテキストコンテンツをデフォルトでマスクする（`maskAllText: true`）
2. The Discalendar shall Session Replayでユーザー入力をデフォルトでブロックする（`blockAllMedia: true`）
3. When Session Replayが記録されSentryに送信された場合, the Discalendar shall ユーザーの個人情報（名前、メールアドレス等）がマスクされた状態で表示される
