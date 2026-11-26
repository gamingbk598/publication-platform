# Database

Supabase PostgreSQL. All schema changes are version-controlled SQL migrations
in `supabase/migrations/`, applied in numeric order. Never edit the database
by hand and never edit an applied migration — write a new one.

## Migrations

| File | Contents |
| --- | --- |
| `0001_schema.sql` | Extensions, enums, all 13 tables, constraints, indexes, full-text search |
| `0002_functions.sql` | Role helpers, audit logging, `updated_at` triggers, signup trigger, publish guard |
| `0003_rls.sql` | Row Level Security policies on every table |
| `0004_seed.sql` | Initial categories, tags, site settings, disabled ad slots |

## Tables

| Table | Purpose | Public read? |
| --- | --- | --- |
| `profiles` | One row per user, linked to `auth.users`. Public fields only (username, name, bio, expertise, socials) + role/status. Email is never stored here. | Yes |
| `categories` | Sections with slug, SEO fields, order, active flag | Yes |
| `tags` | Free-form tags | Yes |
| `articles` | Core content: title, slug, JSON body, status, SEO fields, news metadata, FTS vector | Published only |
| `article_tags` | Many-to-many articles ↔ tags | Follows article |
| `article_revisions` | Immutable snapshots on every workflow action | Author + editors |
| `article_sources` | Source references for news articles | Follows article |
| `editorial_reviews` | Private feedback thread per article | Author + editors |
| `media` | Image metadata (files live in Cloudflare R2) | Yes |
| `invitations` | Invitation tokens (SHA-256 hash only), role, expiry | Editors only |
| `ad_slots` | Ad placements, disabled by default | Yes |
| `site_settings` | Key/value site configuration | Yes |
| `audit_logs` | Who did what, when | Owner only |

## Key constraints and guards

1. **Published articles must have `published_at`** and **scheduled ones must
   have `scheduled_at`** (CHECK constraints).
2. **News metadata is only allowed on `content_type = 'news'`** (CHECK).
3. **`guard_publish()` trigger**: only editors/owner can move an article into
   `published` or `scheduled`; publishing stamps `published_at` automatically.
4. **`protect_role_change()` trigger**: only the owner can change roles or
   suspend users.
5. **First user becomes owner**: `handle_new_user()` assigns `owner` to the
   first profile created on the platform, `author` to everyone after.

## Scheduled publishing

There is no cron job. An article is publicly visible when
`status = 'published' AND published_at <= now()`. To schedule, the editor sets
status `scheduled` with `scheduled_at`, and a small server endpoint flips it
to `published` (with `published_at = scheduled_at`) once the time passes —
until then both the RLS policy and the query layer keep it invisible.

## Full-text search

`articles.search_vector` is a GENERATED column (weights: title A, subtitle B,
excerpt C) with a GIN index. Search query example:

```sql
select id, title, slug
from articles
where status = 'published'
  and published_at <= now()
  and search_vector @@ websearch_to_tsquery('english', $1)
order by ts_rank(search_vector, websearch_to_tsquery('english', $1)) desc;
```

## Applying migrations

In the Supabase dashboard: **SQL Editor → New query → paste the file contents
→ Run**, in order 0001 → 0004, once each. (Supabase CLI `db push` is the
power-user alternative.) Verify in **Table Editor** that all tables exist
afterwards.
