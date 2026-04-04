# Requirements Document

## Introduction

Discord Botの通知タスク（`notify.ts`）は1分間隔でイベント通知を検索・送信しているが、送信済みの記録がDB/メモリに保持されていない。Bot再起動やクラッシュ復旧時に同一分のウィンドウ内で重複送信される可能性がある。本仕様は`sent_notifications`テーブルを追加し、通知送信のべき等性（idempotency）を確保する。

## Project Description (Input)

Bot通知送信の重複防止機構

Botの通知タスクに送信済みフラグがなく、再起動時に重複送信される可能性がある。

## 背景

notify.ts が1分間隔で通知対象を検索・送信しているが、送信済みの記録がDB/メモリに保持されていない。Bot再起動時に同じ通知が再送される。現在は「再起動頻度が低いことを前提に重複を許容する設計」（notify.ts L271-275）として意図的にスキップされている。

## 目的

sent_notifications テーブルを追加し、通知送信のべき等性を確保する。

## 受け入れ条件

- [ ] Bot再起動後も同じ通知が重複送信されない
- [ ] 通知の送信済み状態がDBに永続化される（sent_notifications テーブル）
- [ ] 古い送信済みレコードが自動クリーンアップされる（7日以上前のレコード削除）
- [ ] 既存の通知ロジック（単発・繰り返し）が正常に動作する

## 技術メモ

- `sent_notifications` テーブル: `(event_id, guild_id, notification_type, sent_at)` をユニークキーに
- 通知送信前に送信済みチェックを追加（`notify.ts` の `checkEventNotifications` 内）
- クリーンアップはBot起動時 or 定期タスクで実行
- 繰り返しイベントのオカレンスは `event_series_id + occurrence_date` で識別

## Metadata

- URL: [https://linear.app/ff2345/issue/DIS-88/bot-通知送信の重複防止機構を実装する](https://linear.app/ff2345/issue/DIS-88/bot-通知送信の重複防止機構を実装する)
- Identifier: DIS-88
- Status: In Progress
- Priority: High
- Assignee: Tomoya Ishii
- Labels: Bot
- Created: 2026-03-08T13:30:43.280Z
- Updated: 2026-04-03T18:49:47.096Z

## Requirements

### Requirement 1: 送信済み通知の永続化

**Objective:** Botの運用者として、通知送信済みの状態がDBに永続化されることで、Bot再起動後も通知の送信状態を正確に把握できるようにしたい

#### Acceptance Criteria

1. The Notification Service shall `sent_notifications`テーブルにイベントID、ギルドID、通知タイプ、送信日時を記録する
2. When 通知が正常に送信された場合, the Notification Service shall 送信済みレコードをDBに永続化する
3. The `sent_notifications` テーブル shall `(event_id, guild_id, notification_type)`の組み合わせでユニーク制約を持つ
4. When 繰り返しイベントのオカレンスに対して通知を送信する場合, the Notification Service shall `event_series_id`とオカレンス日時を組み合わせたIDで個別に送信済みを管理する

### Requirement 2: 通知送信の重複防止

**Objective:** Discordサーバーのメンバーとして、同じ通知が重複して送信されないことで、チャンネルのノイズが軽減されるようにしたい

#### Acceptance Criteria

1. When 通知を送信しようとする場合, the Notification Service shall 送信前に`sent_notifications`テーブルを参照し、既に送信済みかどうかを確認する
2. If 同一の`(event_id, guild_id, notification_type)`の組み合わせで送信済みレコードが存在する場合, the Notification Service shall 通知送信をスキップする
3. When Bot再起動後に通知チェックが再開された場合, the Notification Service shall 再起動前に送信済みの通知を再送しない
4. While 通知チェックが1分間隔で実行されている間, the Notification Service shall 送信済みチェックにより同一通知が複数回送信されることを防ぐ

### Requirement 3: 送信済みレコードの自動クリーンアップ

**Objective:** システム運用者として、古い送信済みレコードが自動的に削除されることで、データベースの肥大化を防ぎたい

#### Acceptance Criteria

1. The Notification Service shall 7日以上前の送信済みレコードを自動的に削除する
2. When クリーンアップが実行される場合, the Notification Service shall 削除したレコード数をログに記録する
3. If クリーンアップ中にエラーが発生した場合, the Notification Service shall エラーをログに記録し、通知処理自体は継続する

### Requirement 4: 既存通知ロジックとの互換性

**Objective:** Botの運用者として、重複防止機構の導入後も既存の通知ロジック（単発イベント・繰り返しイベント）が正常に動作することを確認したい

#### Acceptance Criteria

1. When 単発イベントの通知時刻が到来した場合, the Notification Service shall 従来通り通知を送信し、送信済みレコードを記録する
2. When 繰り返しイベントの各オカレンスの通知時刻が到来した場合, the Notification Service shall オカレンスごとに独立して通知を送信し、送信済みレコードを記録する
3. When イベントに複数の通知設定（例: 30分前、1時間前）がある場合, the Notification Service shall 各通知タイプを独立して送信・管理する
4. When 開始時刻のセンチネル通知（`__start__`）が到来した場合, the Notification Service shall 他の通知タイプと同様に重複防止を適用する
