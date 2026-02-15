# Implementation Plan

- [x] 1. InvitableGuild 型と canInviteBot 権限判定の追加
  - BOT 未参加（招待対象）ギルドを表す型を定義する（guildId, name, avatarUrl）
  - ADMINISTRATOR または MANAGE_GUILD 権限で BOT 招待可否を判定する関数を追加する
  - 既存の `canManageGuild` との差異として、MANAGE_MESSAGES / MANAGE_ROLES は招待判定に含めない
  - canInviteBot の単体テストを作成する（各権限フラグの組み合わせ、境界値）
  - _Requirements: 3.2_

- [x] 2. (P) fetchGuilds 拡張 — BOT 未参加ギルドの識別と返却
  - fetchGuilds の戻り値に招待対象ギルドリストを追加する
  - Discord API レスポンスと DB 照合結果を比較し、DB に存在しないギルドを抽出する
  - 抽出したギルドのうち招待権限を持つものだけをフィルタリングする
  - Discord CDN からギルドアイコン URL を構築して招待対象ギルドに設定する
  - エラー発生時は招待対象ギルドを空配列にするフォールバックを維持する
  - キャッシュに招待対象ギルド情報も含めるよう型を拡張する
  - fetchGuilds 拡張の単体テストを作成する（正常系: 分類の正確性、エラー系: フォールバック、空配列ケース）
  - _Requirements: 1.1, 3.1, 3.2, 3.3_

- [x] 3. (P) InvitableGuildCard コンポーネントの作成
  - BOT 未参加ギルドのカード UI を作成する（ギルド名、アイコン、未参加バッジ）
  - 既存の SelectableGuildCard のレイアウトに準拠しつつ、選択機能の代わりに「BOT を招待」ボタンを配置する
  - ボタンクリック時に招待 URL を新タブで開く（guild_id パラメータ付加でギルド事前選択）
  - 招待 URL は環境変数 NEXT_PUBLIC_BOT_INVITE_URL から取得する
  - 環境変数が未設定の場合は招待ボタンを非表示にする
  - Storybook ストーリーを作成する（通常表示、URL 未設定、アイコンなし）
  - 単体テストを作成する（ボタン表示/非表示、URL 生成、新タブ遷移）
  - _Requirements: 1.3, 2.1, 2.2, 2.3, 2.4_

- [ ] 4. refreshGuilds Server Action と useGuildRefresh Hook の追加
- [ ] 4.1 refreshGuilds Server Action の追加
  - キャッシュを無効化して fetchGuilds を再実行し、最新のギルド一覧を返す Server Action を作成する
  - 認証済みセッションからアクセストークンを取得し、未認証時はエラーを返す
  - 戻り値には参加済みギルド、招待対象ギルド、権限情報マップを含める
  - 単体テストを作成する（キャッシュクリア呼び出し、戻り値構造の検証）
  - _Requirements: 5.1_

- [ ] 4.2 useGuildRefresh Hook の作成
  - Page Visibility API の visibilitychange イベントでタブ復帰を検知するカスタムフックを作成する
  - タブが visible に戻った時に refreshGuilds Server Action を呼び出してデータを再取得する
  - 連続再取得防止のため最低 30 秒のインターバルを設ける
  - 招待対象ギルドが存在しない場合はリスナーを登録しないよう enabled フラグで制御する
  - 再取得中であることを示す isRefreshing 状態を公開する
  - 単体テストを作成する（visibilitychange 発火、インターバル制御、enabled 切替）
  - _Requirements: 5.1, 5.2_

- [ ] 5. DashboardWithCalendar 拡張と統合
- [ ] 5.1 Props 拡張と未参加ギルドセクションの追加
  - DashboardWithCalendar の Props に招待対象ギルドリストを追加する
  - DashboardPage（Server Component）から招待対象ギルドを渡すよう接続する
  - デスクトップサイドバーに「BOT 未参加サーバー」セクションを追加し、InvitableGuildCard を表示する
  - モバイルギルドセレクターにも未参加ギルドのセクションを追加する
  - BOT 参加済みギルドを先頭、未参加ギルドをその後に配置し、各グループ内はギルド名のアルファベット順にソートする
  - 招待対象ギルドが存在しない場合は未参加セクションを非表示にする
  - 環境変数 NEXT_PUBLIC_BOT_INVITE_URL を InvitableGuildCard に渡す
  - _Requirements: 1.1, 1.2, 1.4, 4.1, 4.2_

- [ ] 5.2 useGuildRefresh の統合
  - DashboardWithCalendar に useGuildRefresh Hook を統合する
  - タブ復帰時に guilds、invitableGuilds、guildPermissions の状態を更新する
  - BOT 参加状態が変わったギルドを参加済みセクションに移動する
  - 再取得中のローディング表示を追加する（任意: 控えめなインジケーター）
  - _Requirements: 5.1, 5.2_

