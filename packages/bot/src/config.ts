export type Config = {
  botToken: string;
  applicationId: string;
  supabaseUrl: string;
  supabaseServiceKey: string;
  invitationUrl: string;
  logLevel: string;
  sentryDsn: string | undefined;
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
    logLevel: process.env.LOG_LEVEL?.toLowerCase() ?? "info",
    sentryDsn: process.env.SENTRY_DSN || undefined,
  };

  return cachedConfig;
}
