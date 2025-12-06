-- eventsテーブルの作成
-- カレンダーイベント情報を格納するテーブル

CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    guild_id VARCHAR(32) NOT NULL REFERENCES guilds(guild_id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    color VARCHAR(7) NOT NULL DEFAULT '#3B82F6',
    is_all_day BOOLEAN NOT NULL DEFAULT false,
    start_at TIMESTAMPTZ NOT NULL,
    end_at TIMESTAMPTZ NOT NULL,
    location VARCHAR(255),
    channel_id VARCHAR(32),
    channel_name VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- パフォーマンス最適化: インデックス
CREATE INDEX idx_events_guild_id ON events(guild_id);
CREATE INDEX idx_events_start_at ON events(start_at);
CREATE INDEX idx_events_guild_start ON events(guild_id, start_at);

-- Row Level Security設定
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- 認証済みユーザーに対してSELECT権限を許可
CREATE POLICY "authenticated_users_can_read_events"
    ON events
    FOR SELECT
    TO authenticated
    USING (true);

-- updated_at自動更新トリガー
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_events_updated_at
    BEFORE UPDATE ON events
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
