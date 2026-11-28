-- ============================================================================
-- DIAGNOSTIC: why does /article/<slug> return 404 right after publishing?
-- Run this FIRST in Supabase SQL Editor and share the result grid.
-- It reads only — changes nothing.
--
-- How to read the result:
--   row_status = 'published' + row_date_ok = true  -> the data is fine;
--     the problem is access (see the policy/grant columns below).
--   article_read_policies = 0                      -> the "published articles
--     readable by everyone" policy is missing: run 02_fix_public_read.sql.
--   anon_can_select = false                        -> table GRANT missing:
--     run 02_fix_public_read.sql (it re-applies grants too).
--   helper_functions_found < 3                     -> 0002_functions.sql did
--     not fully run; tell me before running the fix.
-- ============================================================================

select
  -- 1) The article row itself (as postgres = bypasses RLS)
  (select id::text            from public.articles where slug = 'test-1')  as row_id,
  (select status              from public.articles where slug = 'test-1')  as row_status,
  (select published_at        from public.articles where slug = 'test-1')  as row_published_at,
  (select published_at <= now() from public.articles where slug = 'test-1') as row_date_ok,

  -- 2) Which RLS policies exist on public.articles
  (select count(*) from pg_policies
    where schemaname = 'public' and tablename = 'articles')                as article_policies_total,
  (select count(*) from pg_policies
    where schemaname = 'public' and tablename = 'articles'
      and cmd in ('SELECT', 'ALL'))                                        as article_read_policies,
  (select string_agg(policyname, ' | ' order by policyname) from pg_policies
    where schemaname = 'public' and tablename = 'articles')                as article_policy_names,

  -- 3) Table-level grants (GRANT missing = loud error; policy missing = silent 404)
  has_table_privilege('anon',           'public.articles', 'select')       as anon_can_select,
  has_table_privilege('authenticated',  'public.articles', 'select')       as auth_can_select,

  -- 4) Helper functions the policies depend on
  (select count(*) from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in ('is_editor_or_above', 'is_owner', 'is_active_member')) as helper_functions_found;
