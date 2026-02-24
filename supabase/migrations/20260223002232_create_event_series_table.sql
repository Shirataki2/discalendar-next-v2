-- event_series テーブルの作成
-- 繰り返しイベントシリーズ情報を格納するテーブル
-- RFC 5545 RRULE 準拠の繰り返しルールを保存し、オカレンスを動的に展開する
-- Requirements: 8.1, 8.2

CREATE TABLE event_series (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    guild_id VARCHAR(32) NOT NULL REFERENCES guilds(guild_id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    color VARCHAR(7) NOT NULL DEFAULT '#3B82F6',
    is_all_day BOOLEAN NOT NULL DEFAULT false,
    rrule TEXT NOT NULL,
    dtstart TIMESTAMPTZ NOT NULL,
    duration_minutes INTEGER NOT NULL DEFAULT 60,
    location VARCHAR(255),
    channel_id VARCHAR(32),
    channel_name VARCHAR(100),
    notifications JSONB NOT NULL DEFAULT '[]',
    exdates TIMESTAMPTZ[] NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- パフォーマンス最適化: インデックス
CREATE INDEX idx_event_series_guild_id ON event_series(guild_id);
CREATE INDEX idx_event_series_dtstart ON event_series(dtstart);

-- Row Level Security 設定
ALTER TABLE event_series ENABLE ROW LEVEL SECURITY;

-- 認証済みユーザーに対して CRUD 権限を許可するポリシー
CREATE POLICY "authenticated_users_can_read_series"
    ON event_series
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "authenticated_users_can_insert_series"
    ON event_series
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "authenticated_users_can_update_series"
    ON event_series
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "authenticated_users_can_delete_series"
    ON event_series
    FOR DELETE
    TO authenticated
    USING (true);

-- updated_at 自動更新トリガー（既存の update_updated_at_column() 関数を再利用）
CREATE TRIGGER update_event_series_updated_at
    BEFORE UPDATE ON event_series
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
