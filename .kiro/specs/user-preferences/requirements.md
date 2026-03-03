# Requirements Document

## Project Description (Input)
ユーザープリファレンス管理ページを /dashboard/user/settings に新設する

### 概要

`/dashboard/user/settings` にユーザープリファレンス管理ページを新設する。現在の `/dashboard/user` は読み取り専用のプロフィール表示のみ。

### 背景

* テーマ切替は `DashboardHeader` のアイコンでのみ可能で、設定としての管理画面がない
* カレンダーのデフォルトビュー（月/週/日）やサイドバー展開状態は localStorage で管理されているが、ユーザーが明示的に設定する場所がない
* 将来的な通知プリファレンスの基盤にもなる

### 受け入れ条件

- [ ] `/dashboard/user/settings` ルートが存在し、認証済みユーザーがアクセスできる
- [ ] 表示設定セクション: テーマ切替（ライト/ダーク/システム）が動作する
- [ ] 表示設定セクション: カレンダーデフォルトビュー（月/週/日）を選択・保存できる
- [ ] UserProfileCard に設定ページへの導線（設定ボタン/リンク）がある
- [ ] DashboardHeader のユーザーアバタードロップダウンに「設定」リンクがある
- [ ] 設定の永続化が実装されている（DB or localStorage、方針を仕様で決定）
- [ ] 設定変更が即座にUIに反映される（テーマ変更時のリアルタイム反映等）

### 技術的な考慮事項

* 設定の永続化先: DB (`user_preferences` テーブル) vs localStorage のどちらを主とするか要検討
* DB に持たせる場合は Supabase Auth の `user_metadata` を活用する手もある
* SDD (仕様駆動開発) で進めるのが望ましい（M サイズ以上）

