# Requirements Document

## Introduction

本機能は、ダッシュボードページ（`/dashboard`）においてログイン済みユーザーが所属するDiscordサーバー（ギルド）の一覧を表示する機能を実装する。Discord APIから取得したユーザーの所属ギルド情報とSupabaseデータベースに登録済みのギルドを照合し、Discalendarが利用可能なサーバーのみを表示する。

参照実装: `refs/DisCalendarV2/api/src/routes/guilds/joined.rs`のパターンに基づき、Next.js App Router + Supabase構成で再実装する。

## Requirements

### Requirement 1: データベーススキーマ

**Objective:** As a 開発者, I want Supabaseにギルド情報を格納するテーブルを作成したい, so that Discord APIから取得したギルド情報と照合できるようになる

#### Acceptance Criteria
1. The Guild Service shall guildsテーブルを以下のスキーマで作成する: id (SERIAL PRIMARY KEY), guild_id (VARCHAR UNIQUE NOT NULL), name (VARCHAR NOT NULL), avatar_url (VARCHAR NULL), locale (VARCHAR NOT NULL)
2. The Guild Service shall guild_idカラムにインデックスを設定する
3. The Guild Service shall Row Level Security (RLS) を有効化し、認証済みユーザーのみがギルド情報を読み取れるポリシーを設定する

### Requirement 2: Discord API連携

**Objective:** As a ログイン済みユーザー, I want Discord APIから自分が所属するサーバー一覧を取得したい, so that Discalendarで利用可能なサーバーを確認できる

#### Acceptance Criteria
1. When ユーザーがダッシュボードにアクセスする, the Guild Service shall Supabase Authに保存されたDiscordアクセストークンを使用してDiscord APIからユーザーの所属ギルド一覧を取得する
2. When Discord APIからギルド一覧を取得する, the Guild Service shall 各ギルドのid, name, iconを取得する
3. If Discord APIへのアクセスに失敗した場合, the Guild Service shall エラーメッセージを表示し、ギルド一覧は空の状態で表示する
4. If Discordアクセストークンが期限切れの場合, the Guild Service shall 再認証を促すメッセージを表示する

### Requirement 3: ギルド照合ロジック

**Objective:** As a システム, I want Discord APIから取得したギルド一覧とDBに登録済みのギルドを照合したい, so that Discalendarに登録済みのサーバーのみをユーザーに表示できる

#### Acceptance Criteria
1. When ユーザーの所属ギルド一覧を取得した後, the Guild Service shall Discord APIから取得したギルドIDリストを使用してSupabaseのguildsテーブルを検索する
2. When ギルド照合を行う, the Guild Service shall guild_idがANY(取得したギルドIDリスト)に一致するレコードを取得する
3. The Guild Service shall 照合結果として、DBに登録済みかつユーザーが所属しているギルドのみを返す

### Requirement 4: ギルド一覧UI表示

**Objective:** As a ログイン済みユーザー, I want ダッシュボードで自分が参加しているDiscalender登録済みサーバーの一覧を見たい, so that どのサーバーのカレンダーを管理できるか把握できる

#### Acceptance Criteria
1. When ダッシュボードページを表示する, the Dashboard shall ユーザーが所属するDiscalendar登録済みギルドの一覧をカード形式で表示する
2. The Dashboard shall 各ギルドカードにギルド名とアイコン画像を表示する
3. If ギルドにアイコンが設定されていない場合, the Dashboard shall ギルド名のイニシャルをフォールバックとして表示する
4. If ユーザーが所属するDiscalendar登録済みギルドが存在しない場合, the Dashboard shall 「利用可能なサーバーがありません」というメッセージを表示する
5. While ギルド一覧を取得中, the Dashboard shall ローディングインジケーターを表示する

### Requirement 5: Server Component実装

**Objective:** As a 開発者, I want ギルド一覧取得をServer Componentで実装したい, so that セキュアかつパフォーマンス最適な方法でデータを取得できる

#### Acceptance Criteria
1. The Dashboard Page shall Server Componentとしてギルド一覧データを取得する
2. The Dashboard Page shall Supabaseクライアント（Server用）を使用してDBクエリを実行する
3. The Dashboard Page shall 取得したギルド情報をClient Componentに渡して表示する
4. When ユーザーが未認証の場合, the Dashboard Page shall ログインページへリダイレクトする

### Requirement 6: 型安全性

**Objective:** As a 開発者, I want ギルド関連の型定義を一元管理したい, so that 型安全なコードを維持できる

#### Acceptance Criteria
1. The Guild Service shall Guild型を定義する: id (number), guild_id (string), name (string), avatar_url (string | null), locale (string)
2. The Guild Service shall Supabaseの自動生成型と互換性のある型定義を使用する
3. The Guild Service shall Discord APIレスポンス用の型定義を作成する
