import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  Article,
  ArticleStatus,
  ArticleWithRelations,
  Author,
  Category,
  ContentBlock,
  ContentType,
  UserRole,
} from '../types/article';
import { getSupabaseServerClient } from './supabase/server';
import { isSupabaseConfigured } from './supabase/ssr';
import * as sample from './sample-data';

/**
 * PUBLIC DATA LAYER — the single entry point every public page uses.
 *
 * When Supabase is configured (PUBLIC_SUPABASE_URL + anon key) each helper
 * runs a real query under the anon role, so Row Level Security guarantees
 * only published, already-scheduled articles are ever returned. When it is
 * not configured (fresh clone, CI, design review) the same helpers fall back
 * to the in-memory sample data with identical shapes — pages never notice.
 *
 * Every article arrives with its `category` and `author` resolved from the
 * same joined query, so cards and layouts need no secondary lookups.
 */

// ── Row shapes returned by PostgREST ───────────────────────────────────────

interface CategoryRow {
  id: string;
  name: string;
  slug: string;
  description: string | null;
}

interface ProfileRow {
  id: string;
  username: string;
  display_name: string;
  title: string | null;
  bio: string | null;
  expertise: string[] | null;
  socials: { label: string; url: string }[] | null;
  role: UserRole;
  created_at: string;
}

interface ArticleRow {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  excerpt: string | null;
  content_type: ContentType;
  reading_minutes: number;
  status: ArticleStatus;
  featured: boolean;
  editors_pick: boolean;
  breaking: boolean;
  body: ContentBlock[] | null;
  published_at: string | null;
  updated_at: string | null;
  event_date: string | null;
  location: string | null;
  category: CategoryRow | null;
  author: ProfileRow | null;
  article_tags: { tags: { slug: string; name: string } | null }[];
  article_sources: { name: string; url: string | null }[];
}

const ARTICLE_SELECT = `
  id, slug, title, subtitle, excerpt, content_type, reading_minutes, status,
  featured, editors_pick, breaking, body, published_at, updated_at,
  event_date, location,
  category:categories(id, name, slug, description),
  author:profiles!author_id(id, username, display_name, title, bio, expertise, socials, role, created_at),
  article_tags(tags(slug, name)),
  article_sources(name, url)
`;

const PROFILE_SELECT =
  'id, username, display_name, title, bio, expertise, socials, role, created_at';

// ── Mapping helpers ────────────────────────────────────────────────────────

/** Categories in the database carry no gradient; pick one deterministically
 * from the slug so the image placeholder stays stable across renders. */
const GRADIENTS = [
  'from-sky-200 to-indigo-300',
  'from-violet-200 to-purple-300',
  'from-emerald-200 to-teal-300',
  'from-amber-200 to-orange-300',
  'from-slate-200 to-zinc-300',
  'from-rose-200 to-pink-300',
];

function gradientFor(slug: string): string {
  let h = 0;
  for (const ch of slug) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return GRADIENTS[h % GRADIENTS.length];
}

function toCategory(row: CategoryRow | null): Category | null {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description ?? '',
    placeholderGradient: gradientFor(row.slug),
  };
}

function toAuthor(row: ProfileRow | null): Author | null {
  if (!row) return null;
  return {
    id: row.id,
    name: row.display_name,
    slug: row.username,
    role: row.role,
    title: row.title ?? '',
    bio: row.bio ?? '',
    expertise: row.expertise ?? [],
    joinedAt: row.created_at,
    socials: Array.isArray(row.socials) ? row.socials : [],
  };
}

function toArticle(row: ArticleRow): ArticleWithRelations {
  const category = toCategory(row.category);
  const author = toAuthor(row.author);
  const article: ArticleWithRelations = {
    id: row.id,
    slug: row.slug,
    title: row.title,
    subtitle: row.subtitle ?? '',
    excerpt: row.excerpt ?? '',
    contentType: row.content_type,
    categorySlug: category?.slug ?? '',
    tagSlugs: row.article_tags?.map((t) => t.tags?.slug).filter(Boolean) as string[] ?? [],
    authorId: row.author?.id ?? '',
    status: row.status,
    featured: row.featured,
    editorsPick: row.editors_pick,
    breaking: row.breaking,
    publishedAt: row.published_at ?? '',
    updatedAt: row.updated_at ?? undefined,
    readingMinutes: row.reading_minutes,
    body: Array.isArray(row.body) ? (row.body as ContentBlock[]) : [],
    category,
    author,
  };
  if (row.content_type === 'news') {
    article.news = {
      eventDate: row.event_date ?? undefined,
      location: row.location ?? undefined,
      sources: (row.article_sources ?? []).map((s) => ({ name: s.name, url: s.url ?? undefined })),
    };
  }
  return article;
}

