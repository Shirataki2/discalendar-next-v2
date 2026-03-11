# Requirements Document

## Project Description (Input)

Botの通知タスクで繰り返し予定（event_series）を通知する

### 背景

Webで作成した繰り返し予定（event_series）がBotの通知タスクから通知されない。
notify.ts の `getFutureEventsForAllGuilds()` が events テーブルのみ参照しており、
event_series テーブルへのアクセスとRRULE展開ロジックがBotパッケージに存在しない。

### 目的

Botの通知タスク（notify.ts）で、繰り返し予定のオカレンスも通常予定と同様に
通知対象とする。Web側の `rrule-utils.ts`（expandOccurrences等）を活用する。

### 現状の技術的制約

* notify.ts の `getFutureEventsForAllGuilds()` が events テーブルのみ参照
* event_series テーブルへのアクセスが一切ない
* RRULE展開ロジック（`rrule-utils.ts`）がBotパッケージに存在しない
* Bot側に `EventSeriesRecord` 型がない

### 受け入れ条件

* [ ] Bot側に `EventSeriesRecord` 型を追加する
* [ ] event_series テーブルから有効なシリーズを取得するサービス関数を追加する
* [ ] Web側 `rrule-utils.ts` の `expandOccurrences` をBotから利用可能にする（共有パッケージ化 or 移植）
* [ ] notify.ts で event_series のオカレンスを展開し、通知時刻を計算して通知する
* [ ] EXDATE（除外日）のオカレンスは通知されない
* [ ] 既存の単発予定（events テーブル）の通知が影響を受けない

### 技術メモ

* Web側の `rrule-utils.ts` は純粋関数で実装済み（外部依存は `rrule` パッケージのみ）
* `expandOccurrences(rrule, dtstart, rangeStart, rangeEnd, exdates?)` が中核ロジック
* Bot側は JST 固定（`JST_OFFSET_MS`）で通知時刻を計算している
* event_series の通知設定は events テーブルと同じ `notifications` JSON カラムを使用する想定

### Metadata
* URL: [https://linear.app/ff2345/issue/DIS-85/botの通知タスクで繰り返し予定event-seriesを通知する](https://linear.app/ff2345/issue/DIS-85/botの通知タスクで繰り返し予定event-seriesを通知する)
* Identifier: DIS-85
* Status: Todo
* Priority: Urgent
* Assignee: Tomoya Ishii
* Labels: Bot
* Created: 2026-03-08T13:30:22.525Z
* Updated: 2026-03-08T18:00:47.461Z

### Sub-issues

* [DIS-90 rrule-utils を共有パッケージとして切り出す](https://linear.app/ff2345/issue/DIS-90/rrule-utils-を共有パッケージとして切り出す)
* [DIS-91 Bot側に EventSeriesRecord 型と event_series 取得サービスを追加する](https://linear.app/ff2345/issue/DIS-91/bot側に-eventseriesrecord-型と-event-series-取得サービスを追加する)
* [DIS-92 notify.ts で繰り返し予定のオカレンスを展開・通知する](https://linear.app/ff2345/issue/DIS-92/notifyts-で繰り返し予定のオカレンスを展開通知する)

## Requirements

### Requirement 1: RRULE展開ロジックの共有
**Objective:** 開発者として、Web側の `rrule-utils.ts` をBotパッケージから利用したい。コードの重複を避け、RRULE展開ロジックを一元管理できるようにするため。

#### Acceptance Criteria
1. The notification task shall RRULE文字列・開始日時・展開範囲・除外日リストを入力としてオカレンス日時の配列を返す関数を利用できる
2. The notification task shall Web側の `expandOccurrences` と同一のRRULE展開結果を返す
3. The shared module shall `rrule` パッケージ以外の外部依存を持たない

### Requirement 2: event_series データ取得
**Objective:** 通知タスクとして、event_series テーブルから通知ウィンドウ内に該当するシリーズを取得したい。繰り返し予定の通知対象を特定するため。

#### Acceptance Criteria
1. When 通知チェックが実行された時, the notification task shall event_series テーブルから有効なシリーズレコードを取得する
2. The notification task shall シリーズレコードの `rrule`, `dtstart`, `duration_minutes`, `notifications`, `exdates` フィールドを取得できる
3. The notification task shall シリーズレコードの `guild_id` に基づいて通知チャンネル設定を解決できる
4. If event_series テーブルへのクエリが失敗した場合, the notification task shall エラーをログに記録し、単発予定の通知処理は継続する

### Requirement 3: オカレンス展開と通知時刻計算
**Objective:** 通知タスクとして、繰り返し予定のRRULEを展開し、各オカレンスの通知タイミングを計算したい。正確なタイミングでDiscordチャンネルに通知を送信するため。

#### Acceptance Criteria
1. When 通知チェックが実行された時, the notification task shall 各シリーズのRRULEを通知ウィンドウ（現在時刻〜最大7日先）の範囲で展開する
2. When オカレンスが展開された時, the notification task shall 各オカレンスの開始時刻と通知設定（`notifications`）から通知タイミングを計算する
3. When 通知タイミングが現在の1分間ウィンドウ内にある時, the notification task shall 対応するDiscordチャンネルに通知Embedを送信する
4. While 終日オカレンスを処理している時, the notification task shall JST（UTC+9）午前0時を基準として通知時刻を計算する
5. When オカレンスの開始時刻がちょうど現在時刻と一致する時, the notification task shall 「以下の予定が開催されます」というセンチネル通知を送信する

### Requirement 4: EXDATE（除外日）の処理
**Objective:** 通知タスクとして、除外日に指定されたオカレンスを通知対象から除外したい。ユーザーが取り消した個別のオカレンスが誤って通知されないようにするため。

#### Acceptance Criteria
1. When シリーズに `exdates` が設定されている時, the notification task shall 該当する日時のオカレンスを展開結果から除外する
2. The notification task shall EXDATE以外のオカレンスは正常に通知する

### Requirement 5: 既存通知との後方互換性
**Objective:** 運用者として、繰り返し予定の通知追加後も既存の単発予定の通知が正常に動作することを保証したい。機能追加によるリグレッションを防ぐため。

#### Acceptance Criteria
1. The notification task shall events テーブルからの単発予定の取得・通知処理を変更しない
2. The notification task shall 単発予定と繰り返し予定の両方を同一の通知チェックサイクル内で処理する
3. If 繰り返し予定の処理でエラーが発生した場合, the notification task shall 単発予定の通知処理に影響を与えない

### Requirement 6: 型安全性
**Objective:** 開発者として、Bot側で event_series テーブルのレコードを型安全に扱いたい。コンパイル時にデータ構造の不整合を検出できるようにするため。

#### Acceptance Criteria
1. The Bot package shall event_series テーブルのカラム構造に対応する `EventSeriesRecord` 型を持つ
2. The `EventSeriesRecord` type shall `id`, `guild_id`, `name`, `description`, `color`, `is_all_day`, `rrule`, `dtstart`, `duration_minutes`, `location`, `channel_id`, `channel_name`, `notifications`, `exdates`, `created_at`, `updated_at` フィールドを含む
3. The notification task shall 繰り返し予定の通知Embedを生成する際に `EventSeriesRecord` の情報を使用する
