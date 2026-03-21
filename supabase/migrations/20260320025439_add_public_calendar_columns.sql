-- guildsテーブルに公開カレンダー用カラムを追加
-- Requirements: 1.4 (スラッグのユニーク保証)
-- DIS-108: DBスキーマに公開カレンダー用カラム（public_slug, is_public）を追加

-- 公開フラグ: デフォルトfalse（既存レコードは自動的に非公開）
ALTER TABLE guilds ADD COLUMN is_public BOOLEAN NOT NULL DEFAULT false;

-- 公開スラッグ: 12文字のhex文字列。NULL許容（公開URL未生成時）。UNIQUE制約で衝突を防止
ALTER TABLE guilds ADD COLUMN public_slug VARCHAR(16) UNIQUE;

-- 部分インデックス: public_slugがNULLでないレコードのみを対象にし、検索パフォーマンスを最適化
CREATE INDEX idx_guilds_public_slug ON guilds(public_slug) WHERE public_slug IS NOT NULL;
