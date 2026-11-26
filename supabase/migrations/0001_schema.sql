-- ============================================================================
-- MIGRATION 0001: Core schema for "Did You Hear?" publication platform
-- Safe to run once on an empty Supabase project.
-- ============================================================================

create extension if not exists "pgcrypto";

-- ── Enums ──────────────────────────────────────────────────────────────────

create type public.user_role as enum ('owner', 'editor', 'author');

create type public.user_status as enum ('active', 'suspended', 'deactivated');

create type public.content_type as enum (
  'news', 'article', 'blog', 'opinion', 'analysis',
  'guide', 'review', 'interview', 'explainer'
);

create type public.article_status as enum (
  'draft', 'submitted', 'in_review', 'changes_requested',
  'approved', 'scheduled', 'published', 'rejected', 'archived'
);

create type public.invitation_status as enum ('pending', 'accepted', 'expired', 'revoked');

-- ── profiles ───────────────────────────────────────────────────────────────
-- One row per authenticated user. Public fields only; emails live in
-- auth.users and are never copied here.

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text unique not null check (username ~ '^[a-z0-9-]{3,40}$'),
  display_name text not null check (char_length(display_name) between 1 and 80),
  title text default '',
  bio text default '' check (char_length(bio) <= 2000),
  avatar_url text,
  expertise text[] not null default '{}',
  socials jsonb not null default '[]',
  role public.user_role not null default 'author',
  status public.user_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ── categories ─────────────────────────────────────────────────────────────

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 60),
  slug text unique not null check (slug ~ '^[a-z0-9-]{1,60}$'),
  description text default '',
  image_url text,
  seo_title text,
  seo_description text,
  display_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ── tags ───────────────────────────────────────────────────────────────────

create table public.tags (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 40),
  slug text unique not null check (slug ~ '^[a-z0-9-]{1,60}$'),
  created_at timestamptz not null default now()
);

-- ── media ──────────────────────────────────────────────────────────────────
-- Metadata only. Binary files live in Cloudflare R2 (Phase 8).

create table public.media (
  id uuid primary key default gen_random_uuid(),
  object_key text unique not null,
  url text not null default '',
  file_name text not null,
  mime_type text not null check (mime_type in ('image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif')),
  size_bytes bigint not null check (size_bytes > 0 and size_bytes <= 10485760),
  width int,
  height int,
  alt_text text default '' check (char_length(alt_text) <= 500),
  caption text default '',
  uploaded_by uuid not null references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

-- ── invitations ────────────────────────────────────────────────────────────
-- token_hash stores a SHA-256 of the invitation token. The raw token exists
-- only in the invitation link shown once to the inviting owner/editor.

create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  role public.user_role not null default 'author' check (role in ('author', 'editor')),
  token_hash text unique not null,
  status public.invitation_status not null default 'pending',
  invited_by uuid not null references public.profiles (id) on delete cascade,
  expires_at timestamptz not null check (expires_at > now()),
  accepted_at timestamptz,
  accepted_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index invitations_email_idx on public.invitations (email);
create index invitations_status_idx on public.invitations (status);

-- ── articles ───────────────────────────────────────────────────────────────

create table public.articles (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 200),
  subtitle text default '',
  slug text unique not null check (slug ~ '^[a-z0-9-]{1,200}$'),
  excerpt text default '' check (char_length(excerpt) <= 500),
  content_type public.content_type not null default 'article',
  category_id uuid references public.categories (id) on delete set null,
  author_id uuid not null references public.profiles (id) on delete cascade,
  featured_image_id uuid references public.media (id) on delete set null,
  image_caption text default '',
  body jsonb not null default '[]',           -- structured content blocks (Tiptap-style)
  reading_minutes int not null default 1,
  status public.article_status not null default 'draft',
  featured boolean not null default false,
  editors_pick boolean not null default false,
  breaking boolean not null default false,
  seo_title text,
  seo_description text,
  canonical_url text,
  social_image_id uuid references public.media (id) on delete set null,
  noindex boolean not null default false,
  -- News-specific fields (used when content_type = 'news')
  event_date date,
  location text,
  scheduled_at timestamptz,
  published_at timestamptz,
  last_edited_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Integrity: editorial metadata only on news items
  constraint news_fields_only_on_news check (
    content_type = 'news' or (event_date is null and (location is null or location = ''))
  ),
  -- Integrity: published articles must have a publication timestamp
  constraint published_has_date check (status <> 'published' or published_at is not null),
  -- Integrity: scheduled articles must have a schedule
  constraint scheduled_has_date check (status <> 'scheduled' or scheduled_at is not null)
);

