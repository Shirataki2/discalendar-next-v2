-- Bot設定用テーブルの作成とイベント通知機能の追加
-- event_settings: 通知先チャンネル設定
-- guild_config: サーバー設定（制限モードなど）
-- events.notifications: イベント通知履歴

-- event_settingsテーブルの作成
CREATE TABLE IF NOT EXISTS event_settings (
    id SERIAL PRIMARY KEY,
    guild_id VARCHAR(32) UNIQUE NOT NULL REFERENCES guilds(guild_id) ON DELETE CASCADE,
    channel_id VARCHAR(32) NOT NULL,
    -- Discord channel IDはsnowflake形式（17-20桁の数字）であることを検証
    CONSTRAINT check_channel_id_format CHECK (channel_id ~ '^\d{17,20}$')
);

-- 注: guild_idにはUNIQUE制約により自動的にインデックスが作成されます

-- guild_configテーブルの作成
CREATE TABLE IF NOT EXISTS guild_config (
    guild_id VARCHAR(32) PRIMARY KEY REFERENCES guilds(guild_id) ON DELETE CASCADE,
    restricted BOOLEAN NOT NULL DEFAULT false
);

-- eventsテーブルにnotificationsカラムを追加
ALTER TABLE events ADD COLUMN IF NOT EXISTS notifications JSONB DEFAULT '[]'::jsonb;

-- Row Level Security設定
-- Bot側はservice_roleキーでRLSをバイパス、Web側（anonキー）からの不正アクセスを防止
-- 注: Bot操作（INSERT/UPDATE/DELETE）はservice_roleキーを使用するためRLSをバイパスします
-- これらのSELECTポリシーはWebアプリ（authenticatedユーザーがanonキーを使用）向けです

-- event_settingsテーブルのRLS設定
ALTER TABLE event_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_users_can_read_event_settings"
    ON event_settings
    FOR SELECT
    TO authenticated
    USING (true);

-- guild_configテーブルのRLS設定
ALTER TABLE guild_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_users_can_read_guild_config"
    ON guild_config
    FOR SELECT
    TO authenticated
    USING (true);

-- 通知履歴を追加するヘルパー関数
-- Bot側がnotificationsカラムに通知成功/失敗を記録するために使用
-- SECURITY DEFINER: RLSをバイパスして実行（Botのservice_roleキーと組み合わせて使用）
CREATE OR REPLACE FUNCTION append_notification(
    event_id UUID,
    notification JSONB
) RETURNS void AS $$
DECLARE
    affected_rows INTEGER;
    -- 許可する通知オブジェクトのキー
    allowed_keys TEXT[] := ARRAY['timestamp', 'status', 'error'];
    notification_key TEXT;
    notification_size INTEGER;
BEGIN
    -- 入力検証: notificationがオブジェクトであることを確認
    IF jsonb_typeof(notification) != 'object' THEN
        RAISE EXCEPTION 'notification must be a JSON object';
    END IF;
    
    -- 入力検証: 許可されたキーのみを含むことを確認
    SELECT array_agg(key) INTO notification_key
    FROM jsonb_object_keys(notification) AS key
    WHERE key != ALL(allowed_keys);
    
    IF notification_key IS NOT NULL THEN
        RAISE EXCEPTION 'notification contains disallowed keys: %', notification_key;
    END IF;
    
    -- 入力検証: JSONBサイズ制限（10KB）
    notification_size := pg_column_size(notification);
    IF notification_size > 10240 THEN
        RAISE EXCEPTION 'notification size exceeds 10KB limit: % bytes', notification_size;
    END IF;
    
    -- イベントの更新
    UPDATE events
    SET notifications = notifications || jsonb_build_array(notification)
    WHERE id = event_id;
    
    -- 更新行数の確認
    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    
    IF affected_rows = 0 THEN
        RAISE EXCEPTION 'Event with id % not found', event_id;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
