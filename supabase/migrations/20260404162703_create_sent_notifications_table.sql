-- 送信済み通知テーブル: Bot再起動時の通知重複送信を防止する
CREATE TABLE sent_notifications (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  event_id text NOT NULL,
  guild_id text NOT NULL,
  notification_key text NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_id, guild_id, notification_key)
);

-- クリーンアップクエリの高速化（7日以上前のレコード一括削除用）
CREATE INDEX idx_sent_notifications_sent_at
  ON sent_notifications (sent_at);

-- RLS有効化（ポリシーなし）: service_role keyはRLSをバイパスするためBot動作に影響なし
-- anon key経由の意図しないアクセスを防御する
ALTER TABLE sent_notifications ENABLE ROW LEVEL SECURITY;
