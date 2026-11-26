/**
 * Core domain types. In Phase 3 these become the shapes returned from
 * Supabase; the sample-data module implements the same interfaces, so
 * components will not need to change when the real database arrives.
 */

export type ContentType =
  | 'news'
  | 'article'
  | 'blog'
  | 'opinion'
  | 'analysis'
  | 'guide'
  | 'review'
  | 'interview'
  | 'explainer';

export type ArticleStatus =
  | 'draft'
  | 'submitted'
  | 'in_review'
  | 'changes_requested'
  | 'approved'
  | 'scheduled'
  | 'published'
  | 'rejected'
  | 'archived';

export type UserRole = 'owner' | 'editor' | 'author';

/**
 * Rich-text body stored as an ordered list of typed blocks.
 * This mirrors the Tiptap JSON approach agreed in the plan: structured
 * content in PostgreSQL, rendered through a validated renderer — never raw
 * HTML.
 */
export type ContentBlock =
  | { type: 'heading'; level: 2 | 3; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'quote'; text: string; attribution?: string }
  | { type: 'list'; ordered: boolean; items: string[] }
  | { type: 'code'; language: string; code: string }
  | { type: 'image'; caption?: string };

export interface Author {
  id: string;
  name: string;
  slug: string;
  role: UserRole;
  title: string;
  bio: string;
  expertise: string[];
  joinedAt: string;
  socials: { label: string; url: string }[];
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  /** Tailwind gradient classes used by the image placeholder until real
   *  images arrive with Cloudflare R2 in Phase 8. */
  placeholderGradient: string;
}

export interface Article {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  excerpt: string;
  contentType: ContentType;
  categorySlug: string;
  tagSlugs: string[];
  authorId: string;
  status: ArticleStatus;
  featured: boolean;
  editorsPick: boolean;
  breaking: boolean;
  publishedAt: string;
  updatedAt?: string;
  readingMinutes: number;
  body: ContentBlock[];
  /** News-specific fields (Phase 6 expands these). */
  news?: {
    eventDate?: string;
    location?: string;
    sources: { name: string; url?: string }[];
  };
}

export interface Tag {
  slug: string;
  name: string;
}
