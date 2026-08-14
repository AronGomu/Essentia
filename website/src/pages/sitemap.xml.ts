import type { APIRoute } from 'astro';
import { catalog } from '../lib/catalog';
import { sitemapRoutes } from '../lib/sitemap';
export const GET: APIRoute = ({ site }) => {
  const routes = sitemapRoutes(catalog);
  const base = import.meta.env.BASE_URL.replace(/^\/+|\/+$/g, '');
  const body = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${routes.map((route) => `<url><loc>${new URL([base, route.replace(/^\//, '')].filter(Boolean).join('/'), site)}</loc></url>`).join('')}</urlset>`;
  return new Response(body, { headers: { 'Content-Type': 'application/xml' } });
};
