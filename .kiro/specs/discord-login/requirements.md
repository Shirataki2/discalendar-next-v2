# Requirements Document

## Introduction

本ドキュメントはDiscalendarにおけるDiscordログイン機能の要件を定義します。SupabaseのSign In / Providers機能を利用し、DiscordユーザーがOAuth 2.0認証フローを通じてWebアプリケーションにログインできる機能を実装します。

Discalendarは Discord コミュニティ向けの予定管理サービスであり、Discord アカウントでのログインはコア機能として不可欠です。本仕様では、ログインフローの完成をゴールとし、ユーザーがDiscordアカウントでシームレスに認証できる状態を目指します。

## Requirements

### Requirement 1: Discordログインボタンの表示

**Objective:** ユーザーとして、ログイン画面でDiscordログインボタンを確認したい。これにより、Discordアカウントでログインできることを直感的に理解できる。

#### Acceptance Criteria

1. When ユーザーがログインページにアクセスした時, the 認証システム shall Discordログインボタンを表示する
2. The 認証システム shall ログインボタンにDiscordのブランドカラーとロゴを表示する
3. While ログインボタンがフォーカスされている間, the 認証システム shall 視覚的なフォーカス状態を表示する
4. The 認証システム shall ログインボタンをキーボード操作で選択可能にする

### Requirement 2: Discord OAuth認証フローの開始

**Objective:** ユーザーとして、Discordログインボタンをクリックした際にDiscordの認可画面に遷移したい。これにより、Discordアカウントでの認証を開始できる。

#### Acceptance Criteria

1. When ユーザーがDiscordログインボタンをクリックした時, the 認証システム shall Supabase Auth経由でDiscord OAuth認可画面にリダイレクトする
2. When OAuth認証が開始された時, the 認証システム shall 必要なスコープ（identify, email）をリクエストする
3. The 認証システム shall コールバックURLをSupabase設定に基づいて正しく設定する

### Requirement 3: OAuth認証コールバック処理

**Objective:** ユーザーとして、Discord側で認可した後にアプリケーションに戻りたい。これにより、認証プロセスを完了できる。

#### Acceptance Criteria

1. When DiscordからOAuthコールバックを受信した時, the 認証システム shall 認可コードを受け取りセッションを確立する
2. When セッション確立が成功した時, the 認証システム shall ユーザーをダッシュボードページにリダイレクトする
3. If OAuth認証が失敗した場合, then the 認証システム shall エラーメッセージを表示してログインページに戻す
4. If ユーザーがDiscord側で認可を拒否した場合, then the 認証システム shall ログインページにリダイレクトしてキャンセルメッセージを表示する

### Requirement 4: セッション管理

**Objective:** ユーザーとして、ログイン後にセッションを維持したい。これにより、ページ遷移やブラウザ更新後も再ログインせずにサービスを利用できる。

#### Acceptance Criteria

1. When ログインが成功した時, the 認証システム shall CookieベースでSupabaseセッションを保存する
2. While 有効なセッションが存在する間, the 認証システム shall Server Components/Client Components双方でユーザー情報を参照可能にする
3. When セッショントークンの有効期限が近づいた時, the 認証システム shall 自動的にトークンをリフレッシュする
4. The 認証システム shall Middlewareでセッションの更新処理を実行する

### Requirement 5: 認証状態に基づくルーティング

**Objective:** ユーザーとして、認証状態に応じて適切なページにアクセスしたい。これにより、未認証時に保護されたページへの不正アクセスを防止できる。

#### Acceptance Criteria

1. While ユーザーが未認証の状態で, when 保護されたページにアクセスした時, the 認証システム shall ログインページにリダイレクトする
2. While ユーザーが認証済みの状態で, when ログインページにアクセスした時, the 認証システム shall ダッシュボードにリダイレクトする
3. The 認証システム shall Middlewareで全てのルーティング保護を実装する

### Requirement 6: ログアウト機能

**Objective:** ユーザーとして、アプリケーションからログアウトしたい。これにより、共有端末での利用後にセキュリティを確保できる。

#### Acceptance Criteria

1. When ユーザーがログアウトボタンをクリックした時, the 認証システム shall Supabaseセッションを破棄する
2. When ログアウトが完了した時, the 認証システム shall ログインページまたはトップページにリダイレクトする
3. When ログアウトが完了した時, the 認証システム shall クライアント側のセッション情報をクリアする

### Requirement 7: エラーハンドリング

**Objective:** ユーザーとして、認証エラー発生時に原因を理解したい。これにより、問題を解決してログインを再試行できる。

#### Acceptance Criteria

1. If ネットワークエラーが発生した場合, then the 認証システム shall ネットワーク接続を確認するようユーザーに通知する
2. If Supabase認証サービスがエラーを返した場合, then the 認証システム shall ユーザーフレンドリーなエラーメッセージを表示する
3. If セッションの取得に失敗した場合, then the 認証システム shall ユーザーを未認証状態として扱いログインページに遷移させる
4. The 認証システム shall 全てのエラーをコンソールまたはログシステムに記録する

### Requirement 8: セキュリティ要件

**Objective:** システムとして、認証フローのセキュリティを確保したい。これにより、不正アクセスやセッションハイジャックを防止できる。

#### Acceptance Criteria

1. The 認証システム shall HTTPS経由でのみ認証通信を行う
2. The 認証システム shall セッションCookieにHttpOnly, Secure, SameSite属性を設定する
3. The 認証システム shall PKCE（Proof Key for Code Exchange）フローを使用する
4. The 認証システム shall CSRFトークンを検証する（Supabase組み込み機能）

