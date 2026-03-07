-- upsert_event_settings 関数にメンバーシップ検証を追加
-- 既存の auth.uid() IS NULL チェック（認証チェック）を保持しつつ、
-- user_guilds テーブルでのメンバーシップ検証を追加する
--
-- Requirements: 6.1, 6.2, 6.3

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
    -- 認証チェック（既存）: anon ユーザーからの呼び出しを拒否
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: user must be authenticated';
    END IF;

    -- メンバーシップ検証（新規追加）: ユーザーがギルドに所属していることを確認
    IF NOT EXISTS (
        SELECT 1 FROM user_guilds
        WHERE user_id = auth.uid() AND guild_id = p_guild_id
    ) THEN
        RAISE EXCEPTION 'Forbidden: user is not a member of this guild';
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
