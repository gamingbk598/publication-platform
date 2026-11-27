import type { APIRoute } from 'astro';
import { generateToken, sha256Hex, isValidEmail } from '../../../../lib/crypto';

/**
 * GET  /api/studio/invitations — list invitations (editors and owner only;
 *      RLS enforces this even if this endpoint were bypassed).
 * POST /api/studio/invitations — create an invitation and return the
 *      one-time invite link. Editors may invite authors; only the owner may
 *      invite editors.
 *
 * The raw token is returned exactly once and never stored — only its
 * SHA-256 hash is persisted. v1 has no SMTP: the owner copies the link and
 * sends it themselves.
 */

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });

export const GET: APIRoute = async ({ locals }) => {
  if (!locals.supabase || !locals.profile) {
    return json({ error: 'Authentication required' }, 401);
  }
  if (locals.profile.role === 'author') {
    return json({ error: 'Editors only' }, 403);
  }

  const { data, error } = await locals.supabase
    .from('invitations')
    .select('id, email, role, status, expires_at, created_at')
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) return json({ error: error.message }, 500);
  return json({ invitations: data ?? [] });
};

export const POST: APIRoute = async ({ request, locals, url }) => {
  if (!locals.supabase || !locals.profile) {
    return json({ error: 'Authentication required' }, 401);
  }
  const profile = locals.profile;

  let body: { email?: string; role?: string };
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  const email = (body.email ?? '').trim().toLowerCase();
  const role = body.role ?? 'author';

  if (!isValidEmail(email)) return json({ error: 'Enter a valid email address' }, 400);
  if (!['author', 'editor'].includes(role)) {
    return json({ error: 'Role must be author or editor' }, 400);
  }
  if (role === 'editor' && profile.role !== 'owner') {
    return json({ error: 'Only the owner can invite editors' }, 403);
  }

  // One pending invitation per email at a time.
  const { data: existing } = await locals.supabase
    .from('invitations')
    .select('id, status')
    .eq('email', email)
    .eq('status', 'pending')
    .maybeSingle();
  if (existing) {
    return json(
      { error: `${email} already has a pending invitation. Revoke it first to issue a new one.` },
      409,
    );
  }

  const token = generateToken(32);
  const tokenHash = await sha256Hex(token);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const { error: insertError } = await locals.supabase.from('invitations').insert({
    email,
    role,
    token_hash: tokenHash,
    invited_by: profile.id,
    expires_at: expiresAt,
  });

  if (insertError) {
    return json({ error: 'Could not create invitation: ' + insertError.message }, 500);
  }

  // Best-effort audit trail (never blocks the user-facing action).
  await locals.supabase.rpc('write_audit_log', {
    p_action: 'invitation.created',
    p_entity_type: 'invitation',
    p_details: { email, role, expires_at },
  });

  const link = `${url.origin}/studio/invite/${token}`;
  return json({ link, email, role, expiresAt }, 201);
};
