# Contributing

This project is developed with AI assistance in phased milestones.

- All changes go through GitHub; the `main` branch always stays deployable.
- One logical change per commit, with a clear, descriptive commit message.
- Database changes are made only through version-controlled migrations in
  `supabase/migrations/`, never by editing a live database by hand.
- Never commit secrets (see ENVIRONMENT.md).
- Documentation in `docs/` is updated whenever the architecture changes.
