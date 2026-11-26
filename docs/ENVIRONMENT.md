# Environment Variables

Never commit real secret values to GitHub. `.env` is gitignored; `.env.example`
documents every variable the project will ever need.

## Variables

| Variable | Public? | Purpose | Needed from |
| --- | --- | --- | --- |
| `PUBLIC_SITE_URL` | Yes | The site's canonical URL (workers.dev subdomain first, custom domain later) | Phase 1 |
| `PUBLIC_SUPABASE_URL` | Yes | Supabase project API URL | Phase 3 |
| `PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase public key — safe in the browser ONLY because Row Level Security protects every table | Phase 3 |
| `SUPABASE_SERVICE_ROLE_KEY` | **No — secret** | Bypasses RLS. Used only inside server endpoints. In production: Cloudflare dashboard, encrypted secret | Phase 3 |
| `R2_ACCOUNT_ID` | **No — secret** | Cloudflare account ID for R2 operations | Phase 8 |
| `R2_ACCESS_KEY_ID` | **No — secret** | R2 API access key (server-side uploads) | Phase 8 |
| `R2_SECRET_ACCESS_KEY` | **No — secret** | R2 API secret (server-side uploads) | Phase 8 |
| `R2_BUCKET` | No | R2 bucket name | Phase 8 |
| `R2_PUBLIC_URL` | Yes | Public URL through which images are delivered | Phase 8 |

## Where values live

- **Local development:** `.env` file (gitignored, never committed).
- **Production (Cloudflare):** Workers & Pages → the worker → Settings → Variables
  and Secrets. Public variables as plain variables; secrets as encrypted secrets.

## Rules

1. Variables starting with `PUBLIC_` are embedded in browser code. Nothing secret
   may ever use that prefix.
2. The service-role key and R2 secret keys are never referenced in any client
   component — only in server endpoints (`src/pages/api/` and server-only code).
3. If a secret is ever accidentally committed, it must be rotated immediately.
