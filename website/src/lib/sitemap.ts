import type { Catalog } from './catalog';

export const STATIC_SITEMAP_ROUTES: readonly string[] = [
  '/',
  '/updates/',
  '/rules/',
  '/philosophy/',
  '/legal/',
  '/docs/',
  '/blog/',
  '/decks/',
  '/feed.xml',
];

export function sitemapRoutes(
  source: Pick<
    Catalog,
    'sections' | 'cards' | 'cardVersions' | 'releases' | 'docs' | 'posts'
  >,
): string[] {
  return [
    ...new Set([
      ...STATIC_SITEMAP_ROUTES,
      ...source.sections.map((section) => section.route),
      ...source.cards.map((card) => card.route),
      ...source.cardVersions.map((card) => card.versionRoute),
      ...source.releases.map((release) => release.route),
      ...source.docs.map((doc) => doc.route),
      ...source.posts.map((post) => post.route),
    ]),
  ];
}
