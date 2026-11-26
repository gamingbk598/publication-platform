# Deployment

**Status:** Initial deployment documented in Phase 1; production hardening in Phase 10.

Deployment model: push to the `main` branch on GitHub → Cloudflare Workers Builds
builds and deploys automatically. Build command `npm run build`, deploy command
`npx wrangler deploy`. Configuration lives in `wrangler.jsonc`.
