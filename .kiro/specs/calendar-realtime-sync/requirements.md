# Requirements Document

## Project Description (Input)

カレンダーリアルタイム同期 (Supabase Realtime)

Supabase Realtimeを活用し、他のメンバーがイベントを追加・編集・削除したときにページリロードなしでカレンダーに即時反映する。

## 背景

* 現在はページリロードやナビゲーションでしかデータが更新されない
* Supabase Realtimeは設定済みだが未活用

## やること

* eventsテーブルとevent_seriesテーブルのPostgres Changesをサブスクライブ
* カレンダービューでリアルタイム更新を反映
* 楽観的UI更新との整合性を考慮

## 使用するSupabase機能

* Realtime (Postgres Changes)

## 受け入れ条件

* [ ] eventsテーブルのINSERT/UPDATE/DELETEをRealtimeでサブスクライブしている
* [ ] event_seriesテーブルのINSERT/UPDATE/DELETEをRealtimeでサブスクライブしている
* [ ] 他ユーザーがイベントを追加するとカレンダーにリアルタイムで表示される
* [ ] 他ユーザーがイベントを編集するとカレンダーにリアルタイムで反映される
* [ ] 他ユーザーがイベントを削除するとカレンダーからリアルタイムで消える
* [ ] 楽観的UI更新とRealtime更新が競合しない（二重反映や巻き戻りが起きない）
* [ ] guild_idでフィルタし、現在表示中のギルドの変更のみ反映する
* [ ] コンポーネントのアンマウント時にサブスクリプションが適切にクリーンアップされる

## 技術メモ

* Supabase Realtime Postgres Changesは `supabase.channel()` + `.on('postgres_changes', ...)` で利用
* 同一ギルド内の変更のみ受信するため、RLS or フィルタ条件を適切に設定
* TanStack Query等のキャッシュを使用している場合、Realtimeイベントでキャッシュを無効化/更新する戦略が必要

