# Requirements Document

## Project Description (Input)
DIS-173: 日程投票機能（/poll）

Discord Botに /poll コマンドを追加し、複数の候補日時に対して参加者が ○/△/× で投票できる日程調整機能を実装する。投票締切後（または運営の手動操作で）最多得票の候補をワンクリックで本イベント化し、既存の events テーブル／カレンダーUIへ反映する。

## 背景・狙い
現状はイベント作成時点で日時が確定している前提で、『みんなの都合を聞いてから決める』フローが存在しない。Sesh等の競合にも投票→カレンダー反映を一気通貫で行える機能はなく、Discalendarの差別化軸（Discord × 視覚性 × 共有）を押し上げる有力な機能。

## 想定フロー
1. ギルド管理者が `/poll` で候補日時を複数（例: 3〜5件）登録
2. Bot がギルドの通知チャンネルに投票用メッセージを投稿（埋め込み＋ボタン or セレクトメニュー）
3. メンバーが候補ごとに ○（参加）/ △（未定）/ ×（不参加）を回答
4. Web のカレンダー／ギルド画面から投票状況をリアルタイムで確認
5. 運営が『この候補で確定』ボタンを押すと、その候補日時が events テーブルに挿入され、通常のイベントと同様に RSVP・通知・ICS 出力の対象になる

## スコープ（初版）
- Bot: `/poll create`, `/poll close`, `/poll finalize` 相当のサブコマンド
- Web: 投票中ポーリング一覧画面、候補ごとの集計表示、確定操作
- DB: event_polls / event_poll_options / event_poll_votes テーブルを新設
- 既存 events への昇格ロジック（finalize 時の INSERT）

## スコープ外（将来拡張）
- Googleカレンダーの空き時間との自動突合
- 投票の匿名化モード
- 投票締切の自動化（cron）は v2 以降で検討

## 受け入れ条件（ドラフト）
- Bot から候補日時を最大 10 件まで登録できる
- メンバーは各候補に対し ○/△/× を1回答できる（上書き可）
- Web 画面で候補ごとの投票人数を確認できる
- 『確定』操作で events テーブルにイベントが作成され、投票は closed 状態になる
- 繰り返しイベント（event_series）との混在を壊さない

## Introduction

本機能は、Discalendar にイベント日程を「投票で決める」フローを追加するものである。Discord Bot の `/poll` スラッシュコマンドを起点に、ギルド管理者が複数の候補日時を登録し、メンバーが各候補に ○/△/× で回答する。Web 側では投票一覧と集計をリアルタイムで確認でき、管理者が最多得票の候補を「確定」すると既存の `events` テーブルへ通常イベントとして昇格する。本機能は Bot / Web / DB をまたぐ新機能であり、既存イベント（通常イベント・繰り返しイベント）との整合性を崩さないことが必須要件となる。

## Requirements

### Requirement 1: Bot 投票作成コマンド（/poll create）
**Objective:** ギルド管理者として、`/poll create` コマンドで複数の候補日時を登録し、ギルドメンバーに投票を依頼したい。これにより、固定日時を決める前にメンバーの都合を収集できる。

#### Acceptance Criteria
1. When ギルド管理者が `/poll create` サブコマンドをタイトル・候補日時リスト付きで実行した場合, the Bot Poll Command Service shall 指定チャンネル（未指定時はギルドの通知チャンネル）に投票用埋め込みメッセージと ○/△/× ボタンを持つメッセージを投稿する。
2. When `/poll create` に渡された候補日時が11件以上である場合, the Bot Poll Command Service shall コマンドをエラー応答し、『候補日時は最大10件までです』の旨をephemeral メッセージで返す。
3. When `/poll create` に渡された候補日時が1件以下である場合, the Bot Poll Command Service shall 『候補日時は2件以上指定してください』と ephemeral メッセージで返し、投票を作成しない。
4. If コマンド実行者がギルドの `ManageEvents` または `ManageGuild` 権限を持たない場合, then the Bot Poll Command Service shall 『このコマンドは管理者のみ利用できます』と ephemeral メッセージで返し、投票を作成しない。
5. When 投票メッセージ投稿に成功した場合, the Bot Poll Command Service shall `event_polls`・`event_poll_options` テーブルにレコードを作成し、status を `open` にする。
6. If Supabase への書き込みが失敗した場合, then the Bot Poll Command Service shall Discord 側に投稿済みの投票メッセージを削除（または失敗マークに更新）し、実行者に失敗理由を ephemeral メッセージで返す。
7. The Bot Poll Command Service shall 各候補日時を UTC で保存し、Discord 上の表示にはギルドのタイムゾーンまたは Discord の `<t:unix:F>` タイムスタンプを使用する。

