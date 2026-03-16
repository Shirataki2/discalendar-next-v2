# Implementation Plan

- [ ] 1. event_attendees テーブルとデータ基盤を作成する
- [x] 1.1 テーブル・制約・インデックスを作成する
  - `event_attendees` テーブルを作成し、going / maybe / not_going の3ステータスを CHECK 制約で管理する
  - 単発イベント（`event_id`）と繰り返しイベント（`event_series_id` + `occurrence_date`）の排他的参照を CHECK 制約で保証する
  - 同一ユーザー × 同一イベントの重複を防ぐユニーク制約を単発・繰り返しそれぞれに定義する
  - `events` と `event_series` への外部キーに CASCADE 削除を設定する
  - パフォーマンス向上のため、event_id、series + occurrence_date、guild_id、discord_user_id に部分インデックスを作成する
  - _Requirements: 1.1, 1.2, 1.4, 6.1, 6.2_
  - _Contracts: event_attendees テーブル_

- [x] 1.2 RLS ポリシーと ownership 取得関数を作成する
  - SELECT ポリシー: 認証済みユーザーが同一ギルドの出欠データを参照できるようにする（`user_guild_ids()` でフィルタ）
  - INSERT / UPDATE / DELETE ポリシー: `user_id = auth.uid()` で自分のレコードのみ操作可とする
  - `claim_rsvp_ownership()` SECURITY DEFINER 関数を作成し、Bot 経由で作成された `user_id = NULL` のレコードを Web ユーザーが引き取れるようにする
  - _Requirements: 1.5, 1.6_

- [ ] 2. Web RSVP サービス層を実装する
- [ ] 2.1 RSVP 型定義と Discord ユーザー情報ヘルパーを実装する
  - `RsvpStatus`、`AttendeeRecord`、`AttendeeSummary`、`AttendeeData` の型を定義する
  - Supabase の `user_metadata` から Discord ユーザー情報（ID、ユーザー名、アバターURL）を抽出するヘルパー関数を実装する
  - _Requirements: 1.1_
  - _Contracts: RsvpService インターフェース_

- [ ] 2.2 RsvpService を実装する（出欠データの取得・登録・削除）
  - 出欠データ取得: 指定イベントまたはオカレンスの参加者一覧を取得し、ステータス別サマリーと現在ユーザーのステータスを算出する
  - 出欠登録: upsert パターンでステータスを挿入または更新し、`responded_at` を現在時刻に設定する
  - 出欠削除: 指定イベントにおける自分のレコードを削除する（トグル解除用）
  - 単発イベントと繰り返しイベントの両方に対応する（eventId / seriesId + occurrenceDate の排他的指定）
  - 既存の Result 型パターンと `classifySupabaseError()` でエラーハンドリングする
  - _Requirements: 1.3, 6.3_
  - _Contracts: RsvpServiceInterface_

- [ ] 3. Web RSVP Server Actions を実装する
  - `upsertRsvpAction`: 認証チェック → Discord 情報抽出 → ownership 取得 → upsert の一連の処理を実装する
  - `deleteRsvpAction`: 認証チェック → 出欠レコード削除を実装する
  - `fetchAttendeesAction`: 認証チェック → 参加者データ取得を実装する
  - 各アクションで `resolveServerAuth()` によるギルドメンバーシップ検証を行う
  - エラーレスポンスは `sanitizeResult()` で内部詳細を除去する
  - _Requirements: 1.3, 2.2, 2.4_
  - _Contracts: Server Actions インターフェース_

- [ ] 4. RsvpButtons コンポーネントを実装する
- [ ] 4.1 RSVP ボタン群と楽観的更新を実装する
  - 参加 / 未定 / 不参加 の3つのボタンを表示し、現在のステータスに対応するボタンを選択状態で表示する
  - ボタンクリック時に楽観的更新で即座にUIを反映し、Server Action の結果を待つ
  - 同じステータスのボタンを再クリックした場合はレコードを削除し、未回答状態に戻す（トグル動作）
  - 処理中はボタンをローディング状態にし、連続クリックを防止する
  - Server Action 失敗時はエラーメッセージを表示し、UIを操作前の状態に戻す
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_
  - _Contracts: RsvpButtonsProps, State Management_

