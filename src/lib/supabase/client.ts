import { createBrowserClient } from '@supabase/ssr';

/**
 * Browser-side Supabase client. Uses ONLY the public anon key — safe because
 * every table is protected by Row Level Security (see supabase/migrations/).
 * Sessions are stored in cookies (not localStorage) so the server-rendered
 * pages share the same session — this is what makes /studio route protection
 * possible.
 *
 * Returns null when Supabase is not configured yet, so UIs can render a
 * setup notice instead of crashing.
 */
export function getSupabaseBrowserClient() {
  const url = import.meta.env.PUBLIC_SUPABASE_URL as string | undefined;
  const anonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY as string | undefined;

  if (!url || !anonKey) return null;

  return createBrowserClient(url, anonKey);
}

export function isSupabaseConfigured(): boolean {
  return Boolean(
    import.meta.env.PUBLIC_SUPABASE_URL &&
      import.meta.env.PUBLIC_SUPABASE_ANON_KEY,
  );
}
