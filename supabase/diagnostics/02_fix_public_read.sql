-- ============================================================================
-- FIX: (re)create the public-read RLS policies + standard grants.
-- Safe to run multiple times (fully idempotent). Run AFTER
-- 01_check_public_read.sql in Supabase SQL Editor.
--
-- Why: RLS with no matching SELECT policy does NOT error — PostgREST just
-- returns 0 rows, so public pages silently 404 while the studio (which uses
-- the authenticated role + author/editor policies) keeps working.
-- ============================================================================

begin;

-- 1) Make sure RLS is enabled everywhere it should be.
alter table public.profiles          enable row level security;
alter table public.categories        enable row level security;
alter table public.tags              enable row level security;
alter table public.media             enable row level security;
alter table public.invitations       enable row level security;
alter table public.articles          enable row level security;
alter table public.article_tags      enable row level security;
alter table public.article_revisions enable row level security;
alter table public.article_sources   enable row level security;
alter table public.editorial_reviews enable row level security;
alter table public.ad_slots          enable row level security;
alter table public.site_settings     enable row level security;
alter table public.audit_logs        enable row level security;

-- 2) Standard Supabase grants (safety net — idempotent).
grant usage on schema public to anon, authenticated, service_role;
grant select, insert, update, delete on all tables in schema public
  to anon, authenticated, service_role;
grant usage, select on all sequences in schema public
  to anon, authenticated, service_role;
grant execute on all functions in schema public
  to anon, authenticated, service_role;

-- 3) The critical one: published articles readable by everyone (incl. anon).
drop policy if exists "published articles readable by everyone" on public.articles;
create policy "published articles readable by everyone"
  on public.articles for select
  using (
    status = 'published'
    and published_at is not null
    and published_at <= now()
  );

-- 4) The other public-read policies (author pages, categories, tags…).
drop policy if exists "profiles readable by everyone" on public.profiles;
create policy "profiles readable by everyone"
  on public.profiles for select using (true);

drop policy if exists "categories readable by everyone" on public.categories;
create policy "categories readable by everyone"
  on public.categories for select using (true);

drop policy if exists "tags readable by everyone" on public.tags;
create policy "tags readable by everyone"
  on public.tags for select using (true);

drop policy if exists "settings readable by everyone" on public.site_settings;
create policy "settings readable by everyone"
  on public.site_settings for select using (true);

drop policy if exists "ad_slots readable by everyone" on public.ad_slots;
create policy "ad_slots readable by everyone"
  on public.ad_slots for select using (true);

drop policy if exists "media readable by everyone" on public.media;
create policy "media readable by everyone"
  on public.media for select using (true);

-- 5) Join tables for the public article page (reference helper functions,
--    so they run last — if these two error, the main fix above still holds).
drop policy if exists "article tags follow article visibility" on public.article_tags;
create policy "article tags follow article visibility"
  on public.article_tags for select
  using (
    exists (
      select 1 from public.articles a
      where a.id = article_id
        and (
          (a.status = 'published' and a.published_at is not null and a.published_at <= now())
          or a.author_id = auth.uid()
          or public.is_editor_or_above()
        )
    )
  );

drop policy if exists "sources follow article visibility" on public.article_sources;
create policy "sources follow article visibility"
  on public.article_sources for select
  using (
    exists (
      select 1 from public.articles a
      where a.id = article_id
        and (
          (a.status = 'published' and a.published_at is not null and a.published_at <= now())
          or a.author_id = auth.uid()
          or public.is_editor_or_above()
        )
    )
  );

commit;

-- 6) Verify AS the anon role — the final grid should list your published
--    article(s). If it does, the public site can see them too.
set role anon;
select id, slug, status, published_at
from public.articles
where status = 'published'
  and published_at is not null
  and published_at <= now();
reset role;
