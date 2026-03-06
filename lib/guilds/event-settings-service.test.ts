/**
 * EventSettingsService のユニットテスト
 *
 * Task 3.2: イベント設定サービスのユニットテストを追加する
 * - getEventSettings: 設定取得の成功ケースとPGRST116（未設定）ケース
 * - upsertEventSettings: upsertの成功ケース（新規作成・既存更新）
 * - Snowflake形式バリデーションの正常値・異常値
 * - Supabaseエラー時のResult型返却
 *
 * Requirements: 3.1, 3.2, 3.5, 6.1, 6.2
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	type EventSettingsServiceInterface,
	createEventSettingsService,
} from "./event-settings-service";

// Supabase クライアントモック
const mockRpcQuery = {
	single: vi.fn(),
};
const mockSupabaseClient = {
	from: vi.fn(),
	rpc: vi.fn().mockReturnValue(mockRpcQuery),
};

describe("EventSettingsService", () => {
	let service: EventSettingsServiceInterface;

	beforeEach(() => {
		service = createEventSettingsService(
			mockSupabaseClient as unknown as Parameters<
				typeof createEventSettingsService
			>[0],
		);
	});

	afterEach(() => {
		vi.clearAllMocks();
		mockSupabaseClient.rpc.mockReturnValue(mockRpcQuery);
	});

	describe("getEventSettings", () => {
		it("レコードが存在する場合、success: true で EventSettings を返す", async () => {
			const mockRow = {
				guild_id: "123456789012345678",
				channel_id: "987654321098765432",
			};

			const mockQuery = {
				select: vi.fn().mockReturnThis(),
				eq: vi.fn().mockReturnThis(),
				single: vi.fn().mockResolvedValue({
					data: mockRow,
					error: null,
				}),
			};
			mockSupabaseClient.from.mockReturnValue(mockQuery);

			const result = await service.getEventSettings("123456789012345678");

			expect(result).toEqual({
				success: true,
				data: {
					guildId: "123456789012345678",
					channelId: "987654321098765432",
				},
			});
			expect(mockSupabaseClient.from).toHaveBeenCalledWith("event_settings");
			expect(mockQuery.eq).toHaveBeenCalledWith(
				"guild_id",
				"123456789012345678",
			);
		});

		it("レコードが存在しない場合（PGRST116）、success: true で null を返す", async () => {
			const mockQuery = {
				select: vi.fn().mockReturnThis(),
				eq: vi.fn().mockReturnThis(),
				single: vi.fn().mockResolvedValue({
					data: null,
					error: { code: "PGRST116", message: "No rows found" },
				}),
			};
			mockSupabaseClient.from.mockReturnValue(mockQuery);

			const result = await service.getEventSettings("123456789012345678");

			expect(result).toEqual({
				success: true,
				data: null,
			});
		});

		it("DB エラー時は success: false でエラーを返す", async () => {
			const mockQuery = {
				select: vi.fn().mockReturnThis(),
				eq: vi.fn().mockReturnThis(),
				single: vi.fn().mockResolvedValue({
					data: null,
					error: { code: "500", message: "Internal server error" },
				}),
			};
			mockSupabaseClient.from.mockReturnValue(mockQuery);

			const result = await service.getEventSettings("123456789012345678");

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.code).toBe("FETCH_FAILED");
				expect(result.error.message).toBe("設定の取得に失敗しました。");
				expect(result.error.details).toBe("Internal server error");
			}
		});

		it("data が null でエラーもない場合、null を返す", async () => {
			const mockQuery = {
				select: vi.fn().mockReturnThis(),
				eq: vi.fn().mockReturnThis(),
				single: vi.fn().mockResolvedValue({
					data: null,
					error: null,
				}),
			};
			mockSupabaseClient.from.mockReturnValue(mockQuery);

			const result = await service.getEventSettings("123456789012345678");

			expect(result).toEqual({
				success: true,
				data: null,
			});
		});
	});

	describe("upsertEventSettings", () => {
		it("新規作成（INSERT）が成功した場合、success を返す", async () => {
			const mockRow = {
				out_guild_id: "123456789012345678",
				out_channel_id: "987654321098765432",
			};

			mockRpcQuery.single.mockResolvedValue({
				data: mockRow,
				error: null,
			});

			const result = await service.upsertEventSettings(
				"123456789012345678",
				"987654321098765432",
			);

			expect(result).toEqual({
				success: true,
				data: {
					guildId: "123456789012345678",
					channelId: "987654321098765432",
				},
			});
			expect(mockSupabaseClient.rpc).toHaveBeenCalledWith(
				"upsert_event_settings",
				{
					p_guild_id: "123456789012345678",
					p_channel_id: "987654321098765432",
				},
			);
		});

		it("既存更新（UPDATE）が成功した場合、success を返す", async () => {
			const mockRow = {
				out_guild_id: "123456789012345678",
				out_channel_id: "111222333444555666",
			};

			mockRpcQuery.single.mockResolvedValue({
				data: mockRow,
				error: null,
			});

			const result = await service.upsertEventSettings(
				"123456789012345678",
				"111222333444555666",
			);

			expect(result).toEqual({
				success: true,
				data: {
					guildId: "123456789012345678",
					channelId: "111222333444555666",
				},
			});
		});

		it("DB エラー時はエラーレスポンスを返す", async () => {
			mockRpcQuery.single.mockResolvedValue({
				data: null,
				error: {
					message: "Foreign key constraint violation",
					code: "23503",
				},
			});

			const result = await service.upsertEventSettings(
				"invalid_guild_id",
				"987654321098765432",
			);

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.code).toBe("UPDATE_FAILED");
				expect(result.error.message).toBe("設定の保存に失敗しました。");
				expect(result.error.details).toBe(
					"Foreign key constraint violation",
				);
			}
		});

		it("例外発生時はエラーレスポンスを返す", async () => {
			mockRpcQuery.single.mockRejectedValue(new Error("Network error"));

			const result = await service.upsertEventSettings(
				"123456789012345678",
				"987654321098765432",
			);

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.code).toBe("UPDATE_FAILED");
				expect(result.error.details).toBe("Network error");
			}
		});

		it("upsert は冪等である（同じ入力で同じ結果）", async () => {
			const mockRow = {
				out_guild_id: "123456789012345678",
				out_channel_id: "987654321098765432",
			};

			mockRpcQuery.single.mockResolvedValue({
				data: mockRow,
				error: null,
			});

			const result1 = await service.upsertEventSettings(
				"123456789012345678",
				"987654321098765432",
			);
			const result2 = await service.upsertEventSettings(
				"123456789012345678",
				"987654321098765432",
			);

			expect(result1).toEqual(result2);
		});
	});

	describe("Snowflake バリデーション", () => {
		it("17桁のSnowflakeは有効", async () => {
			const mockRow = {
				out_guild_id: "123456789012345678",
				out_channel_id: "12345678901234567",
			};
			mockRpcQuery.single.mockResolvedValue({ data: mockRow, error: null });

			const result = await service.upsertEventSettings(
				"123456789012345678",
				"12345678901234567",
			);

			expect(result.success).toBe(true);
		});

		it("20桁のSnowflakeは有効", async () => {
			const mockRow = {
				out_guild_id: "123456789012345678",
				out_channel_id: "12345678901234567890",
			};
			mockRpcQuery.single.mockResolvedValue({ data: mockRow, error: null });

			const result = await service.upsertEventSettings(
				"123456789012345678",
				"12345678901234567890",
			);

			expect(result.success).toBe(true);
		});

		it("16桁以下の数字は無効", async () => {
			const result = await service.upsertEventSettings(
				"123456789012345678",
				"1234567890123456",
			);

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.code).toBe("VALIDATION_ERROR");
				expect(result.error.message).toBe("無効なチャンネルIDです。");
			}
		});

		it("21桁以上の数字は無効", async () => {
			const result = await service.upsertEventSettings(
				"123456789012345678",
				"123456789012345678901",
			);

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.code).toBe("VALIDATION_ERROR");
			}
		});

		it("数字以外の文字を含む場合は無効", async () => {
			const result = await service.upsertEventSettings(
				"123456789012345678",
				"abcdefghijklmnopqr",
			);

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.code).toBe("VALIDATION_ERROR");
			}
		});

		it("空文字列は無効", async () => {
			const result = await service.upsertEventSettings(
				"123456789012345678",
				"",
			);

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.code).toBe("VALIDATION_ERROR");
			}
		});
	});
});