### Requirement 2: Bot 投票回答（○/△/× 反応）
**Objective:** ギルドメンバーとして、候補日時ごとに Discord 上で ○（参加）/ △（未定）/ ×（不参加）を選択し、都合を表明したい。

#### Acceptance Criteria
1. When ユーザーが投票メッセージの候補ボタン（○/△/×）をクリックした場合, the Bot Poll Interaction Handler shall `event_poll_votes` テーブルに (poll_id, option_id, user_id, choice) のレコードを upsert する。
2. When 同一ユーザーが同一候補に対して異なる選択肢を再度クリックした場合, the Bot Poll Interaction Handler shall 既存レコードを新しい choice に上書きし、履歴ではなく最新状態のみを保持する。
3. When ユーザーが同一候補に対して既に選択した選択肢を再度クリックした場合, the Bot Poll Interaction Handler shall 当該ユーザーのその候補に対する投票を取り消し（削除）、ephemeral メッセージで『投票を取り消しました』と返す。
4. If 投票メッセージが属する `event_polls.status` が `open` でない場合, then the Bot Poll Interaction Handler shall 投票を受け付けず『この投票はすでに締め切られています』と ephemeral メッセージで返す。
5. When 投票レコードが変化した場合, the Bot Poll Interaction Handler shall 投票メッセージの埋め込みを最新集計（候補ごとの ○/△/× 人数）で更新する。
6. The Bot Poll Interaction Handler shall 投票結果を返却する際、各候補の○/△/× の人数と投票者一覧（○の回答者のみ）を Discord 埋め込みで表示する。

### Requirement 3: Bot 投票締切コマンド（/poll close）
**Objective:** ギルド管理者として、`/poll close` で手動で投票を締め切り、以降の回答を防ぎたい。

#### Acceptance Criteria
1. When ギルド管理者が `/poll close <poll_id>` を実行した場合, the Bot Poll Command Service shall 対象の `event_polls.status` を `closed` に更新する。
2. When 投票が締め切られた場合, the Bot Poll Command Service shall 投票メッセージの埋め込みに『締切済』を表示し、○/△/× ボタンを無効化（disabled）する。
3. If 指定された `poll_id` が存在しない、または実行者のギルドに属さない場合, then the Bot Poll Command Service shall 『該当する投票が見つかりません』と ephemeral メッセージで返す。
4. If 対象の投票が既に `closed` または `finalized` 状態である場合, then the Bot Poll Command Service shall 状態を変更せず『この投票はすでに締め切られています』と ephemeral メッセージで返す。
5. If コマンド実行者がギルドの `ManageEvents` または `ManageGuild` 権限を持たない場合, then the Bot Poll Command Service shall 投票を締め切らず、権限エラーを ephemeral メッセージで返す。

### Requirement 4: Bot 投票確定コマンド（/poll finalize）
**Objective:** ギルド管理者として、`/poll finalize` または Web の確定ボタンで最多得票候補を正式イベントに昇格させたい。これにより、投票結果を一貫したイベント管理に取り込める。

