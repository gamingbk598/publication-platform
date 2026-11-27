import type { APIRoute } from 'astro';
import { sha256Hex } from '../../../../lib/crypto';
import { getSupabaseAdminClient } from '../../../../lib/supabase/server';
import { createSupabaseSsrClient } from '../../../../lib/supabase/ssr';

/**
 * POST /api/studio/invitations/accept  { token, password? }
 *
 * Public endpoint (invitees have no session yet). Flow:
 *   1. Hash the token and look the invitation up with the service-role
 *      client (token hashes are never exposed to anon users via RLS).
 *   2. If the visitor already has a session with the invited email, link
 *      the invitation to that account.
 *   3. Otherwise create the auth user server-side (invite-only platform:
 *      public self-signup stays disabled in Supabase) and sign them in so
 *      the session cookie is set.
 *   4. Promote to editor when the invitation says so, mark accepted,
 *      write the audit trail.
 */

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });

export const POST: APIRoute = async ({ request, cookies }) => {
  let body: { token?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  const token = (body.token ?? '').trim();
  const password = body.password ?? '';
  if (!token) return json({ error: 'Missing invitation token' }, 400);

  // ── 1. Verify the invitation (service role — bypasses RLS by design) ────
  let admin;
  try {
    admin = getSupabaseAdminClient();
  } catch {
    return json({ error: 'Server is missing SUPABASE_SERVICE_ROLE_KEY' }, 503);
  }

  const tokenHash = await sha256Hex(token);
  const { data: invitation } = await admin
    .from('invitations')
    .select('id, email, role, status, expires_at')
    .eq('token_hash', tokenHash)
    .maybeSingle();

  if (!invitation) return json({ error: 'This invitation link is not valid.' }, 400);
  if (invitation.status !== 'pending') {
    return json({ error: `This invitation was already ${invitation.status}.` }, 400);
  }
  if (new Date(invitation.expires_at) < new Date()) {
    return json({ error: 'This invitation has expired. Ask for a new one.' }, 400);
  }

  // ── 2/3. Establish the user (existing session or brand-new account) ─────
  const supabase = createSupabaseSsrClient(request, cookies);
  if (!supabase) return json({ error: 'Supabase is not configured' }, 503);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let userId: string;
  let email: string = invitation.email;

  if (user) {
    if (user.email?.toLowerCase() !== invitation.email.toLowerCase()) {
      return json(
        {
          error: `You are signed in as ${user.email}, but this invitation is for ${invitation.email}. Sign out first.`,
        },
        403,
      );
    }
    userId = user.id;
  } else {
    if (typeof password !== 'string' || password.length < 8) {
      return json({ error: 'Choose a password with at least 8 characters.' }, 400);
    }

    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email: invitation.email,
      password,
      email_confirm: true, // invited by the owner — no email round-trip needed
    });

    if (createError) {
      if (createError.message.toLowerCase().includes('already')) {
        return json(
          {
            error:
              'An account with this email already exists. Sign in first, then open the invitation link again.',
            code: 'already_registered',
          },
          409,
        );
      }
      return json({ error: 'Could not create the account: ' + createError.message }, 500);
    }
    userId = created.user.id;

    // Sign in so the browser receives a session cookie.
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: invitation.email,
      password,
    });
    if (signInError) {
      return json(
        { error: 'Account created, but sign-in failed. Use the login page.' },
        202,
      );
    }
  }

  // ── 4. Apply the invited role, mark accepted, audit ──────────────────────
  if (invitation.role === 'editor') {
    // protect_role_change() allows the service role to do this (0005 fix).
    await admin.from('profiles').update({ role: 'editor' }).eq('id', userId);
  }

  const { error: acceptError } = await admin
    .from('invitations')
    .update({ status: 'accepted', accepted_at: new Date().toISOString(), accepted_by: userId })
    .eq('id', invitation.id)
    .eq('status', 'pending');

  if (acceptError) {
    return json({ error: 'Could not finalize the invitation: ' + acceptError.message }, 500);
  }

  await admin.rpc('write_audit_log', {
    p_action: 'invitation.accepted',
    p_entity_type: 'invitation',
    p_entity_id: invitation.id,
    p_details: { email, role: invitation.role },
  });

  return json({ ok: true, role: invitation.role, email });
};
