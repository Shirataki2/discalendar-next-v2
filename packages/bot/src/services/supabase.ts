import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getConfig } from "../config.js";
import { logger } from "../utils/logger.js";

let client: SupabaseClient | null = null;

function validateServiceRoleKey(key: string): void {
  try {
    const parts = key.split(".");
    if (parts.length !== 3) {
      logger.warn("SUPABASE_SERVICE_KEY does not appear to be a valid JWT");
      return;
    }
    const payload = JSON.parse(
      Buffer.from(parts[1], "base64url").toString("utf-8")
    );
    if (payload.role && payload.role !== "service_role") {
      logger.warn(
        { role: payload.role },
        `SUPABASE_SERVICE_KEY has role "${payload.role}" instead of "service_role". Ensure you are using the service role key, not the anon key.`
      );
    }
  } catch {
    logger.warn("Failed to validate SUPABASE_SERVICE_KEY format");
  }
}

/**
 * Service Role Key を使用するため RLS がバイパスされる。
 * 環境変数 SUPABASE_SERVICE_KEY には必ずサービスロールキー（anon key ではない）を設定すること。
 */
export function getSupabaseClient(): SupabaseClient {
  if (!client) {
    const config = getConfig();
    validateServiceRoleKey(config.supabaseServiceKey);
    client = createClient(config.supabaseUrl, config.supabaseServiceKey);
  }
  return client;
}
