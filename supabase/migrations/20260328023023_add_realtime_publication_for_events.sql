-- Supabase Realtime Postgres Changes を有効にするため、
-- events と event_series テーブルを supabase_realtime publication に追加する。
-- これにより INSERT/UPDATE/DELETE のリアルタイム通知がクライアントに配信される。
ALTER PUBLICATION supabase_realtime ADD TABLE events;
ALTER PUBLICATION supabase_realtime ADD TABLE event_series;
