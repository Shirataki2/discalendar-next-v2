import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getConfig } from "../config.js";

let client: SupabaseClient | null = null;

/**
 * Service Role Key を使用するため RLS がバイパスされる。
 * 環境変数 SUPABASE_SERVICE_KEY には必ずサービスロールキー（anon key ではない）を設定すること。
 */
export function getSupabaseClient(): SupabaseClient {
  if (!client) {
    const config = getConfig();
    client = createClient(config.supabaseUrl, config.supabaseServiceKey);
  }
  return client;
}