function fromSample(a: Article): ArticleWithRelations {
  return {
    ...a,
    category: sample.getCategory(a.categorySlug) ?? null,
    author: sample.getAuthorById(a.authorId) ?? null,
  };
}

function client(): SupabaseClient | null {
  return isSupabaseConfigured() ? getSupabaseServerClient() : null;
}

const nowIso = () => new Date().toISOString();

/** Shared "visible to the public" filter: published AND publication time passed. */
function publishedQuery(sb: SupabaseClient) {
  return sb
    .from('articles')
    .select(ARTICLE_SELECT)
    .eq('status', 'published')
    .lte('published_at', nowIso());
}

function report(error: { message: string } | null, where: string) {
  if (error) console.error(`[data] ${where}: ${error.message}`);
}

// ── Articles ───────────────────────────────────────────────────────────────

export async function getLatest(limit = 10): Promise<ArticleWithRelations[]> {
  const sb = client();
  if (!sb) return sample.getLatest(limit).map(fromSample);
  const { data, error } = await publishedQuery(sb)
    .order('published_at', { ascending: false })
    .limit(limit);
  report(error, 'getLatest');
  return (data as ArticleRow[] | null)?.map(toArticle) ?? [];
}

export async function getFeatured(): Promise<ArticleWithRelations | undefined> {
  const sb = client();
  if (!sb) {
    const f = sample.getFeatured();
    return f ? fromSample(f) : undefined;
  }
  const { data, error } = await publishedQuery(sb)
    .eq('featured', true)
    .order('published_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  report(error, 'getFeatured');
  return data ? toArticle(data as ArticleRow) : undefined;
}

export async function getEditorsPicks(limit = 4): Promise<ArticleWithRelations[]> {
  const sb = client();
  if (!sb) return sample.getEditorsPicks(limit).map(fromSample);
  const { data, error } = await publishedQuery(sb)
    .eq('editors_pick', true)
    .eq('featured', false)
    .order('published_at', { ascending: false })
    .limit(limit);
  report(error, 'getEditorsPicks');
  return (data as ArticleRow[] | null)?.map(toArticle) ?? [];
}

export async function getByCategory(slug: string, limit = 20): Promise<ArticleWithRelations[]> {
  const sb = client();
  if (!sb) return sample.getByCategory(slug, limit).map(fromSample);
  const category = await getCategory(slug);
  if (!category) return [];
  const { data, error } = await publishedQuery(sb)
    .eq('category_id', category.id)
    .order('published_at', { ascending: false })
    .limit(limit);
  report(error, 'getByCategory');
  return (data as ArticleRow[] | null)?.map(toArticle) ?? [];
}

export async function getByType(
  type: ContentType,
  limit = 20,
): Promise<ArticleWithRelations[]> {
  const sb = client();
  if (!sb) return sample.getByType(type, limit).map(fromSample);
  const { data, error } = await publishedQuery(sb)
    .eq('content_type', type)
    .order('published_at', { ascending: false })
    .limit(limit);
  report(error, 'getByType');
  return (data as ArticleRow[] | null)?.map(toArticle) ?? [];
}

export async function getByAuthor(authorId: string): Promise<ArticleWithRelations[]> {
  const sb = client();
  if (!sb) return sample.getByAuthor(authorId).map(fromSample);
  const { data, error } = await publishedQuery(sb)
    .eq('author_id', authorId)
    .order('published_at', { ascending: false })
    .limit(200);
  report(error, 'getByAuthor');
  return (data as ArticleRow[] | null)?.map(toArticle) ?? [];
}

export async function getArticleBySlug(slug: string): Promise<ArticleWithRelations | undefined> {
  const sb = client();
  if (!sb) {
    const a = sample.getArticleBySlug(slug);
    return a ? fromSample(a) : undefined;
  }
  const { data, error } = await publishedQuery(sb).eq('slug', slug).maybeSingle();
  report(error, 'getArticleBySlug');
  return data ? toArticle(data as ArticleRow) : undefined;
}

export async function getRelated(
  article: Article,
  limit = 3,
): Promise<ArticleWithRelations[]> {
  const sb = client();
  if (!sb) return sample.getRelated(article, limit).map(fromSample);
  const categoryId = article.category?.id;
  const authorId = article.author?.id;
  const clauses = [
    categoryId ? `category_id.eq.${categoryId}` : null,
    authorId ? `author_id.eq.${authorId}` : null,
  ].filter(Boolean);
  let q = publishedQuery(sb).neq('id', article.id);
  if (clauses.length) q = q.or(clauses.join(','));
  const { data, error } = await q
    .order('published_at', { ascending: false })
    .limit(limit);
  report(error, 'getRelated');
  return (data as ArticleRow[] | null)?.map(toArticle) ?? [];
}

/** Full-text search over title/subtitle/excerpt using the generated
 *  search_vector column (see 0001_schema.sql). Falls back to the in-memory
 *  search when Supabase is not configured. */
export async function searchArticles(query: string): Promise<ArticleWithRelations[]> {
  const q = query.trim();
  if (!q) return [];
  const sb = client();
  if (!sb) return sample.searchArticles(q).map(fromSample);
  const { data, error } = await publishedQuery(sb)
    .textSearch('search_vector', q, { type: 'websearch', config: 'english' })
    .order('published_at', { ascending: false })
    .limit(50);
  report(error, 'searchArticles');
  return (data as ArticleRow[] | null)?.map(toArticle) ?? [];
}

/** Number of published articles per category slug — used by the Topics index. */
export async function getPublishedCountsByCategory(): Promise<Record<string, number>> {
  const sb = client();
  if (!sb) {
    const counts: Record<string, number> = {};
    for (const c of sample.categories) counts[c.slug] = sample.getByCategory(c.slug, 1000).length;
    return counts;
  }
  const { data, error } = await sb
    .from('articles')
    .select('category_id, category:categories(slug)')
    .eq('status', 'published')
    .lte('published_at', nowIso());
  report(error, 'getPublishedCountsByCategory');
  const counts: Record<string, number> = {};
  for (const row of (data as { category: { slug: string } | null }[] | null) ?? []) {
    if (row.category?.slug) counts[row.category.slug] = (counts[row.category.slug] ?? 0) + 1;
  }
  return counts;
}

// ── Categories ─────────────────────────────────────────────────────────────

export async function getCategories(): Promise<Category[]> {
  const sb = client();
  if (!sb) return sample.categories;
  const { data, error } = await sb
    .from('categories')
    .select('id, name, slug, description')
    .eq('is_active', true)
    .order('display_order', { ascending: true });
  report(error, 'getCategories');
  return ((data as CategoryRow[] | null) ?? []).map((c) => toCategory(c)!);
}

export async function getCategory(slug: string): Promise<Category | undefined> {
  const sb = client();
  if (!sb) return sample.getCategory(slug);
  const { data, error } = await sb
    .from('categories')
    .select('id, name, slug, description')
    .eq('slug', slug)
    .eq('is_active', true)
    .maybeSingle();
  report(error, 'getCategory');
  return data ? toCategory(data as CategoryRow) ?? undefined : undefined;
}

// ── Authors ────────────────────────────────────────────────────────────────

/** The public team page: active members who write. */
export async function getAuthors(): Promise<Author[]> {
  const sb = client();
  if (!sb) return sample.authors;
  const { data, error } = await sb
    .from('profiles')
    .select(PROFILE_SELECT)
    .eq('status', 'active')
    .order('display_name', { ascending: true });
  report(error, 'getAuthors');
  return ((data as ProfileRow[] | null) ?? []).map((p) => toAuthor(p)!);
}

export async function getAuthorBySlug(slug: string): Promise<Author | undefined> {
  const sb = client();
  if (!sb) return sample.getAuthorBySlug(slug);
  const { data, error } = await sb
    .from('profiles')
    .select(PROFILE_SELECT)
    .eq('username', slug)
    .eq('status', 'active')
    .maybeSingle();
  report(error, 'getAuthorBySlug');
  return data ? toAuthor(data as ProfileRow) ?? undefined : undefined;
}

export async function getAuthorById(id: string): Promise<Author | undefined> {
  const sb = client();
  if (!sb) return sample.getAuthorById(id);
  const { data, error } = await sb
    .from('profiles')
    .select(PROFILE_SELECT)
    .eq('id', id)
    .maybeSingle();
  report(error, 'getAuthorById');
  return data ? toAuthor(data as ProfileRow) ?? undefined : undefined;
}

// ── Pure helpers (shared by both backends) ─────────────────────────────────

export const formatDate = sample.formatDate;
export type { ArticleWithRelations };
