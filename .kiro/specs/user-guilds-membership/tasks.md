# Implementation Plan

- [ ] 1. user_guilds テーブル作成マイグレーション
- [x] 1.1 テーブルスキーマとRLSポリシーのマイグレーションファイルを作成する
  - `user_guilds` テーブルを作成し、ユーザーID（UUID）とギルドID（VARCHAR(32)）をカラムとして定義する
  - ユーザーIDは `auth.users` への外部キー（ON DELETE CASCADE）、ギルドIDは `guilds(guild_id)` への外部キー（ON DELETE CASCADE）として設定する
  - `(user_id, guild_id)` の複合ユニーク制約を定義する
  - Discord権限ビットフィールドを格納するBIGINTカラム（デフォルト0）を追加する
  - レコード鮮度管理用のタイムスタンプカラム（デフォルト `now()`）を追加する
  - 既存の `update_updated_at_column()` トリガーを再利用し、UPDATE時にタイムスタンプを自動更新するトリガーを設定する
  - RLSを有効化し、`auth.uid() = user_id` を条件とするSELECT/INSERT/UPDATE/DELETEの4ポリシーを定義する
  - パフォーマンス用インデックス（`user_id` 単体、`user_id + guild_id` 複合）を作成する
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 2.1, 2.2, 2.3, 2.4, 2.5_

- [ ] 2. UserGuildsサービス層の実装
- [ ] 2.1 ドメイン型とエラー型を定義する
  - DBのRow型（snake_case）とドメイン型（camelCase）を定義し、変換関数を用意する
  - サービス固有のエラー型（同期失敗、取得失敗、削除失敗）を定義する
  - Result型パターンに準拠した戻り値型を定義する
  - 同期入力用の型（ギルドIDと権限文字列のペア）を定義する
  - permissionsカラムはBIGINTだがSupabaseクライアントがstringで返却するため、型定義でstringを明示する
  - _Requirements: 4.1, 4.4_

- [ ] 2.2 ファクトリ関数とCRUDメソッドを実装する
  - SupabaseClientを受け取るファクトリ関数でサービスインスタンスを生成する
  - Discord APIの結果を一括upsertし、API結果に含まれないギルドのレコードを削除する同期メソッドを実装する（upsertは `onConflict: 'user_id,guild_id'`、削除は `.not('guild_id', 'in', ...)` パターン）
  - 指定ギルドの権限ビットフィールドを取得するメソッドを実装する（レコード不在時はnullを返す）
  - 全メソッドでResult型パターンによるエラーハンドリングを実装する
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [ ] 2.3 サービス層の単体テストを作成する
  - 同期メソッドのテスト: upsert成功、不在ギルド削除、部分失敗時のエラーハンドリング
  - 権限取得メソッドのテスト: レコード存在時のpermissions返却、不在時のnull返却
  - Supabaseクライアントをモックし、各メソッドのResult型レスポンスを検証する
  - _Requirements: 4.5_

- [ ] 3. fetchGuildsへのメンバーシップ同期統合
- [ ] 3.1 ギルド一覧取得時にuser_guildsテーブルへの同期処理を追加する
  - Discord APIからのギルド取得成功後に、サービス層の同期メソッドを呼び出してメンバーシップをupsertする
  - Discord APIレスポンスからギルドIDと権限文字列のペアリストを構築して同期メソッドに渡す
  - APIレスポンスに含まれないギルドのレコードは同期メソッド内で自動削除される（脱退検知）
  - キャッシュヒット時はDiscord APIが呼ばれないため同期処理をスキップする
  - 同期処理をtry-catchでラップし、失敗時はエラーログのみ記録してギルド一覧の返却は継続する（UIをブロックしない）
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [ ] 3.2 fetchGuilds同期統合の単体テストを作成する
  - Discord API成功時にサービス層の同期メソッドが呼ばれることを検証する
  - 同期失敗時にエラーがログされ、ギルド一覧が正常に返却されることを検証する
  - キャッシュヒット時に同期処理がスキップされることを検証する
  - _Requirements: 3.1, 3.4_

- [ ] 4. resolveServerAuthの3-tier権限解決
- [ ] 4.1 (P) メモリキャッシュミス時にDBフォールバック層を追加する
  - 権限解決の順序を「メモリキャッシュ → user_guilds DB → Discord API」の3-tierに拡張する
  - キャッシュミス時にサービス層の権限取得メソッドでDBから権限を検索する
  - DBにレコードが存在する場合、権限文字列を既存のparsePermissionsで解析して認証結果を返す
  - DBにレコードが存在しない場合、既存のDiscord APIフォールバックを実行する（後方互換性維持）
  - Discord APIフォールバック成功時に、取得結果をサービス層の同期メソッドでDBに書き戻す（次回以降のDB参照を可能にする）
  - user_guildsテーブルが空の初期状態ではDBフォールバックが常にnullを返し、既存のDiscord APIフォールバックが実行される（段階的移行をサポート）
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 8.4_

- [ ] 4.2 (P) resolveServerAuth 3-tierの単体テストを作成する
  - キャッシュヒット時にDB/Discord APIが呼ばれないことを検証する
  - キャッシュミス + DBヒット時にDiscord APIが呼ばれず、DBの権限が使われることを検証する
  - キャッシュミス + DBミス + Discord API成功時にDBへの書き戻しが行われることを検証する
  - 全層ミス時にエラーが返されることを検証する
  - user_guildsが空の初期状態でDiscord APIフォールバックが正常動作することを検証する
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 8.4_

- [ ] 5. 既存RLSポリシーのメンバーシップベース移行とSECURITY DEFINER更新
- [ ] 5.1 user_guild_ids()ヘルパー関数とRLSポリシー移行のマイグレーションを作成する
  - SECURITY DEFINER + STABLEで`user_guild_ids()`関数を作成し、現在のユーザーが所属するギルドID一覧を返す（RLSパフォーマンス最適化）
  - `guild_config`のINSERT/UPDATEポリシーを `guild_id IN (SELECT user_guild_ids())` ベースに移行する
  - `event_settings`のINSERT/UPDATEポリシーを同様に移行する
  - `events`のINSERT/UPDATE/DELETEポリシーを同様に移行する
  - `event_series`のINSERT/UPDATE/DELETEポリシーも同一の脆弱性を持つため同時に移行する
  - SELECTポリシーは変更しない（閲覧はメンバーシップ不問、カレンダー共有閲覧機能を維持）
  - 既存ポリシーの`DROP POLICY IF EXISTS`と新ポリシーの`CREATE POLICY`でべき等に実行する
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [ ] 5.2 upsert_event_settings関数にメンバーシップ検証を追加するマイグレーションを作成する
  - 既存の`auth.uid() IS NULL`チェック（認証チェック）を保持する
  - 認証チェックの後に`user_guilds`テーブルで`(auth.uid(), p_guild_id)`のレコード存在確認を追加する
  - メンバーシップレコードが存在しない場合に`'Forbidden: user is not a member of this guild'`例外を発生させる
  - `CREATE OR REPLACE FUNCTION`でべき等に実行する
  - _Requirements: 6.1, 6.2, 6.3_

- [ ] 6. 後方互換性の検証
- [ ] 6.1 既存テストの回帰確認を行う
  - マイグレーションが既存テーブル（guilds, guild_config, event_settings, events）のスキーマを変更していないことを確認する
  - 既存の単体テストが全て通ることを確認する
  - 既存のE2Eテストが全て通ることを確認する
  - user_guildsにレコードが存在しない初期状態でDiscord APIフォールバックにより正常動作することを確認する
  - _Requirements: 8.1, 8.2, 8.3, 8.4_
