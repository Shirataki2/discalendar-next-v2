-- events テーブルに繰り返しイベント関連カラムを追加
-- 例外オカレンス（個別編集済みイベント）をシリーズに紐付けるためのカラム
-- Requirements: 8.2, 9.2

-- series_id: イベントシリーズへの参照（NULL = 単発イベント、非NULL = 例外オカレンス）
-- ON DELETE SET NULL: シリーズ削除時に例外レコードは単発イベントとして残る
ALTER TABLE events
  ADD COLUMN series_id UUID REFERENCES event_series(id) ON DELETE SET NULL;

-- original_date: 例外が元々対応していたオカレンスの日付
ALTER TABLE events
  ADD COLUMN original_date TIMESTAMPTZ;

-- パーシャルインデックス: series_id が非NULLの行のみ対象（大半の単発イベントは除外）
CREATE INDEX idx_events_series_id ON events(series_id)
  WHERE series_id IS NOT NULL;
