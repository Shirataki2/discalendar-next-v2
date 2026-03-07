-- permissions パラメータの型を BIGINT → TEXT に変更
--
-- JavaScript の Number.MAX_SAFE_INTEGER (2^53-1) を超える Discord 権限値で
-- 精度が失われるリスクを排除する。
-- TypeScript 側は文字列をそのまま渡し、PostgreSQL 側で TEXT → BIGINT キャストを行う。

-- =============================================================================
-- 1. 既存関数の削除（シグネチャ変更のため DROP + CREATE が必要）
-- =============================================================================
DROP FUNCTION IF EXISTS upsert_user_guild(VARCHAR(32), BIGINT);
DROP FUNCTION IF EXISTS sync_user_guilds(VARCHAR(32)[], BIGINT[]);

-- =============================================================================
-- 2. TEXT パラメータで再作成
-- =============================================================================

-- 単一ギルドの upsert
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

-- 一括同期（unnest ベース）
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

-- =============================================================================
-- 3. REVOKE/GRANT（新しいシグネチャに対して設定）
-- =============================================================================
REVOKE ALL ON FUNCTION upsert_user_guild(VARCHAR(32), TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION upsert_user_guild(VARCHAR(32), TEXT) TO authenticated;

REVOKE ALL ON FUNCTION sync_user_guilds(VARCHAR(32)[], TEXT[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION sync_user_guilds(VARCHAR(32)[], TEXT[]) TO authenticated;
