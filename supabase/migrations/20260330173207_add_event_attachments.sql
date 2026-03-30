-- イベント添付ファイル機能: DBスキーマ拡張 + Storageバケット + RLSポリシー
--
-- 1. events テーブルに attachments カラム追加（JSONB, NOT NULL, DEFAULT '[]'）
-- 2. event_series テーブルに attachments カラム追加（同上）
-- 3. event-attachments Storageバケット作成（プライベート, 10MB上限, 画像+PDF）
-- 4. Storage RLS ポリシー作成（INSERT/SELECT/DELETE, ギルドメンバー限定）
--
-- Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 2.3, 3.1, 3.2, 3.3, 3.4

-- =============================================================================
-- 1. events テーブルに attachments カラム追加
-- =============================================================================
ALTER TABLE events
ADD COLUMN attachments JSONB NOT NULL DEFAULT '[]'::jsonb;

-- =============================================================================
-- 2. event_series テーブルに attachments カラム追加
-- =============================================================================
ALTER TABLE event_series
ADD COLUMN attachments JSONB NOT NULL DEFAULT '[]'::jsonb;

-- =============================================================================
-- 3. event-attachments Storageバケット作成
-- =============================================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'event-attachments',
  'event-attachments',
  false,
  10485760,  -- 10MB
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf']
);

-- =============================================================================
-- 4. Storage RLS ポリシー作成
-- =============================================================================

-- INSERT: ギルドメンバーのみアップロード可能
CREATE POLICY "guild_members_can_upload_attachments"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'event-attachments'
  AND (storage.foldername(name))[1] IN (SELECT user_guild_ids())
);

-- SELECT: ギルドメンバーのみ閲覧・ダウンロード可能
CREATE POLICY "guild_members_can_view_attachments"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'event-attachments'
  AND (storage.foldername(name))[1] IN (SELECT user_guild_ids())
);

-- DELETE: ギルドメンバーのみ削除可能
CREATE POLICY "guild_members_can_delete_attachments"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'event-attachments'
  AND (storage.foldername(name))[1] IN (SELECT user_guild_ids())
);
