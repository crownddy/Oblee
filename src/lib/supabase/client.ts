import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";
import { SUPABASE_ANON_KEY, SUPABASE_URL, requireSupabaseConfig } from "@/lib/supabase/config";

let browserClient: SupabaseClient<Database> | null = null;

/** Browser client. Only ever uses the public anon key. */
export function createSupabaseBrowserClient(): SupabaseClient<Database> {
  if (browserClient) return browserClient;
  const { url, anonKey } = requireSupabaseConfig();
  browserClient = createBrowserClient<Database>(url, anonKey);
  return browserClient;
}

export { SUPABASE_URL, SUPABASE_ANON_KEY };
