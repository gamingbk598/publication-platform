import type { MiddlewareResponseHandler } from 'astro';

/**
 * Global middleware.
 *
 * Phase 3 will use this to protect all /studio routes (session check,
 * redirect unauthenticated visitors to /studio/login) and to handle
 * security headers. For now it passes every request through unchanged.
 */
export const onRequest: MiddlewareResponseHandler = (context, next) => {
  return next();
};
