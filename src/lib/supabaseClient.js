// Centralized Supabase client factory using the named import `createClient`.
// Provides a safe no-op fallback if environment variables are not present so builds won't fail.
import { createClient } from '@supabase/supabase-js';

function createNoopClient() {
  // Minimal no-op client that supports from(...).select(...) pattern used in placeholders.
  const noop = {
    from: () => ({
      select: async () => ({ data: [], error: null }),
      insert: async () => ({ data: null, error: null }),
      update: async () => ({ data: null, error: null }),
      delete: async () => ({ data: null, error: null }),
    }),
    auth: {
      // minimal auth admin stub
      admin: {
        updateUserById: async () => ({ data: null, error: { message: 'SUPABASE keys not configured' } }),
      },
    },
  };
  return noop;
}

/**
 * createSupabaseClient(isServer = false)
 * - isServer true: returns a client using the SERVICE_ROLE_KEY (server-side) when available
 * - isServer false: returns a client using the public anon key when available
 *
 * If environment variables are missing this returns a no-op client and logs a warning.
 */
export function createSupabaseClient(isServer = false) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (isServer) {
    const key = serviceRole || anon;
    if (!url || !key) {
      // Return noop to avoid build-time errors; log for developer visibility
      // (Vercel build logs will show this warning)
      // eslint-disable-next-line no-console
      console.warn('createSupabaseClient(Server): SUPABASE env vars missing — returning no-op client.');
      return createNoopClient();
    }
    // server client: persistSession:false to avoid side effects in server contexts
    return createClient(url, key, { auth: { persistSession: false } });
  } else {
    if (!url || !anon) {
      // eslint-disable-next-line no-console
      console.warn('createSupabaseClient(Client): NEXT_PUBLIC_SUPABASE env vars missing — returning no-op client.');
      return createNoopClient();
    }
    return createClient(url, anon);
  }
}
