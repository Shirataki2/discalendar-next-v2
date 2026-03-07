-- user_guilds テーブルのセキュリティ強化
--
-- 1. INSERT/UPDATE/DELETE RLS ポリシーを削除（クライアントからの直接書き込みを禁止）
-- 2. SECURITY DEFINER 関数を作成（サーバー側からの書き込みのみ許可）
-- 3. UNIQUE 制約を PRIMARY KEY に昇格
-- 4. 冗長な単一カラムインデックスを削除

-- =============================================================================
-- 1. クライアント直接書き込みポリシーの削除
-- =============================================================================
-- guild_id の検証がなく、認証ユーザーが任意の guild_id を自己挿入できるため
-- user_guild_ids() 経由で他テーブルへの不正アクセスが可能になる脆弱性を修正
DROP POLICY IF EXISTS "users_can_insert_own_user_guilds" ON user_guilds;
DROP POLICY IF EXISTS "users_can_update_own_user_guilds" ON user_guilds;
DROP POLICY IF EXISTS "users_can_delete_own_user_guilds" ON user_guilds;

-- =============================================================================
-- 2. SECURITY DEFINER 関数の作成（書き込みはサーバー側関数経由のみ）
-- =============================================================================

-- 単一ギルドの upsert（resolveServerAuth の Discord API フォールバック用）
CREATE OR REPLACE FUNCTION upsert_user_guild(
    p_guild_id VARCHAR(32),
    p_permissions BIGINT
)
RETURNS void
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
    INSERT INTO user_guilds (user_id, guild_id, permissions, updated_at)
    VALUES (auth.uid(), p_guild_id, p_permissions, NOW())
    ON CONFLICT (user_id, guild_id)
    DO UPDATE SET permissions = EXCLUDED.permissions, updated_at = NOW();
$$;

-- 一括同期（fetchGuilds のメンバーシップ同期用）
-- upsert + 入力に含まれないギルドの削除を1関数で実行
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
    -- Upsert each guild
    IF array_length(p_guild_ids, 1) IS NOT NULL THEN
        FOR i IN 1..array_length(p_guild_ids, 1) LOOP
            INSERT INTO user_guilds (user_id, guild_id, permissions, updated_at)
            VALUES (v_user_id, p_guild_ids[i], p_permissions[i], NOW())
            ON CONFLICT (user_id, guild_id)
            DO UPDATE SET permissions = EXCLUDED.permissions, updated_at = NOW();
        END LOOP;
        v_synced := array_length(p_guild_ids, 1);
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
-- 3. UNIQUE 制約を PRIMARY KEY に昇格
-- =============================================================================
-- PRIMARY KEY は UNIQUE + NOT NULL を暗黙的に保証する
ALTER TABLE user_guilds DROP CONSTRAINT user_guilds_user_id_guild_id_key;
ALTER TABLE user_guilds ADD PRIMARY KEY (user_id, guild_id);

-- =============================================================================
-- 4. 冗長な単一カラムインデックスの削除
-- =============================================================================
-- 複合インデックス idx_user_guilds_user_guild(user_id, guild_id) の先頭列で
-- user_id 単体の検索もカバーされるため不要
DROP INDEX IF EXISTS idx_user_guilds_user_id;
-- PRIMARY KEY が (user_id, guild_id) のインデックスを自動作成するため
-- 手動の複合インデックスも不要
DROP INDEX IF EXISTS idx_user_guilds_user_guild;
