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

-- guild_configテーブルの作成
CREATE TABLE IF NOT EXISTS guild_config (
    guild_id VARCHAR(32) PRIMARY KEY REFERENCES guilds(guild_id) ON DELETE CASCADE,
    restricted BOOLEAN NOT NULL DEFAULT false
);

-- eventsテーブルにnotificationsカラムを追加
ALTER TABLE events ADD COLUMN IF NOT EXISTS notifications JSONB DEFAULT '[]'::jsonb;
