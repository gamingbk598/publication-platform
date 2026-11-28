import type { APIRoute } from 'astro';
import { isSupabaseConfigured } from '../../../../lib/supabase/ssr';
import { getSupabaseServerClient } from '../../../../lib/supabase/server';

/**
 * DEBUG ENDPOINT — temporary, remove before production deploy.
 *
 * GET /api/debug/article/[slug]
 *
 * Reproduces exactly what the public article page does, step by step, and
 * returns every intermediate result as JSON so we can see WHERE the public
 * page loses the article (env config, RLS row visibility, embeds, etc.).
 *
 * Uses the anon client — same role as public pages — so it can never leak
 * unpublished articles (RLS still applies).
 */

const FULL_SELECT = `
  id, slug, title, subtitle, excerpt, content_type, reading_minutes, status,
  featured, editors_pick, breaking, body, published_at, updated_at,
  event_date, location,
  category:categories(id, name, slug, description),
  author:profiles!author_id(id, username, display_name, title, bio, expertise, socials, role, created_at),
  article_tags(tags(slug, name)),
  article_sources(name, url)
`;

export const GET: APIRoute = async ({ params }) => {
  const slug = params.slug ?? '';
  const out: Record<string, unknown> = {
    slug,
    time_utc: new Date().toISOString(),
  };

  out.configured = isSupabaseConfigured();

  if (!isSupabaseConfigured()) {
    out.using = 'sample data fallback (env vars missing)';
    return new Response(JSON.stringify(out, null, 2), {
      headers: { 'content-type': 'application/json' },
    });
  }

  out.using = 'supabase (anon key, no user session)';

  let sb;
  try {
    sb = getSupabaseServerClient();
  } catch (e) {
    out.client_error = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify(out, null, 2), {
      headers: { 'content-type': 'application/json' },
    });
  }

  // Step 1: bare minimum query, no embeds.
  const minimal = await sb
    .from('articles')
    .select('id, slug, status, published_at')
    .eq('slug', slug)
    .maybeSingle();
  out.step1_minimal = {
    found: Boolean(minimal.data),
    error: minimal.error
      ? `${minimal.error.message} (code ${minimal.error.code})`
      : null,
    row: minimal.data ?? null,
  };

  // Step 2: same query plus the public filters the page applies.
  if (minimal.data) {
    const filtered = await sb
      .from('articles')
      .select('id, slug, status, published_at')
      .eq('slug', slug)
      .eq('status', 'published')
      .lte('published_at', new Date().toISOString())
      .maybeSingle();
    out.step2_with_public_filters = {
      found: Boolean(filtered.data),
      error: filtered.error ? filtered.error.message : null,
      note: 'if found=false but step1 found=true, the status/published_at filter is rejecting the row',
    };
  }

  // Step 3: the exact embed-heavy select the real page uses.
  const full = await sb.from('articles').select(FULL_SELECT).eq('slug', slug).maybeSingle();
  out.step3_full_page_select = {
    found: Boolean(full.data),
    error: full.error
      ? `${full.error.message} (code ${full.error.code})`
      : null,
    title: full.data?.title ?? null,
    has_author: Boolean((full.data as Record<string, unknown> | null)?.author),
    has_category: Boolean((full.data as Record<string, unknown> | null)?.category),
  };

  // Step 4: how many published articles does anon see at all?
  const all = await sb
    .from('articles')
    .select('id, slug, published_at')
    .eq('status', 'published')
    .lte('published_at', new Date().toISOString());
  out.step4_anon_published_count = {
    count: all.data?.length ?? 0,
    error: all.error ? all.error.message : null,
    slugs: (all.data ?? []).map((r: { slug: string }) => r.slug),
  };

  return new Response(JSON.stringify(out, null, 2), {
    headers: { 'content-type': 'application/json' },
  });
};
