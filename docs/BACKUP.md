# Backup and Recovery

**Status:** Full procedure written in Phase 3 (when the database goes live).

Honest expectations (Supabase free tier, verified November 2026): the free plan
does NOT include automatic database backups. The backup routine documented in
Phase 3 will therefore be a manual, scheduled-by-you export process, plus
version-controlled migrations and GitHub history which are always recoverable.
