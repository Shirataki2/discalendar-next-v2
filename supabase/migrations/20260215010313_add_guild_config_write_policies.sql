-- guild_config テーブルに INSERT/UPDATE の RLS ポリシーを追加
-- 既存の SELECT ポリシーのみでは認証ユーザーからの書き込みが拒否される問題を修正
--
-- 権限チェックはアプリケーション層（Server Action）で Discord 権限ビットフィールドに基づいて実施
-- RLS では認証ユーザーであることのみを検証する

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
