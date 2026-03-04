# Implementation Plan

- [ ] 1. 基盤セットアップ
- [x] 1.1 (P) event_settings テーブルに書き込みRLSポリシーを追加する
  - `event_settings` テーブルに INSERT と UPDATE のRLSポリシーを追加するマイグレーションファイルを作成する
  - 認証済みユーザー（`authenticated`）に対して INSERT と UPDATE を許可する
  - 既存の SELECT ポリシー（`authenticated_users_can_read_event_settings`）は変更しない
  - マイグレーションファイル名はタイムスタンプ命名規則に従う
  - _Requirements: 5.4_

- [x] 1.2 (P) Discord 権限フラグに SEND_MESSAGES と VIEW_CHANNEL を追加する
  - `SEND_MESSAGES` (1 << 11) と `VIEW_CHANNEL` (1 << 10) のビットフラグ定数を追加する
  - `DiscordPermissions` インターフェースに `sendMessages` と `viewChannel` プロパティを追加する
  - `parsePermissions()` 関数で新しいフラグを解析するよう拡張する
  - 既存のテストに新しいフラグの解析テストを追加する
  - 既存の権限チェック関数（`canInviteBot`, `canManageGuild`）に影響を与えないことを確認する
  - _Requirements: 4.1_

- [x] 2. Discord BOT API チャンネル取得サービス
- [x] 2.1 Discord チャンネル型定義とチャンネル一覧取得サービスを実装する
  - Discord API のチャンネルオブジェクトと権限オーバーライドオブジェクトの型定義を追加する
  - テキストチャンネル情報の型（ID、名前、カテゴリID、カテゴリ名、表示順序、BOT送信可否フラグ）を定義する
  - BOT トークン（環境変数）を使用して Discord API v10 `GET /guilds/{guild.id}/channels` を呼び出す関数を実装する
  - レスポンスからテキストチャンネル（type=0）のみをフィルタリングする
  - カテゴリチャンネル（type=4）の名前を `parent_id` で紐付けて解決する
  - `permission_overwrites` の deny ビットから BOT の `SEND_MESSAGES` と `VIEW_CHANNEL` 権限を簡易チェックし、`canBotSendMessages` フラグを設定する
  - 既存の `getUserGuilds()` と同一パターンでエラーハンドリング（401 unauthorized, 429 rate_limited, network_error）を実装する
  - BOT トークン未設定時は `BOT_TOKEN_MISSING` エラーを返す
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 4.1_
  - _Contracts: NotificationChannelService Service Interface_

- [x] 2.2 チャンネル取得サービスのユニットテストを追加する
  - テキストチャンネルのみがフィルタリングされることを検証する
  - カテゴリ名が正しく解決されることを検証する
  - `permission_overwrites` の deny ビットに基づく `canBotSendMessages` 判定を検証する
  - Discord API エラー（401, 429, その他）のハンドリングを検証する
  - BOT トークン未設定時のエラーを検証する
  - ネットワークエラー時の挙動を検証する
  - _Requirements: 1.1, 1.2, 1.3, 1.5, 1.6, 4.1_

- [x] 3. イベント設定データアクセスサービス
- [x] 3.1 (P) イベント設定の読み取りと upsert 操作を実装する
  - `GuildConfigService` と同一のファクトリ関数パターンでサービスを作成する
  - ギルドIDでイベント設定を取得する関数を実装する（未設定時は null を返す）
  - ギルドIDとチャンネルIDの組み合わせで upsert する関数を実装する
  - チャンネルID の Snowflake 形式バリデーション（17-20桁の数字）を実装する
  - DB Row 型（snake_case）からアプリケーション型（camelCase）への変換関数を定義する
  - PGRST116（レコード未発見）を未設定状態として処理する
  - エラーコード `FETCH_FAILED`, `UPDATE_FAILED` で Result 型エラーを返す
  - _Requirements: 3.1, 3.2, 3.5, 6.1, 6.2_
  - _Contracts: EventSettingsService Service Interface_