## Metadata
* URL: [https://linear.app/ff2345/issue/DIS-124/カレンダーリアルタイム同期-supabase-realtime](https://linear.app/ff2345/issue/DIS-124/カレンダーリアルタイム同期-supabase-realtime)
* Identifier: DIS-124
* Status: In Progress
* Priority: Medium
* Assignee: Tomoya Ishii
* Labels: UI UX向上
* Created: 2026-03-27T01:51:30.057Z
* Updated: 2026-03-27T06:11:02.245Z

## Sub-issues

* [DIS-130 Supabase Realtimeサブスクリプション用カスタムフックを作成](https://linear.app/ff2345/issue/DIS-130/supabase-realtimeサブスクリプション用カスタムフックを作成)
* [DIS-131 eventsテーブルのRealtime変更をカレンダーキャッシュに反映](https://linear.app/ff2345/issue/DIS-131/eventsテーブルのrealtime変更をカレンダーキャッシュに反映)
* [DIS-132 event_seriesテーブルのRealtime変更をカレンダーキャッシュに反映](https://linear.app/ff2345/issue/DIS-132/event-seriesテーブルのrealtime変更をカレンダーキャッシュに反映)
* [DIS-133 楽観的UI更新とRealtime更新の競合解消ロジックを実装](https://linear.app/ff2345/issue/DIS-133/楽観的ui更新とrealtime更新の競合解消ロジックを実装)

## Introduction

Discalendarのカレンダービューにおいて、他のギルドメンバーが行ったイベントの追加・編集・削除をページリロードなしでリアルタイムに反映する機能を定義する。Supabase RealtimeのPostgres Changes機能を活用し、eventsテーブルおよびevent_seriesテーブルの変更を購読して、カレンダーUIを自動更新する。

## Requirements

### Requirement 1: リアルタイムサブスクリプション

**Objective:** カレンダー利用者として、eventsおよびevent_seriesテーブルの変更をリアルタイムで受信したい。これにより、他メンバーの操作を即座に把握できる。

#### Acceptance Criteria

1. When カレンダービューがマウントされる, the Realtime Subscription shall eventsテーブルのINSERT・UPDATE・DELETEイベントの購読を開始する
2. When カレンダービューがマウントされる, the Realtime Subscription shall event_seriesテーブルのINSERT・UPDATE・DELETEイベントの購読を開始する
3. When Supabase Realtimeからeventsテーブルの変更イベントを受信する, the Realtime Subscription shall 変更内容（操作種別・変更後データ・変更前データ）をコールバックに通知する
4. When Supabase Realtimeからevent_seriesテーブルの変更イベントを受信する, the Realtime Subscription shall 変更内容（操作種別・変更後データ・変更前データ）をコールバックに通知する

### Requirement 2: ギルドスコープフィルタリング

**Objective:** カレンダー利用者として、現在表示中のギルドに関連する変更のみ受信したい。これにより、無関係なギルドの更新でカレンダーが不要に更新されることを防ぐ。

#### Acceptance Criteria

1. The Realtime Subscription shall 現在選択中のguild_idに一致する変更イベントのみを処理する
2. When ユーザーが表示ギルドを切り替える, the Realtime Subscription shall 旧ギルドの購読を解除し、新ギルドの購読を開始する

### Requirement 3: カレンダーデータ同期

**Objective:** カレンダー利用者として、他メンバーによるイベント操作がカレンダーUIに即時反映されてほしい。これにより、常に最新のスケジュールを確認できる。

#### Acceptance Criteria

1. When eventsテーブルのINSERTイベントを受信する, the Calendar View shall 新しいイベントをカレンダー上に追加表示する
2. When eventsテーブルのUPDATEイベントを受信する, the Calendar View shall 該当イベントの表示内容（タイトル・日時・色など）を更新する
3. When eventsテーブルのDELETEイベントを受信する, the Calendar View shall 該当イベントをカレンダーから削除する
4. When event_seriesテーブルのINSERTイベントを受信する, the Calendar View shall 新しい繰り返しイベント系列をカレンダー上に追加表示する
5. When event_seriesテーブルのUPDATEイベントを受信する, the Calendar View shall 該当繰り返しイベント系列の表示内容を更新する
6. When event_seriesテーブルのDELETEイベントを受信する, the Calendar View shall 該当繰り返しイベント系列をカレンダーから削除する

### Requirement 4: 楽観的UI更新との整合性

**Objective:** カレンダー利用者として、自分が行った操作の楽観的UI更新とRealtimeからの通知が競合せず、一貫した表示を保ちたい。これにより、データの二重反映や巻き戻りが防がれる。

#### Acceptance Criteria

1. When ローカルユーザーの楽観的更新が適用済みの状態でRealtimeから同一操作の通知を受信する, the Calendar View shall 楽観的更新をRealtimeデータで置換し、二重反映を起こさない
2. If Realtimeイベントが楽観的更新と矛盾するデータを含む, the Calendar View shall Realtimeデータ（サーバーの正）を優先して表示を更新する
3. While ローカルユーザーのミューテーションが進行中である, the Calendar View shall 同一エンティティに対するRealtimeイベントの即時反映を保留し、ミューテーション完了後に最新状態を反映する

### Requirement 5: サブスクリプションライフサイクル管理

**Objective:** 開発者として、Realtimeサブスクリプションが適切に管理され、リソースリークが発生しないことを保証したい。これにより、長時間の使用でもパフォーマンスが維持される。

#### Acceptance Criteria

1. When カレンダービューがアンマウントされる, the Realtime Subscription shall 全てのアクティブなチャネル購読を解除する
2. When ブラウザタブが非アクティブになる, the Realtime Subscription shall 購読を維持し、タブがアクティブに戻った際に見逃した変更を反映する
3. If Realtimeの接続が切断される, the Realtime Subscription shall 自動再接続を試行し、再接続後に最新データを取得する
4. The Realtime Subscription shall 同一テーブルに対する重複した購読チャネルを作成しない
