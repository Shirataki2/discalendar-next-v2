-- =============================================================================
-- Supabase Security Advisor: function_search_path_mutable 警告の解消
-- =============================================================================
-- 対象関数の search_path を `public, pg_temp` に固定し、同名オブジェクトを
-- 別スキーマに作成された場合に関数内の参照が乗っ取られるリスクを排除する。
-- ロジックは無変更（ALTER FUNCTION で属性のみ更新）。
--
-- 参照: https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable
-- =============================================================================

-- 汎用 updated_at トリガー関数
ALTER FUNCTION public.update_updated_at_column()
    SET search_path = public, pg_temp;

-- 通知履歴追記関数（SECURITY DEFINER のため特に重要）
-- 既存の SECURITY DEFINER 関数（upsert_user_guild, sync_user_guilds, ICS feed token 関数群など）と
-- 一貫性を保つため、pg_temp を含めずに public のみを指定する。
ALTER FUNCTION public.append_notification(UUID, JSONB)
    SET search_path = public;

-- event_polls の options 件数上限トリガー関数
ALTER FUNCTION public.assert_poll_option_limit()
    SET search_path = public, pg_temp;
