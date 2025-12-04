-- Task 1.1: guildsテーブルの作成
-- Discord サーバー（ギルド）情報を格納するテーブル
-- Requirements: 1.1, 1.2

CREATE TABLE guilds (
    id SERIAL PRIMARY KEY,
    guild_id VARCHAR(32) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    avatar_url VARCHAR(512),
    locale VARCHAR(10) NOT NULL DEFAULT 'ja'
);

-- パフォーマンス最適化: guild_idカラムへのインデックス
-- Requirement: 1.2
CREATE INDEX idx_guilds_guild_id ON guilds(guild_id);

-- Task 1.2: Row Level Security設定
-- Requirement: 1.3

-- RLSを有効化
ALTER TABLE guilds ENABLE ROW LEVEL SECURITY;

-- 認証済みユーザーに対してSELECT権限のみを許可するポリシー
CREATE POLICY "authenticated_users_can_read_guilds"
    ON guilds
    FOR SELECT
    TO authenticated
    USING (true);