- [ ] 4.2 未認証ユーザーの RSVP 制御を実装する
  - 未ログイン時は全ボタンを disabled 状態で表示する
  - 無効化されたボタンにホバーまたはクリック時、ログインを促すツールチップを表示する
  - _Requirements: 4.1, 4.2_

- [ ] 5. (P) AttendeeList コンポーネントを実装する
  - ステータス別（参加 / 未定 / 不参加）の参加者数サマリーをインラインで表示する
  - 参加者一覧をステータス別にグループ化し、Discord アバターとユーザー名を表示する
  - 出欠回答者がいない場合は「まだ回答がありません」の空状態メッセージを表示する
  - Task 3 の fetchAttendeesAction に依存するが、Task 4 と並列実行可能（ファイル競合なし）
  - _Requirements: 3.1, 3.2, 3.3_
  - _Contracts: AttendeeList_

- [ ] 6. EventPopover に RSVP 機能を統合する
- [ ] 6.1 RsvpButtons と AttendeeList を EventPopover に組み込む
  - EventPopover の説明セクションの後、編集/削除ボタンの前に RSVP セクションを配置する
  - EventPopover 表示時に参加者データをフェッチし、RsvpButtons と AttendeeList に渡す
  - RSVP ステータス変更時に参加者一覧を再取得して表示を更新する
  - _Requirements: 2.1, 3.1, 3.2_

- [ ] 6.2 繰り返しイベントの RSVP に対応する
  - 繰り返しイベントのオカレンスを表示する際、`event_series_id` と `occurrence_date` を RSVP コンポーネントに渡す
  - 各オカレンスで独立した参加者一覧と RSVP ステータスを表示する
  - _Requirements: 6.1, 6.2, 6.3_

- [ ] 7. (P) Bot RSVP 機能を実装する
- [ ] 7.1 Bot 用 attendee-service を実装する
  - service_role を使用して出欠データの upsert / 削除 / サマリー取得を実装する
  - イベント名でギルド内のイベントを検索する機能を実装する
  - 同じステータスでの再実行時はレコードを削除する（トグル動作）
  - Task 1 の DB スキーマにのみ依存し、Web 側タスク（2〜6）と並列実行可能
  - _Requirements: 5.2, 5.5_
  - _Contracts: AttendeeService_

- [ ] 7.2 /rsvp スラッシュコマンドを実装する
  - `/rsvp` コマンドを定義し、イベント名（Autocomplete 対応）とステータス（going / maybe / not_going）をオプションとして受け付ける
  - コマンド成功時は更新後のステータスと参加者数サマリーを Embed で返信する
  - イベントが見つからない場合はエラーメッセージと直近のイベント一覧を Ephemeral メッセージで案内する
  - _Requirements: 5.1, 5.3, 5.4_
  - _Contracts: RsvpCommand_

- [ ] 8. テストを実装する
- [ ] 8.1 (P) Web サービス・Server Action のテスト
  - RsvpService のユニットテスト: upsert、トグル削除、サマリー集計、空データ、繰り返しイベント
  - Server Action のテスト: 認証チェック、エラーサニタイズ、ownership 取得フロー
  - _Requirements: 1.3, 2.2, 2.4, 6.3_

- [ ] 8.2 (P) UI コンポーネントのテスト
  - RsvpButtons: ボタンクリックでステータス変更、トグル動作、ローディング状態、disabled 状態、エラーロールバック
  - AttendeeList: ステータス別グループ表示、空状態メッセージ、アバター表示
  - _Requirements: 2.1, 2.3, 2.5, 2.6, 3.1, 3.2, 3.3, 4.1, 4.2_

- [ ] 8.3 (P) Bot attendee-service のテスト
  - upsert、トグル削除、サマリー取得、イベント名検索のユニットテスト
  - _Requirements: 5.2, 5.5_
