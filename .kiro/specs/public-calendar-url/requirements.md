# Requirements Document

## Project Description (Input)

ギルドカレンダーの公開共有URLを実装する

## 背景

ログイン不要で閲覧できる公開リンクがない。非Discordユーザーへのリーチとバイラル効果が期待できる。

## 目的

ギルド単位で公開カレンダーURLを発行し、非ログインユーザーでもブラウザからイベント一覧を閲覧できるようにする。

## 作業内容

* ギルド単位の公開カレンダーURL生成
* 非ログインユーザー向けの閲覧ページ
* 参照: `feature-expansion-plan.md` 2.4節

## 受け入れ条件

* [ ] ギルド管理者が公開カレンダーURLを生成・無効化できる
* [ ] 公開URLにアクセスすると、ログイン不要でカレンダーのイベント一覧が閲覧できる
* [ ] 公開ページではイベントの閲覧のみ可能（編集・RSVP等の操作は不可）
* [ ] 公開URLはギルド単位でユニークなスラッグまたはトークンで識別される
* [ ] 公開設定がオフの場合、URLにアクセスしても404またはアクセス不可メッセージが表示される
* [ ] 公開ページにOGP/メタタグが適切に設定され、SNS共有時にプレビューが表示される

## 技術メモ

* PublicルートはMiddlewareの認証チェック対象外にする必要がある（`/public/*` or `/cal/*`）
* ギルドテーブルに `public_slug` / `is_public` カラム追加が必要
* RLSポリシーで公開ギルドのイベントは匿名読み取り可にする

## Metadata
* URL: [https://linear.app/ff2345/issue/DIS-18/ギルドカレンダーの公開共有urlを実装する](https://linear.app/ff2345/issue/DIS-18/ギルドカレンダーの公開共有urlを実装する)
* Identifier: DIS-18
* Status: Backlog
* Priority: Medium
* Assignee: Tomoya Ishii
* Labels: Feature
* Created: 2026-02-20T07:52:00.446Z
* Updated: 2026-03-19T14:11:26.405Z

## Sub-issues

* [DIS-108 DBスキーマに公開カレンダー用カラム（public_slug, is_public）を追加](https://linear.app/ff2345/issue/DIS-108/dbスキーマに公開カレンダー用カラムpublic-slug-is-publicを追加)
* [DIS-109 公開カレンダー閲覧ページを実装する（/cal/[slug]）](https://linear.app/ff2345/issue/DIS-109/公開カレンダー閲覧ページを実装するcalslug)
* [DIS-110 ギルド管理画面に公開URL生成・無効化UIを追加する](https://linear.app/ff2345/issue/DIS-110/ギルド管理画面に公開url生成無効化uiを追加する)
* [DIS-111 公開ページのOGP/メタタグを設定する](https://linear.app/ff2345/issue/DIS-111/公開ページのogpメタタグを設定する)

## Requirements

### Introduction

ギルド単位で公開カレンダーURLを発行し、非ログインユーザーでもブラウザからイベント一覧を閲覧できるようにする機能の要件を定義する。公開共有URLにより、Discordアカウントを持たないユーザーにもコミュニティのイベント情報を届け、バイラル効果を促進する。

### Requirement 1: 公開URL生成・管理

**Objective:** ギルド管理者として、ギルドの公開カレンダーURLを生成・管理したい。これにより、コミュニティ外のユーザーにもイベント情報を共有できるようになる。

#### Acceptance Criteria

1. When ギルド管理者が公開URL生成を実行した場合, the Discalendar shall そのギルドに対してユニークな公開スラッグを生成し、公開カレンダーURLを発行する
2. When ギルド管理者が公開URLの無効化を実行した場合, the Discalendar shall そのギルドの公開設定をオフにし、公開スラッグを無効化する
3. When ギルド管理者が公開URLを再生成した場合, the Discalendar shall 既存のスラッグを新しいスラッグに置き換え、旧URLを無効化する
4. The Discalendar shall 公開スラッグをギルド単位でユニークに保証する
5. The Discalendar shall 公開URL生成後、コピー可能な完全なURL文字列を管理者に表示する

### Requirement 2: 公開カレンダー閲覧ページ

**Objective:** 非ログインユーザーとして、公開URLにアクセスしてカレンダーのイベント一覧を閲覧したい。これにより、Discordアカウントがなくてもコミュニティのイベント情報を確認できる。

#### Acceptance Criteria

1. When 有効な公開スラッグを含むURLにアクセスした場合, the Discalendar shall ログイン不要で該当ギルドのイベント一覧をカレンダー形式で表示する
2. The Discalendar shall 公開カレンダーページにギルド名を表示する
3. The Discalendar shall 公開カレンダーページで各イベントのタイトル、日時、説明を表示する
4. While 公開カレンダーページを表示している間, the Discalendar shall イベントの編集、削除、RSVP等の操作UIを表示しない
5. The Discalendar shall 公開カレンダーページを認証不要のパブリックルートとして提供する

### Requirement 3: アクセス制御

**Objective:** ギルド管理者として、公開カレンダーへのアクセスを制御したい。これにより、意図しない情報公開を防止できる。

#### Acceptance Criteria

1. If 公開設定がオフのギルドのURLにアクセスした場合, the Discalendar shall アクセス不可であることを示すページを表示する
2. If 存在しないスラッグを含むURLにアクセスした場合, the Discalendar shall 404ページを表示する
3. The Discalendar shall 公開カレンダーページからギルドの内部情報（メンバーリスト、設定等）にアクセスできないようにする
4. While 公開設定がオンの場合, the Discalendar shall 匿名ユーザーに対して該当ギルドのイベントデータの読み取りのみを許可する

### Requirement 4: OGP・SNS共有対応

**Objective:** 非ログインユーザーとして、SNSで共有された公開カレンダーリンクからプレビューを確認したい。これにより、リンク共有時にカレンダーの内容が視覚的に伝わる。

#### Acceptance Criteria

1. The Discalendar shall 公開カレンダーページにOpen Graphメタタグ（og:title, og:description, og:image, og:url）を設定する
2. The Discalendar shall OGPのtitleにギルド名を含める
3. The Discalendar shall OGPのdescriptionにギルドのイベント概要情報を含める
4. The Discalendar shall Twitterカード用メタタグ（twitter:card, twitter:title, twitter:description）を設定する
5. When SNSやメッセンジャーで公開カレンダーURLが共有された場合, the Discalendar shall リッチプレビュー（タイトル、説明、画像）が表示される形式でメタ情報を提供する

### Requirement 5: 管理画面UI

**Objective:** ギルド管理者として、ダッシュボード上で公開URL設定を管理したい。これにより、直感的な操作で公開・非公開を切り替えられる。

#### Acceptance Criteria

1. The Discalendar shall ギルド管理画面に公開カレンダーURL設定セクションを表示する
2. The Discalendar shall 公開カレンダーの有効・無効を切り替えるトグルUIを提供する
3. While 公開設定がオンの場合, the Discalendar shall 現在の公開URLとコピーボタンを管理画面に表示する
4. While 公開設定がオフの場合, the Discalendar shall URL生成を促すUIを管理画面に表示する
5. When 管理者が公開設定を無効化する操作を行った場合, the Discalendar shall 無効化の影響を説明する確認ダイアログを表示する
