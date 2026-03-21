-- 認証済みユーザーに対してguildsテーブルのUPDATE権限を許可するポリシー
-- 公開カレンダー設定（is_public, public_slug）の更新に必要
-- アプリケーション層でcanManageGuild()による権限チェックを実施済み

CREATE POLICY "authenticated_users_can_update_guilds"
    ON guilds
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);
