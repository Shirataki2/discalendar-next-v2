# Requirements Document

## Introduction

PostHogユーザー識別（identify）機能の導入。Discord OAuth認証後に `posthog.identify()` を呼び出し、匿名IDとユーザーIDを紐づけてユーザー単位の行動追跡を可能にする。ログアウト時には `posthog.reset()` で匿名状態に戻す。これにより、リテンション分析・コホート分析・個別ユーザーのジャーニー追跡が実現される。

## Requirements

### Requirement 1: ログイン時のユーザー識別

**Objective:** アナリティクス管理者として、認証済みユーザーをPostHog上で一意に識別したい。リテンション分析やユーザージャーニー追跡を行えるようにするため。

#### Acceptance Criteria
1. When ユーザーがDiscord OAuthでログインする, the PostHog Client shall `posthog.identify(userId)` を呼び出し匿名IDとユーザーIDを紐づける
2. When 認証状態が変化しセッションが確立される, the PostHog Client shall Supabase Auth の `user.id` をPostHogの `distinct_id` として使用する
3. When ページをリロードし既存セッションが存在する, the PostHog Client shall 自動的に `identify` を再実行してユーザー識別を維持する

### Requirement 2: ユーザープロパティの設定

**Objective:** アナリティクス管理者として、PostHog上でユーザー属性（ギルド数など）を参照したい。コホート分析やセグメント分析を行えるようにするため。

#### Acceptance Criteria
1. When ユーザーが識別される, the PostHog Client shall ユーザープロパティ（`guild_count`）を `$set` で送信する
2. When ギルド数が変化する（ギルド選択画面表示時）, the PostHog Client shall 最新の `guild_count` で `$set` プロパティを更新する

### Requirement 3: ログアウト時のリセット

**Objective:** ユーザーとして、ログアウト後に自分の行動データが次のユーザーに紐づかないことを期待する。プライバシーを保護するため。

#### Acceptance Criteria
1. When ユーザーがログアウトする, the PostHog Client shall `posthog.reset()` を呼び出しユーザー識別を解除する
2. When `posthog.reset()` が呼び出された後, the PostHog Client shall 新しい匿名IDを生成し以降のイベントをその匿名IDに紐づける

### Requirement 4: SSR/クライアント境界の考慮

**Objective:** 開発者として、PostHog identify がクライアントサイドでのみ実行されることを保証したい。SSR環境でのエラーを防止するため。

#### Acceptance Criteria
1. The PostHog Identify Module shall クライアントサイド（`"use client"`）でのみ `identify` / `reset` を実行する
2. If PostHog SDKが未初期化または環境変数が未設定の場合, the PostHog Identify Module shall エラーをスローせずに静かにスキップする
3. The PostHog Identify Module shall 既存の `SentryUserProvider` と同様のパターン（`onAuthStateChange` リスナー）で認証状態を監視する

### Requirement 5: テスト可能性

**Objective:** 開発者として、identify機能が正しく動作することをユニットテストで検証したい。リグレッションを防止するため。

#### Acceptance Criteria
1. The PostHog Identify Module shall ユニットテストで `posthog.identify` / `posthog.reset` の呼び出しを検証できる
2. The PostHog Identify Module shall PostHog SDKをモック可能な形で利用する
