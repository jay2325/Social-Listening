// Load .env before reading any env vars — this file can be imported
// independently of index.ts, so dotenv must be bootstrapped here too.
// dotenv.config() is idempotent: calling it multiple times is safe.
import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import ws from "ws";

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
 *
 * Node.js <22 has no native WebSocket; we pass the `ws` package explicitly
 * so Supabase Realtime connects without the "no WebSocket support" warning.
 */
export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
  realtime: {
    // ws is a drop-in WebSocket for Node <22.
    // Supabase's WebSocketLikeConstructor is narrower than ws's type, so we
    // go through `any` — this is the standard polyfill cast for this package.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    transport: ws as any,
  },
});
