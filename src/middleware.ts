import type { MiddlewareResponseHandler } from 'astro';
import type { SupabaseClient, User } from '@supabase/supabase-js';
import { createSupabaseSsrClient, isSupabaseConfigured } from './lib/supabase/ssr';

/**
 * Global middleware.
 *
 * Protects every /studio page and /api/studio endpoint:
 *   1. Refreshes the Supabase session cookie (silent token rotation).
 *   2. Loads the signed-in user's profile from the database.
 *   3. Blocks unauthenticated or deactivated users.
 *
 * Public exceptions: /studio/login, /studio/invite/*, and the invitation
 * acceptance endpoint (people accepting an invite have no session yet).
 *
 * Security layering: this is the UI/UX layer. Every server endpoint still
 * re-checks permissions, and Row Level Security is the final wall — see
 * supabase/migrations/0003_rls.sql.
 */

export interface StudioProfile {
  id: string;
  username: string;
  display_name: string;
  title: string | null;
  avatar_url: string | null;
  role: 'owner' | 'editor' | 'author';
  status: 'active' | 'suspended' | 'deactivated';
}

declare global {
  namespace App {
    interface Locals {
      supabase: SupabaseClient | null;
      user: User | null;
      profile: StudioProfile | null;
    }
  }
}

const PUBLIC_STUDIO_PATHS = [
  '/studio/login',
  '/studio/invite',
  '/api/studio/invitations/accept',
  '/api/studio/auth/signout', // always allowed: it only clears cookies
];

export const onRequest: MiddlewareResponseHandler = async (context, next) => {
  const { url, request, cookies, redirect } = context;
  const path = url.pathname;

  const isStudio = path.startsWith('/studio');
  const isStudioApi = path.startsWith('/api/studio');
  if (!isStudio && !isStudioApi) return next();

  // Routes that must work without a session.
  if (PUBLIC_STUDIO_PATHS.some((p) => path.startsWith(p))) {
    return next();
  }

  // Not configured yet (fresh clone / CI): let the login page explain setup.
  if (!isSupabaseConfigured()) {
    if (isStudioApi) {
      return new Response(JSON.stringify({ error: 'Supabase is not configured' }), {
        status: 503,
        headers: { 'content-type': 'application/json' },
      });
    }
    return redirect('/studio/login?error=not_configured');
  }

  const supabase = createSupabaseSsrClient(request, cookies);
  if (!supabase) return redirect('/studio/login?error=not_configured');

  // getUser() validates the token with the auth server (never trusts the
  // cookie contents alone) and rotates the cookie when needed.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    if (isStudioApi) {
      return new Response(JSON.stringify({ error: 'Authentication required' }), {
        status: 401,
        headers: { 'content-type': 'application/json' },
      });
    }
    return redirect('/studio/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, username, display_name, title, avatar_url, role, status')
    .eq('id', user.id)
    .single();

  // No profile or deactivated account: kill the session and bounce to login.
  if (!profile || profile.status !== 'active') {
    await supabase.auth.signOut();
    if (isStudioApi) {
      return new Response(JSON.stringify({ error: 'Account is not active' }), {
        status: 403,
        headers: { 'content-type': 'application/json' },
      });
    }
    return redirect('/studio/login?error=inactive');
  }

  context.locals.supabase = supabase;
  context.locals.user = user;
  context.locals.profile = profile as StudioProfile;

  return next();
};