#### Acceptance Criteria
1. When ギルド管理者が `/poll finalize <poll_id> [option_id]` を実行した場合, the Poll Finalization Service shall 指定された option_id（未指定時は○票数が最多の候補）を確定候補として選択する。
2. When 確定候補が選択された場合, the Poll Finalization Service shall `events` テーブルに当該ギルドの通常イベントとして 1 件 INSERT し、タイトル・説明・日時を投票の候補値から引き継ぐ。
3. When 確定が完了した場合, the Poll Finalization Service shall `event_polls.status` を `finalized` に更新し、`finalized_option_id` と `finalized_event_id` を記録する。
4. When ○票数の最多が複数候補で同数の場合, the Poll Finalization Service shall 同数の候補を一覧表示し、『どの候補を確定しますか？』と実行者に選択を促す（option_id 指定が必須になる）。
5. If `event_polls.status` が `open` 状態のままで finalize コマンドが呼ばれた場合, then the Poll Finalization Service shall まず投票を `closed` に遷移させてから確定処理を実行する。
6. If 対象の投票が既に `finalized` 状態である場合, then the Poll Finalization Service shall 再度のイベント作成を行わず『この投票はすでに確定済みです』と ephemeral メッセージで返す。
7. If `events` テーブルへの INSERT が失敗した場合, then the Poll Finalization Service shall `event_polls.status` を元の状態に戻し、失敗理由を実行者に返す（投票データは破壊しない）。
8. When 確定が成功した場合, the Poll Finalization Service shall 元の投票メッセージの埋め込みに『確定: <候補日時>』を表示し、作成された events への Web リンク（例: `/dashboard?event=<event_id>`）を含める。
9. The Poll Finalization Service shall 確定で作成した events レコードの作成者（created_by）を finalize 実行者の Discord ユーザーとして記録する。

### Requirement 5: Web 投票一覧・集計画面
**Objective:** ギルド管理者およびメンバーとして、Web 画面から進行中の投票と候補ごとの集計を確認したい。Discord を開かずに状況を把握するためである。

#### Acceptance Criteria
1. When 認証済みユーザーが対象ギルドの投票一覧ページを開いた場合, the Web Poll List Service shall 当該ギルドの `event_polls` のうち status が `open` または `closed` のレコードを新しい順に一覧表示する。
2. When ユーザーが投票詳細ページを開いた場合, the Web Poll Detail Service shall 候補ごとの ○/△/× 人数と、各候補の ○ 回答者の Discord 表示名一覧を表示する。
3. While 詳細ページが表示されている間, the Web Poll Detail Service shall Supabase Realtime の購読または定期ポーリング（30秒以内）により、最新の集計結果を自動更新する。
4. If 対象ユーザーが当該ギルドのメンバーでない場合, then the Web Poll List Service shall 投票一覧・詳細ページへのアクセスを拒否し、403 または空の結果を返す。
5. Where ユーザーがギルドの管理権限（`ManageEvents` 相当）を持つ場合, the Web Poll Detail Service shall 『この候補で確定』ボタンおよび『投票を締切』ボタンを候補行／ヘッダーに表示する。
6. When 管理者が Web で『この候補で確定』ボタンを押下した場合, the Web Poll Finalize Action shall サーバーアクション経由で Requirement 4 と同一の Poll Finalization Service を呼び出し、成功時はダッシュボードのイベント詳細にリダイレクトする。
7. When 管理者が Web で『投票を締切』ボタンを押下した場合, the Web Poll Close Action shall Requirement 3 の投票締切ロジックと同一の状態遷移を適用する。

### Requirement 6: データモデル（event_polls / event_poll_options / event_poll_votes）
**Objective:** データ層として、投票・候補・回答を正規化して保持し、既存 events との参照整合性を保ちたい。

