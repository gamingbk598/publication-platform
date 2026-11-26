# Security

The platform enforces security in three layers. The frontend is never trusted.

```
Layer 1  UI             hides actions users should not take (cosmetic only)
Layer 2  Server API     re-checks roles and validates input (Astro endpoints)
Layer 3  PostgreSQL RLS the final wall (supabase/migrations/0003_rls.sql)
```

## Row Level Security policy map

| Table | Public | Author | Editor | Owner |
| --- | --- | --- | --- | --- |
| `profiles` | read public fields | update own row (bio, avatar, socials) | — | change roles/status (trigger-enforced) |
| `articles` | published & past `published_at` only | create own drafts, edit own unpublished work | update all, review, publish, schedule | delete |
| `article_revisions` | — | read own, create on own articles | read/create all | (as editor) |
| `article_sources` | follows article | write on own unpublished | write all | — |
| `editorial_reviews` | — | read on own articles, respond | read/create all | — |
| `invitations` | — | — | read/create/update | delete (revoke) |
| `media` | read | insert own, edit own metadata | edit all, delete | — |
| `categories` / `tags` | read | — | manage | — |
| `site_settings` / `ad_slots` | read | — | — | manage |
| `audit_logs` | — | — | — | read (written via definer function) |

## Enforced invariants

1. **Scheduled articles cannot leak**: the public-read policy requires
   `published_at <= now()` at the database level.
2. **Authors cannot publish**: the `guard_publish()` trigger rejects
   `published`/`scheduled` transitions from non-editors, even if a policy bug
   allowed the update.
3. **Authors cannot see other authors' drafts**: the select policy filters by
   `author_id = auth.uid()`.
4. **Invitation tokens are stored as SHA-256 hashes**; the raw token exists
   only in the one-time link shown to the inviter.
5. **Role escalation is blocked twice**: by RLS and by the
   `protect_role_change()` trigger.
6. **Emails are never in `profiles`** — they stay in `auth.users`, which the
   client API cannot read for other users.

## Secrets

See ENVIRONMENT.md. Summary of the standing rules:

- `SUPABASE_SERVICE_ROLE_KEY` and R2 keys: Cloudflare encrypted secrets only,
  used exclusively inside server endpoints, never committed, never sent to
  the browser.
- `PUBLIC_SUPABASE_URL` / `PUBLIC_SUPABASE_ANON_KEY` are safe for the browser
  **only because** every table has RLS enabled.

## Rich-text safety

Article bodies are stored as structured JSON (typed content blocks). The
renderer (`ArticleBody.astro` and its React counterpart) maps block types to
components — unknown block types are dropped, and no raw HTML from user input
is ever injected into a page. This structurally prevents stored XSS.
