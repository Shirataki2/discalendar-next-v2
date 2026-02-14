-- guild_config テーブルに INSERT/UPDATE の RLS ポリシーを追加
-- 既存の SELECT ポリシーのみでは認証ユーザーからの書き込みが拒否される問題を修正
--
-- 設計上の制約:
--   Discord 権限ビットフィールドは外部 API から取得されるためDB内に永続化されておらず、
--   RLS ポリシーでギルド管理権限の有無を直接検証することができない。
--   そのため RLS では認証ユーザーであることのみを検証し、
--   ギルド管理権限のチェックはアプリケーション層（Server Action の resolveServerAuth）で
--   Discord API / メモリキャッシュから権限を取得して実施する。
--
-- 将来の改善案:
--   user_guilds テーブル等で Discord 権限をDB内にキャッシュすれば、
--   RLS ポリシーでもギルドメンバーシップ・権限の検証が可能になる。

CREATE POLICY "authenticated_users_can_insert_guild_config"
    ON guild_config
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "authenticated_users_can_update_guild_config"
    ON guild_config
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);
