-- upsert_event_settings 関数の "column reference is ambiguous" エラーを修正
--
-- 問題: RETURNS TABLE(guild_id TEXT, channel_id TEXT) の戻り値列名が
-- event_settings テーブルの列名と同名のため、PostgreSQL が曖昧と判断する。
--
-- 対策: 戻り値列名を out_ プレフィックス付きにリネームして衝突を回避する。
--
-- Requirements: 5.4

-- 戻り値型を変更するため、既存関数を一度削除して再作成
DROP FUNCTION IF EXISTS upsert_event_settings(TEXT, TEXT);

CREATE FUNCTION upsert_event_settings(
    p_guild_id TEXT,
    p_channel_id TEXT
)
RETURNS TABLE(out_guild_id TEXT, out_channel_id TEXT)
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

-- 実行権限を authenticated ロールのみに制限
REVOKE ALL ON FUNCTION upsert_event_settings(TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION upsert_event_settings(TEXT, TEXT) TO authenticated;
