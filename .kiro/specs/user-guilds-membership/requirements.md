# Requirements Document

## Introduction

現在、Discalendarではギルドメンバーシップと権限情報をDiscord APIからリアルタイムで取得しており、DB内に永続化されていない。このため、RLSポリシーが `WITH CHECK (true)` で全行許可となっており、認証済みユーザーなら任意のギルド設定を変更可能な状態にある。また、SECURITY DEFINER関数でもギルドメンバーシップの検証が行えていない。

本仕様では `user_guilds` テーブルを導入し、ユーザーとギルドの関連（メンバーシップ・権限ビットフィールド）をDB内に永続化する。これにより、RLSポリシーおよびDB関数レベルでギルド単位のアクセス制御を実現する。

## Project Description (Input)

user_guilds テーブルの追加（ギルドメンバーシップのDB永続化）

### Metadata

- URL: [DIS-78](https://linear.app/ff2345/issue/DIS-78/user-guilds-テーブルの追加ギルドメンバーシップのdb永続化)
- Identifier: DIS-78
- Status: In Progress
- Priority: High
- Labels: Improvement, 品質向上

### Sub-issues

- [DIS-79 user_guilds テーブル作成マイグレーション（スキーマ + RLS）](https://linear.app/ff2345/issue/DIS-79/user-guilds-テーブル作成マイグレーションスキーマ-rls)
- [DIS-80 user_guilds サービス層の実装（CRUD + 同期upsert）](https://linear.app/ff2345/issue/DIS-80/user-guilds-サービス層の実装crud-同期upsert)
- [DIS-81 fetchGuilds Server Action で user_guilds 同期更新を追加](https://linear.app/ff2345/issue/DIS-81/fetchguilds-server-action-で-user-guilds-同期更新を追加)
- [DIS-82 既存RLSポリシー・SECURITY DEFINER関数をメンバーシップベースに移行](https://linear.app/ff2345/issue/DIS-82/既存rlsポリシーsecurity-definer関数をメンバーシップベースに移行)
- [DIS-83 resolveServerAuth を user_guilds 対応に更新](https://linear.app/ff2345/issue/DIS-83/resolveserverauth-を-user-guilds-対応に更新)

## Requirements

### Requirement 1: user_guilds テーブルスキーマ

**Objective:** As a 開発者, I want ユーザーとギルドの関連をDBテーブルで管理する, so that RLSポリシーやDB関数からメンバーシップを参照できる

#### Acceptance Criteria

1. The user_guilds テーブル shall `user_id` (UUID, `auth.users` への外部キー) と `guild_id` (VARCHAR(32), `guilds(guild_id)` への外部キー) のカラムを持つ
2. The user_guilds テーブル shall `user_id` + `guild_id` の複合ユニーク制約を持つ
3. The user_guilds テーブル shall Discord権限ビットフィールドを格納する `permissions` カラム (BIGINT) を持つ
4. The user_guilds テーブル shall レコードの鮮度を管理する `updated_at` カラム (TIMESTAMPTZ, デフォルト `now()`) を持つ
5. When guilds テーブルから行が削除された場合, the user_guilds テーブル shall 対応する行を `ON DELETE CASCADE` で自動削除する
6. When auth.users から行が削除された場合, the user_guilds テーブル shall 対応する行を `ON DELETE CASCADE` で自動削除する

### Requirement 2: user_guilds RLSポリシー

**Objective:** As a 開発者, I want user_guilds テーブル自体のアクセスをRLSで制御する, so that ユーザーが自分のメンバーシップレコードのみを操作できる

#### Acceptance Criteria

1. The user_guilds テーブル shall Row Level Security が有効化される
2. The user_guilds テーブル shall `auth.uid() = user_id` を条件とする SELECT ポリシーを持ち、認証済みユーザーが自分のレコードのみを読み取れる
3. The user_guilds テーブル shall `auth.uid() = user_id` を条件とする INSERT ポリシーを持ち、認証済みユーザーが自分のレコードのみを挿入できる
4. The user_guilds テーブル shall `auth.uid() = user_id` を条件とする UPDATE ポリシーを持ち、認証済みユーザーが自分のレコードのみを更新できる
5. The user_guilds テーブル shall `auth.uid() = user_id` を条件とする DELETE ポリシーを持ち、認証済みユーザーが自分のレコードのみを削除できる

### Requirement 3: メンバーシップ同期

**Objective:** As a Discordユーザー, I want ダッシュボード表示時にギルドメンバーシップがDBに同期される, so that 最新の権限情報でアクセス制御が行われる

#### Acceptance Criteria

1. When ギルド一覧取得 Server Action (`getGuildsWithConfig`) が実行された場合, the アプリケーション shall Discord APIから取得したギルド一覧を `user_guilds` テーブルにupsertする
2. When upsert が実行された場合, the アプリケーション shall 各ギルドの `permissions` と `updated_at` を最新値で更新する
3. When ユーザーがDiscordギルドから脱退した場合（API結果に含まれなくなった場合）, the アプリケーション shall 該当する `user_guilds` レコードを削除する
4. If upsert処理が失敗した場合, the アプリケーション shall エラーをログに記録し、ギルド一覧の表示自体は継続する（同期失敗がUIをブロックしない）

### Requirement 4: user_guilds サービス層

**Objective:** As a 開発者, I want user_guilds の CRUD 操作をサービス層で提供する, so that Server Action やテストから統一的にメンバーシップデータにアクセスできる

#### Acceptance Criteria

1. The UserGuildsService shall ファクトリ関数 `createUserGuildsService(supabase)` でインスタンスを生成する
2. The UserGuildsService shall `syncUserGuilds(userId, guilds)` メソッドを提供し、Discord APIの結果を一括upsert + 不在ギルドの削除を行う
3. The UserGuildsService shall `getUserGuildPermissions(userId, guildId)` メソッドを提供し、指定ギルドの権限ビットフィールドを返す（レコード不在時は `null`）
4. The UserGuildsService shall Result型パターン (`{ success: true; data: T } | { success: false; error: E }`) でエラーを返す
5. The UserGuildsService shall 全メソッドの単体テストを持つ

### Requirement 5: 既存RLSポリシーのメンバーシップベース移行

**Objective:** As a 開発者, I want 既存テーブルのRLSポリシーを `user_guilds` ベースに移行する, so that 認証済みユーザーが所属ギルドの設定のみを変更できる

#### Acceptance Criteria

1. When 認証済みユーザーが `guild_config` に INSERT/UPDATE を実行した場合, the RLSポリシー shall `user_guilds` に対応する `(auth.uid(), guild_config.guild_id)` のレコードが存在することを検証する
2. When 認証済みユーザーが `event_settings` に INSERT/UPDATE を実行した場合, the RLSポリシー shall `user_guilds` に対応する `(auth.uid(), event_settings.guild_id)` のレコードが存在することを検証する
3. When 認証済みユーザーが `events` に INSERT/UPDATE/DELETE を実行した場合, the RLSポリシー shall `user_guilds` に対応する `(auth.uid(), events.guild_id)` のレコードが存在することを検証する
4. The 既存の SELECT ポリシー shall 変更せず、認証済みユーザーが全ギルドのデータを閲覧できる状態を維持する（閲覧はメンバーシップ不問）
5. The マイグレーション shall 既存ポリシーの DROP と新ポリシーの CREATE をべき等に実行する（`DROP POLICY IF EXISTS` + `CREATE POLICY`）

### Requirement 6: SECURITY DEFINER関数のメンバーシップ検証

**Objective:** As a 開発者, I want SECURITY DEFINER関数内でギルドメンバーシップを検証する, so that RLSをバイパスする関数からも不正アクセスを防止できる

#### Acceptance Criteria

1. When `upsert_event_settings` が呼び出された場合, the 関数 shall `user_guilds` テーブルで `(auth.uid(), p_guild_id)` のレコードが存在することを検証する
2. If メンバーシップレコードが存在しない場合, the 関数 shall 例外 `'Forbidden: user is not a member of this guild'` を発生させる
3. The 関数 shall 既存の `auth.uid() IS NULL` チェック（認証チェック）を引き続き保持する

### Requirement 7: resolveServerAuth のuser_guilds対応

**Objective:** As a 開発者, I want `resolveServerAuth` が `user_guilds` テーブルからも権限を取得できる, so that メモリキャッシュミス時にDiscord APIを呼ばずにDB参照で権限解決できる

#### Acceptance Criteria

1. When メモリキャッシュにギルド情報がない場合, the resolveServerAuth shall `user_guilds` テーブルから権限を検索する（Discord APIの前にDB参照）
2. When `user_guilds` にレコードが存在する場合, the resolveServerAuth shall DBの権限ビットフィールドを使用して認証結果を返す
3. If `user_guilds` にレコードが存在しない場合, the resolveServerAuth shall 既存のDiscord APIフォールバックを実行する
4. When Discord APIフォールバックで権限が取得できた場合, the resolveServerAuth shall 取得結果を `user_guilds` テーブルに保存する（次回以降のDB参照を可能にする）

### Requirement 8: 後方互換性と既存テスト

**Objective:** As a 開発者, I want 既存機能への影響を最小限にする, so that user_guilds導入がリグレッションを引き起こさない

#### Acceptance Criteria

1. The マイグレーション shall 既存テーブル（`guilds`, `guild_config`, `event_settings`, `events`）のスキーマを変更しない
2. The アプリケーション shall 既存の単体テストが全て通ること
3. The アプリケーション shall 既存のE2Eテストが全て通ること
4. While `user_guilds` にレコードが存在しない初期状態, the アプリケーション shall Discord APIフォールバックにより正常に動作する（段階的移行をサポート）
