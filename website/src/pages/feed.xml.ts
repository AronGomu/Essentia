import type { APIRoute } from 'astro';
import { cardsById, catalog } from '../lib/catalog';

function xml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

export const GET: APIRoute = ({ site }) => {
  const base = import.meta.env.BASE_URL.replace(/^\/+|\/+$/g, '');
  const absolute = (route: string) =>
    new URL([base, route.replace(/^\//, '')].filter(Boolean).join('/'), site)
      .href;
  const items = catalog.updates.slice(0, 50).map((update) => {
    const card = cardsById.get(update.cardId)!;
    return `<item><title>${xml(card.name)}</title><link>${xml(absolute(update.versionRoute))}</link><guid isPermaLink="true">${xml(absolute(update.versionRoute))}</guid><pubDate>${new Date(`${update.modified.slice(0, 10)}T12:00:00Z`).toUTCString()}</pubDate><description>${xml(update.summary)}</description></item>`;
  });
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>Essentia card updates</title><link>${xml(absolute('/updates/'))}</link><description>New and meaningfully updated cards.</description>${items.join('')}</channel></rss>`,
    { headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' } },
  );
};
