import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Server-only Supabase clients.
 *
 * - getSupabaseServerClient(accessToken): acts as the signed-in user. Row
 *   Level Security applies. This is the default for all dashboard actions.
 * - getSupabaseAdminClient(): bypasses RLS. Reserved for a small, explicit
 *   list of operations (invitation token verification, user role updates,
 *   audit writes). Never expose this client or its key to the browser.
 */

export function getSupabaseServerClient(accessToken?: string): SupabaseClient {
  const url = import.meta.env.PUBLIC_SUPABASE_URL as string | undefined;
  const anonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY as string | undefined;

  if (!url || !anonKey) {
    throw new Error('Supabase is not configured. See docs/ENVIRONMENT.md.');
  }

  return createClient(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: accessToken
      ? { headers: { Authorization: `Bearer ${accessToken}` } }
      : undefined,
  });
}

export function getSupabaseAdminClient(): SupabaseClient {
  const url = import.meta.env.PUBLIC_SUPABASE_URL as string | undefined;
  const serviceKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY as string | undefined;

  if (!url || !serviceKey) {
    throw new Error(
      'Admin client requires SUPABASE_SERVICE_ROLE_KEY. Set it as a Cloudflare secret — never in client code.',
    );
  }

  return createClient(url, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
