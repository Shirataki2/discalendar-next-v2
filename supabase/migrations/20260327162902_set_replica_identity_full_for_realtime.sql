-- Supabase Realtime Postgres Changes で UPDATE/DELETE の old record を受信可能にする
-- events: DELETE 時に old.id が必要（Realtime ペイロード）
-- event_series: 同様
ALTER TABLE events REPLICA IDENTITY FULL;
ALTER TABLE event_series REPLICA IDENTITY FULL;