create index articles_slug_idx on public.articles (slug);
create index articles_status_idx on public.articles (status);
create index articles_published_at_idx on public.articles (published_at desc);
create index articles_author_idx on public.articles (author_id);
create index articles_category_idx on public.articles (category_id);
create index articles_type_idx on public.articles (content_type);

-- Full-text search: generated column kept in sync with title/subtitle/excerpt.
alter table public.articles
  add column search_vector tsvector
  generated always as (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(subtitle, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(excerpt, '')), 'C')
  ) stored;

create index articles_search_idx on public.articles using gin (search_vector);

-- ── article_tags ───────────────────────────────────────────────────────────

create table public.article_tags (
  article_id uuid not null references public.articles (id) on delete cascade,
  tag_id uuid not null references public.tags (id) on delete cascade,
  primary key (article_id, tag_id)
);

create index article_tags_tag_idx on public.article_tags (tag_id);

-- ── article_revisions ──────────────────────────────────────────────────────

create table public.article_revisions (
  id uuid primary key default gen_random_uuid(),
  article_id uuid not null references public.articles (id) on delete cascade,
  revision_number int not null,
  title text not null,
  body jsonb not null,
  created_by uuid references public.profiles (id) on delete set null,
  note text default '',
  created_at timestamptz not null default now(),
  unique (article_id, revision_number)
);

create index article_revisions_article_idx on public.article_revisions (article_id, revision_number desc);

-- ── article_sources ────────────────────────────────────────────────────────

create table public.article_sources (
  id uuid primary key default gen_random_uuid(),
  article_id uuid not null references public.articles (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 200),
  url text,
  note text default '',
  display_order int not null default 0,
  created_at timestamptz not null default now()
);

create index article_sources_article_idx on public.article_sources (article_id);

-- ── editorial_reviews ──────────────────────────────────────────────────────
-- The private feedback thread between editors and the author.

create table public.editorial_reviews (
  id uuid primary key default gen_random_uuid(),
  article_id uuid not null references public.articles (id) on delete cascade,
  reviewer_id uuid not null references public.profiles (id) on delete cascade,
  decision text check (decision in ('submitted', 'in_review', 'changes_requested', 'approved', 'rejected', 'published', 'archived')),
  comment text not null default '',
  is_author_response boolean not null default false,
  created_at timestamptz not null default now()
);

create index editorial_reviews_article_idx on public.editorial_reviews (article_id, created_at desc);

-- ── ad_slots ───────────────────────────────────────────────────────────────

create table public.ad_slots (
  id uuid primary key default gen_random_uuid(),
  placement text not null check (placement in (
    'homepage', 'article_top', 'in_content', 'article_bottom', 'sidebar', 'category'
  )),
  page_type text default '',
  enabled boolean not null default false,
  show_desktop boolean not null default true,
  show_mobile boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ── site_settings ──────────────────────────────────────────────────────────

create table public.site_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

-- ── audit_logs ─────────────────────────────────────────────────────────────
-- Written via SECURITY DEFINER function so RLS can never block an audit trail.

create table public.audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid references public.profiles (id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text,
  details jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index audit_logs_entity_idx on public.audit_logs (entity_type, entity_id);
create index audit_logs_created_idx on public.audit_logs (created_at desc);
