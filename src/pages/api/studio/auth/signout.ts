import type { APIRoute } from 'astro';
import { createSupabaseSsrClient } from '../../../../lib/supabase/ssr';

/**
 * POST /api/studio/auth/signout
 * Ends the session (clears auth cookies) and returns to the login page.
 * Accepts plain form posts from the dashboard — no JavaScript required.
 */
export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  const supabase = createSupabaseSsrClient(request, cookies);
  if (supabase) {
    await supabase.auth.signOut();
  }
  return redirect('/studio/login');
};
