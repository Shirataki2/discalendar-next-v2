-- event_attendees テーブルの RLS ポリシーと ownership 取得関数
-- Requirements: 1.5, 1.6
-- Task 1.2: RLS ポリシーと ownership 取得関数を作成する

-- =============================================================================
-- 1. RLS 有効化
-- =============================================================================

ALTER TABLE event_attendees ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- 2. SELECT ポリシー (Req 1.5)
-- 認証済みユーザーは同一ギルドの出欠データを参照可
-- =============================================================================

CREATE POLICY "guild_members_can_read_attendees"
    ON event_attendees FOR SELECT TO authenticated
    USING (guild_id IN (SELECT user_guild_ids()));

-- =============================================================================
-- 3. INSERT ポリシー (Req 1.6)
-- 自分の user_id に一致するレコードのみ作成可
-- =============================================================================

CREATE POLICY "users_can_insert_own_rsvp"
    ON event_attendees FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());

-- =============================================================================
-- 4. UPDATE ポリシー (Req 1.6)
-- 自分の user_id に一致するレコードのみ更新可
-- =============================================================================

CREATE POLICY "users_can_update_own_rsvp"
    ON event_attendees FOR UPDATE TO authenticated
    USING (user_id = auth.uid());

-- =============================================================================
-- 5. DELETE ポリシー (Req 1.6)
-- 自分の user_id に一致するレコードのみ削除可
-- =============================================================================

CREATE POLICY "users_can_delete_own_rsvp"
    ON event_attendees FOR DELETE TO authenticated
    USING (user_id = auth.uid());

-- =============================================================================
-- 6. claim_rsvp_ownership() 関数
-- Bot 経由で作成された user_id = NULL のレコードを Web ユーザーが引き取る
-- discord_user_id が一致し user_id IS NULL のレコードのみ更新する
-- =============================================================================

CREATE FUNCTION claim_rsvp_ownership(
    p_discord_user_id VARCHAR(32),
    p_user_id UUID
) RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    UPDATE event_attendees
    SET user_id = p_user_id
    WHERE discord_user_id = p_discord_user_id
      AND user_id IS NULL;
$$;

-- 実行権限を authenticated ロールのみに制限
REVOKE ALL ON FUNCTION claim_rsvp_ownership(VARCHAR, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION claim_rsvp_ownership(VARCHAR, UUID) TO authenticated;
