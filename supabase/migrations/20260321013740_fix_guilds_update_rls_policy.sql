-- guilds テーブルの UPDATE ポリシーをメンバーシップベースに修正
-- 既存ポリシーは USING(true)/WITH CHECK(true) で全認証済みユーザーが任意ギルドを更新可能な脆弱性あり
-- user_guild_ids() を使い、自身がメンバーのギルドのみ更新許可に制限

DROP POLICY IF EXISTS "authenticated_users_can_update_guilds" ON guilds;

CREATE POLICY "members_can_update_guilds"
    ON guilds
    FOR UPDATE
    TO authenticated
    USING (guild_id IN (SELECT user_guild_ids()))
    WITH CHECK (guild_id IN (SELECT user_guild_ids()));
