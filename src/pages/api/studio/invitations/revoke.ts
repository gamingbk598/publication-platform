import type { APIRoute } from 'astro';

/**
 * POST /api/studio/invitations/revoke  { id }
 * Marks a pending invitation as revoked. The invite link stops working
 * immediately (acceptance checks status in the database).
 */
export const POST: APIRoute = async ({ request, locals }) => {
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { 'content-type': 'application/json' },
    });

  if (!locals.supabase || !locals.profile) {
    return json({ error: 'Authentication required' }, 401);
  }
  if (locals.profile.role === 'author') {
    return json({ error: 'Editors only' }, 403);
  }

  let body: { id?: string };
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }
  if (!body.id) return json({ error: 'Missing invitation id' }, 400);

  const { error } = await locals.supabase
    .from('invitations')
    .update({ status: 'revoked' })
    .eq('id', body.id)
    .eq('status', 'pending'); // accepted/expired/revoked rows are immutable history

  if (error) return json({ error: error.message }, 500);

  await locals.supabase.rpc('write_audit_log', {
    p_action: 'invitation.revoked',
    p_entity_type: 'invitation',
    p_entity_id: body.id,
  });

  return json({ ok: true });
};
