# Did You Hear? — Digital Editorial & News Platform

A modern, multi-author digital publication platform: a public magazine-style website
plus a private editorial CMS (`/studio`), built entirely on free-tier infrastructure.

## Stack

| Layer | Technology |
| --- | --- |
| Frontend | Astro, React (islands), TypeScript, Tailwind CSS v4 |
| Hosting | Cloudflare Workers (SSR) + CDN static assets, deployed from GitHub |
| Database / Auth | Supabase PostgreSQL + Supabase Auth + Row Level Security (Phase 3) |
| Media storage | Cloudflare R2 (Phase 8) |
| Monetization | Google AdSense, prepared in Phase 9 |

## Project status (phased development)

| Phase | Deliverable | Status |
| --- | --- | --- |
| 0 | Technical implementation plan | Done |
| 1 | Project foundation | Done |
| 2 | Public website design | Done |
| 3 | Database and authentication | In progress — migrations & RLS done, live connection pending Supabase setup |
| 4 | Admin dashboard | Planned |
| 5 | Editorial system | Planned |
| 6 | Newsroom features | Planned |
| 7 | SEO and performance | Planned |
| 8 | Storage and integrations | Planned |
| 9 | Monetization | Planned |
| 10 | Production deployment | Planned |

## Commands

- `npm run dev` — local development server (http://localhost:4321)
- `npm run build` — production build (output in `dist/`)
- `npm run preview` — preview the production build locally
- `npm run deploy` — build and deploy with Wrangler (requires Cloudflare login)

## Documentation

See the `docs/` folder: SETUP, ARCHITECTURE, ENVIRONMENT, DATABASE, SECURITY,
DEPLOYMENT, BACKUP, CONTRIBUTING.
