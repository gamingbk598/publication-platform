-- ============================================================================
-- MIGRATION 0004: Seed data — categories, tags, site settings, ad slots
-- Matches the public site's initial category set. Safe to run once.
-- ============================================================================

insert into public.categories (name, slug, description, display_order) values
  ('Technology', 'technology', 'Hardware, software, and the industry that builds them.', 1),
  ('AI', 'ai', 'Machine learning, models, policy, and their consequences.', 2),
  ('Science', 'science', 'Discoveries, research, and the natural world.', 3),
  ('Education', 'education', 'Learning, teaching, and building better study habits.', 4),
  ('Business', 'business', 'Markets, strategy, and the economics of technology.', 5),
  ('Lifestyle', 'lifestyle', 'Creativity, work-life, and everyday improvement.', 6);

insert into public.tags (name, slug) values
  ('Edge AI', 'edge-ai'),
  ('Policy', 'policy'),
  ('Space', 'space'),
  ('Open Source', 'open-source'),
  ('Productivity', 'productivity'),
  ('Climate', 'climate'),
  ('Publishing', 'publishing'),
  ('Cloud', 'cloud'),
  ('JWST', 'webb');

insert into public.site_settings (key, value) values
  ('site', '{"name": "Did You Hear?", "tagline": "A blogging and news channel", "description": "Reporting, explainers, guides, and takes worth sharing."}'::jsonb),
  ('homepage', '{"sections": [{"key": "featured", "enabled": true}, {"key": "latest", "enabled": true}, {"key": "picks", "enabled": true}, {"key": "categories", "enabled": true}, {"key": "newsletter", "enabled": true}]}'::jsonb);

insert into public.ad_slots (placement, page_type, enabled) values
  ('homepage', '', false),
  ('article_top', 'article', false),
  ('in_content', 'article', false),
  ('article_bottom', 'article', false),
  ('sidebar', '', false),
  ('category', 'category', false);
