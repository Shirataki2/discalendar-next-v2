-- event_series テーブルへの制約追加
-- 1. RRULE の長さ制限を DB 側でも保証する CHECK 制約
-- 2. events テーブルの例外レコードに (series_id, original_date) ユニーク制約を追加
--    updateOccurrence の upsert による重複防止に使用
-- Requirements: 8.1, 9.2

-- RRULE 長さ制限（アプリ層の validateRrule() と一致させる）
ALTER TABLE event_series
    ADD CONSTRAINT rrule_length_check CHECK (LENGTH(rrule) <= 1000);

-- 例外レコードの重複防止: 同一シリーズの同一オカレンス日付への重複挿入を禁止
-- パーシャルユニーク制約（series_id と original_date が両方非 NULL の行のみ対象）
CREATE UNIQUE INDEX idx_events_series_original_date_unique
    ON events (series_id, original_date)
    WHERE series_id IS NOT NULL AND original_date IS NOT NULL;
