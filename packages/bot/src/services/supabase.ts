import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getConfig } from "../config.js";

let client: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (!client) {
    const config = getConfig();
    client = createClient(config.supabaseUrl, config.supabaseServiceKey);
  }
  return client;
}
