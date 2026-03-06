/**
 * EventSettingsService - イベント設定（event_settings テーブル）の CRUD 操作
 *
 * Task 3.1: イベント設定の読み取りと upsert 操作を実装する
 * - ファクトリ関数 createEventSettingsService でサービスを生成
 * - getEventSettings: channel_id の取得（不在時は null）
 * - upsertEventSettings: channel_id の挿入/更新
 * - Snowflake 形式バリデーション（17-20桁の数字）
 * - MutationResult<T> パターンに従ったエラーハンドリング
 *
 * Requirements: 3.1, 3.2, 3.5, 6.1, 6.2
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { SNOWFLAKE_PATTERN } from "@/lib/validation/snowflake";

/**
 * イベント設定の型定義（アプリケーション層 - camelCase）
 */
export interface EventSettings {
	guildId: string;
	channelId: string;
}

/**
 * イベント設定の DB Row 型（snake_case）
 */
interface EventSettingsRow {
	guild_id: string;
	channel_id: string;
}

/**
 * イベント設定エラーの型定義
 */
export interface EventSettingsError {
	code: string;
	message: string;
	details?: string;
}

/**
 * ミューテーション結果（Result 型）
 */
export type EventSettingsMutationResult<T> =
	| { success: true; data: T }
	| { success: false; error: EventSettingsError };

/**
 * EventSettingsService インターフェース
 */
export interface EventSettingsServiceInterface {
	/** イベント設定を取得（不在時は null を返す） */
	getEventSettings(
		guildId: string,
	): Promise<EventSettingsMutationResult<EventSettings | null>>;

	/** イベント設定を更新（不在時は新規作成） */
	upsertEventSettings(
		guildId: string,
		channelId: string,
	): Promise<EventSettingsMutationResult<EventSettings>>;
}

/**
 * EventSettingsRow から EventSettings への変換
 */
function toEventSettings(row: EventSettingsRow): EventSettings {
	return {
		guildId: row.guild_id,
		channelId: row.channel_id,
	};
}

/**
 * EventSettingsService のファクトリ関数
 *
 * @param supabase - Supabase クライアントインスタンス
 * @returns EventSettingsService インスタンス
 */
export function createEventSettingsService(
	supabase: SupabaseClient,
): EventSettingsServiceInterface {
	return {
		async getEventSettings(
			guildId: string,
		): Promise<EventSettingsMutationResult<EventSettings | null>> {
			try {
				const { data, error } = await supabase
					.from("event_settings")
					.select("*")
					.eq("guild_id", guildId)
					.single();

				if (error) {
					if (error.code === "PGRST116") {
						return { success: true, data: null };
					}
					return {
						success: false,
						error: {
							code: "FETCH_FAILED",
							message: "設定の取得に失敗しました。",
							details: error.message,
						},
					};
				}

				if (!data) {
					return { success: true, data: null };
				}

				return {
					success: true,
					data: toEventSettings(data as EventSettingsRow),
				};
			} catch (err) {
				const errorMessage =
					err instanceof Error ? err.message : "Unknown error";
				return {
					success: false,
					error: {
						code: "FETCH_FAILED",
						message: "設定の取得に失敗しました。",
						details: errorMessage,
					},
				};
			}
		},

		async upsertEventSettings(
			guildId: string,
			channelId: string,
		): Promise<EventSettingsMutationResult<EventSettings>> {
			if (!SNOWFLAKE_PATTERN.test(channelId)) {
				return {
					success: false,
					error: {
						code: "VALIDATION_ERROR",
						message: "無効なチャンネルIDです。",
					},
				};
			}

			try {
				// upsert_event_settings RPC を使用する。
				// INSERT ... ON CONFLICT DO UPDATE + RLS の組み合わせで
				// authenticated ロールが正しく適用されないケースを回避するため、
				// SECURITY DEFINER 関数経由で upsert を実行する。
				// 関数内で auth.uid() チェックを行い、anon からの呼び出しを拒否する。
				const { data, error } = await supabase
					.rpc("upsert_event_settings", {
						p_guild_id: guildId,
						p_channel_id: channelId,
					})
					.single();

				if (error) {
					return {
						success: false,
						error: {
							code: "UPDATE_FAILED",
							message: "設定の保存に失敗しました。",
							details: error.message,
						},
					};
				}

				return {
					success: true,
					data: toEventSettings(data as EventSettingsRow),
				};
			} catch (err) {
				const errorMessage =
					err instanceof Error ? err.message : "Unknown error";
				return {
					success: false,
					error: {
						code: "UPDATE_FAILED",
						message: "設定の保存に失敗しました。",
						details: errorMessage,
					},
				};
			}
		},
	};
}
