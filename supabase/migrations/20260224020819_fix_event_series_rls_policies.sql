-- event_series テーブルの RLS ポリシー名を統一
-- 初期マイグレーションで作成したポリシーを削除し、events テーブルと同じ命名規則で再作成
-- ギルドスコープの認可はアプリケーション層 (authorizeEventOperation) で実施
-- Requirements: 8.1

-- 既存ポリシーを削除
DROP POLICY IF EXISTS "authenticated_users_can_read_series" ON event_series;
DROP POLICY IF EXISTS "authenticated_users_can_insert_series" ON event_series;
DROP POLICY IF EXISTS "authenticated_users_can_update_series" ON event_series;
DROP POLICY IF EXISTS "authenticated_users_can_delete_series" ON event_series;

-- SELECT: 認証済みユーザーはシリーズを閲覧可能
CREATE POLICY "authenticated_users_can_read_event_series"
    ON event_series
    FOR SELECT
    TO authenticated
    USING (true);

-- INSERT: 認証済みユーザーはシリーズを作成可能
CREATE POLICY "authenticated_users_can_insert_event_series"
    ON event_series
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- UPDATE: 認証済みユーザーはシリーズを更新可能
CREATE POLICY "authenticated_users_can_update_event_series"
    ON event_series
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- DELETE: 認証済みユーザーはシリーズを削除可能
CREATE POLICY "authenticated_users_can_delete_event_series"
    ON event_series
    FOR DELETE
    TO authenticated
    USING (true);
