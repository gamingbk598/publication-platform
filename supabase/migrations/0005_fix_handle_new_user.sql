-- ============================================================================
-- MIGRATION 0005: Hotfixes for user creation and role management
-- ============================================================================
-- FIX 1 (critical): handle_new_user()'s CASE expression produced a `text`
--   value; PostgreSQL has no implicit cast from text to the user_role enum,
--   so EVERY signup failed with "Database error creating new user".
--   Usernames are also truncated now, so long email addresses don't break
--   the 40-char username limit.
-- FIX 2: protect_role_change() now lets the postgres / service_role roles
--   change roles and statuses, so the owner can manage users through the
--   SQL Editor or a server endpoint in an emergency. session_user cannot be
--   spoofed and is never those roles for client API traffic.
--
-- Safe to run on a project where 0001-0004 already ran. No data is touched.

-- ── FIX 1 ───────────────────────────────────────────────────────────────────

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

-- ── FIX 2 ───────────────────────────────────────────────────────────────────

create or replace function public.protect_role_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
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
