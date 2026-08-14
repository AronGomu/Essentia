import { describe, expect, it } from 'vitest';
import type { Catalog } from '../../src/lib/catalog';
import { STATIC_SITEMAP_ROUTES, sitemapRoutes } from '../../src/lib/sitemap';

type SitemapSource = Pick<
  Catalog,
  'sections' | 'cards' | 'cardVersions' | 'releases' | 'docs' | 'posts'
>;

const source = {
  sections: [{ route: '/sections/example/' }],
  cards: [{ route: '/cards/example/' }],
  cardVersions: [{ versionRoute: '/cards/example/versions/alpha/' }],
  releases: [{ route: '/releases/alpha/example/' }],
  docs: [{ route: '/docs/' }, { route: '/docs/context/' }],
  posts: [{ route: '/blog/example/' }],
} as unknown as SitemapSource;

describe('sitemapRoutes', () => {
  it('keeps static and dynamic routes in insertion order', () => {
    expect(sitemapRoutes(source)).toEqual([
      ...STATIC_SITEMAP_ROUTES,
      '/sections/example/',
      '/cards/example/',
      '/cards/example/versions/alpha/',
      '/releases/alpha/example/',
      '/docs/context/',
      '/blog/example/',
    ]);
  });

  it('includes every docs and post route', () => {
    expect(sitemapRoutes(source)).toEqual(
      expect.arrayContaining(['/docs/context/', '/blog/example/']),
    );
  });

  it('includes docs blog and decks landing routes', () => {
    expect(sitemapRoutes(source)).toEqual(
      expect.arrayContaining(['/docs/', '/blog/', '/decks/']),
    );
  });

  it('includes all card section version and release routes', () => {
    expect(sitemapRoutes(source)).toEqual(
      expect.arrayContaining([
        '/sections/example/',
        '/cards/example/',
        '/cards/example/versions/alpha/',
        '/releases/alpha/example/',
      ]),
    );
  });

  it('contains no duplicate routes', () => {
    const routes = sitemapRoutes(source);
    expect(new Set(routes).size).toBe(routes.length);
    expect(routes.filter((route) => route === '/docs/')).toHaveLength(1);
  });
});
