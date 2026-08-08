import { formatDate, type CatalogDoc } from './catalog';
import { docsRailGroups } from './docs';

export type ReadingKind = 'docs' | 'blog';

export interface ReadingNavItem {
  route: string;
  title: string;
  meta?: string;
}

export interface ReadingNavGroup {
  key: string;
  label: string;
  items: ReadingNavItem[];
}

/**
 * The slice of the catalog the reading nav reads. Structural, so `catalog`
 * satisfies it and a test can build a two-post fixture without inventing a
 * whole card corpus.
 */
export interface ReadingNavSource {
  docs: CatalogDoc[];
  posts: ReadonlyArray<{
    slug: string;
    route: string;
    title: string;
    date: string;
  }>;
  postGroups: ReadonlyArray<{
    key: string;
    label: string;
    slugs: readonly string[];
  }>;
}

/** `'docs'` / `'blog'` on a reading page, `null` everywhere else. */
export function readingKindFor(
  pathname: string,
  base: string,
): ReadingKind | null {
  const prefix = base.endsWith('/') ? base : `${base}/`;
  if (pathname.startsWith(`${prefix}docs/`)) return 'docs';
  if (pathname.startsWith(`${prefix}blog/`)) return 'blog';
  return null;
}

/**
 * The groups the catalog rail shows on a reading page: the doc groups in
 * catalog order, or the authored blog sections from `reading-order.json`.
 * Empty groups and slugs that resolve to no post are dropped, so the rail
 * never renders a heading with nothing under it or a dead link.
 */
export function readingNavGroups(
  kind: ReadingKind | null,
  source: ReadingNavSource,
): ReadingNavGroup[] {
  if (kind === 'docs') {
    return docsRailGroups(source.docs).map((group) => ({
      key: group.key,
      label: group.label,
      items: group.docs.map((doc) => ({ route: doc.route, title: doc.title })),
    }));
  }

  if (kind === 'blog') {
    const bySlug = new Map(source.posts.map((post) => [post.slug, post]));
    return source.postGroups
      .map((group) => ({
        key: group.key,
        label: group.label,
        items: group.slugs.flatMap((slug) => {
          const post = bySlug.get(slug);
          return post
            ? [
                {
                  route: post.route,
                  title: post.title,
                  meta: formatDate(post.date),
                },
              ]
            : [];
        }),
      }))
      .filter((group) => group.items.length > 0);
  }

  return [];
}
