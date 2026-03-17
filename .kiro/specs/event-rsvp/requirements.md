# Requirements Document

## Project Description (Input)

イベントにRSVP（出欠管理）機能を追加する

## 背景

イベント運営において、参加者の出欠状況を事前に把握することは必須。
現状はイベントの作成・閲覧のみで、参加意思を表明する手段がない。

## 目的

イベントに対してユーザーがRSVP（出欠回答）できる機能を追加し、
主催者が参加状況を把握できるようにする。

## 作業内容

* `event_attendees` テーブルで going/maybe/not_going を管理
* イベント詳細画面にRSVPボタン追加
* 参加者一覧の表示
* 設計案は `feature-expansion-plan.md` 8.2節に記載
* Botも管理対象に加えたのでBot側でも出欠を管理できるようにする

## 受け入れ条件

* [ ] `event_attendees` テーブルが作成され、going/maybe/not_going ステータスを管理できる
* [ ] イベント詳細画面にRSVPボタン（参加/未定/不参加）が表示される
* [ ] ユーザーが自分の出欠ステータスを変更できる
* [ ] イベント詳細画面に参加者一覧が表示される（ステータス別）
* [ ] 未ログイン状態ではRSVPボタンが無効化またはログイン誘導される
* [ ] 自分の現在のRSVPステータスがボタンに反映される

## 技術メモ

* RLSポリシー: 自分のレコードのみ INSERT/UPDATE/DELETE 可、閲覧は同ギルドメンバー全員
* Server Actionで upsert パターン（重複回答を防止）

## Metadata

