-- SECURITY DEFINER 関数の権限強化 + sync_user_guilds パフォーマンス最適化
--
-- 1. upsert_user_guild, sync_user_guilds, user_guild_ids() に REVOKE/GRANT を設定
--    （未認証ユーザーからの関数呼び出しを防止）
-- 2. sync_user_guilds を FOR LOOP から unnest ベースの一括 INSERT に最適化

-- =============================================================================
-- 1. REVOKE/GRANT 設定
-- =============================================================================

-- user_guild_ids(): RLS ポリシーから参照されるため authenticated + service_role に許可
REVOKE ALL ON FUNCTION user_guild_ids() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION user_guild_ids() TO authenticated;
GRANT EXECUTE ON FUNCTION user_guild_ids() TO service_role;

-- upsert_user_guild: サーバー側からの単一ギルド書き込み用
REVOKE ALL ON FUNCTION upsert_user_guild(VARCHAR(32), BIGINT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION upsert_user_guild(VARCHAR(32), BIGINT) TO authenticated;

-- sync_user_guilds: サーバー側からの一括同期用
REVOKE ALL ON FUNCTION sync_user_guilds(VARCHAR(32)[], BIGINT[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION sync_user_guilds(VARCHAR(32)[], BIGINT[]) TO authenticated;

-- =============================================================================
-- 2. sync_user_guilds を unnest ベースに最適化
-- =============================================================================
-- FOR LOOP による行ごとの INSERT を unnest による一括 INSERT に置換
-- ギルド数が多い場合のパフォーマンスを改善
CREATE OR REPLACE FUNCTION sync_user_guilds(
    p_guild_ids VARCHAR(32)[],
    p_permissions BIGINT[]
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
    -- Upsert all guilds in a single statement using unnest
    IF array_length(p_guild_ids, 1) IS NOT NULL THEN
        INSERT INTO user_guilds (user_id, guild_id, permissions, updated_at)
        SELECT v_user_id, unnest(p_guild_ids), unnest(p_permissions), NOW()
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
