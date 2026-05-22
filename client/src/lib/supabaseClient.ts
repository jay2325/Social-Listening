import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl  = import.meta.env.VITE_SUPABASE_URL  as string | undefined;
const supabaseAnon = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/**
 * Anon-key Supabase client — ONLY used for Realtime subscriptions.
 * All data queries go through the Express server (never directly to Supabase).
 *
 * Returns null when VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are not set
 * so the rest of the app degrades gracefully (no live updates, but no crash).
 *
 * To enable Realtime add to your .env:
 *   VITE_SUPABASE_URL=https://<project>.supabase.co
 *   VITE_SUPABASE_ANON_KEY=<anon-key>
 * Then enable the mentions table in Supabase → Database → Replication.
 */
export const supabaseRealtime: SupabaseClient | null =
  supabaseUrl && supabaseAnon
    ? createClient(supabaseUrl, supabaseAnon)
    : null;
