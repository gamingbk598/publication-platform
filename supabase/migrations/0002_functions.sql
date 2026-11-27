-- ============================================================================
-- MIGRATION 0002: Functions, triggers, and role helpers
-- ============================================================================

-- ── Role helper functions (SECURITY DEFINER so RLS policies can call them
--    without recursion on the profiles table) ───────────────────────────────

create or replace function public.is_owner()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'owner' and status = 'active'
  );
$$;

create or replace function public.is_editor_or_above()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('owner', 'editor') and status = 'active'
  );
$$;

create or replace function public.is_active_member()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and status = 'active'
  );
$$;

-- ── Audit logging (callable by any authenticated user's actions) ──────────

create or replace function public.write_audit_log(
  p_action text,
  p_entity_type text,
  p_entity_id text default null,
  p_details jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.audit_logs (actor_id, action, entity_type, entity_id, details)
  values (auth.uid(), p_action, p_entity_type, p_entity_id, p_details);
end;
$$;

-- ── updated_at maintenance ─────────────────────────────────────────────────

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

create trigger categories_touch before update on public.categories
  for each row execute function public.touch_updated_at();

create trigger articles_touch before update on public.articles
  for each row execute function public.touch_updated_at();

create trigger ad_slots_touch before update on public.ad_slots
  for each row execute function public.touch_updated_at();

-- ── Auto-create a profile when a user signs up ─────────────────────────────
-- The FIRST user on the platform becomes the owner (that is you).
-- Invitation acceptance updates the role afterwards (Phase 3 app layer).

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, username, display_name, role)
  values (
    new.id,
    left(lower(regexp_replace(split_part(new.email, '@', 1), '[^a-zA-Z0-9-]', '-', 'g')), 35) || '-' || substr(new.id::text, 1, 4),
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)),
    case
      when (select count(*) from public.profiles) = 0
        then 'owner'::public.user_role
      else 'author'::public.user_role
    end
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── Protect roles from being changed by non-owners ─────────────────────────

create or replace function public.protect_role_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- session_user cannot be spoofed and is never 'postgres'/'service_role'
  -- for client API traffic; those roles are the owner's server-side escape
  -- hatch (SQL Editor / service key) for emergencies.
  if new.role is distinct from old.role
     and not (public.is_owner() or session_user in ('postgres', 'service_role')) then
    raise exception 'Only the owner can change user roles';
  end if;
  if new.status is distinct from old.status
     and not (public.is_owner() or session_user in ('postgres', 'service_role')) then
    raise exception 'Only the owner can change user status';
  end if;
  return new;
end;
$$;

create trigger profiles_protect_role before update on public.profiles
  for each row execute function public.protect_role_change();

-- ── Publishing guard: only editors+ can set published/scheduled ────────────

create or replace function public.guard_publish()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status in ('published', 'scheduled') and old.status not in ('published', 'scheduled') then
    if not public.is_editor_or_above() then
      raise exception 'Only editors or the owner can publish or schedule articles';
    end if;
    if new.status = 'published' then
      new.published_at = coalesce(new.published_at, now());
    end if;
  end if;
  -- Authors may only submit their own articles
  if new.status = 'submitted' and old.status in ('draft', 'changes_requested') then
    if not (new.author_id = auth.uid() or public.is_editor_or_above()) then
      raise exception 'You can only submit your own articles';
    end if;
  end if;
  return new;
end;
$$;

create trigger articles_guard_publish before update on public.articles
  for each row execute function public.guard_publish();
