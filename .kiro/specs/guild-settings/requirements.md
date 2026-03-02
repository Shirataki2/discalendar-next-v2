# Requirements Document

## Project Description (Input)

ギルド設定の専用ページを新設する

### 概要

現在 `GuildSettingsDialog` (ダイアログ内のトグル1つ) でしかギルド設定ができないため、`/dashboard/guilds/[guildId]/settings` に専用ページを新設する。

### 背景

* 現状は `restricted` トグルのみで、今後通知チャンネル設定やロケール変更などを追加する際にダイアログでは収まらない
* 設定項目が増える前にページの骨格を作っておきたい
* DIS-64（通知チャンネル設定UI）の前提となるイシュー

### やること

* `/dashboard/guilds/[guildId]/settings` ルート新設（App Router）
* セクション構成: 一般設定 / 権限 / (将来: 通知)
* 既存の `GuildSettingsPanel`（restrictedトグル）を移植
* ギルド名・アイコン・メンバー数の表示（読み取り専用、Discord APIソース）
* `canManageGuild` 権限がない場合のアクセス制御
* CalendarToolbar の歯車アイコンからの導線変更（ダイアログ → ページ遷移）

### 受け入れ条件

- [ ] `/dashboard/guilds/[guildId]/settings` でギルド設定ページが表示される
- [ ] ギルド名・アイコンが読み取り専用で表示される
- [ ] 「一般設定」セクションにrestricted トグルが動作する
- [ ] `canManageGuild` 権限がないユーザーはアクセスできない（リダイレクト）
- [ ] CalendarToolbar の歯車アイコンから設定ページへ遷移できる
- [ ] Storybook ストーリーとテストが作成されている

### 技術的な考慮事項

* Server Component でギルド情報フェッチ → Client Component で設定フォーム
* 既存の `GuildSettingsPanel` コンポーネントは再利用可能
* `guild_config` テーブルへの upsert は既存の `updateGuildConfig` Server Action を流用

### Metadata
- URL: [https://linear.app/ff2345/issue/DIS-62/ギルド設定の専用ページを新設する](https://linear.app/ff2345/issue/DIS-62/ギルド設定の専用ページを新設する)
- Identifier: DIS-62
- Status: Backlog
- Priority: Medium
- Assignee: Tomoya Ishii
- Labels: Feature
- Created: 2026-03-01T08:38:28.681Z
- Updated: 2026-03-01T08:42:24.851Z

### Sub-issues

- [DIS-65 ギルド設定ページのルートとレイアウト新設](https://linear.app/ff2345/issue/DIS-65/ギルド設定ページのルートとレイアウト新設)
- [DIS-66 ギルド設定フォームコンポーネント実装](https://linear.app/ff2345/issue/DIS-66/ギルド設定フォームコンポーネント実装)
- [DIS-67 CalendarToolbarからの導線変更](https://linear.app/ff2345/issue/DIS-67/calendartoolbarからの導線変更)
- [DIS-68 Storybookストーリーとテスト作成](https://linear.app/ff2345/issue/DIS-68/storybookストーリーとテスト作成)

## Requirements

### Requirement 1: ギルド設定ページのルーティングとアクセス制御
**Objective:** As a ギルド管理者, I want ギルド設定の専用ページにアクセスできる, so that ダイアログではなく専用画面でギルド設定を管理できる

#### Acceptance Criteria
1. When 認証済みユーザーが `/dashboard/guilds/{guildId}/settings` にアクセスした場合, the ギルド設定ページ shall ギルド設定画面を表示する
2. When 未認証ユーザーが `/dashboard/guilds/{guildId}/settings` にアクセスした場合, the ギルド設定ページ shall `/auth/login` にリダイレクトする
3. If ユーザーが対象ギルドの `canManageGuild` 権限を持っていない場合, the ギルド設定ページ shall `/dashboard` にリダイレクトする
4. If 存在しない `guildId` が指定された場合, the ギルド設定ページ shall `/dashboard` にリダイレクトする

### Requirement 2: ギルド情報ヘッダー表示
**Objective:** As a ギルド管理者, I want 設定ページの上部でギルドの基本情報を確認できる, so that どのギルドの設定を編集しているか明確に把握できる

#### Acceptance Criteria
1. The ギルド設定ページ shall ギルド名をページタイトルとして表示する
2. The ギルド設定ページ shall ギルドアイコン画像を表示する（Discord API から取得）
3. If ギルドアイコンが設定されていない場合, the ギルド設定ページ shall ギルド名のイニシャルをフォールバックとして表示する
4. The ギルド設定ページ shall ギルド情報（名前・アイコン）を読み取り専用で表示する（編集不可）

### Requirement 3: 権限設定セクション
**Objective:** As a ギルド管理者, I want ギルドの `restricted` フラグをトグルで切り替えられる, so that イベント編集を管理権限のあるユーザーのみに制限できる

#### Acceptance Criteria
1. The ギルド設定ページ shall 「権限設定」セクションを表示する
2. The 権限設定セクション shall `restricted` フラグのオン/オフ切り替えトグルを表示する
3. When ユーザーが `restricted` トグルを切り替えた場合, the ギルド設定ページ shall `guild_config` テーブルの `restricted` 値を即座に更新する
4. When `restricted` トグルの更新が成功した場合, the ギルド設定ページ shall 更新成功のフィードバックを表示する
5. If `restricted` トグルの更新に失敗した場合, the ギルド設定ページ shall エラーメッセージを表示し、トグルを元の状態に戻す

### Requirement 4: セクション構成と拡張性
**Objective:** As a 開発者, I want 設定ページが複数のセクションに分かれた構成になっている, so that 将来の設定項目（通知チャンネル・ロケール等）を容易に追加できる

#### Acceptance Criteria
1. The ギルド設定ページ shall 設定項目をセクション単位で区切って表示する
2. The ギルド設定ページ shall 初期リリース時に「権限設定」セクションを含む
3. The ギルド設定ページ shall 各セクションにタイトルと説明文を表示する

### Requirement 5: ダッシュボードからの導線
**Objective:** As a ギルド管理者, I want ダッシュボードから直接ギルド設定ページに遷移できる, so that 設定変更のための操作ステップを最小限に抑えられる

#### Acceptance Criteria
1. While ユーザーが `canManageGuild` 権限を持つギルドを選択中の場合, the CalendarToolbar shall ギルド設定ページへのリンクアイコン（歯車）を表示する
2. When ユーザーが CalendarToolbar の歯車アイコンをクリックした場合, the ダッシュボード shall `/dashboard/guilds/{guildId}/settings` に遷移する
3. While ユーザーが `canManageGuild` 権限を持っていない場合, the CalendarToolbar shall 歯車アイコンを非表示にする
4. The ギルド設定ページ shall ダッシュボード（カレンダー画面）に戻るナビゲーションリンクを表示する

### Requirement 6: レスポンシブ対応
**Objective:** As a ユーザー, I want モバイル・タブレット・デスクトップのいずれのデバイスでもギルド設定ページを利用できる, so that 画面サイズに依存せず設定管理が可能になる

#### Acceptance Criteria
1. While デスクトップ画面（1024px以上）の場合, the ギルド設定ページ shall コンテンツ幅を適切に制限して中央配置する
2. While モバイル画面（768px未満）の場合, the ギルド設定ページ shall 全幅レイアウトで設定セクションを表示する
3. The ギルド設定ページ shall すべての操作要素（トグル、リンク等）がタッチ操作に適したサイズで表示する
