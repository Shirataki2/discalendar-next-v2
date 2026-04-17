-- event-poll 機能: RLS ポリシー + Realtime publication
-- Requirements: 5.4, 6.4, 6.5
--
-- 設計方針:
-- - SELECT: authenticated ユーザーのうち、該当 poll の親ギルドに所属するメンバーのみ
--   (user_guild_ids() ベース。既存 events / event_series と同ポリシー)
-- - event_polls の UPDATE: メンバー許可（close / finalize を Web Server Action 経由で行うため）
-- - event_polls の INSERT / DELETE: service_role のみ（Bot 経路のみ。RLS bypass）
-- - event_poll_options / event_poll_votes の全書き込み: service_role のみ
--   (Web から直接投票・候補追加はさせず、Bot 経由に統一して整合単純化)
--
-- service_role は RLS をバイパスするため、authenticated 用ポリシーを作らないだけで
-- クライアント側からの書き込みを全面的に禁止できる。

-- =============================================================================
-- 1. event_polls ポリシー
-- =============================================================================
CREATE POLICY "members_can_read_event_polls"
    ON event_polls
    FOR SELECT
    TO authenticated
    USING (guild_id IN (SELECT user_guild_ids()));

-- Web Server Action（close / finalize）は authenticated ロールで UPDATE を発行する
CREATE POLICY "members_can_update_event_polls"
    ON event_polls
    FOR UPDATE
    TO authenticated
    USING (guild_id IN (SELECT user_guild_ids()))
    WITH CHECK (guild_id IN (SELECT user_guild_ids()));

-- INSERT / DELETE は service_role のみ（ポリシー未定義 = authenticated には deny）

-- =============================================================================
-- 2. event_poll_options ポリシー
-- =============================================================================
-- 親 poll の guild_id を経由してメンバーシップを検証する
CREATE POLICY "members_can_read_event_poll_options"
    ON event_poll_options
    FOR SELECT
    TO authenticated
    USING (
        poll_id IN (
            SELECT id FROM event_polls
            WHERE guild_id IN (SELECT user_guild_ids())
        )
    );

-- INSERT / UPDATE / DELETE は service_role のみ

-- =============================================================================
-- 3. event_poll_votes ポリシー
-- =============================================================================
CREATE POLICY "members_can_read_event_poll_votes"
    ON event_poll_votes
    FOR SELECT
    TO authenticated
    USING (
        poll_id IN (
            SELECT id FROM event_polls
            WHERE guild_id IN (SELECT user_guild_ids())
        )
    );

-- INSERT / UPDATE / DELETE は service_role のみ（投票は Bot 経路のみ）

-- =============================================================================
-- 4. Realtime publication 追加
-- =============================================================================
-- Supabase Realtime の postgres_changes でクライアントに変更を配信する
ALTER PUBLICATION supabase_realtime ADD TABLE event_polls;
ALTER PUBLICATION supabase_realtime ADD TABLE event_poll_options;
ALTER PUBLICATION supabase_realtime ADD TABLE event_poll_votes;

-- DELETE / UPDATE 時に old 行全体を送出するため REPLICA IDENTITY FULL を設定
ALTER TABLE event_polls        REPLICA IDENTITY FULL;
ALTER TABLE event_poll_options REPLICA IDENTITY FULL;
ALTER TABLE event_poll_votes   REPLICA IDENTITY FULL;
