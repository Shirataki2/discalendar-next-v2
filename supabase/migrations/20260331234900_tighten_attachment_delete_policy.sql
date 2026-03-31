-- 添付ファイル削除ポリシーを厳格化: アップロード者本人のみ削除可能
--
-- 修正理由: 元のポリシーではギルドメンバーなら他人がアップロードしたファイルも
-- 削除できてしまう。storage.objects.owner でアップロード者に制限する。

DROP POLICY "guild_members_can_delete_attachments" ON storage.objects;

CREATE POLICY "owner_can_delete_attachments"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'event-attachments'
  AND owner = auth.uid()
  AND (storage.foldername(name))[1] IN (SELECT user_guild_ids())
);
