-- event-poll 機能: 3 テーブル、インデックス、CHECK 制約、トリガー
-- Requirements: 6.1, 6.2, 6.3, 6.6, 6.7, 7.5

-- =============================================================================
-- event_polls: 投票の親レコード
-- =============================================================================
CREATE TABLE event_polls (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    guild_id            VARCHAR(32) NOT NULL REFERENCES guilds(guild_id) ON DELETE CASCADE,
    title               TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 100),
    description         TEXT,
    status              TEXT NOT NULL CHECK (status IN ('open', 'closed', 'finalized')),
    channel_id          VARCHAR(32) NOT NULL,
    message_id          VARCHAR(32),
    created_by          VARCHAR(32) NOT NULL,
    finalized_by        VARCHAR(32),
    finalized_option_id UUID, -- event_poll_options 作成後に FK 追加
    finalized_event_id  UUID REFERENCES events(id) ON DELETE SET NULL,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 一覧クエリ用（新しい順、status フィルタ併用想定）
CREATE INDEX idx_event_polls_guild_status_created
    ON event_polls (guild_id, status, created_at DESC);

-- message_id による Discord メッセージからの逆引き（部分インデックス）
CREATE UNIQUE INDEX idx_event_polls_message_id
    ON event_polls (message_id)
    WHERE message_id IS NOT NULL;

-- =============================================================================
-- event_poll_options: 投票候補（最大 10 件/poll）
-- =============================================================================
CREATE TABLE event_poll_options (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    poll_id    UUID NOT NULL REFERENCES event_polls(id) ON DELETE CASCADE,
    starts_at  TIMESTAMPTZ NOT NULL,
    ends_at    TIMESTAMPTZ,
    position   INTEGER NOT NULL CHECK (position BETWEEN 0 AND 9),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (poll_id, position)
);

CREATE INDEX idx_event_poll_options_poll_id
    ON event_poll_options (poll_id);

-- event_polls.finalized_option_id の FK を遅延追加
ALTER TABLE event_polls
    ADD CONSTRAINT event_polls_finalized_option_id_fkey
    FOREIGN KEY (finalized_option_id)
    REFERENCES event_poll_options(id)
    ON DELETE SET NULL;

-- =============================================================================
-- event_poll_votes: ユーザー投票（(option_id, user_id) で一意）
-- =============================================================================
CREATE TABLE event_poll_votes (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    poll_id    UUID NOT NULL REFERENCES event_polls(id) ON DELETE CASCADE,
    option_id  UUID NOT NULL REFERENCES event_poll_options(id) ON DELETE CASCADE,
    user_id    VARCHAR(32) NOT NULL,
    choice     TEXT NOT NULL CHECK (choice IN ('yes', 'maybe', 'no')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (option_id, user_id)
);

-- 候補ごとの choice 集計用
CREATE INDEX idx_event_poll_votes_poll_choice
    ON event_poll_votes (poll_id, choice);

-- =============================================================================
-- RLS 有効化（ポリシーは後続マイグレーション 1.2 で追加）
-- デフォルトで deny とし、policy なしでは読み書き不可にする
-- =============================================================================
ALTER TABLE event_polls        ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_poll_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_poll_votes   ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- updated_at 自動更新トリガー
-- =============================================================================
-- update_updated_at_column() は events マイグレーションで既に定義済み（CREATE OR REPLACE）。
CREATE TRIGGER update_event_polls_updated_at
    BEFORE UPDATE ON event_polls
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_event_poll_votes_updated_at
    BEFORE UPDATE ON event_poll_votes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- 1 poll あたり options が 10 件を超える INSERT を拒否するトリガー
-- CHECK 制約の position BETWEEN 0 AND 9 と合わせて二重防御
-- =============================================================================
CREATE OR REPLACE FUNCTION assert_poll_option_limit()
RETURNS TRIGGER AS $$
DECLARE
    option_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO option_count
    FROM event_poll_options
    WHERE poll_id = NEW.poll_id;

    IF option_count >= 10 THEN
        RAISE EXCEPTION 'event_poll_options: poll % already has 10 options (limit reached)', NEW.poll_id
            USING ERRCODE = 'check_violation';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_poll_option_limit
    BEFORE INSERT ON event_poll_options
    FOR EACH ROW
    EXECUTE FUNCTION assert_poll_option_limit();
