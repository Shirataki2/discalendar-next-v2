-- 匿名ユーザー向けRLSポリシーを追加（公開カレンダー機能）
-- Requirements: 3.3 (内部情報アクセス防止), 3.4 (匿名ユーザーへの読み取り制限)
-- DIS-108: DBスキーマに公開カレンダー用カラム（public_slug, is_public）を追加

-- guilds: anonロールに公開かつ未削除のギルドの読み取りを許可
CREATE POLICY "anon_can_read_public_guilds"
    ON guilds
    FOR SELECT
    TO anon
    USING (is_public = true AND deleted_at IS NULL);

-- events: anonロールに公開ギルドのイベント読み取りを許可
CREATE POLICY "anon_can_read_public_events"
    ON events
    FOR SELECT
    TO anon
    USING (
        guild_id IN (
            SELECT guild_id FROM guilds
            WHERE is_public = true AND deleted_at IS NULL
        )
    );

-- event_series: anonロールに公開ギルドのイベントシリーズ読み取りを許可
CREATE POLICY "anon_can_read_public_event_series"
    ON event_series
    FOR SELECT
    TO anon
    USING (
        guild_id IN (
            SELECT guild_id FROM guilds
            WHERE is_public = true AND deleted_at IS NULL
        )
    );
