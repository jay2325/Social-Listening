import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    "Missing required env vars: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY"
  );
}

/**
 * Server-side Supabase client using the service role key.
 * All DB access routes through the server — the client (browser) never
 * uses this key or calls Supabase directly (except Realtime in Phase 2).
 */
export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});
