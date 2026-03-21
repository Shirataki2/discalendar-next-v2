-- anon ロールの events テーブルに対する SELECT を安全なカラムのみに制限
-- 除外: channel_id, channel_name, notifications（内部Discord情報）
REVOKE SELECT ON events FROM anon;
GRANT SELECT (
    id, guild_id, name, description, color, is_all_day,
    start_at, end_at, location, series_id, original_date,
    created_at, updated_at
) ON events TO anon;

-- event_series テーブルも同様
-- 除外: channel_id, channel_name, notifications（内部Discord情報）
REVOKE SELECT ON event_series FROM anon;
GRANT SELECT (
    id, guild_id, name, description, color, is_all_day,
    rrule, dtstart, duration_minutes, exdates,
    location, created_at, updated_at
) ON event_series TO anon;