- [x] 3.2 イベント設定サービスのユニットテストを追加する
  - 設定取得の成功ケースと PGRST116（未設定）ケースを検証する
  - upsert の成功ケース（新規作成・既存更新）を検証する
  - Snowflake 形式バリデーションの正常値・異常値を検証する
  - Supabase エラー時の Result 型返却を検証する
  - `GuildConfigService` のテストパターン（モック Supabase クライアント）を踏襲する
  - _Requirements: 3.1, 3.2, 3.5, 6.1, 6.2_

- [x] 4. 通知チャンネル管理の Server Actions
- [x] 4.1 チャンネル一覧取得の Server Action を実装する
  - `resolveServerAuth()` による認証チェックを実装する
  - ギルドIDのフォーマットバリデーションを実装する
  - チャンネル取得サービスを呼び出し、結果を返す
  - 認証エラー時は適切なエラーコードを返す
  - 既存の `updateGuildConfig` Server Action パターンを踏襲する
  - _Requirements: 1.1, 5.1, 5.3_
  - _Contracts: fetchGuildChannels API Contract_

- [x] 4.2 通知チャンネル更新の Server Action を実装する
  - `resolveServerAuth()` による認証チェックを実装する
  - `canManageGuild()` による MANAGE_GUILD 権限チェックを実装する
  - 権限不足時は `PERMISSION_DENIED` エラーを返す
  - ギルドIDとチャンネルIDのフォーマットバリデーションを実装する
  - イベント設定サービスの upsert を呼び出し、結果を返す
  - _Requirements: 3.1, 3.2, 5.1, 5.2, 5.3_
  - _Contracts: updateNotificationChannel API Contract_

- [ ] 5. 通知チャンネル選択 UI とギルド設定ページ統合
- [ ] 5.1 通知チャンネル選択ドロップダウンコンポーネントを実装する
  - コンポーネントマウント時にチャンネル一覧取得の Server Action を呼び出す
  - テキストチャンネル一覧を shadcn/ui Select コンポーネントでドロップダウン表示する
  - チャンネルをカテゴリ別にグループ化して表示する
  - BOT が投稿権限を持たないチャンネルを選択不可（disabled）にし、権限不足を示すテキストを付与する
  - チャンネル一覧読み込み中はローディングインジケーターを表示する
  - 未設定時はプレースホルダー「チャンネルを選択」を表示する
  - 既に設定済みの場合は現在の値を Select の初期値に反映する
  - チャンネル選択時に楽観的 UI 更新を行い、保存中のローディング状態を表示する
  - 保存成功時に成功フィードバックを表示する
  - 保存失敗時にエラーメッセージを表示し、Select を変更前の値にロールバックする
  - チャンネル一覧の取得失敗時にエラーメッセージとリトライボタンを表示する
  - ギルドID変更時にチャンネル一覧を再取得し、エラー状態をリセットする
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 3.3, 3.4, 4.2, 4.3, 6.3_
  - _Contracts: NotificationChannelSelect State Management_

- [ ] 5.2 ギルド設定フォームと設定ページに通知セクションを統合する
  - `GuildSettingsForm` に通知設定セクション（SettingsSection ラッパー、タイトル「通知設定」）を追加する
  - `GuildSettingsForm` の props に現在のチャンネルIDを追加する
  - 通知チャンネル選択コンポーネントを通知設定セクション内に配置する
  - ギルド設定ページ（Server Component）でイベント設定サービスから現在のチャンネルIDを取得し、フォームに渡す
  - 既存の権限設定セクションとの共存を確認する
  - _Requirements: 2.1, 6.1, 6.3_

- [ ]* 6. コンポーネントテスト
  - 通知チャンネル選択コンポーネントのマウント時チャンネル取得をテストする
  - ローディング状態の表示をテストする
  - チャンネル選択と保存処理をテストする
  - 保存失敗時のロールバック動作をテストする
  - 権限なしチャンネルの disabled 表示をテストする
  - リトライボタンの動作をテストする
  - ギルド設定フォームに通知設定セクションが表示されることをテストする
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 3.3, 3.4, 4.2, 4.3_
