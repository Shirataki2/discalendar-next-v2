-- Web側からDiscord APIギルド情報をguildsテーブルに登録するSECURITY DEFINER関数
--
-- 目的:
--   guildsテーブルへの書き込みはこれまでBot側のguildCreateイベントのみだった。
--   Botが未起動・遅延している場合でも、Web側からギルドを登録できるようにする。
--   ON CONFLICT DO UPDATE で名前・アバターを最新化し、locale等の既存値は保持する。

CREATE FUNCTION ensure_guilds(
    p_guild_ids VARCHAR(32)[],
    p_names VARCHAR(100)[],
    p_avatar_urls VARCHAR(512)[]
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF array_length(p_guild_ids, 1) IS NULL THEN
        RETURN;
    END IF;

    INSERT INTO guilds (guild_id, name, avatar_url)
    SELECT g_id, g_name, g_avatar
    FROM unnest(p_guild_ids, p_names, p_avatar_urls) AS t(g_id, g_name, g_avatar)
    ON CONFLICT (guild_id) DO UPDATE SET
        name = EXCLUDED.name,
        avatar_url = EXCLUDED.avatar_url;
END;
$$;

REVOKE ALL ON FUNCTION ensure_guilds(VARCHAR(32)[], VARCHAR(100)[], VARCHAR(512)[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION ensure_guilds(VARCHAR(32)[], VARCHAR(100)[], VARCHAR(512)[]) TO authenticated;
