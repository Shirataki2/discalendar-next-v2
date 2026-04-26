export type Config = {
  botToken: string;
  applicationId: string;
  supabaseUrl: string;
  supabaseServiceKey: string;
  invitationUrl: string;
  supportServerUrl: string;
  logLevel: string;
  /** Sentry DSN。未設定時はSentry無効 */
  sentryDsn: string | undefined;
  /** 開発用: 指定するとグローバルではなくギルドコマンドとして登録（レート制限回避） */
  devGuildId: string | undefined;
  /** Web ダッシュボードの URL（/poll finalize リンク先の組み立てに使用） */
  webBaseUrl: string;
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
    supportServerUrl: process.env.SUPPORT_SERVER_URL ?? "",
    logLevel: process.env.LOG_LEVEL?.toLowerCase() ?? "info",
    sentryDsn: process.env.SENTRY_DSN || undefined,
    devGuildId: process.env.DEV_GUILD_ID || undefined,
    webBaseUrl: process.env.WEB_BASE_URL ?? "https://discalendar.app",
  };

  return cachedConfig;
}
