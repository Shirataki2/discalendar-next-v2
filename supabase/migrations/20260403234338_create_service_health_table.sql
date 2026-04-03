-- サービス死活監視テーブル
--
-- 各サービス（Discord Bot等）が定期的にハートビートを書き込み、
-- /api/health エンドポイントからDB経由で稼働状態を確認する。
--
-- service_name をPKとし、サービスごとに1行をupsertで更新する。

CREATE TABLE service_health (
  service_name TEXT PRIMARY KEY,
  last_seen_at TIMESTAMPTZ NOT NULL,
  metadata     JSONB NOT NULL DEFAULT '{}'::jsonb
);

ALTER TABLE service_health ENABLE ROW LEVEL SECURITY;

-- ヘルスチェックエンドポイントは anon key (publishable key) で接続するため
-- anon ロールに SELECT を許可する。書き込みは Bot の service_role key のみ。
-- service_role は RLS をバイパスするため INSERT/UPDATE ポリシーは不要。
-- authenticated/anon への書き込みポリシーは意図的に作成しない（デフォルト拒否）。
CREATE POLICY "allow_read_service_health"
  ON service_health FOR SELECT TO anon, authenticated USING (true);
