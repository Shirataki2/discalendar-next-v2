-- event_attendees テーブル: RSVP（出欠管理）データの永続化
-- Requirements: 1.1, 1.2, 1.4, 6.1, 6.2

CREATE TABLE event_attendees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- 単発イベント参照（排他的: event_id OR series）
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,

    -- 繰り返しイベント参照（排他的: series OR event_id）
    event_series_id UUID REFERENCES event_series(id) ON DELETE CASCADE,
    occurrence_date DATE,

    -- ギルドスコープ
    guild_id VARCHAR(32) NOT NULL REFERENCES guilds(guild_id) ON DELETE CASCADE,

    -- ユーザー識別（user_id は Bot 経由の場合 NULL）
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    discord_user_id VARCHAR(32) NOT NULL,
    discord_username VARCHAR(100) NOT NULL,
    discord_avatar_url VARCHAR(512),

    -- RSVP ステータス
    status VARCHAR(10) NOT NULL CHECK (status IN ('going', 'maybe', 'not_going')),
    responded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- 排他的参照: 単発イベント OR 繰り返しイベント（いずれか一方のみ非 NULL）
    CONSTRAINT chk_event_reference CHECK (
        (event_id IS NOT NULL AND event_series_id IS NULL AND occurrence_date IS NULL)
        OR
        (event_id IS NULL AND event_series_id IS NOT NULL AND occurrence_date IS NOT NULL)
    ),

    -- ユニーク制約: 同一ユーザー × 同一単発イベントで 1 レコード
    CONSTRAINT uq_single_event_attendee UNIQUE (event_id, discord_user_id),

    -- ユニーク制約: 同一ユーザー × 同一繰り返しイベントオカレンスで 1 レコード
    CONSTRAINT uq_series_occurrence_attendee UNIQUE (event_series_id, occurrence_date, discord_user_id)
);

-- パフォーマンス用インデックス
CREATE INDEX idx_attendees_event_id ON event_attendees(event_id) WHERE event_id IS NOT NULL;
CREATE INDEX idx_attendees_series_occurrence ON event_attendees(event_series_id, occurrence_date) WHERE event_series_id IS NOT NULL;
CREATE INDEX idx_attendees_guild ON event_attendees(guild_id);
CREATE INDEX idx_attendees_discord_user ON event_attendees(discord_user_id);
