import type { APIRoute } from 'astro';
import { json } from '../../../../../lib/studio-articles';

/**
 * POST /api/studio/articles/[id]/transition — move an article through the
 * editorial workflow, optionally with a comment that lands in the private
 * editorial_reviews thread.
 *
 *   author:  submit (draft/changes_requested → submitted)
 *            comment (reply to the editors, no status change)
 *   editor:  start_review, request_changes, approve, reject,
 *            publish, schedule, unpublish, archive
 *
 * The database re-checks every transition (RLS policies + guard_publish()
 * trigger), so even a tampered request cannot escalate privileges. This
 * handler exists to give friendly errors and to write the review rows.
 */

type Action =
  | 'submit'
  | 'comment'
  | 'start_review'
  | 'request_changes'
  | 'approve'
  | 'reject'
  | 'publish'
  | 'schedule'
  | 'unpublish'
  | 'archive';

const AUTHOR_ACTIONS: Action[] = ['submit', 'comment'];
const EDITOR_ACTIONS: Action[] = [
  'start_review',
  'request_changes',
  'approve',
  'reject',
  'publish',
  'schedule',
  'unpublish',
  'archive',
];

const NEXT_STATUS: Record<Exclude<Action, 'comment'>, string> = {
  submit: 'submitted',
  start_review: 'in_review',
  request_changes: 'changes_requested',
  approve: 'approved',
  reject: 'rejected',
  publish: 'published',
  schedule: 'scheduled',
  unpublish: 'draft',
  archive: 'archived',
};

/** from-statuses each action makes sense from (friendly errors). */
const VALID_FROM: Record<Exclude<Action, 'comment'>, string[]> = {
  submit: ['draft', 'changes_requested', 'rejected'],
  start_review: ['submitted'],
  request_changes: ['submitted', 'in_review', 'approved'],
  approve: ['submitted', 'in_review', 'changes_requested'],
  reject: ['submitted', 'in_review'],
  publish: ['approved', 'draft', 'submitted', 'in_review', 'changes_requested', 'scheduled'],
  schedule: ['approved', 'draft', 'submitted', 'in_review', 'changes_requested'],
  unpublish: ['published', 'scheduled', 'submitted', 'in_review', 'approved', 'rejected'],
  archive: ['published', 'scheduled', 'rejected', 'approved', 'in_review'],
};

export const POST: APIRoute = async ({ params, request, locals }) => {
  if (!locals.supabase || !locals.profile) return json({ error: 'Authentication required' }, 401);
  const sb = locals.supabase;
  const profile = locals.profile;
  const isEditor = profile.role === 'owner' || profile.role === 'editor';

  let body: { action?: string; comment?: string; scheduledAt?: string; publishedAt?: string };
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  const action = body.action as Action | undefined;
  if (!action || (!AUTHOR_ACTIONS.includes(action) && !EDITOR_ACTIONS.includes(action))) {
    return json({ error: 'Unknown action' }, 400);
  }
  if (EDITOR_ACTIONS.includes(action) && !AUTHOR_ACTIONS.includes(action) && !isEditor) {
    return json({ error: 'Only editors can do that' }, 403);
  }

  const comment = typeof body.comment === 'string' ? body.comment.trim().slice(0, 2000) : '';

  const { data: article } = await sb
    .from('articles')
    .select('id, status, title, author_id')
    .eq('id', params.id)
    .maybeSingle();
  if (!article) return json({ error: 'Article not found' }, 404);

  if (action !== 'comment') {
    const next = NEXT_STATUS[action];
    if (!VALID_FROM[action].includes(article.status)) {
      return json(
        { error: `Cannot ${action.replace(/_/g, ' ')} an article that is "${article.status}"` },
        409,
      );
    }

    const patch: Record<string, unknown> = { status: next, last_edited_by: profile.id };
    if (action === 'publish') {
      patch.published_at =
        body.publishedAt && !Number.isNaN(Date.parse(body.publishedAt))
          ? new Date(body.publishedAt).toISOString()
          : new Date().toISOString();
    }
    if (action === 'schedule') {
      if (!body.scheduledAt || Number.isNaN(Date.parse(body.scheduledAt))) {
        return json({ error: 'Pick a schedule date and time first' }, 400);
      }
      patch.scheduled_at = new Date(body.scheduledAt).toISOString();
    }

    const { data: updated, error } = await sb
      .from('articles')
      .update(patch)
      .eq('id', params.id)
      .select('id')
      .maybeSingle();
    if (error) {
      return json({ error: 'Could not update: ' + error.message }, 500);
    }
    if (!updated) {
      // RLS dropped the update: the caller lacks rights for this article.
      return json(
        { error: 'You are not allowed to change this article (Row Level Security).' },
        403,
      );
    }
  }

  // Thread entry (skip silent auto-moves without a comment).
  if (action !== 'publish' || comment) {
    await sb.from('editorial_reviews').insert({
      article_id: params.id,
      reviewer_id: profile.id,
      decision:
        action === 'comment'
          ? (article.status as string)
          : NEXT_STATUS[action as Exclude<Action, 'comment'>],
      comment,
      is_author_response: !isEditor,
    });
  }

  await sb.rpc('write_audit_log', {
    p_action: `article.${action}`,
    p_entity_type: 'article',
    p_entity_id: params.id,
    p_details: { title: article.title },
  });

  return json({ ok: true });
};
