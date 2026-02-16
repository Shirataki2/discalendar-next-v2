# Requirements Document

## Introduction

V2（Nuxt.js版）に存在していた利用規約・プライバシーポリシーページ（`/support/:slug`）およびBOTドキュメントページ（`/docs/:slug`）を、Next.js App Routerで実装する。V2では `@nuxt/content` でMarkdownから動的ページを生成していたが、Next.jsではMDXまたは静的ページとして再実装する。現行のフッターにはプレースホルダーリンク（`#terms`, `#privacy`）が存在するが、実際のページは未実装の状態。

### V2で提供されていたコンテンツ

**サポートページ（`/support/`）:**
- 利用規約（`tos`）
- プライバシーポリシー（`privacy`）

**ドキュメントページ（`/docs/`）:**
- 基本的な使い方（`gettingstarted`）
- ログイン（`login`）
- Botの招待（`invite`）
- 初期設定（`initialize`）
- 予定の追加と表示（`calendar`）
- 予定の編集と削除（`edit`）
- 利用可能なコマンド（`commands`）

## Requirements

### Requirement 1: 利用規約ページ

**Objective:** ユーザーとして、サービスの利用規約を閲覧したい。法的要件を満たし、ユーザーがサービス利用条件を確認できるようにするため。

#### Acceptance Criteria

1. The Discalendar app shall `/terms` ルートで利用規約ページを提供する
2. The Discalendar app shall 利用規約ページにタイトル「利用規約」と全条文（第1条〜第6条、施行日）を表示する
3. The Discalendar app shall 利用規約ページをServer Componentとしてレンダリングし、認証不要でアクセス可能にする
4. The Discalendar app shall 利用規約ページに適切なHTMLセマンティクス（見出し階層、リスト）を適用する
5. The Discalendar app shall 利用規約ページに `<title>` および `<meta description>` のSEOメタデータを設定する

### Requirement 2: プライバシーポリシーページ

**Objective:** ユーザーとして、個人情報の取り扱いについて確認したい。個人情報保護の透明性を担保し、法的要件を満たすため。

#### Acceptance Criteria

1. The Discalendar app shall `/privacy` ルートで プライバシーポリシーページを提供する
2. The Discalendar app shall プライバシーポリシーページにタイトル「プライバシーポリシー」と全セクション（収集する個人情報、利用目的、第三者提供、免責事項、改定について、制定日）を表示する
3. The Discalendar app shall プライバシーポリシーページをServer Componentとしてレンダリングし、認証不要でアクセス可能にする
4. The Discalendar app shall プライバシーポリシーページに適切なHTMLセマンティクス（見出し階層、リスト、外部リンク）を適用する
5. The Discalendar app shall プライバシーポリシーページに `<title>` および `<meta description>` のSEOメタデータを設定する

### Requirement 3: BOTドキュメントページ

**Objective:** ユーザーとして、BOTの導入方法や使い方を確認したい。セルフサービスで問題を解決でき、サポート負荷を軽減するため。

#### Acceptance Criteria

1. The Discalendar app shall `/docs` ルート配下でドキュメントページ群を提供する
2. The Discalendar app shall 以下のドキュメントページを提供する: 基本的な使い方、ログイン、Botの招待、初期設定、予定の追加と表示、予定の編集と削除、利用可能なコマンド
3. The Discalendar app shall 各ドキュメントページをServer Componentとしてレンダリングし、認証不要でアクセス可能にする
4. The Discalendar app shall 各ドキュメントページにタイトル、本文コンテンツ、および該当する場合はスクリーンショット画像を表示する
5. The Discalendar app shall 各ドキュメントページに `<title>` および `<meta description>` のSEOメタデータを設定する

### Requirement 4: ドキュメントナビゲーション

**Objective:** ユーザーとして、ドキュメントページ間をスムーズに移動したい。必要な情報に素早くアクセスできるようにするため。

#### Acceptance Criteria

1. The Discalendar app shall ドキュメントページに目次（ページ一覧）ナビゲーションを表示する
2. The Discalendar app shall 各ドキュメントページに「前の記事」「次の記事」のページ送りリンクを表示する
3. When ドキュメントページが最初のページの場合, the Discalendar app shall 「前の記事」リンクを非表示にする
4. When ドキュメントページが最後のページの場合, the Discalendar app shall 「次の記事」リンクを非表示にする

### Requirement 5: 共通レイアウトとスタイリング

**Objective:** 開発者として、静的コンテンツページに統一されたレイアウトを適用したい。一貫したデザインを保ちつつ、コンテンツの追加・変更を容易にするため。

#### Acceptance Criteria

1. The Discalendar app shall 利用規約・プライバシーポリシー・ドキュメントページに共通のグローバルヘッダーとフッターを表示する
2. The Discalendar app shall 静的コンテンツページのメインコンテンツ領域を中央揃え・最大幅制限のレイアウトで表示する
3. The Discalendar app shall 静的コンテンツページをレスポンシブデザインで実装し、モバイル・デスクトップの両方で適切に表示する
4. The Discalendar app shall 静的コンテンツページでダークモード・ライトモードの両テーマに対応する

### Requirement 6: フッターリンク統合

**Objective:** ユーザーとして、フッターから利用規約やプライバシーポリシーにアクセスしたい。サイト内のどこからでも法的ページにたどり着けるようにするため。

#### Acceptance Criteria

1. The Discalendar app shall フッターの「利用規約」リンクを `/terms` ページへの遷移リンクに更新する
2. The Discalendar app shall フッターの「プライバシーポリシー」リンクを `/privacy` ページへの遷移リンクに更新する
3. The Discalendar app shall フッターに「ドキュメント」リンクを追加し、`/docs` のトップページ（基本的な使い方）へ遷移できるようにする
