import type { APIRoute } from 'astro';
import {
  json,
  readingMinutes,
  resolveTags,
  sanitizeBlocks,
  slugify,
  uniqueSlug,
} from '../../../../../lib/studio-articles';

/**
 * GET   /api/studio/articles/[id] — fetch one article with its tags and
 *       sources (RLS: authors see their own, editors see everything).
 * PATCH /api/studio/articles/[id] — update fields while the article is in an
 *       editable state. Status changes go through the /transition endpoint.
 */

export const GET: APIRoute = async ({ params, locals }) => {
  if (!locals.supabase || !locals.profile) return json({ error: 'Authentication required' }, 401);
  const sb = locals.supabase;

  const { data: article, error } = await sb
    .from('articles')
    .select(
      `id, slug, title, subtitle, excerpt, content_type, category_id, author_id, body,
       reading_minutes, status, featured, editors_pick, breaking, event_date, location,
       published_at, scheduled_at, updated_at,
       article_tags(tags(id, name, slug))`,
    )
    .eq('id', params.id)
    .maybeSingle();

  if (error) return json({ error: error.message }, 500);
  if (!article) return json({ error: 'Article not found' }, 404);
  return json({ article });
};

export const PATCH: APIRoute = async ({ params, request, locals }) => {
  if (!locals.supabase || !locals.profile) return json({ error: 'Authentication required' }, 401);
  const sb = locals.supabase;
  const profile = locals.profile;
  const isEditor = profile.role === 'owner' || profile.role === 'editor';

  // RLS decides visibility/editability: if the row is not returned, the
  // caller has no business here.
  const { data: current } = await sb
    .from('articles')
    .select('id, status, author_id, slug, title')
    .eq('id', params.id)
    .maybeSingle();
  if (!current) return json({ error: 'Article not found' }, 404);

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  const patch: Record<string, unknown> = { last_edited_by: profile.id };

  if (typeof body.title === 'string') {
    const title = body.title.trim();
    if (title.length < 1 || title.length > 200) {
      return json({ error: 'Title must be between 1 and 200 characters' }, 400);
    }
    patch.title = title;
    if (typeof body.slug !== 'string' || !body.slug.trim()) {
      // Title edited without an explicit slug: keep it in sync for drafts.
      patch.slug = await uniqueSlug(sb, slugify(title), current.id);
    }
  }
  if (typeof body.slug === 'string' && body.slug.trim()) {
    const wanted = slugify(body.slug);
    if (!wanted) return json({ error: 'Slug must contain letters or numbers' }, 400);
    if (wanted !== current.slug) patch.slug = await uniqueSlug(sb, wanted, current.id);
  }
  if (typeof body.subtitle === 'string') patch.subtitle = body.subtitle.slice(0, 300);
  if (typeof body.excerpt === 'string') patch.excerpt = body.excerpt.slice(0, 500);
  if (typeof body.categoryId === 'string') patch.category_id = body.categoryId || null;
  if (typeof body.eventDate === 'string') patch.event_date = body.eventDate || null;
  if (typeof body.location === 'string') patch.location = body.location.slice(0, 120);

  if (Array.isArray(body.body)) {
    const blocks = sanitizeBlocks(body.body);
    patch.body = blocks;
    patch.reading_minutes = readingMinutes(blocks);
  }

  // Editorial flags: only editors may flip these (RLS would allow an author
  // to write them on own rows, so enforce it here too — least surprise).
  if (isEditor) {
    if (typeof body.featured === 'boolean') patch.featured = body.featured;
    if (typeof body.editorsPick === 'boolean') patch.editors_pick = body.editorsPick;
    if (typeof body.breaking === 'boolean') patch.breaking = body.breaking;
  }

  const { data: article, error } = await sb
    .from('articles')
    .update(patch)
    .eq('id', params.id)
    .select('id, slug, title, status, updated_at')
    .maybeSingle();

  if (error) {
    return json({ error: 'Could not save: ' + error.message }, 500);
  }
  if (!article) {
    // RLS silently dropped the update: the caller may not edit this article
    // in its current state (e.g. an author editing an in-review piece).
    return json(
      { error: 'You cannot edit this article in its current status (Row Level Security).' },
      403,
    );
  }

  // Replace the tag set when the client sent one.
  if (Array.isArray(body.tags)) {
    const names = body.tags.filter((t): t is string => typeof t === 'string');
    const tags = await resolveTags(sb, names, isEditor);
    await sb.from('article_tags').delete().eq('article_id', params.id);
    if (tags.length) {
      await sb
        .from('article_tags')
        .insert(tags.map((t) => ({ article_id: params.id!, tag_id: t.id })));
    }
  }

  await sb.rpc('write_audit_log', {
    p_action: 'article.updated',
    p_entity_type: 'article',
    p_entity_id: params.id,
    p_details: { fields: Object.keys(patch).filter((k) => k !== 'last_edited_by') },
  });

  return json({ article });
};