#### Acceptance Criteria
1. The Event Poll Schema shall `event_polls` テーブルを以下のカラムで定義する: `id` (uuid, PK), `guild_id` (text, FK to guilds.id), `title` (text), `description` (text, nullable), `status` (text, enum: `open` | `closed` | `finalized`), `created_by` (text, Discord user ID), `channel_id` (text), `message_id` (text, nullable), `finalized_option_id` (uuid, nullable, FK to event_poll_options.id), `finalized_event_id` (uuid, nullable, FK to events.id), `created_at`, `updated_at`。
2. The Event Poll Schema shall `event_poll_options` テーブルを以下のカラムで定義する: `id` (uuid, PK), `poll_id` (uuid, FK to event_polls.id, ON DELETE CASCADE), `starts_at` (timestamptz), `ends_at` (timestamptz, nullable), `position` (integer, 表示順), `created_at`。
3. The Event Poll Schema shall `event_poll_votes` テーブルを以下のカラムで定義する: `id` (uuid, PK), `poll_id` (uuid, FK to event_polls.id, ON DELETE CASCADE), `option_id` (uuid, FK to event_poll_options.id, ON DELETE CASCADE), `user_id` (text, Discord user ID), `choice` (text, enum: `yes` | `maybe` | `no`), `created_at`, `updated_at`、かつ `(option_id, user_id)` 複合 UNIQUE 制約を持つ。
4. The Event Poll Schema shall RLS ポリシーを設定し、`event_polls` / `event_poll_options` / `event_poll_votes` の SELECT を当該ギルドに所属する認証済みユーザーのみに許可する。
5. The Event Poll Schema shall Bot の service key ロールに対し、`event_polls` / `event_poll_options` / `event_poll_votes` の INSERT / UPDATE / DELETE を許可する（Web クライアントの直接 INSERT は禁止とし、Server Action 経由のみ許可する）。
6. When `event_polls` レコードが DELETE された場合, the Event Poll Schema shall 関連する `event_poll_options` および `event_poll_votes` を ON DELETE CASCADE で一括削除する。
7. The Event Poll Schema shall 候補数（`event_poll_options.position` の最大値 + 1）が 10 を超える INSERT を CHECK 制約またはトリガで禁止する。

### Requirement 7: 既存イベント・繰り返しイベントとの混在保護
**Objective:** システムとして、投票から昇格した通常イベントが既存の繰り返しイベント（event_series）と混在しても整合性を保ちたい。

#### Acceptance Criteria
1. When 投票 finalize によって `events` に INSERT する場合, the Poll Finalization Service shall `events.series_id` を NULL（単発イベント）として作成し、既存 `event_series` の生成ルールに影響を与えない。
2. The Poll Finalization Service shall 投票 finalize で作成された events の通知・RSVP・ICS 出力について、既存イベントと同一のハンドラを使用する（別系統を作らない）。
3. If 投票候補の日時が既存の他イベントと重複する場合, then the Poll Finalization Service shall 確定自体はブロックせず、警告メッセージに『同時間帯に既存イベント <タイトル> があります』を含める。
4. When 投票メッセージが削除された（Discord 側で手動削除）場合, the Bot Poll Interaction Handler shall 次回の投票操作（ボタン押下）検知時に `event_polls.message_id` を NULL に更新するか `status` を `closed` に変更し、500 エラーを返さない。
5. The Event Poll Schema shall `event_polls` と `events` の外部キー `finalized_event_id` を ON DELETE SET NULL とし、events 側が削除されても投票レコード自体は残す。

### Requirement 8: 監査・ログ
**Objective:** 運用担当として、投票の作成・締切・確定のライフサイクルを追跡したい。障害時の原因調査と不正操作の検出のためである。

#### Acceptance Criteria
1. When `/poll create`, `/poll close`, `/poll finalize` のいずれかが実行された場合, the Bot Logger shall 実行者 user_id、ギルド ID、poll_id、操作種別、結果 (success/failure) を構造化ログ（pino）で出力する。
2. When 投票が `finalized` 状態に遷移した場合, the Poll Finalization Service shall `event_polls.updated_at` を更新し、finalize 実行者の Discord user_id を `updated_by` 相当のカラム（または `finalized_by` カラム）に記録する。
3. If Web 側の確定アクションが失敗した場合, then the Web Poll Finalize Action shall Server Action 層で構造化ログを出力し、ユーザーには汎用エラーメッセージのみを返す（内部実装を漏洩させない）。
