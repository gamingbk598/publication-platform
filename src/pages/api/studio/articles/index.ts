import type { APIRoute } from 'astro';
import {
  json,
  readingMinutes,
  resolveTags,
  sanitizeBlocks,
  slugify,
  uniqueSlug,
} from '../../../../lib/studio-articles';

/**
 * POST /api/studio/articles — create a new draft.
 *
 * The database enforces the real rules (RLS "authors create own drafts":
 * author_id must be the caller and status must be 'draft'), so this handler
 * only shapes the payload. Editors may additionally set author_id to someone
 * else; authors always get themselves.
 */

const CONTENT_TYPES = [
  'news',
  'article',
  'blog',
  'opinion',
  'analysis',
  'guide',
  'review',
  'interview',
  'explainer',
];

export const POST: APIRoute = async ({ request, locals }) => {
  if (!locals.supabase || !locals.profile) return json({ error: 'Authentication required' }, 401);
  const sb = locals.supabase;
  const profile = locals.profile;
  const isEditor = profile.role === 'owner' || profile.role === 'editor';

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  const title = String(body.title ?? '').trim();
  if (title.length < 1 || title.length > 200) {
    return json({ error: 'Title must be between 1 and 200 characters' }, 400);
  }
  const contentType = CONTENT_TYPES.includes(String(body.contentType))
    ? String(body.contentType)
    : 'article';

  const blocks = sanitizeBlocks(body.body);
  const slug = await uniqueSlug(sb, slugify(String(body.slug ?? '').trim() || title));

  // Editors may create on behalf of an author; authors always create for
  // themselves (RLS rejects anything else anyway).
  const authorId =
    isEditor && typeof body.authorId === 'string' && body.authorId ? body.authorId : profile.id;

  const { data: article, error } = await sb
    .from('articles')
    .insert({
      title,
      subtitle: String(body.subtitle ?? '').slice(0, 300),
      slug,
      excerpt: String(body.excerpt ?? '').slice(0, 500),
      content_type: contentType,
      category_id: typeof body.categoryId === 'string' && body.categoryId ? body.categoryId : null,
      author_id: authorId,
      body: blocks,
      reading_minutes: readingMinutes(blocks),
      status: 'draft',
      event_date:
        contentType === 'news' && typeof body.eventDate === 'string' && body.eventDate
          ? body.eventDate
          : null,
      location:
        contentType === 'news' && typeof body.location === 'string'
          ? body.location.slice(0, 120)
          : null,
      last_edited_by: profile.id,
    })
    .select('id, slug, title, status')
    .single();

  if (error || !article) {
    return json({ error: 'Could not create the article: ' + (error?.message ?? 'unknown') }, 500);
  }

  // Best-effort tag attach (authors can only use existing tags).
  const tagNames = Array.isArray(body.tags)
    ? body.tags.filter((t): t is string => typeof t === 'string')
    : [];
  if (tagNames.length) {
    const tags = await resolveTags(sb, tagNames, isEditor);
    if (tags.length) {
      await sb
        .from('article_tags')
        .insert(tags.map((t) => ({ article_id: article.id, tag_id: t.id })));
    }
  }

  await sb.rpc('write_audit_log', {
    p_action: 'article.created',
    p_entity_type: 'article',
    p_entity_id: article.id,
    p_details: { title: article.title, slug: article.slug },
  });

  return json({ article }, 201);
};
