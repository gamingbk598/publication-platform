import { createServerClient } from '@supabase/ssr';
import type { AstroCookies } from 'astro';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Server-side Supabase client bound to the request's cookies.
 *
 * This is the client that honors Row Level Security as the signed-in user.
 * Use it in middleware, pages, and API endpoints. Session tokens live in
 * cookies (chunked automatically by @supabase/ssr), so the browser and
 * server share one session.
 *
 * Returns null when Supabase env vars are not configured yet, so pages can
 * show a friendly setup notice instead of crashing during development.
 */

export function isSupabaseConfigured(): boolean {
  return Boolean(
    import.meta.env.PUBLIC_SUPABASE_URL &&
      import.meta.env.PUBLIC_SUPABASE_ANON_KEY,
  );
}

function parseCookieHeader(header: string | null): { name: string; value: string }[] {
  if (!header) return [];
  const out: { name: string; value: string }[] = [];
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    out.push({
      name: part.slice(0, idx).trim(),
      value: part.slice(idx + 1).trim(),
    });
  }
  return out;
}

export function createSupabaseSsrClient(
  request: Request,
  cookies: AstroCookies,
): SupabaseClient | null {
  const url = import.meta.env.PUBLIC_SUPABASE_URL as string | undefined;
  const anonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY as string | undefined;
  if (!url || !anonKey) return null;

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return parseCookieHeader(request.headers.get('cookie'));
      },
      setAll(cookiesToSet) {
        const secure = new URL(request.url).protocol === 'https:';
        for (const { name, value } of cookiesToSet) {
          try {
            cookies.set(name, value, {
              path: '/',
              sameSite: 'lax',
              secure,
              maxAge: 60 * 60 * 24 * 7,
            });
          } catch {
            // Setting cookies can throw if called from a Server Component
            // render pass; the middleware refresh keeps sessions alive anyway.
          }
        }
      },
    },
  });
}
