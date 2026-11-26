// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import cloudflare from '@astrojs/cloudflare';
import tailwindcss from '@tailwindcss/vite';

// Cloudflare recommends Workers for new Astro deployments.
// `output: 'server'` runs every page through the Worker; individual public
// pages will be marked `prerender` later (Phase 7) where static is better.
export default defineConfig({
  output: 'server',
  // Updated to the real workers.dev URL once the first deploy is done.
  site: 'https://publication-platform.example.workers.dev',
  adapter: cloudflare({
    imageService: 'passthrough',
  }),
  integrations: [react()],
  vite: {
    plugins: [tailwindcss()],
  },
});
