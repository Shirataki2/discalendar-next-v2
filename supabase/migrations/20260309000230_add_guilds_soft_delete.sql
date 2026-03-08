-- guilds テーブルにソフトデリート用の deleted_at カラムを追加
--
-- Bot がギルドから意図せず削除された場合（キック、トークン期限切れ等）に
-- イベント・設定データが完全に失われるリスクを回避する。
-- Bot が再参加した際に deleted_at を NULL に戻すことでデータを復元できる。

ALTER TABLE guilds ADD COLUMN deleted_at TIMESTAMPTZ;

-- ソフトデリート済みレコードを効率的にフィルタするための部分インデックス
CREATE INDEX idx_guilds_deleted_at ON guilds (deleted_at) WHERE deleted_at IS NOT NULL;

-- ensure_guilds 関数を更新: 再登録時に deleted_at を NULL にクリアする
CREATE OR REPLACE FUNCTION ensure_guilds(
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
        avatar_url = EXCLUDED.avatar_url,
        deleted_at = NULL;
END;
$$;
