# Requirements Document

## Project Description (Input)

ダッシュボードに全サーバー横断の予定一覧を追加する

## 背景

現在、ユーザーは各Discordサーバーのカレンダーページに個別にアクセスして予定を確認する必要がある。
複数サーバーに参加しているユーザーにとって、直近の予定をまとめて把握できないのは不便。

## 目的

ダッシュボードで全参加サーバーの予定を横断的に一覧表示し、直近の予定をひと目で確認できるようにする。

## 受け入れ条件

- [ ] ダッシュボードに「直近の予定」セクションが表示される
- [ ] 参加している全サーバーの予定が時系列順で一覧される
- [ ] 各予定にサーバー名が表示され、どのサーバーの予定か識別できる
- [ ] 予定をクリックすると該当サーバーのカレンダーページに遷移する
- [ ] 予定がない場合は空状態メッセージが表示される
- [ ] ローディング中はスケルトンUIが表示される

## 技術メモ

- 全参加ギルドのイベントを横断取得するAPIまたはServer Actionが必要
- 既存の `fetchGuildEvents` を拡張 or 新規アクションで対応
- パフォーマンス: サーバー数が多い場合の並列取得・ページネーションを検討

## Metadata

- URL: [https://linear.app/ff2345/issue/DIS-120/ダッシュボードに全サーバー横断の予定一覧を追加する](https://linear.app/ff2345/issue/DIS-120/ダッシュボードに全サーバー横断の予定一覧を追加する)
- Identifier: DIS-120
- Status: In Progress
- Priority: Medium
- Assignee: Tomoya Ishii
- Labels: Feature
- Created: 2026-03-22T15:54:44.486Z
- Updated: 2026-03-22T15:59:29.681Z

## Sub-issues

- [DIS-121 全参加サーバーの予定を横断取得するServer Actionを実装する](https://linear.app/ff2345/issue/DIS-121/全参加サーバーの予定を横断取得するserver-actionを実装する)
- [DIS-122 直近の予定一覧コンポーネントを実装する](https://linear.app/ff2345/issue/DIS-122/直近の予定一覧コンポーネントを実装する)
- [DIS-123 ダッシュボードに予定一覧セクションを統合する](https://linear.app/ff2345/issue/DIS-123/ダッシュボードに予定一覧セクションを統合する)

## Requirements

### Requirement 1: 全サーバー横断イベント取得

**Objective:** ログインユーザーとして、参加している全Discordサーバーの直近の予定をまとめて取得したい。サーバーごとに個別にアクセスせずに一括で確認できるようにするため。

#### Acceptance Criteria

1. When ダッシュボードページがロードされた時, the Discalendar shall ユーザーが参加している全ギルドの予定を横断的に取得する
2. The Discalendar shall 取得する予定の範囲を現在日時から30日以内の将来の予定に限定する
3. The Discalendar shall 単発イベント（`events` テーブル）と繰り返しイベント（`event_series` テーブル）の両方を取得対象に含める
4. The Discalendar shall 取得した全サーバーの予定を開始日時の昇順でソートして返す
5. When 参加ギルドが複数ある場合, the Discalendar shall 各ギルドへのイベント取得を並列に実行する

### Requirement 2: 直近の予定一覧表示

**Objective:** ログインユーザーとして、ダッシュボード上で全サーバーの直近予定を一覧形式で視覚的に確認したい。今後の予定をひと目で把握できるようにするため。

#### Acceptance Criteria

1. The Discalendar shall ダッシュボードに「直近の予定」セクションを表示する
2. The Discalendar shall 各予定について、イベント名・開始日時・所属サーバー名を表示する
3. The Discalendar shall 終日イベントと時刻指定イベントを視覚的に区別して表示する
4. The Discalendar shall 各予定にイベントの色を反映して表示する
5. The Discalendar shall 繰り返しイベントの各オカレンスを個別の予定として一覧に含める

### Requirement 3: サーバー識別とナビゲーション

**Objective:** ログインユーザーとして、各予定がどのサーバーのものか識別し、そのサーバーのカレンダーページに直接遷移したい。予定の詳細確認や管理をスムーズに行えるようにするため。

#### Acceptance Criteria

1. The Discalendar shall 各予定の表示にサーバー名とサーバーアイコンを含める
2. When ユーザーが予定をクリックした時, the Discalendar shall 該当サーバーのカレンダーページ（`/dashboard?guild={guildId}`）に遷移する
3. When ユーザーが予定をクリックした時, the Discalendar shall 遷移先のカレンダーで該当イベントの日付が表示されるようにする

### Requirement 4: 空状態とローディング

**Objective:** ログインユーザーとして、データ取得中やデータがない場合でも適切なフィードバックを受けたい。システムの状態を常に把握できるようにするため。

#### Acceptance Criteria

1. While 予定データを取得中の場合, the Discalendar shall スケルトンUIを表示する
2. When 全サーバーを通じて直近の予定が存在しない場合, the Discalendar shall 「直近の予定はありません」を示す空状態メッセージとイラストを表示する
3. If 予定取得中にエラーが発生した場合, the Discalendar shall エラーメッセージを表示し、再取得を促すリトライボタンを表示する
4. When 参加しているサーバーが存在しない場合, the Discalendar shall サーバーにBotを招待するよう案内するメッセージを表示する

### Requirement 5: パフォーマンスと表示制限

**Objective:** ログインユーザーとして、多数のサーバーに参加していても高速に予定一覧を確認したい。レスポンス時間の悪化による体験低下を防ぐため。

#### Acceptance Criteria

1. The Discalendar shall 一覧に表示する予定の件数を最大20件に制限する
2. When 表示上限を超える予定が存在する場合, the Discalendar shall 「さらに表示」または全件確認への導線を提供する
3. The Discalendar shall ダッシュボードの初期表示時に予定一覧のデータをServer Component内でプリフェッチする
