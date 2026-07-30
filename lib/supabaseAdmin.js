import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "./supabaseConfig";

// Server-only admin client (uses the service role key, bypasses RLS).
// NEVER import this in a client component. Returns null if the key is not set.
export function supabaseAdmin() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) return null;
  return createClient(SUPABASE_URL, key, { auth: { persistSession: false } });
}
