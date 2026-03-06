-- user_guilds テーブルの作成
-- ユーザーとDiscordギルドの関連（メンバーシップ・権限ビットフィールド）をDB内に永続化する
-- Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 2.1, 2.2, 2.3, 2.4, 2.5

-- テーブル作成
CREATE TABLE user_guilds (
    user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
    guild_id VARCHAR(32) NOT NULL REFERENCES guilds(guild_id) ON DELETE CASCADE,
    permissions BIGINT NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, guild_id)
);

-- パフォーマンス用インデックス
-- RLS ポリシーの user_id 検索を高速化
CREATE INDEX idx_user_guilds_user_id ON user_guilds(user_id);
-- getUserGuildPermissions の複合検索を高速化
CREATE INDEX idx_user_guilds_user_guild ON user_guilds(user_id, guild_id);

-- updated_at 自動更新トリガー（既存の update_updated_at_column() 関数を再利用）
CREATE TRIGGER update_user_guilds_updated_at
    BEFORE UPDATE ON user_guilds
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security 設定
ALTER TABLE user_guilds ENABLE ROW LEVEL SECURITY;

-- SELECT: 認証済みユーザーが自分のメンバーシップレコードのみを読み取れる
CREATE POLICY "users_can_select_own_user_guilds"
    ON user_guilds
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

-- INSERT: 認証済みユーザーが自分のメンバーシップレコードのみを挿入できる
CREATE POLICY "users_can_insert_own_user_guilds"
    ON user_guilds
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- UPDATE: 認証済みユーザーが自分のメンバーシップレコードのみを更新できる
CREATE POLICY "users_can_update_own_user_guilds"
    ON user_guilds
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- DELETE: 認証済みユーザーが自分のメンバーシップレコードのみを削除できる
CREATE POLICY "users_can_delete_own_user_guilds"
    ON user_guilds
    FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);
