import { createClient } from '@supabase/supabase-js';

/**
 * Browser-side Supabase client. Uses ONLY the public anon key — safe because
 * every table is protected by Row Level Security (see supabase/migrations/).
 * Never import the service-role key into a client module.
 */
export function getSupabaseBrowserClient() {
  const url = import.meta.env.PUBLIC_SUPABASE_URL as string | undefined;
  const anonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY as string | undefined;

  if (!url || !anonKey) {
    throw new Error(
      'Supabase is not configured. Set PUBLIC_SUPABASE_URL and PUBLIC_SUPABASE_ANON_KEY (see docs/ENVIRONMENT.md).',
    );
  }

  return createClient(url, anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  });
}