* URL: [https://linear.app/ff2345/issue/DIS-16/イベントにrsvp出欠管理機能を追加する](https://linear.app/ff2345/issue/DIS-16/イベントにrsvp出欠管理機能を追加する)
* Identifier: DIS-16
* Status: In Progress
* Priority: High
* Assignee: Tomoya Ishii
* Labels: Feature
* Created: 2026-02-20T07:51:54.579Z
* Updated: 2026-03-16T15:07:52.298Z

## Sub-issues

* [DIS-100 event_attendeesテーブルとRLSポリシーを作成する](https://linear.app/ff2345/issue/DIS-100/event-attendeesテーブルとrlsポリシーを作成する)
* [DIS-101 RSVP用Server Actionを実装する（upsert/削除）](https://linear.app/ff2345/issue/DIS-101/rsvp用server-actionを実装するupsert削除)
* [DIS-102 イベント詳細画面にRSVPボタンを追加する](https://linear.app/ff2345/issue/DIS-102/イベント詳細画面にrsvpボタンを追加する)
* [DIS-103 イベント詳細画面に参加者一覧を表示する](https://linear.app/ff2345/issue/DIS-103/イベント詳細画面に参加者一覧を表示する)

## Requirements

### Requirement 1: RSVP データ永続化

**Objective:** As a 開発者, I want イベントごとの出欠データを安全に永続化したい, so that Web・Botの両方から一貫した出欠状態を参照・更新できる

#### Acceptance Criteria

1. The Discalendar shall `event_attendees` テーブルで `going` / `maybe` / `not_going` の3種類のステータスを管理する
2. The Discalendar shall 1つのイベントに対して同一ユーザーの出欠レコードを1件のみ保持する（`event_id` + `discord_user_id` のユニーク制約）
3. When ユーザーが出欠を回答した場合, the Discalendar shall upsert パターンでレコードを挿入または更新し、`responded_at` を現在時刻に設定する
4. When イベントが削除された場合, the Discalendar shall 関連する全ての出欠レコードを CASCADE 削除する
5. The Discalendar shall RLSポリシーにより、認証済みユーザーが同一ギルドの出欠データを参照できるようにする
6. The Discalendar shall RLSポリシーにより、ユーザーが自分の `discord_user_id` に一致するレコードのみ INSERT / UPDATE / DELETE できるようにする

### Requirement 2: Web RSVP 操作

**Objective:** As a ログイン済みユーザー, I want イベント詳細画面から出欠を回答したい, so that 主催者や他の参加者に自分の参加意思を伝えられる

#### Acceptance Criteria

1. When ユーザーがイベント詳細（EventPopover）を開いた場合, the Discalendar shall RSVP ボタン群（参加 / 未定 / 不参加）を表示する
2. When ユーザーが RSVP ボタンをクリックした場合, the Discalendar shall Server Action 経由で出欠ステータスを upsert し、UIを即座に更新する
3. While ユーザーが既に出欠を回答済みの場合, the Discalendar shall 現在のステータスに対応するボタンを選択状態（アクティブ）で表示する
4. When ユーザーが現在のステータスと同じボタンをクリックした場合, the Discalendar shall 出欠レコードを削除し、未回答状態に戻す
5. While RSVP の送信が処理中の場合, the Discalendar shall ボタンをローディング状態にし、連続クリックを防止する
6. If Server Action が失敗した場合, the Discalendar shall エラーメッセージを表示し、UIを操作前の状態に戻す（楽観的更新のロールバック）

### Requirement 3: 参加者一覧表示

**Objective:** As a ギルドメンバー, I want イベントの参加者一覧を確認したい, so that 誰が参加予定かを事前に把握できる

#### Acceptance Criteria

1. When ユーザーがイベント詳細を開いた場合, the Discalendar shall ステータス別（参加 / 未定 / 不参加）の参加者数サマリーを表示する
2. When ユーザーがイベント詳細を開いた場合, the Discalendar shall 参加者一覧をステータス別にグループ化して表示する（Discordユーザー名 + アバター）
3. While 出欠回答者がいない場合, the Discalendar shall 「まだ回答がありません」などの空状態メッセージを表示する

### Requirement 4: 未認証ユーザーの制御

**Objective:** As a 未ログインユーザー, I want RSVP 機能の存在を認識しつつ適切に誘導されたい, so that ログインして出欠を回答する動機を得られる

#### Acceptance Criteria

1. While ユーザーが未ログインの場合, the Discalendar shall RSVP ボタンを無効化（disabled）状態で表示する
2. When 未ログインユーザーが無効化された RSVP ボタンをホバーまたはクリックした場合, the Discalendar shall ログインを促すツールチップまたはメッセージを表示する

### Requirement 5: Bot RSVP コマンド

**Objective:** As a Discord ユーザー, I want Discord 内から出欠を回答したい, so that Web アプリを開かずに参加意思を表明できる

#### Acceptance Criteria

1. The Discalendar Bot shall `/rsvp` スラッシュコマンドを提供し、イベント名・ステータス（going / maybe / not_going）を引数として受け付ける
2. When ユーザーが `/rsvp` コマンドを実行した場合, the Discalendar Bot shall `service_role` を使用して `event_attendees` テーブルに upsert する
3. When `/rsvp` コマンドが成功した場合, the Discalendar Bot shall 更新後のステータスと参加者数サマリーを Embed で返信する
4. If 指定されたイベントが存在しない場合, the Discalendar Bot shall エラーメッセージを表示し、直近のイベント一覧を案内する
5. When ユーザーが既に回答済みのステータスと同じ値で `/rsvp` を実行した場合, the Discalendar Bot shall 出欠を取り消し、未回答状態に戻す

### Requirement 6: 繰り返しイベントの RSVP

**Objective:** As a ギルドメンバー, I want 繰り返しイベントの各回ごとに出欠を回答したい, so that 参加できる日とできない日を個別に管理できる

#### Acceptance Criteria

1. The Discalendar shall 繰り返しイベントの RSVP をオカレンス（発生日）単位で管理する（シリーズ全体ではなく各回個別）
2. When ユーザーが繰り返しイベントの特定回に RSVP した場合, the Discalendar shall `event_series_id` + `occurrence_date` の組み合わせで出欠レコードを保存する
3. The Discalendar shall 繰り返しイベントの各回で独立した参加者一覧を表示する
