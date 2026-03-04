# Requirements Document

## Project Description (Input)

イベント通知チャンネルの選択UIを実装する

### 概要

`event_settings.channel_id` を Web UI から設定できるようにする。ギルド管理者がイベント通知の送信先 Discord チャンネルを選択可能にする。

### 背景

* DB テーブル `event_settings` は既に存在し `channel_id` カラムがある
* `append_notification()` SQL関数も定義済み
* しかし Web アプリ側に設定 UI が存在しない
* Discord BOT 側で通知を送る際のチャンネル指定に必要

### やること

* Discord BOT API からギルドのテキストチャンネル一覧を取得する Server Action
* チャンネル選択 UI（Select コンポーネント）
* `event_settings` テーブルへの upsert Server Action
* ギルド設定ページの「通知」セクションに配置
* BOT がチャンネルに投稿権限を持っているかのバリデーション

### 受け入れ条件

* [ ] ギルド設定ページに「通知チャンネル」セクションが表示される
* [ ] Discord BOT API からテキストチャンネル一覧を取得し、Selectコンポーネントで選択できる
* [ ] チャンネル選択後、`event_settings.channel_id` に保存される（upsert）
* [ ] BOTが投稿権限を持たないチャンネルは選択不可またはバリデーションエラーが表示される
* [ ] 既に設定済みの場合、現在の設定値がSelectに反映される
* [ ] 未設定の場合、プレースホルダーで「チャンネルを選択」が表示される
* [ ] RLSポリシーにより、ギルド管理者のみが設定を変更できる

### 依存関係

* ギルド設定ページの新設（設定ページ内のセクションとして配置）
* Discord BOT の API エンドポイント（チャンネル一覧取得）

### 技術的な考慮事項

* Discord API `GET /guilds/{guild.id}/channels` でチャンネル一覧取得
* BOT トークンが必要（ユーザーの OAuth トークンではなく）
* チャンネルタイプのフィルタリング（テキストチャンネルのみ）
* RLS ポリシー: `event_settings` への書き込み権限制御

