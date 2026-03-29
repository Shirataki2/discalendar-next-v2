-- ICSフィードトークン管理用のRPC関数を追加
-- トークン操作をアトミック化し、RLS INSERT/UPDATEポリシーを削除して
-- SECURITY DEFINER関数経由のみで書き込みを許可する
--
-- 修正内容:
-- 1. get_or_create_ics_feed_token: TOCTOU競合をON CONFLICTで解決
-- 2. regenerate_ics_feed_token: revoke + insertをトランザクション内でアトミック実行
-- 3. INSERT/UPDATEポリシーを削除（直接テーブル操作によるトークン改ざんを防止）
-- 4. DELETEポリシーなし: 物理削除不可は設計意図（監査証跡として revoked_at で論理削除のみ）

-- =============================================================================
-- 1. RPC関数: get_or_create_ics_feed_token
-- =============================================================================
-- 既存のアクティブトークンがあればそれを返し、なければ新規作成する。
-- ON CONFLICT で同時リクエストの競合を安全に処理する。
CREATE FUNCTION get_or_create_ics_feed_token(
    p_guild_id VARCHAR(32),
    p_new_token VARCHAR(64)
)
RETURNS VARCHAR(64)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_token VARCHAR(64);
BEGIN
    -- ギルドメンバーシップ検証
    IF p_guild_id NOT IN (SELECT user_guild_ids()) THEN
        RAISE EXCEPTION 'PERMISSION_DENIED: Not a guild member';
    END IF;

    -- 既存のアクティブトークンを検索
    SELECT token INTO v_token
    FROM ics_feed_tokens
    WHERE guild_id = p_guild_id AND revoked_at IS NULL;

    IF v_token IS NOT NULL THEN
        RETURN v_token;
    END IF;

    -- 新規トークンを挿入（UNIQUE制約違反時はスキップ）
    INSERT INTO ics_feed_tokens (guild_id, token)
    VALUES (p_guild_id, p_new_token)
    ON CONFLICT (guild_id) WHERE revoked_at IS NULL
    DO NOTHING;

    -- 再読み取り（自身または競合勝者のトークンを返す）
    SELECT token INTO v_token
    FROM ics_feed_tokens
    WHERE guild_id = p_guild_id AND revoked_at IS NULL;

    RETURN v_token;
END;
$$;

-- =============================================================================
-- 2. RPC関数: regenerate_ics_feed_token
-- =============================================================================
-- 既存のアクティブトークンを無効化し、新しいトークンを挿入する。
-- PL/pgSQL関数はトランザクション内で実行されるため、
-- insert失敗時は自動的にrevokeもロールバックされる。
CREATE FUNCTION regenerate_ics_feed_token(
    p_guild_id VARCHAR(32),
    p_new_token VARCHAR(64)
)
RETURNS VARCHAR(64)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- ギルドメンバーシップ検証
    IF p_guild_id NOT IN (SELECT user_guild_ids()) THEN
        RAISE EXCEPTION 'PERMISSION_DENIED: Not a guild member';
    END IF;

    -- アクティブトークンをすべて無効化
    UPDATE ics_feed_tokens
    SET revoked_at = NOW()
    WHERE guild_id = p_guild_id AND revoked_at IS NULL;

    -- 新しいトークンを挿入
    INSERT INTO ics_feed_tokens (guild_id, token)
    VALUES (p_guild_id, p_new_token);

    RETURN p_new_token;
END;
$$;

-- =============================================================================
-- 3. RLSポリシーの制限: INSERT/UPDATEポリシーを削除
-- =============================================================================
-- トークンの書き込みはSECURITY DEFINER関数経由のみ許可。
-- SELECTポリシーはギルドメンバーのトークン読み取り用に維持。
DROP POLICY "guild_members_can_insert_tokens" ON ics_feed_tokens;
DROP POLICY "guild_members_can_update_tokens" ON ics_feed_tokens;
