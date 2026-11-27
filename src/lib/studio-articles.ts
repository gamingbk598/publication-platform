import type { SupabaseClient } from '@supabase/supabase-js';
import type { ContentBlock } from '../types/article';

/**
 * Server-side helpers shared by the article API endpoints.
 * Pure functions plus small Supabase queries — no business rules that the
 * database does not already enforce (RLS + guard_publish are the wall).
 */

/** 'My Big Article! (v2)' → 'my-big-article-v2' */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 190);
}

/** Unique slug: 'my-title', 'my-title-2', 'my-title-3', … */
export async function uniqueSlug(
  sb: SupabaseClient,
  desired: string,
  ignoreArticleId?: string,
): Promise<string> {
  const base = desired || 'untitled';
  let candidate = base;
  for (let i = 2; i < 100; i++) {
    const { data } = await sb.from('articles').select('id').eq('slug', candidate).maybeSingle();
    const clash = data && data.id !== ignoreArticleId;
    if (!clash) return candidate;
    candidate = `${base}-${i}`;
  }
  return `${base}-${Date.now()}`;
}

/** Rough reading time: ~220 wpm over the rendered text of all blocks. */
export function readingMinutes(blocks: ContentBlock[]): number {
  const words = blocks
    .map((b) => {
      switch (b.type) {
        case 'heading':
        case 'paragraph':
          return b.text;
        case 'quote':
          return b.text + ' ' + (b.attribution ?? '');
        case 'list':
          return b.items.join(' ');
        case 'code':
          return b.code;
        default:
          return '';
      }
    })
    .join(' ')
    .split(/\s+/)
    .filter(Boolean).length;
  return Math.max(1, Math.round(words / 220));
}

/**
 * Validate and normalise untrusted body JSON into safe ContentBlocks.
 * Everything unknown is dropped — the stored body is always a known shape,
 * and the public renderer only ever handles these types.
 */
export function sanitizeBlocks(input: unknown): ContentBlock[] {
  if (!Array.isArray(input)) return [];
  const out: ContentBlock[] = [];
  for (const raw of input.slice(0, 300)) {
    if (typeof raw !== 'object' || raw === null) continue;
    const b = raw as Record<string, unknown>;
    const text = typeof b.text === 'string' ? b.text.slice(0, 10_000) : '';
    switch (b.type) {
      case 'heading':
        out.push({ type: 'heading', level: b.level === 3 ? 3 : 2, text });
        break;
      case 'paragraph':
        if (text.trim()) out.push({ type: 'paragraph', text });
        break;
      case 'quote':
        out.push({
          type: 'quote',
          text,
          attribution: typeof b.attribution === 'string' ? b.attribution.slice(0, 300) : undefined,
        });
        break;
      case 'list': {
        const items = Array.isArray(b.items)
          ? b.items.filter((i): i is string => typeof i === 'string').slice(0, 100)
          : [];
        out.push({ type: 'list', ordered: b.ordered === true, items });
        break;
      }
      case 'code':
        out.push({
          type: 'code',
          language: typeof b.language === 'string' ? b.language.slice(0, 40) : 'text',
          code: typeof b.code === 'string' ? b.code.slice(0, 20_000) : '',
        });
        break;
      case 'image':
        // Phase 8 (R2 media). Accepted but rendered as a placeholder.
        out.push({
          type: 'image',
          caption: typeof b.caption === 'string' ? b.caption.slice(0, 300) : undefined,
        });
        break;
      default:
        break; // unknown block type → dropped
    }
  }
  return out;
}

/**
 * Resolve a list of tag names into tag rows the current user may attach.
 * Authors cannot create tags (RLS: "tags managed by editors"), so unknown
 * names are silently skipped for them instead of failing the whole save.
 */
export async function resolveTags(
  sb: SupabaseClient,
  names: string[],
  canCreate: boolean,
): Promise<{ id: string }[]> {
  const wanted = [...new Set(names.map((n) => n.trim()).filter((n) => n && n.length <= 40))].slice(
    0,
    12,
  );
  if (wanted.length === 0) return [];

  const slugs = wanted.map(slugify).filter(Boolean);
  const { data: existing } = await sb.from('tags').select('id, slug').in('slug', slugs);
  const have = new Set((existing ?? []).map((t) => t.slug));
  const missing = wanted.filter((n) => !have.has(slugify(n)));

  let created: { id: string; slug: string }[] = [];
  if (canCreate && missing.length) {
    const rows = missing.map((name) => ({ name, slug: slugify(name) }));
    const { data } = await sb.from('tags').insert(rows).select('id, slug');
    created = data ?? [];
  }

  return [...(existing ?? []), ...created].map((t) => ({ id: t.id }));
}

export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