## Metadata
* URL: [https://linear.app/ff2345/issue/DIS-64/イベント通知チャンネルの選択uiを実装する](https://linear.app/ff2345/issue/DIS-64/イベント通知チャンネルの選択uiを実装する)
* Identifier: DIS-64
* Status: Backlog
* Priority: Medium
* Assignee: Unassigned
* Labels: Feature
* Created: 2026-03-01T08:38:30.603Z
* Updated: 2026-03-04T09:58:47.481Z

### Sub-issues

* [DIS-74 Discord BOT APIからギルドのテキストチャンネル一覧を取得するServer Actionを実装する](https://linear.app/ff2345/issue/DIS-74/discord-bot-apiからギルドのテキストチャンネル一覧を取得するserver-actionを実装する)
* [DIS-75 通知チャンネル選択UIコンポーネントを実装する](https://linear.app/ff2345/issue/DIS-75/通知チャンネル選択uiコンポーネントを実装する)
* [DIS-76 event_settingsテーブルへのupsert Server Actionを実装する](https://linear.app/ff2345/issue/DIS-76/event-settingsテーブルへのupsert-server-actionを実装する)
* [DIS-77 BOT投稿権限バリデーションとRLSポリシーを実装する](https://linear.app/ff2345/issue/DIS-77/bot投稿権限バリデーションとrlsポリシーを実装する)

## Introduction

本仕様は、Discalendarのギルド設定ページにおけるイベント通知チャンネル選択機能の要件を定義する。ギルド管理者がWeb UIからDiscordテキストチャンネルを選択し、イベント通知の送信先として `event_settings.channel_id` に保存できるようにする。DBスキーマ（`event_settings` テーブル）とBot側通知関数（`append_notification()`）は既に存在するため、本仕様はWeb UIおよびそれを支えるサービス層・Server Actionの要件に焦点を当てる。

## Requirements

### Requirement 1: チャンネル一覧取得

**Objective:** ギルド管理者として、Discord BOT API経由でギルドのテキストチャンネル一覧を取得したい。通知先チャンネルの選択肢として表示するためである。

#### Acceptance Criteria

1. When ギルド設定ページの通知セクションが表示される, the NotificationChannelService shall Discord BOT API (`GET /guilds/{guild.id}/channels`) を呼び出してチャンネル一覧を取得する
2. The NotificationChannelService shall チャンネルタイプがテキストチャンネル（type=0）のもののみをフィルタリングして返す
3. The NotificationChannelService shall 各チャンネルのID・名前・カテゴリ情報を含む構造化データを返す
4. The NotificationChannelService shall BOTトークン（環境変数）を使用してDiscord APIを呼び出す（ユーザーのOAuthトークンは使用しない）
5. If Discord APIからのレスポンスがエラーの場合, the NotificationChannelService shall Result型でエラー情報を返す（`FETCH_FAILED` エラーコード）
6. If Discord APIがレート制限（429）を返した場合, the NotificationChannelService shall `retryAfter` 情報を含むエラーを返す

### Requirement 2: 通知チャンネル選択UI

**Objective:** ギルド管理者として、ドロップダウンからテキストチャンネルを選択したい。直感的に通知先を設定できるようにするためである。

#### Acceptance Criteria

1. The 通知チャンネル選択コンポーネント shall ギルド設定ページの「通知」セクション内にSelectコンポーネントとして表示される
2. The 通知チャンネル選択コンポーネント shall 取得したテキストチャンネル一覧をドロップダウンの選択肢として表示する
3. While チャンネル一覧が読み込み中の場合, the 通知チャンネル選択コンポーネント shall ローディングインジケーターを表示する
4. While 通知チャンネルが未設定の場合, the 通知チャンネル選択コンポーネント shall プレースホルダーテキスト「チャンネルを選択」を表示する
5. While 通知チャンネルが既に設定済みの場合, the 通知チャンネル選択コンポーネント shall 現在の設定値をSelectの初期値として表示する
6. When ユーザーがチャンネルを選択する, the 通知チャンネル選択コンポーネント shall 保存処理中のローディング状態を表示する
7. If チャンネル一覧の取得に失敗した場合, the 通知チャンネル選択コンポーネント shall エラーメッセージを表示し、リトライボタンを提供する

### Requirement 3: 通知チャンネル保存

**Objective:** ギルド管理者として、選択したチャンネルを `event_settings` テーブルに保存したい。Bot側が通知送信時にチャンネル情報を参照できるようにするためである。

#### Acceptance Criteria

1. When ユーザーが通知チャンネルを選択する, the EventSettingsService shall `event_settings` テーブルに `guild_id` と `channel_id` の組み合わせをupsertする
2. The EventSettingsService shall `channel_id` がDiscord Snowflake形式（17-20桁の数字）であることを検証する
3. When 保存が成功した場合, the 通知チャンネル選択コンポーネント shall 成功のフィードバックを表示する
4. If 保存に失敗した場合, the 通知チャンネル選択コンポーネント shall エラーメッセージを表示し、Selectを変更前の値に戻す
5. The EventSettingsService shall 既存レコードがある場合はUPDATE、ない場合はINSERTとして動作する（upsert）

### Requirement 4: BOT投稿権限バリデーション

**Objective:** ギルド管理者として、BOTが投稿権限を持つチャンネルのみ選択可能にしたい。設定後に通知が配信不能になることを防ぐためである。

#### Acceptance Criteria

1. The NotificationChannelService shall 各チャンネルに対するBOTの投稿権限（SEND_MESSAGES）を確認する
2. While BOTが投稿権限を持たないチャンネルの場合, the 通知チャンネル選択コンポーネント shall そのチャンネルを選択不可（disabled）として表示する
3. While BOTが投稿権限を持たないチャンネルの場合, the 通知チャンネル選択コンポーネント shall 権限不足を示す視覚的インジケーターを表示する

### Requirement 5: アクセス制御

**Objective:** システム管理者として、ギルド管理者のみが通知チャンネル設定を変更できるようにしたい。不正な設定変更を防止するためである。

#### Acceptance Criteria

1. The Server Action shall リクエスト元ユーザーのDiscord権限を検証し、`MANAGE_GUILD` 権限を持つ場合のみ設定変更を許可する
2. If ユーザーが `MANAGE_GUILD` 権限を持たない場合, the Server Action shall `PERMISSION_DENIED` エラーを返し、設定変更を拒否する
3. The Server Action shall サーバー側で認証・認可を解決する（クライアント提供の権限情報を信頼しない）
4. The `event_settings` テーブル shall RLSポリシーにより認証済みユーザーのみ読み取りを許可する（書き込みはServer Action経由で制御）

### Requirement 6: 既存設定の読み込み

**Objective:** ギルド管理者として、現在の通知チャンネル設定を確認したい。変更が必要かどうか判断するためである。

#### Acceptance Criteria

1. When ギルド設定ページが読み込まれる, the EventSettingsService shall `event_settings` テーブルから現在の `channel_id` を取得する
2. If 該当ギルドの設定が存在しない場合, the EventSettingsService shall 未設定状態（null）を返す
3. The 通知チャンネル選択コンポーネント shall 取得した設定値に基づいて初期表示を決定する（設定済み: 該当チャンネル名を表示、未設定: プレースホルダー表示）
