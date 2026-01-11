-- Bot設定用テーブルの作成とイベント通知機能の追加
-- event_settings: 通知先チャンネル設定
-- guild_config: サーバー設定（制限モードなど）
-- events.notifications: イベント通知履歴

-- event_settingsテーブルの作成
CREATE TABLE IF NOT EXISTS event_settings (
    id SERIAL PRIMARY KEY,
    guild_id VARCHAR(32) UNIQUE NOT NULL REFERENCES guilds(guild_id) ON DELETE CASCADE,
    channel_id VARCHAR(32) NOT NULL
);

-- パフォーマンス最適化: guild_idカラムへのインデックス
-- UNIQUE制約により自動的にインデックスが作成されますが、既存パターンとの一貫性のため明示
CREATE INDEX IF NOT EXISTS idx_event_settings_guild_id ON event_settings(guild_id);

-- guild_configテーブルの作成
CREATE TABLE IF NOT EXISTS guild_config (
    guild_id VARCHAR(32) PRIMARY KEY REFERENCES guilds(guild_id) ON DELETE CASCADE,
    restricted BOOLEAN NOT NULL DEFAULT false
);

-- eventsテーブルにnotificationsカラムを追加
ALTER TABLE events ADD COLUMN IF NOT EXISTS notifications JSONB DEFAULT '[]'::jsonb;

-- Row Level Security設定
-- Bot側はservice_roleキーでRLSをバイパス、Web側（anonキー）からの不正アクセスを防止

-- event_settingsテーブルのRLS設定
ALTER TABLE event_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_users_can_read_event_settings"
    ON event_settings
    FOR SELECT
    TO authenticated
    USING (true);

-- guild_configテーブルのRLS設定
ALTER TABLE guild_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_users_can_read_guild_config"
    ON guild_config
    FOR SELECT
    TO authenticated
    USING (true);

-- 通知履歴を追加するヘルパー関数
-- Bot側がnotificationsカラムに通知成功/失敗を記録するために使用
CREATE OR REPLACE FUNCTION append_notification(
    event_id UUID,
    notification JSONB
) RETURNS void AS $$
BEGIN
    UPDATE events
    SET notifications = notifications || jsonb_build_array(notification)
    WHERE id = event_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
