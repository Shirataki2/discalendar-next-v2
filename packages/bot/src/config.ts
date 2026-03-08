export type Config = {
  botToken: string;
  applicationId: string;
  supabaseUrl: string;
  supabaseServiceKey: string;
  invitationUrl: string;
  supportServerUrl: string;
  logLevel: string;
  /** TODO: Sentry SDK初期化は未実装。将来的に追加予定 */
  sentryDsn: string | undefined;
  /** 開発用: 指定するとグローバルではなくギルドコマンドとして登録（レート制限回避） */
  devGuildId: string | undefined;
};

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

let cachedConfig: Config | null = null;

export function getConfig(): Config {
  if (cachedConfig) {
    return cachedConfig;
  }

  cachedConfig = {
    botToken: requireEnv("BOT_TOKEN"),
    applicationId: requireEnv("APPLICATION_ID"),
    supabaseUrl: requireEnv("SUPABASE_URL"),
    supabaseServiceKey: requireEnv("SUPABASE_SERVICE_KEY"),
    invitationUrl: process.env.INVITATION_URL ?? "",
    supportServerUrl:
      process.env.SUPPORT_SERVER_URL ?? "https://discord.gg/MyaZRuze23",
    logLevel: process.env.LOG_LEVEL?.toLowerCase() ?? "info",
    sentryDsn: process.env.SENTRY_DSN || undefined,
    devGuildId: process.env.DEV_GUILD_ID || undefined,
  };

  return cachedConfig;
}
