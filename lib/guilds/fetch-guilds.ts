import { captureException } from "@sentry/nextjs";
import { getUserGuilds } from "@/lib/discord/client";
import { canInviteBot, parsePermissions } from "@/lib/discord/permissions";
import type { DiscordGuild } from "@/lib/discord/types";
import { getGuildIconUrl } from "@/lib/discord/types";
import {
  type FetchGuildsData,
  getCachedGuilds,
  getOrSetPendingRequest,
  setCachedGuilds,
} from "@/lib/guilds/cache";
import { getJoinedGuilds } from "@/lib/guilds/service";
import type {
  Guild,
  GuildListError,
  GuildWithPermissions,
  InvitableGuild,
} from "@/lib/guilds/types";

/**
 * ギルド一覧を取得する（キャッシュ対応）
 *
 * Requirements:
 * - 5.1: Server Componentとしてギルド一覧データを取得する
 * - 5.2: Supabaseクライアント（Server用）を使用してDBクエリを実行する
 * - 2.1: Supabase Authに保存されたDiscordアクセストークンを使用
 * - 2.4: provider_token未取得時は再認証を促すメッセージを表示
 *
 * @param userId ユーザーID（キャッシュキーとして使用）
 * @param providerToken Discord OAuthアクセストークン
 * @returns ギルド一覧またはエラー
 */
export async function fetchGuilds(
  userId: string,
  providerToken: string | null | undefined
): Promise<{
  guilds: GuildWithPermissions[];
  invitableGuilds: InvitableGuild[];
  error?: GuildListError;
}> {
  // provider_tokenが存在しない場合
  if (!providerToken) {
    return {
      guilds: [],
      invitableGuilds: [],
      error: { type: "no_token" },
    };
  }

  // キャッシュをチェック
  const cached = getCachedGuilds(userId);
  if (cached !== null) {
    return {
      guilds: cached.guilds,
      invitableGuilds: cached.invitableGuilds,
    };
  }

  // エラー情報を保持する変数（factory関数内で設定される）
  let errorInfo: GuildListError | undefined;

  // 進行中のリクエストを取得、または新しいリクエストを設定（Atomic操作で競合状態を防ぐ）
  try {
    const result = await getOrSetPendingRequest(userId, async (requestId) => {
      // Discord APIからユーザー所属ギルドを取得
      const discordResult = await getUserGuilds(providerToken);

      if (!discordResult.success) {
        // エラー情報を保持（DiscordApiResultから直接取得）
        if (discordResult.error.code === "unauthorized") {
          errorInfo = { type: "token_expired" };
        } else {
          errorInfo = {
            type: "api_error",
            message: discordResult.error.message,
          };
        }
        // エラー時はキャッシュせずに空配列を返す
        return { guilds: [], invitableGuilds: [] };
      }

      // Discord ギルドごとの権限ビットフィールドをマップに保持
      const permissionsMap = new Map<string, string>();
      for (const dg of discordResult.data) {
        permissionsMap.set(dg.id, dg.permissions);
      }

      // ギルドIDリストを抽出
      const guildIds = discordResult.data.map((guild) => guild.id);

      if (guildIds.length === 0) {
        const emptyData: FetchGuildsData = {
          guilds: [],
          invitableGuilds: [],
        };
        // 空配列もキャッシュする（リクエストIDを渡して一貫性を保つ）
        setCachedGuilds(userId, emptyData, requestId);
        return emptyData;
      }

      // DB照合を実行
      try {
        const joinedGuilds = await getJoinedGuilds(guildIds);

        // 権限情報をマージして GuildWithPermissions に変換
        const guildsWithPermissions = mergePermissions(
          joinedGuilds,
          permissionsMap
        );

        // DB に存在しないギルドを招待対象として抽出
        const joinedGuildIds = new Set(joinedGuilds.map((g) => g.guildId));
        const invitableGuilds = buildInvitableGuilds(
          discordResult.data,
          joinedGuildIds,
          permissionsMap
        );

        const data: FetchGuildsData = {
          guilds: guildsWithPermissions,
          invitableGuilds,
        };

        // 成功時のみキャッシュに保存（リクエストIDを渡して古いリクエストの結果で上書きされないようにする）
        setCachedGuilds(userId, data, requestId);
        return data;
      } catch (dbError) {
        captureException(dbError);
        // DBエラー情報を保持
        errorInfo = {
          type: "api_error",
          message: "ギルド情報の取得に失敗しました。",
        };
        // DBエラー時も空配列を返す
        return { guilds: [], invitableGuilds: [] };
      }
    });

    // エラー情報がある場合は、エラー情報と共に返す
    if (errorInfo) {
      return {
        guilds: result.guilds,
        invitableGuilds: result.invitableGuilds,
        error: errorInfo,
      };
    }

    // リクエストが成功した場合、キャッシュは既にfetchPromise内で設定されている
    return result;
  } catch (error) {
    // 予期しないエラー（DBエラーなど）を処理
    const errorMessage =
      error instanceof Error
        ? error.message
        : "ギルド情報の取得に失敗しました。";
    return {
      guilds: [],
      invitableGuilds: [],
      error: { type: "api_error", message: errorMessage },
    };
  }
}

/**
 * Guild 配列に Discord 権限情報をマージする
 *
 * Discord API から取得した権限ビットフィールドを解析し、
 * DB から取得したギルド情報に付加する。
 * 権限情報が見つからない場合はフェイルセーフとしてデフォルト権限（全 false）を付与する。
 *
 * Requirements: guild-permissions 2.1, 2.3
 */
function mergePermissions(
  guilds: Guild[],
  permissionsMap: Map<string, string>
): GuildWithPermissions[] {
  return guilds.map((guild) => ({
    ...guild,
    permissions: parsePermissions(permissionsMap.get(guild.guildId) ?? ""),
  }));
}

/**
 * DB に存在しないギルドから招待対象ギルドを構築する
 *
 * Discord API レスポンスのうち DB に存在せず、かつ BOT 招待権限
 * (ADMINISTRATOR or MANAGE_GUILD) を持つギルドを InvitableGuild に変換する。
 *
 * Requirements: bot-invite-flow 3.1, 3.2
 */
function buildInvitableGuilds(
  discordGuilds: DiscordGuild[],
  joinedGuildIds: Set<string>,
  permissionsMap: Map<string, string>
): InvitableGuild[] {
  const invitable: InvitableGuild[] = [];

  for (const dg of discordGuilds) {
    // DB に存在するギルドはスキップ
    if (joinedGuildIds.has(dg.id)) {
      continue;
    }

    // 権限チェック: BOT 招待権限がないギルドはスキップ
    const permissions = parsePermissions(permissionsMap.get(dg.id) ?? "");
    if (!canInviteBot(permissions)) {
      continue;
    }

    invitable.push({
      guildId: dg.id,
      name: dg.name,
      avatarUrl: getGuildIconUrl(dg.id, dg.icon),
    });
  }

  return invitable;
}
