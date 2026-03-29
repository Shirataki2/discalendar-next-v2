-- ics_feed_tokens テーブルの作成
-- ICSフィードエクスポート用のアクセストークンを格納するテーブル
-- 非公開ギルドのICSフィードへのアクセス制御に使用
--
-- Requirements: 5.1, 5.2, 5.3, 5.5

-- =============================================================================
-- 1. テーブル作成
-- =============================================================================
CREATE TABLE ics_feed_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    guild_id VARCHAR(32) NOT NULL REFERENCES guilds(guild_id) ON DELETE CASCADE,
    token VARCHAR(64) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    revoked_at TIMESTAMPTZ DEFAULT NULL
);

-- アクティブトークンのユニーク制約（1ギルド1アクティブトークン）
CREATE UNIQUE INDEX idx_ics_feed_tokens_guild_active
    ON ics_feed_tokens (guild_id)
    WHERE revoked_at IS NULL;

-- トークン検証用インデックス（アクティブなトークンのみ対象）
CREATE INDEX idx_ics_feed_tokens_token
    ON ics_feed_tokens (token)
    WHERE revoked_at IS NULL;

-- =============================================================================
-- 2. Row Level Security
-- =============================================================================
ALTER TABLE ics_feed_tokens ENABLE ROW LEVEL SECURITY;

-- 認証済みユーザーが自分のギルドのトークンを読み取り可能
CREATE POLICY "guild_members_can_read_tokens"
    ON ics_feed_tokens FOR SELECT TO authenticated
    USING (guild_id IN (SELECT user_guild_ids()));

-- 認証済みユーザーが自分のギルドのトークンを作成可能
CREATE POLICY "guild_members_can_insert_tokens"
    ON ics_feed_tokens FOR INSERT TO authenticated
    WITH CHECK (guild_id IN (SELECT user_guild_ids()));

-- 認証済みユーザーが自分のギルドのトークンを無効化（revoked_at更新）可能
CREATE POLICY "guild_members_can_update_tokens"
    ON ics_feed_tokens FOR UPDATE TO authenticated
    USING (guild_id IN (SELECT user_guild_ids()))
    WITH CHECK (guild_id IN (SELECT user_guild_ids()));
