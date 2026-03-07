-- RLS ポリシーをメンバーシップベースに移行 + upsert_event_settings にメンバーシップ検証追加
--
-- 1. 既存テーブルの INSERT/UPDATE/DELETE ポリシーを user_guild_ids() ベースに置換
--    移行対象: guild_config, event_settings, events, event_series
--    SELECT ポリシーは変更しない（閲覧はメンバーシップ不問、カレンダー共有閲覧機能を維持）
--
-- 2. upsert_event_settings 関数にメンバーシップ検証を追加

-- =============================================================================
-- 1. guild_config テーブルの INSERT/UPDATE ポリシー移行
-- =============================================================================
DROP POLICY IF EXISTS "authenticated_users_can_insert_guild_config" ON guild_config;
DROP POLICY IF EXISTS "authenticated_users_can_update_guild_config" ON guild_config;
DROP POLICY IF EXISTS "members_can_insert_guild_config" ON guild_config;
DROP POLICY IF EXISTS "members_can_update_guild_config" ON guild_config;

CREATE POLICY "members_can_insert_guild_config"
    ON guild_config
    FOR INSERT
    TO authenticated
    WITH CHECK (guild_id IN (SELECT user_guild_ids()));

CREATE POLICY "members_can_update_guild_config"
    ON guild_config
    FOR UPDATE
    TO authenticated
    USING (guild_id IN (SELECT user_guild_ids()))
    WITH CHECK (guild_id IN (SELECT user_guild_ids()));

-- =============================================================================
-- 2. event_settings テーブルの INSERT/UPDATE ポリシー移行
-- =============================================================================
DROP POLICY IF EXISTS "authenticated_users_can_insert_event_settings" ON event_settings;
DROP POLICY IF EXISTS "authenticated_users_can_update_event_settings" ON event_settings;
DROP POLICY IF EXISTS "members_can_insert_event_settings" ON event_settings;
DROP POLICY IF EXISTS "members_can_update_event_settings" ON event_settings;

CREATE POLICY "members_can_insert_event_settings"
    ON event_settings
    FOR INSERT
    TO authenticated
    WITH CHECK (guild_id IN (SELECT user_guild_ids()));

CREATE POLICY "members_can_update_event_settings"
    ON event_settings
    FOR UPDATE
    TO authenticated
    USING (guild_id IN (SELECT user_guild_ids()))
    WITH CHECK (guild_id IN (SELECT user_guild_ids()));

-- =============================================================================
-- 3. events テーブルの INSERT/UPDATE/DELETE ポリシー移行
-- =============================================================================
DROP POLICY IF EXISTS "authenticated_users_can_insert_events" ON events;
DROP POLICY IF EXISTS "authenticated_users_can_update_events" ON events;
DROP POLICY IF EXISTS "authenticated_users_can_delete_events" ON events;
DROP POLICY IF EXISTS "members_can_insert_events" ON events;
DROP POLICY IF EXISTS "members_can_update_events" ON events;
DROP POLICY IF EXISTS "members_can_delete_events" ON events;

CREATE POLICY "members_can_insert_events"
    ON events
    FOR INSERT
    TO authenticated
    WITH CHECK (guild_id IN (SELECT user_guild_ids()));

CREATE POLICY "members_can_update_events"
    ON events
    FOR UPDATE
    TO authenticated
    USING (guild_id IN (SELECT user_guild_ids()))
    WITH CHECK (guild_id IN (SELECT user_guild_ids()));

CREATE POLICY "members_can_delete_events"
    ON events
    FOR DELETE
    TO authenticated
    USING (guild_id IN (SELECT user_guild_ids()));

-- =============================================================================
-- 4. event_series テーブルの INSERT/UPDATE/DELETE ポリシー移行
-- =============================================================================
DROP POLICY IF EXISTS "authenticated_users_can_insert_event_series" ON event_series;
DROP POLICY IF EXISTS "authenticated_users_can_update_event_series" ON event_series;
DROP POLICY IF EXISTS "authenticated_users_can_delete_event_series" ON event_series;
DROP POLICY IF EXISTS "members_can_insert_event_series" ON event_series;
DROP POLICY IF EXISTS "members_can_update_event_series" ON event_series;
DROP POLICY IF EXISTS "members_can_delete_event_series" ON event_series;

CREATE POLICY "members_can_insert_event_series"
    ON event_series
    FOR INSERT
    TO authenticated
    WITH CHECK (guild_id IN (SELECT user_guild_ids()));

CREATE POLICY "members_can_update_event_series"
    ON event_series
    FOR UPDATE
    TO authenticated
    USING (guild_id IN (SELECT user_guild_ids()))
    WITH CHECK (guild_id IN (SELECT user_guild_ids()));

CREATE POLICY "members_can_delete_event_series"
    ON event_series
    FOR DELETE
    TO authenticated
    USING (guild_id IN (SELECT user_guild_ids()));

-- =============================================================================
-- 5. upsert_event_settings にメンバーシップ検証を追加
-- =============================================================================

-- メンバーシップ検証を追加するため、既存関数を一度削除して再作成
DROP FUNCTION IF EXISTS upsert_event_settings(TEXT, TEXT);

CREATE FUNCTION upsert_event_settings(
    p_guild_id TEXT,
    p_channel_id TEXT
)
RETURNS TABLE(out_guild_id TEXT, out_channel_id TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- 認証チェック（既存）: anon ユーザーからの呼び出しを拒否
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: user must be authenticated';
    END IF;

    -- メンバーシップ検証（新規追加）: ユーザーがギルドに所属していることを確認
    IF NOT EXISTS (
        SELECT 1 FROM user_guilds
        WHERE user_id = auth.uid() AND guild_id = p_guild_id
    ) THEN
        RAISE EXCEPTION 'Forbidden: user is not a member of this guild';
    END IF;

    INSERT INTO event_settings (guild_id, channel_id)
    VALUES (p_guild_id, p_channel_id)
    ON CONFLICT (guild_id)
    DO UPDATE SET channel_id = EXCLUDED.channel_id;

    RETURN QUERY
        SELECT es.guild_id::TEXT, es.channel_id::TEXT
        FROM event_settings es
        WHERE es.guild_id = p_guild_id;
END;
$$;

-- 実行権限を authenticated ロールのみに制限
REVOKE ALL ON FUNCTION upsert_event_settings(TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION upsert_event_settings(TEXT, TEXT) TO authenticated;
