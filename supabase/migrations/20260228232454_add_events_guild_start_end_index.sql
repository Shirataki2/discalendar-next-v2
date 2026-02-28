-- 期間重複判定クエリ (start_at <= endDate AND end_at >= startDate) を効率化するための複合インデックス
-- DIS-53: 期間外から続く予定の表示対応に伴い追加
CREATE INDEX idx_events_guild_start_end ON events(guild_id, start_at, end_at);

-- 旧インデックス (guild_id, start_at) は新インデックスで包含されるため削除
DROP INDEX IF EXISTS idx_events_guild_start;
