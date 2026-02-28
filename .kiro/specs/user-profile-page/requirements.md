# Requirements Document

## Project Description (Input)
ユーザーページ - プロフィール表示・参加ギルド一覧・ログアウト

### 概要

ダッシュボードヘッダーのアバターからアクセスできるユーザーページを新規追加する。

### 必須スコープ

* **プロフィール表示**: Discordアバター、表示名、メールアドレス
* **参加ギルド一覧**: 所属ギルドのリスト（ダッシュボードへのリンク付き）
* **ログアウト**: アカウント操作ボタン

### 受け入れ条件

- [ ] `/dashboard/user` でユーザーページにアクセスできる
- [ ] Discordアバター・表示名・メールアドレスが表示される
- [ ] 参加ギルド一覧が表示され、各ギルドをクリックするとダッシュボードに遷移する
- [ ] ログアウトボタンが機能する
- [ ] レスポンシブ対応（モバイル・デスクトップ）
- [ ] Storybookストーリーが作成されている
- [ ] 単体テストが作成されている

### Metadata
- URL: [https://linear.app/ff2345/issue/DIS-54/ユーザーページを新規追加する](https://linear.app/ff2345/issue/DIS-54/ユーザーページを新規追加する)
- Identifier: DIS-54
- Status: Backlog
- Priority: Medium
- Assignee: Tomoya Ishii
- Labels: Feature
- Created: 2026-02-28T06:02:36.208Z
- Updated: 2026-02-28T06:04:56.826Z

### Sub-issues

- [DIS-55 ユーザーページのルーティングとレイアウトを作成する](https://linear.app/ff2345/issue/DIS-55/ユーザーページのルーティングとレイアウトを作成する)
- [DIS-56 プロフィール表示コンポーネントを実装する](https://linear.app/ff2345/issue/DIS-56/プロフィール表示コンポーネントを実装する)
- [DIS-57 参加ギルド一覧コンポーネントを実装する](https://linear.app/ff2345/issue/DIS-57/参加ギルド一覧コンポーネントを実装する)
- [DIS-58 Storybookストーリーと単体テストを作成する](https://linear.app/ff2345/issue/DIS-58/storybookストーリーと単体テストを作成する)

## Introduction

ダッシュボードに認証済みユーザー専用のプロフィールページを追加する。ユーザーはダッシュボードヘッダーのアバターからアクセスし、自身のプロフィール情報確認・参加ギルド一覧の閲覧・ログアウト操作を行える。

## Requirements

### Requirement 1: ページルーティングとアクセス制御
**Objective:** As a 認証済みユーザー, I want `/dashboard/user` でユーザーページにアクセスしたい, so that 自分のプロフィール情報を確認できる

#### Acceptance Criteria
1. When 認証済みユーザーが `/dashboard/user` にアクセスした時, the ユーザーページ shall プロフィールページを表示する
2. When 未認証ユーザーが `/dashboard/user` にアクセスした時, the ユーザーページ shall ログインページ (`/auth/login`) にリダイレクトする
3. When ダッシュボードヘッダーのアバターをクリックした時, the ダッシュボード shall `/dashboard/user` へのナビゲーションリンクを提供する

### Requirement 2: プロフィール表示
**Objective:** As a 認証済みユーザー, I want 自分のDiscordプロフィール情報を確認したい, so that 正しいアカウントでログインしていることを確認できる

#### Acceptance Criteria
1. The ユーザーページ shall Discordアバター画像を表示する
2. The ユーザーページ shall ユーザーの表示名（Discord username）を表示する
3. The ユーザーページ shall ユーザーのメールアドレスを表示する
4. If ユーザーのアバター画像が取得できない場合, the ユーザーページ shall 表示名のイニシャルをフォールバックとして表示する

### Requirement 3: 参加ギルド一覧
**Objective:** As a 認証済みユーザー, I want 自分が参加しているギルドの一覧を確認したい, so that 各ギルドのカレンダーに素早くアクセスできる

#### Acceptance Criteria
1. The ユーザーページ shall ユーザーが参加しているギルドをアイコンと名前付きのリストで表示する
2. When ギルドリストの項目をクリックした時, the ユーザーページ shall 該当ギルドが選択された状態のダッシュボード (`/dashboard`) に遷移する
3. If ユーザーが参加しているギルドが0件の場合, the ユーザーページ shall ギルドが未登録であることを示すメッセージを表示する

### Requirement 4: ログアウト
**Objective:** As a 認証済みユーザー, I want ユーザーページからログアウトしたい, so that セッションを安全に終了できる

#### Acceptance Criteria
1. The ユーザーページ shall ログアウトボタンを表示する
2. When ログアウトボタンをクリックした時, the ユーザーページ shall Supabaseセッションを破棄し、ログインページにリダイレクトする
3. While ログアウト処理中, the ユーザーページ shall ローディング状態を表示し、ボタンの重複クリックを防止する

### Requirement 5: レスポンシブデザイン
**Objective:** As a ユーザー, I want モバイル・デスクトップの両方でユーザーページを快適に利用したい, so that デバイスを問わずプロフィール情報にアクセスできる

#### Acceptance Criteria
1. The ユーザーページ shall モバイル幅（640px未満）でシングルカラムレイアウトを表示する
2. The ユーザーページ shall デスクトップ幅（640px以上）で適切な余白とカード配置のレイアウトを表示する
3. The ユーザーページ shall すべてのインタラクティブ要素がタッチ操作でアクセス可能であること
