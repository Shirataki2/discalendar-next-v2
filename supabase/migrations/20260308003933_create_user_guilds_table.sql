-- user_guilds テーブルの作成
-- ユーザーとDiscordギルドの関連（メンバーシップ・権限ビットフィールド）をDB内に永続化する
--
-- 1. テーブル作成 (PRIMARY KEY, トリガー, RLS)
-- 2. SECURITY DEFINER 関数 (upsert_user_guild, sync_user_guilds, user_guild_ids)
-- 3. REVOKE/GRANT による最小権限設定
--
-- セキュリティ方針:
--   - SELECT: authenticated ユーザーが自分のレコードのみ読み取り可能
--   - INSERT/UPDATE/DELETE: クライアント直接書き込み禁止（メンバーシップ偽装防止）
--   - 書き込みは SECURITY DEFINER 関数経由のみ（サーバー側で Discord メンバーシップを検証済み）

-- =============================================================================
-- 1. テーブル作成
-- =============================================================================
CREATE TABLE user_guilds (
    user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
    guild_id VARCHAR(32) NOT NULL REFERENCES guilds(guild_id) ON DELETE CASCADE,
    permissions BIGINT NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, guild_id)
);

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

-- =============================================================================
-- 2. SECURITY DEFINER 関数
-- =============================================================================

-- 単一ギルドの upsert（resolveServerAuth の Discord API フォールバック用）
-- 他ギルドのメンバーシップを削除しない安全な書き込み
CREATE FUNCTION upsert_user_guild(
    p_guild_id VARCHAR(32),
    p_permissions TEXT
)
RETURNS void
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
    INSERT INTO user_guilds (user_id, guild_id, permissions, updated_at)
    VALUES (auth.uid(), p_guild_id, p_permissions::BIGINT, NOW())
    ON CONFLICT (user_id, guild_id)
    DO UPDATE SET permissions = EXCLUDED.permissions, updated_at = NOW();
$$;

-- 一括同期（fetchGuilds のメンバーシップ同期用）
-- upsert + 入力に含まれないギルドの削除を1関数で実行
CREATE FUNCTION sync_user_guilds(
    p_guild_ids VARCHAR(32)[],
    p_permissions TEXT[]
)
RETURNS TABLE(synced INT, removed INT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_synced INT := 0;
    v_removed INT := 0;
    v_user_id UUID := auth.uid();
BEGIN
    -- Upsert all guilds using unnest (TEXT → BIGINT cast)
    IF array_length(p_guild_ids, 1) IS NOT NULL THEN
        INSERT INTO user_guilds (user_id, guild_id, permissions, updated_at)
        SELECT v_user_id, g_id, p::BIGINT, NOW()
        FROM unnest(p_guild_ids, p_permissions) AS t(g_id, p)
        ON CONFLICT (user_id, guild_id)
        DO UPDATE SET permissions = EXCLUDED.permissions, updated_at = NOW();

        GET DIAGNOSTICS v_synced = ROW_COUNT;
    END IF;

    -- Delete stale guilds (not in the input set)
    IF array_length(p_guild_ids, 1) IS NOT NULL THEN
        DELETE FROM user_guilds
        WHERE user_id = v_user_id
        AND guild_id != ALL(p_guild_ids);
    ELSE
        -- Empty input: delete all memberships for this user
        DELETE FROM user_guilds
        WHERE user_id = v_user_id;
    END IF;

    GET DIAGNOSTICS v_removed = ROW_COUNT;

    RETURN QUERY SELECT v_synced, v_removed;
END;
$$;

-- user_guild_ids(): RLS ポリシーから参照するメンバーシップ解決ヘルパー
-- SECURITY DEFINER: RLS をバイパスして user_guilds テーブルを直接参照
-- STABLE: トランザクション内で結果をキャッシュし、行ごとのサブクエリ実行を回避
CREATE FUNCTION user_guild_ids()
RETURNS SETOF VARCHAR(32)
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
    SELECT guild_id FROM user_guilds WHERE user_id = auth.uid();
$$;

-- =============================================================================
-- 3. REVOKE/GRANT（最小権限の原則）
-- =============================================================================

REVOKE ALL ON FUNCTION upsert_user_guild(VARCHAR(32), TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION upsert_user_guild(VARCHAR(32), TEXT) TO authenticated;

REVOKE ALL ON FUNCTION sync_user_guilds(VARCHAR(32)[], TEXT[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION sync_user_guilds(VARCHAR(32)[], TEXT[]) TO authenticated;

REVOKE ALL ON FUNCTION user_guild_ids() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION user_guild_ids() TO authenticated;
GRANT EXECUTE ON FUNCTION user_guild_ids() TO service_role;
