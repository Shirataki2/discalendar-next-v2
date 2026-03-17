-- claim_rsvp_ownership に auth.uid() 検証を追加
-- SECURITY DEFINER 関数のため、呼び出し元ユーザーが p_user_id と一致することを保証する

CREATE OR REPLACE FUNCTION claim_rsvp_ownership(
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
      AND user_id IS NULL
      AND p_user_id = auth.uid();
$$;