### Metadata
- URL: [https://linear.app/ff2345/issue/DIS-63/ユーザープリファレンス管理ページを-dashboardusersettings-に新設する](https://linear.app/ff2345/issue/DIS-63/ユーザープリファレンス管理ページを-dashboardusersettings-に新設する)
- Identifier: DIS-63
- Status: Backlog
- Priority: Medium
- Assignee: Unassigned
- Labels: UI UX向上
- Created: 2026-03-01T08:38:29.667Z
- Updated: 2026-03-02T06:34:05.756Z

### Sub-issues

- [DIS-69 /dashboard/user/settings ルートとページレイアウトを作成する](https://linear.app/ff2345/issue/DIS-69/dashboardusersettings-ルートとページレイアウトを作成する)
- [DIS-70 テーマ切替設定UIを実装する（ライト/ダーク/システム）](https://linear.app/ff2345/issue/DIS-70/テーマ切替設定uiを実装するライトダークシステム)
- [DIS-71 カレンダーデフォルトビュー設定UIを実装する（月/週/日）](https://linear.app/ff2345/issue/DIS-71/カレンダーデフォルトビュー設定uiを実装する月週日)
- [DIS-72 設定の永続化レイヤーを実装する（DB or localStorage）](https://linear.app/ff2345/issue/DIS-72/設定の永続化レイヤーを実装するdb-or-localstorage)
- [DIS-73 UserProfileCard・DashboardHeader に設定ページへの導線を追加する](https://linear.app/ff2345/issue/DIS-73/userprofilecarddashboardheader-に設定ページへの導線を追加する)

## Requirements

### Requirement 1: 設定ページルーティングとアクセス制御
**Objective:** 認証済みユーザーとして、専用のユーザー設定ページにアクセスしたい。自分のプリファレンスを一箇所で確認・変更できるようにするため。

#### Acceptance Criteria
1. The 設定ページ shall `/dashboard/user/settings` ルートで認証済みユーザーにアクセス可能であること
2. When 未認証ユーザーが `/dashboard/user/settings` にアクセスした場合, the 設定ページ shall ログインページ (`/auth/login`) にリダイレクトすること
3. The 設定ページ shall ダッシュボード共通ヘッダー (`DashboardHeader`) を表示すること
4. The 設定ページ shall ダッシュボードへ戻るナビゲーションリンクを提供すること
5. The 設定ページ shall 設定カテゴリごとにセクション分けされたレイアウトで表示すること

### Requirement 2: テーマ設定
**Objective:** ユーザーとして、設定ページからテーマ（ライト/ダーク/システム）を切り替えたい。ヘッダーアイコン以外からもテーマを管理できるようにするため。

#### Acceptance Criteria
1. The 設定ページ shall 「表示設定」セクション内にテーマ選択UIを表示すること
2. The テーマ選択UI shall ライト・ダーク・システムの3つの選択肢を提供すること
3. When ユーザーがテーマを変更した場合, the 設定ページ shall 選択されたテーマを即座にUI全体に反映すること
4. The テーマ選択UI shall 現在適用中のテーマを視覚的に示すこと
5. The 設定ページのテーマ変更 shall `DashboardHeader` の `ThemeSwitcher` と同一のテーマ状態を共有すること

### Requirement 3: カレンダーデフォルトビュー設定
**Objective:** ユーザーとして、カレンダーのデフォルト表示モード（月/週/日）を設定したい。毎回ビューを手動で切り替える手間を省くため。

#### Acceptance Criteria
1. The 設定ページ shall 「表示設定」セクション内にカレンダーデフォルトビュー選択UIを表示すること
2. The カレンダーデフォルトビュー選択UI shall 月ビュー・週ビュー・日ビューの3つの選択肢を提供すること
3. When ユーザーがカレンダーデフォルトビューを変更した場合, the 設定ページ shall 選択されたビューを永続化すること
4. When ユーザーがダッシュボードのカレンダーを開いた場合, the カレンダー shall ユーザーが設定したデフォルトビューで表示すること
5. If デフォルトビュー設定が存在しない場合, the カレンダー shall 月ビューをデフォルトとして表示すること

### Requirement 4: 設定ページへの導線
**Objective:** ユーザーとして、既存のUIから設定ページへ簡単に遷移したい。設定機能を直感的に発見・利用できるようにするため。

#### Acceptance Criteria
1. The `UserProfileCard` shall 設定ページ (`/dashboard/user/settings`) へのリンクまたはボタンを表示すること
2. The `DashboardHeader` shall ユーザーアバター周辺のUIに設定ページへのリンクを提供すること
3. When ユーザーが導線をクリックした場合, the アプリケーション shall `/dashboard/user/settings` へ遷移すること

### Requirement 5: 設定の永続化
**Objective:** ユーザーとして、設定した内容がブラウザやセッションをまたいで保持されてほしい。再訪問のたびに設定し直す必要をなくすため。

#### Acceptance Criteria
1. When ユーザーが設定を変更した場合, the 設定ページ shall 変更内容を永続ストレージに保存すること
2. When ユーザーがアプリケーションに再アクセスした場合, the アプリケーション shall 保存済みの設定を復元して適用すること
3. The 設定の永続化 shall テーマ設定とカレンダーデフォルトビュー設定の両方を対象とすること
4. If 設定の保存に失敗した場合, the 設定ページ shall ユーザーにエラーを通知すること
5. If 保存済み設定の読み込みに失敗した場合, the アプリケーション shall デフォルト値（テーマ: system、ビュー: month）にフォールバックすること

### Requirement 6: 設定変更のフィードバック
**Objective:** ユーザーとして、設定変更が正常に反映されたことを確認したい。操作結果の不明瞭さによる不安を解消するため。

#### Acceptance Criteria
1. When ユーザーが設定を変更して保存に成功した場合, the 設定ページ shall 保存完了のフィードバックを表示すること
2. While 設定を保存中の場合, the 設定ページ shall ローディング状態を表示すること
3. The 設定変更のフィードバック shall 操作後3秒以内に表示されること
