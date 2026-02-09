---
name: supabase-migration
description: Supabase データベースマイグレーション作成の統合ワークフロー。テーブル作成、RLSポリシー設定、インデックス追加など、データベーススキーマ変更時に使用する。「テーブルを追加」「カラムを変更」「RLSポリシーを設定」「マイグレーションを作成」など、DB変更全般で使用。
---

# Supabase Migration Skill

Discalendar プロジェクトで Supabase マイグレーションを作成する際の統合ワークフロー。

## 成果物チェックリスト

| # | 成果物 | パス | 必須 |
|---|--------|------|------|
| 1 | マイグレーションファイル | `supabase/migrations/YYYYMMDDHHMMSS_description.sql` | Yes |
| 2 | シードデータ更新 | `supabase/seed.sql` | 必要に応じて |

---

## Phase 1: マイグレーションファイル作成

### 1.1 ファイル命名規則

```
supabase/migrations/YYYYMMDDHHMMSS_説明.sql
```

- タイムスタンプは UTC 形式で `YYYYMMDDHHMMSS`
- 説明はスネークケースで簡潔に記載
- 例: `20260201120000_create_users_table.sql`

タイムスタンプ生成:
```bash
date -u +"%Y%m%d%H%M%S"
```

### 1.2 マイグレーションファイル構造

```sql
-- 説明コメント（タスク・要件との紐付け）
-- Task X.X: テーブルの作成
-- Requirements: Y.Y, Z.Z

-- 1. テーブル作成
CREATE TABLE table_name (
    id SERIAL PRIMARY KEY,
    -- カラム定義
);

-- 2. インデックス作成（必要に応じて）
CREATE INDEX idx_table_column ON table_name(column);

-- 3. RLS有効化
ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;

-- 4. RLSポリシー設定
CREATE POLICY "policy_name"
    ON table_name
    FOR SELECT/INSERT/UPDATE/DELETE
    TO authenticated
    USING (条件);
```

### 1.3 RLSポリシーパターン

**SELECT（読み取り）**:
```sql
CREATE POLICY "authenticated_users_can_read_table"
    ON table_name
    FOR SELECT
    TO authenticated
    USING (true);  -- または条件付き
```

**INSERT（作成）**:
```sql
CREATE POLICY "authenticated_users_can_insert_table"
    ON table_name
    FOR INSERT
    TO authenticated
    WITH CHECK (true);  -- または条件付き
```

**UPDATE（更新）**:
```sql
CREATE POLICY "authenticated_users_can_update_table"
    ON table_name
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);
```

**DELETE（削除）**:
```sql
CREATE POLICY "authenticated_users_can_delete_table"
    ON table_name
    FOR DELETE
    TO authenticated
    USING (true);
```

### 1.4 カラム変更パターン

**カラム追加**:
```sql
ALTER TABLE table_name ADD COLUMN IF NOT EXISTS column_name TYPE DEFAULT value;
```

**カラム変更（型）**:
```sql
ALTER TABLE table_name ALTER COLUMN column_name TYPE new_type;
```

**外部キー制約**:
```sql
column_name VARCHAR(32) NOT NULL REFERENCES other_table(column) ON DELETE CASCADE
```

**CHECK制約**:
```sql
CONSTRAINT check_name CHECK (column ~ '^正規表現$')
```

### 1.5 関数・トリガー

**SECURITY DEFINER関数（RLSバイパス）**:
```sql
CREATE OR REPLACE FUNCTION function_name(
    param1 TYPE,
    param2 TYPE
) RETURNS return_type AS $$
DECLARE
    -- 変数宣言
BEGIN
    -- 入力検証
    IF condition THEN
        RAISE EXCEPTION 'エラーメッセージ';
    END IF;
    
    -- 処理
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## Phase 2: シードデータ更新（必要に応じて）

新しいテーブルを作成した場合、テスト用シードデータを追加:

```sql
-- supabase/seed.sql に追加

-- テスト用データを追加
INSERT INTO new_table (column1, column2)
VALUES
    ('value1', 'value2'),
    ('value3', 'value4')
