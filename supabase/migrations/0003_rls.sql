-- ============================================================================
-- MIGRATION 0003: Row Level Security policies
-- The database itself enforces who can read and write what. The application
-- provides a second layer of checks; this is the final wall.
-- ============================================================================

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

-- ── profiles ───────────────────────────────────────────────────────────────
-- Public: anyone can read author pages. The table contains public fields only
-- (email lives in auth.users, which is not readable through the client API).
-- Private columns do not exist here by design — never add them.

create policy "profiles readable by everyone"
  on public.profiles for select using (true);

create policy "users update own profile"
  on public.profiles for update
  using (id = auth.uid() and status = 'active')
  with check (id = auth.uid());

-- insert happens via the handle_new_user trigger (security definer).
-- role/status changes are additionally blocked by protect_role_change().

-- ── categories & tags & site_settings & ad_slots ───────────────────────────

create policy "categories readable by everyone"
  on public.categories for select using (true);
create policy "categories managed by editors"
  on public.categories for all
  using (public.is_editor_or_above())
  with check (public.is_editor_or_above());

create policy "tags readable by everyone"
  on public.tags for select using (true);
create policy "tags managed by editors"
  on public.tags for all
  using (public.is_editor_or_above())
  with check (public.is_editor_or_above());

create policy "settings readable by everyone"
  on public.site_settings for select using (true);
create policy "settings managed by owner"
  on public.site_settings for all
  using (public.is_owner())
  with check (public.is_owner());

create policy "ad_slots readable by everyone"
  on public.ad_slots for select using (true);
create policy "ad_slots managed by owner"
  on public.ad_slots for all
  using (public.is_owner())
  with check (public.is_owner());

-- ── media ──────────────────────────────────────────────────────────────────

create policy "media readable by everyone"
  on public.media for select using (true);
create policy "authors upload media"
  on public.media for insert
  with check (uploaded_by = auth.uid() and public.is_active_member());
create policy "users edit own media metadata"
  on public.media for update
  using (uploaded_by = auth.uid() or public.is_editor_or_above())
  with check (uploaded_by = auth.uid() or public.is_editor_or_above());
create policy "editors delete media"
  on public.media for delete using (public.is_editor_or_above());

-- ── invitations ────────────────────────────────────────────────────────────
-- Never readable by the anon/public role. token_hash must stay private.

create policy "invitations visible to editors"
  on public.invitations for select using (public.is_editor_or_above());
create policy "editors create invitations"
  on public.invitations for insert
  with check (public.is_editor_or_above());
create policy "editors update invitations"
  on public.invitations for update
  using (public.is_editor_or_above())
  with check (public.is_editor_or_above());
create policy "editors revoke invitations"
  on public.invitations for delete using (public.is_owner());

-- Acceptance flow runs through a server endpoint using the service-role key
-- (verify token hash, mark accepted, set the invited user's role).

-- ── articles ───────────────────────────────────────────────────────────────

create policy "published articles readable by everyone"
  on public.articles for select
  using (
    status = 'published'
    and published_at is not null
    and published_at <= now()          -- scheduled articles stay invisible
  );

create policy "authors read own articles any status"
  on public.articles for select
  using (author_id = auth.uid() or public.is_editor_or_above());

create policy "authors create own drafts"
  on public.articles for insert
  with check (
    author_id = auth.uid()
    and status = 'draft'
    and public.is_active_member()
  );

create policy "authors edit own unpublished work"
  on public.articles for update
  using (
    author_id = auth.uid()
    and status in ('draft', 'submitted', 'changes_requested')
  )
  with check (
    author_id = auth.uid()
    and status in ('draft', 'submitted', 'changes_requested')
  );

create policy "editors manage all articles"
  on public.articles for update
  using (public.is_editor_or_above())
  with check (public.is_editor_or_above());

create policy "owner deletes articles"
  on public.articles for delete using (public.is_owner());

-- Status transitions to published/scheduled are additionally guarded by the
-- guard_publish() trigger — belt and braces.

-- ── article_tags ───────────────────────────────────────────────────────────

create policy "article tags follow article visibility"
  on public.article_tags for select
  using (
    exists (
      select 1 from public.articles a
      where a.id = article_id
        and (
          (a.status = 'published' and a.published_at <= now())
          or a.author_id = auth.uid()
          or public.is_editor_or_above()
        )
    )
  );

create policy "article tags writable by article editors"
  on public.article_tags for all
  using (
    public.is_editor_or_above()
    or exists (
      select 1 from public.articles a
      where a.id = article_id
        and a.author_id = auth.uid()
        and a.status in ('draft', 'submitted', 'changes_requested')
    )
  )
  with check (
    public.is_editor_or_above()
    or exists (
      select 1 from public.articles a
      where a.id = article_id
        and a.author_id = auth.uid()
        and a.status in ('draft', 'submitted', 'changes_requested')
    )
  );

-- ── article_revisions ──────────────────────────────────────────────────────

create policy "revisions visible to author and editors"
  on public.article_revisions for select
  using (
    public.is_editor_or_above()
    or exists (
      select 1 from public.articles a
      where a.id = article_id and a.author_id = auth.uid()
    )
  );

create policy "revisions created by author or editors"
  on public.article_revisions for insert
  with check (
    created_by = auth.uid()
    and (
      public.is_editor_or_above()
      or exists (
        select 1 from public.articles a
        where a.id = article_id and a.author_id = auth.uid()
      )
    )
  );

-- ── article_sources ────────────────────────────────────────────────────────

create policy "sources follow article visibility"
  on public.article_sources for select
  using (
    exists (
      select 1 from public.articles a
      where a.id = article_id
        and (
          (a.status = 'published' and a.published_at <= now())
          or a.author_id = auth.uid()
          or public.is_editor_or_above()
        )
    )
  );

create policy "sources writable by article editors"
  on public.article_sources for all
  using (
    public.is_editor_or_above()
    or exists (
      select 1 from public.articles a
      where a.id = article_id
        and a.author_id = auth.uid()
        and a.status in ('draft', 'submitted', 'changes_requested')
    )
  )
  with check (
    public.is_editor_or_above()
    or exists (
      select 1 from public.articles a
      where a.id = article_id
        and a.author_id = auth.uid()
        and a.status in ('draft', 'submitted', 'changes_requested')
    )
  );

-- ── editorial_reviews ──────────────────────────────────────────────────────

create policy "reviews visible to article author and editors"
  on public.editorial_reviews for select
  using (
    public.is_editor_or_above()
    or reviewer_id = auth.uid()
    or exists (
      select 1 from public.articles a
      where a.id = article_id and a.author_id = auth.uid()
    )
  );

create policy "reviews written by active members"
  on public.editorial_reviews for insert
  with check (reviewer_id = auth.uid() and public.is_active_member());

-- ── audit_logs ─────────────────────────────────────────────────────────────
-- Written ONLY via write_audit_log() (security definer). Readable by owner.

create policy "audit logs readable by owner"
  on public.audit_logs for select using (public.is_owner());
