# Architecture

One repository, two logically separated applications.

## System overview

```
                        READERS (public internet)
                                │
                                ▼
              ┌──────────────────────────────────┐
              │        CLOUDFLARE CDN            │
              │  (static assets, cache, SSL)     │
              └───────────────┬──────────────────┘
                              │
                              ▼
              ┌──────────────────────────────────┐
              │   ASTRO APP ON CLOUDFLARE WORKER │
              │  ┌────────────┐  ┌────────────┐  │
              │  │  PUBLIC    │  │  /STUDIO   │  │
              │  │  SITE      │  │  CMS       │  │
              │  │  (SSR)     │  │  (login-   │  │
              │  │            │  │   gated)   │  │
              │  └─────┬──────┘  └─────┬──────┘  │
              │        └──── API endpoints ──────┘│
              └───────┬──────────────┬────────────┘
                      │              │
                      ▼              ▼
        ┌──────────────────┐   ┌──────────────────┐
        │   SUPABASE       │   │  CLOUDFLARE R2   │
        │   • PostgreSQL   │   │  • image files   │
        │   • Auth         │   │                  │
        │   • Row Level    │   │                  │
        │     Security     │   │                  │
        └──────────────────┘   └──────────────────┘
                      ▲
        ┌─────────────┴─────────────┐
        │  GITHUB  (source code)    │
        │  push → auto-deploy to    │
        │  Cloudflare Workers       │
        └───────────────────────────┘
```

## Layers and responsibilities

| Layer | Location | Responsibility |
| --- | --- | --- |
| Public website | `src/pages/` (except `studio/`), `src/layouts/public/` | Reader-facing pages, SEO metadata |
| Editorial CMS | `src/pages/studio/`, `src/layouts/dashboard/` | Protected management interface |
| Interactive islands | React components inside `src/features/` | Editor, uploads, dashboards |
| Server API | `src/pages/api/` | Validation, authorization, upload signing |
| Shared logic | `src/lib/` | Supabase clients, permissions, validation, SEO helpers |
| Design system | `src/styles/tokens.css` | All colors, fonts, spacing — single source of truth |
| Database | `supabase/migrations/` | Version-controlled SQL schema and RLS policies |
| Tests | `tests/` | Unit, integration, end-to-end |

## Key design decisions

1. **SSR by default, static where possible.** `output: 'server'` on Cloudflare
   Workers; individual pages marked prerendered when their content permits.
2. **Scheduled publishing without cron.** Any article with
   `status = 'published' AND published_at <= now()` is publicly visible. No
   background job is needed; the database policy itself prevents early leaks.
3. **Invitation links without SMTP (v1).** The dashboard generates a secure,
   single-use, expiring link that the owner copies and sends by any channel.
   SMTP email delivery is an optional documented upgrade.
4. **Security in depth.** UI hides what users should not do, server endpoints
   re-check permissions, and PostgreSQL Row Level Security is the final wall.
