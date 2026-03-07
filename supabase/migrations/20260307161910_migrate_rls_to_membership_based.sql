-- RLSポリシーをメンバーシップベースに移行
-- user_guild_ids() ヘルパー関数を作成し、既存の WITH CHECK(true) ポリシーを
-- guild_id IN (SELECT user_guild_ids()) ベースに置き換える
--
-- 移行対象: guild_config, event_settings, events, event_series の INSERT/UPDATE/DELETE ポリシー
-- SELECTポリシーは変更しない（閲覧はメンバーシップ不問、カレンダー共有閲覧機能を維持）
--
-- Requirements: 5.1, 5.2, 5.3, 5.4, 5.5

-- =============================================================================
-- 1. user_guild_ids() ヘルパー関数の作成
-- =============================================================================
-- SECURITY DEFINER: RLSをバイパスしてuser_guildsテーブルを直接参照
-- STABLE: トランザクション内で結果をキャッシュし、行ごとのサブクエリ実行を回避
CREATE OR REPLACE FUNCTION user_guild_ids()
RETURNS SETOF VARCHAR(32)
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
    SELECT guild_id FROM user_guilds WHERE user_id = auth.uid();
$$;

-- =============================================================================
-- 2. guild_config テーブルの INSERT/UPDATE ポリシー移行
-- =============================================================================
DROP POLICY IF EXISTS "authenticated_users_can_insert_guild_config" ON guild_config;
DROP POLICY IF EXISTS "authenticated_users_can_update_guild_config" ON guild_config;

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
-- 3. event_settings テーブルの INSERT/UPDATE ポリシー移行
-- =============================================================================
DROP POLICY IF EXISTS "authenticated_users_can_insert_event_settings" ON event_settings;
DROP POLICY IF EXISTS "authenticated_users_can_update_event_settings" ON event_settings;

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
-- 4. events テーブルの INSERT/UPDATE/DELETE ポリシー移行
-- =============================================================================
DROP POLICY IF EXISTS "authenticated_users_can_insert_events" ON events;
DROP POLICY IF EXISTS "authenticated_users_can_update_events" ON events;
DROP POLICY IF EXISTS "authenticated_users_can_delete_events" ON events;

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
-- 5. event_series テーブルの INSERT/UPDATE/DELETE ポリシー移行
-- =============================================================================
DROP POLICY IF EXISTS "authenticated_users_can_insert_event_series" ON event_series;
DROP POLICY IF EXISTS "authenticated_users_can_update_event_series" ON event_series;
DROP POLICY IF EXISTS "authenticated_users_can_delete_event_series" ON event_series;

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
