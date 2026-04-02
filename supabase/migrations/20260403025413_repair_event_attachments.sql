-- 添付ファイル機能の修復マイグレーション
--
-- 20260330173207_add_event_attachments.sql はマイグレーション履歴に記録されたが
-- 実際のスキーマ変更が適用されていなかった。IF NOT EXISTS / IF EXISTS を使い
-- 冪等に修復する。
--
-- 修復内容:
--   1. events / event_series に attachments カラム追加
--   2. event-attachments Storageバケット作成
--   3. Storage RLS ポリシー作成（upload / view）
--   4. anon ロールに attachments カラムの SELECT 権限付与

-- =============================================================================
-- 1. events テーブルに attachments カラム追加（存在しない場合のみ）
-- =============================================================================
ALTER TABLE events
ADD COLUMN IF NOT EXISTS attachments JSONB NOT NULL DEFAULT '[]'::jsonb;

-- =============================================================================
-- 2. event_series テーブルに attachments カラム追加（存在しない場合のみ）
-- =============================================================================
ALTER TABLE event_series
ADD COLUMN IF NOT EXISTS attachments JSONB NOT NULL DEFAULT '[]'::jsonb;

-- =============================================================================
-- 3. event-attachments Storageバケット作成（存在しない場合のみ）
-- =============================================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'event-attachments',
  'event-attachments',
  false,
  10485760,  -- 10MB
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- 4. Storage RLS ポリシー作成（存在しない場合のみ）
-- =============================================================================

-- INSERT: ギルドメンバーのみアップロード可能
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'guild_members_can_upload_attachments'
  ) THEN
    CREATE POLICY "guild_members_can_upload_attachments"
    ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (
      bucket_id = 'event-attachments'
      AND (storage.foldername(name))[1] IN (SELECT user_guild_ids())
    );
  END IF;
END
$$;

-- SELECT: ギルドメンバーのみ閲覧可能
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'guild_members_can_view_attachments'
  ) THEN
    CREATE POLICY "guild_members_can_view_attachments"
    ON storage.objects FOR SELECT TO authenticated
    USING (
      bucket_id = 'event-attachments'
      AND (storage.foldername(name))[1] IN (SELECT user_guild_ids())
    );
  END IF;
END
$$;

-- DELETE: アップロード者本人のみ削除可能
-- (20260331234900 で tighten 済みだが、未適用の場合に備える)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'owner_can_delete_attachments'
  ) THEN
    CREATE POLICY "owner_can_delete_attachments"
    ON storage.objects FOR DELETE TO authenticated
    USING (
      bucket_id = 'event-attachments'
      AND owner = auth.uid()
      AND (storage.foldername(name))[1] IN (SELECT user_guild_ids())
    );
  END IF;
END
$$;

-- =============================================================================
-- 5. anon ロールに attachments カラムの SELECT 権限を付与
--    (20260321113429 でカラム単位GRANTに制限済みのため追加が必要)
-- =============================================================================
GRANT SELECT (attachments) ON events TO anon;
GRANT SELECT (attachments) ON event_series TO anon;