ON CONFLICT (unique_column) DO NOTHING;
```

---

## Phase 3: ローカル検証

### 3.1 マイグレーション適用

```bash
# Supabaseローカル環境を起動
supabase start

# マイグレーション適用
supabase db reset

# シードデータ適用
supabase db seed
```

### 3.2 確認コマンド

```bash
# マイグレーション一覧
supabase migration list

# リモート差分確認
supabase db diff --schema public
```

---

## コーディング規約

### 必須ルール

1. **コメント**: すべてのマイグレーションに目的・タスク番号を記載
2. **冪等性**: `IF NOT EXISTS`, `ON CONFLICT DO NOTHING` を使用
3. **RLS**: 新規テーブルには必ず RLS を有効化
4. **インデックス**: 頻繁に検索されるカラムにはインデックスを作成
5. **外部キー**: `ON DELETE CASCADE` を適切に設定

### 型の選択

| 用途 | 推奨型 |
|------|--------|
| Discord ID (snowflake) | `VARCHAR(32)` |
| UUID | `UUID DEFAULT gen_random_uuid()` |
| 連番ID | `SERIAL` または `BIGSERIAL` |
| タイムスタンプ | `TIMESTAMPTZ DEFAULT NOW()` |
| JSON | `JSONB` |
| ブール値 | `BOOLEAN NOT NULL DEFAULT false` |

### Discord ID の検証

```sql
CONSTRAINT check_discord_id_format CHECK (column ~ '^\d{17,20}$')
```

---

## CI/CD との連携

マイグレーションは `.github/workflows/deploy-migrations.yml` で自動デプロイ:

- **PR時**: Dry-run検証、破壊的操作の検出
- **main マージ時**: 本番環境に自動適用

### 破壊的操作の警告

以下の操作は CI で警告が出る:
- `DROP TABLE/DATABASE/SCHEMA/INDEX/FUNCTION`
- `TRUNCATE TABLE`
- `DELETE FROM`
- `ALTER TABLE ... DROP COLUMN`

破壊的操作が必要な場合は、別途ロールバック戦略を検討すること。

---

## 実装例

### 新規テーブル作成

```sql
-- Task 1.1: usersテーブルの作成
-- Discord ユーザー情報を格納するテーブル
-- Requirements: 1.1, 1.2

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(32) UNIQUE NOT NULL,
    username VARCHAR(100) NOT NULL,
    avatar_url VARCHAR(512),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT check_user_id_format CHECK (user_id ~ '^\d{17,20}$')
);

-- パフォーマンス最適化
CREATE INDEX idx_users_user_id ON users(user_id);

-- RLS有効化
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- RLSポリシー
CREATE POLICY "authenticated_users_can_read_users"
    ON users
    FOR SELECT
    TO authenticated
    USING (true);
```

### 既存テーブルへのカラム追加

```sql
-- Task 2.1: eventsテーブルに通知設定カラムを追加
-- Requirements: 3.1

ALTER TABLE events ADD COLUMN IF NOT EXISTS notify_before_minutes INTEGER DEFAULT 30;
ALTER TABLE events ADD COLUMN IF NOT EXISTS notification_enabled BOOLEAN DEFAULT true;
```

### RLSポリシーのみ追加

```sql
-- Task 3.1: CRUD用RLSポリシーを追加
-- Requirements: 4.1, 4.2

CREATE POLICY "authenticated_users_can_insert_events"
    ON events
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "authenticated_users_can_update_events"
    ON events
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);
```

---

## ワークフロー手順

1. **要件確認**: どのテーブル/カラム/ポリシーが必要か確認
2. **ファイル作成**: タイムスタンプ付きで `supabase/migrations/` に作成
3. **SQL記述**: 上記パターンに従って記述
4. **ローカル検証**: `supabase db reset` で適用確認
5. **シードデータ**: 必要に応じて `supabase/seed.sql` を更新
6. **コミット・PR**: CI で自動検証が実行される
