// Centralized Supabase client factory
// Use createClient (named import) — avoids the wrapper/default-import issues.
import { createClient } from '@supabase/supabase-js';

/**
 * createSupabaseClient(isServer = false)
 * - isServer true: returns a client using the SERVICE_ROLE_KEY (server-side, sensitive)
 * - isServer false: returns a client using the public anon key (safe for browser)
 *
 * NOTE: Ensure environment variables are present in Vercel:
 * - NEXT_PUBLIC_SUPABASE_URL
 * - NEXT_PUBLIC_SUPABASE_ANON_KEY
 * - SUPABASE_SERVICE_ROLE_KEY (server only)
 */
export function createSupabaseClient(isServer = false) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (isServer) {
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !serviceKey) {
      throw new Error('Supabase server client requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or anon key) in env.');
    }
    // disable session persistence for server clients to avoid side effects
    return createClient(url, serviceKey, { auth: { persistSession: false } });
  } else {
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !anon) {
      // Return a no-op client or throw depending on preference; here we throw to highlight missing config.
      throw new Error('Supabase client requires NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in env.');
    }
    return createClient(url, anon);
  }
}
