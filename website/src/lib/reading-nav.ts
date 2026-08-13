import { formatDateNumeric, type CatalogDoc } from './catalog';
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
 * The groups the catalog rail shows on a reading page: doc groups in catalog
 * order, or one flat newest-first blog list. Empty groups are dropped.
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
    if (source.posts.length === 0) return [];
    return [
      {
        key: 'posts',
        label: '',
        items: source.posts.map((post) => ({
          route: post.route,
          title: post.title,
          meta: formatDateNumeric(post.date),
        })),
      },
    ];
  }

  return [];
}
