# Implementation Plan

- [x] 1. ギルド設定ページのルーティングとアクセス制御
- [x] 1.1 Server Component としてギルド設定ページを新設し、認証・権限チェック・リダイレクト処理を実装する
  - `/dashboard/guilds/[guildId]/settings` ルートを App Router に追加する
  - 未認証ユーザーを `/auth/login` にリダイレクトする
  - `fetchGuilds` で取得したギルド一覧に `guildId` が存在しない場合、`/dashboard` にリダイレクトする
  - `canManageGuild` 権限を持たないユーザーを `/dashboard` にリダイレクトする
  - 権限チェック通過後、`GuildConfigService` からギルド設定を取得する
  - `DashboardHeader` を共有してダッシュボードと統一されたヘッダーを表示する
  - `dynamic = "force-dynamic"` を設定してリクエストごとの最新データを保証する
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] 2. ギルド設定フォームとセクション構成の実装
- [x] 2.1 (P) 汎用セクションラッパーコンポーネントを作成する
  - タイトル・説明文・children を受け取り、shadcn/ui の Card でセクション区切りを表現する
  - 将来のセクション追加（通知チャンネル、ロケール等）が同一パターンで行えるようにする
  - _Requirements: 4.1, 4.3_

- [x] 2.2 (P) ギルド設定フォームのメインクライアントコンポーネントを作成する
  - ギルドアイコンと名前を読み取り専用で表示するヘッダー部分を実装する
  - アイコンが未設定の場合、ギルド名の頭文字をフォールバックとして表示する（既存 `GuildCard` パターン踏襲）
  - ギルドアイコンは `next/image` の `Image` コンポーネントで表示する
  - セクションラッパー内に既存の `GuildSettingsPanel` を配置して権限設定セクションを構成する
  - 「カレンダーに戻る」リンクを `next/link` で設置する
  - デスクトップ（1024px以上）ではコンテンツ幅を制限して中央配置、モバイル（768px未満）では全幅レイアウトにする
  - タッチ操作に適したサイズで操作要素を表示する
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 4.2, 5.4, 6.1, 6.2, 6.3_

- [x] 2.3 ギルド設定ページからフォームコンポーネントにデータを渡して統合する
  - Server Component で取得したギルド情報（guildId, name, avatarUrl）と restricted フラグを Client Component に props として渡す
  - JSON シリアライズ可能な値のみを渡す（BigInt の permissions は除外）
  - ページ表示の動作確認を行い、権限設定セクションの restricted トグルが正常に動作することを検証する
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 3. ダッシュボードからの導線変更
- [x] 3.1 (P) CalendarToolbar の歯車アイコンからの導線をダイアログからページ遷移に変更する
  - `DashboardWithCalendar` の `handleSettingsClick` を `router.push` によるページ遷移に変更する
  - `isSettingsDialogOpen` 状態管理と `GuildSettingsDialog` のレンダリングを削除する
  - `handleRestrictedChange` コールバックを削除する（Server Action の `revalidatePath` でデータ整合性が保証される）
  - `canManageGuild` 権限を持たないユーザーには歯車アイコンを非表示にする（既存の条件分岐を維持）
  - _Requirements: 5.1, 5.2, 5.3_

- [x] 3.2 (P) `GuildSettingsDialog` コンポーネントとその関連ファイル（テスト・ストーリー）を削除する
  - ダイアログコンポーネント本体、テストファイル、Storybook ストーリーを削除する
  - 他ファイルからの import 参照がないことを確認する
  - _Requirements: 5.2_

- [ ] 4. Storybook ストーリーとテスト作成
- [ ] 4.1 (P) 新規コンポーネントの Storybook ストーリーを作成する
  - ギルド設定フォームのストーリー: デスクトップ表示、モバイル表示、アイコンあり、アイコンなし（イニシャルフォールバック）のバリアント
  - セクションラッパーのストーリー: 基本表示
  - CSF3 形式、`tags: ["autodocs"]` を設定し、コンポーネントと同ディレクトリに配置する
  - _Requirements: 2.1, 2.2, 2.3, 4.1, 4.3, 6.1, 6.2_

- [ ]* 4.2 (P) 新規コンポーネントの単体テストを作成する
  - ギルド設定フォーム: ギルド情報（名前・アイコン）の表示、セクション構成、戻るリンクの存在を検証する
  - セクションラッパー: タイトル・説明文・children の正常表示を検証する
  - ダッシュボード導線変更: 歯車クリックで `router.push` が呼ばれることを検証する
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 4.1, 4.3, 5.1, 5.2_
