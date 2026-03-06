-- event_settings テーブルの RLS ポリシーを修正
--
-- 問題: INSERT ... ON CONFLICT DO UPDATE (upsert) 実行時に
-- PostgreSQL が INSERT ポリシーと UPDATE ポリシーを別々にチェックするため、
-- 既存ポリシーが正しく適用されない場合がある。
--
-- 対策:
-- 1. 既存の INSERT/UPDATE ポリシーをいったん削除して再作成（べき等化）
-- 2. upsert 操作専用の PostgreSQL 関数を SECURITY DEFINER で追加し、
--    アプリケーション層の認証チェックと組み合わせて使用する
--
-- Requirements: 5.4

-- 既存ポリシーを安全に削除（べき等）
DROP POLICY IF EXISTS "authenticated_users_can_insert_event_settings" ON event_settings;
DROP POLICY IF EXISTS "authenticated_users_can_update_event_settings" ON event_settings;

-- INSERT ポリシーを再作成
CREATE POLICY "authenticated_users_can_insert_event_settings"
    ON event_settings
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- UPDATE ポリシーを再作成
CREATE POLICY "authenticated_users_can_update_event_settings"
    ON event_settings
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- upsert 用 SECURITY DEFINER 関数
-- アプリケーション層で認証・権限チェック済みの操作をRLSをバイパスして実行する。
-- auth.uid() IS NULL の場合は例外を発生させ、anon ユーザーからの呼び出しを拒否する。
CREATE OR REPLACE FUNCTION upsert_event_settings(
    p_guild_id TEXT,
    p_channel_id TEXT
)
RETURNS TABLE(guild_id TEXT, channel_id TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- 認証チェック: anon ユーザーからの呼び出しを拒否
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: user must be authenticated';
    END IF;

    INSERT INTO event_settings (guild_id, channel_id)
    VALUES (p_guild_id, p_channel_id)
    ON CONFLICT (guild_id)
    DO UPDATE SET channel_id = EXCLUDED.channel_id;

    RETURN QUERY
        SELECT es.guild_id::TEXT, es.channel_id::TEXT
        FROM event_settings es
        WHERE es.guild_id = p_guild_id;
END;
$$;

-- 関数の実行権限を authenticated ロールのみに制限
REVOKE ALL ON FUNCTION upsert_event_settings(TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION upsert_event_settings(TEXT, TEXT) TO authenticated;
