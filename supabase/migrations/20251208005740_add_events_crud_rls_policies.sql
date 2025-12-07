-- Task 2.4: Supabase RLSポリシーを追加するマイグレーション
-- 認証済みユーザーによるイベント作成・更新・削除を許可するRLSポリシーを追加する
-- Requirements: 1.4, 3.3, 4.2

-- INSERT policy: 認証済みユーザーが予定を作成可能
CREATE POLICY "authenticated_users_can_insert_events"
    ON events
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- UPDATE policy: 認証済みユーザーが予定を更新可能
CREATE POLICY "authenticated_users_can_update_events"
    ON events
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- DELETE policy: 認証済みユーザーが予定を削除可能
CREATE POLICY "authenticated_users_can_delete_events"
    ON events
    FOR DELETE
    TO authenticated
    USING (true);

