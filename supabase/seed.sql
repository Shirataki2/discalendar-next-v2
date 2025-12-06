-- Supabase Seed Data
-- テスト用のサンプルデータ

-- テスト用ギルドを追加
INSERT INTO guilds (guild_id, name, avatar_url, locale)
VALUES
    ('703633851683176530', 'Test Guild 1', NULL, 'ja'),
    ('703633851683176531', 'Test Guild 2', NULL, 'ja')
ON CONFLICT (guild_id) DO NOTHING;

-- テスト用イベントを追加（今月のイベント）
INSERT INTO events (guild_id, name, description, color, is_all_day, start_at, end_at, location, channel_id, channel_name)
VALUES
    -- Test Guild 1のイベント
    ('703633851683176530', '定例ミーティング', 'チーム定例ミーティングです', '#3B82F6', false,
     NOW() + INTERVAL '1 day' + TIME '10:00', NOW() + INTERVAL '1 day' + TIME '11:00',
     'オンライン', '123456789', 'general'),

    ('703633851683176530', 'プロジェクト進捗確認', '今週の進捗を確認します', '#10B981', false,
     NOW() + INTERVAL '2 days' + TIME '14:00', NOW() + INTERVAL '2 days' + TIME '15:30',
     NULL, '123456789', 'project'),

    ('703633851683176530', 'チーム懇親会', 'オンライン懇親会を開催します', '#F59E0B', false,
     NOW() + INTERVAL '5 days' + TIME '19:00', NOW() + INTERVAL '5 days' + TIME '21:00',
     'Discord Voice', '987654321', 'voice-chat'),

    ('703633851683176530', '年末休暇', '年末年始のお休み期間', '#EF4444', true,
     DATE_TRUNC('day', NOW()) + INTERVAL '20 days', DATE_TRUNC('day', NOW()) + INTERVAL '25 days',
     NULL, NULL, NULL),

    ('703633851683176530', 'リリースデー', '新バージョンのリリース日', '#8B5CF6', true,
     DATE_TRUNC('day', NOW()) + INTERVAL '10 days', DATE_TRUNC('day', NOW()) + INTERVAL '10 days',
     NULL, '123456789', 'announcements'),

    -- Test Guild 2のイベント
    ('703633851683176531', 'ゲーム大会', '月例ゲーム大会', '#EC4899', false,
     NOW() + INTERVAL '3 days' + TIME '20:00', NOW() + INTERVAL '3 days' + TIME '23:00',
     'Discord Voice', '111222333', 'gaming'),

    ('703633851683176531', '新メンバー歓迎会', '新しく参加したメンバーの歓迎会', '#06B6D4', false,
     NOW() + INTERVAL '7 days' + TIME '18:00', NOW() + INTERVAL '7 days' + TIME '19:30',
     'メインチャンネル', '444555666', 'welcome');
