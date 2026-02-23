-- event_series テーブルの RLS ポリシーを修正
-- 認証済みユーザー全員に許可していた緩すぎるポリシーを削除し、
-- guild_members テーブルを参照したギルドスコープのポリシーに置き換える
-- Requirements: 8.1 (セキュリティ強化)

-- 既存の緩すぎるポリシーを削除
DROP POLICY IF EXISTS "authenticated_users_can_read_series" ON event_series;
DROP POLICY IF EXISTS "authenticated_users_can_insert_series" ON event_series;
DROP POLICY IF EXISTS "authenticated_users_can_update_series" ON event_series;
DROP POLICY IF EXISTS "authenticated_users_can_delete_series" ON event_series;

-- SELECT: 自分が所属するギルドのシリーズのみ閲覧可能
CREATE POLICY "users_can_read_series_in_their_guilds"
    ON event_series
    FOR SELECT
    TO authenticated
    USING (
        guild_id IN (
            SELECT guild_id FROM guild_members WHERE user_id = auth.uid()
        )
    );

-- INSERT: 自分が所属するギルドのみにシリーズを作成可能
CREATE POLICY "users_can_insert_series_in_their_guilds"
    ON event_series
    FOR INSERT
    TO authenticated
    WITH CHECK (
        guild_id IN (
            SELECT guild_id FROM guild_members WHERE user_id = auth.uid()
        )
    );

-- UPDATE: 自分が所属するギルドのシリーズのみ更新可能
CREATE POLICY "users_can_update_series_in_their_guilds"
    ON event_series
    FOR UPDATE
    TO authenticated
    USING (
        guild_id IN (
            SELECT guild_id FROM guild_members WHERE user_id = auth.uid()
        )
    )
    WITH CHECK (
        guild_id IN (
            SELECT guild_id FROM guild_members WHERE user_id = auth.uid()
        )
    );

-- DELETE: 自分が所属するギルドのシリーズのみ削除可能
CREATE POLICY "users_can_delete_series_in_their_guilds"
    ON event_series
    FOR DELETE
    TO authenticated
    USING (
        guild_id IN (
            SELECT guild_id FROM guild_members WHERE user_id = auth.uid()
        )
    );
