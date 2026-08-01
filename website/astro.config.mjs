import { defineConfig } from 'astro/config';
import svelte from '@astrojs/svelte';

const site = process.env.SITE_URL ?? 'https://example.invalid';
const base = process.env.BASE_PATH ?? '/';

if (!base.startsWith('/') || (!base.endsWith('/') && base !== '/')) {
  throw new Error('BASE_PATH must start and end with /');
}

export default defineConfig({
  site,
  base,
  output: 'static',
  outDir: process.env.OUT_DIR ?? 'dist',
  trailingSlash: 'always',
  integrations: [svelte()],
  server: { port: 4201, strictPort: true },
  preview: { port: 4201, strictPort: true },
  vite: { build: { sourcemap: false } },
});
