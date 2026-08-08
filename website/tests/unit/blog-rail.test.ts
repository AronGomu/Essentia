import { describe, expect, it } from 'vitest';
import { blogRailItems } from '../../src/lib/blog-rail';

const posts = [
  {
    slug: 'a',
    route: '/blog/a/',
    title: 'Post A',
    date: '2026-01-01',
  },
  {
    slug: 'b',
    route: '/blog/b/',
    title: 'Post B',
    date: '2026-03-01',
  },
  {
    slug: 'c',
    route: '/blog/c/',
    title: 'Post C',
    date: '2026-02-01',
  },
];

describe('blogRailItems', () => {
  it('builds the rail with every post newest first', () => {
    const items = blogRailItems(posts, null);
    expect(items.map((item) => item.slug)).toEqual(['b', 'c', 'a']);
    for (const item of items) {
      expect(Object.keys(item).sort()).toEqual(
        ['current', 'date', 'route', 'slug', 'title'].sort(),
      );
    }
  });

  it('marks the current post', () => {
    const items = blogRailItems(posts, '/blog/b/');
    const current = items.filter((item) => item.current);
    expect(current).toHaveLength(1);
    expect(current[0]?.route).toBe('/blog/b/');
  });

  it('marks the index when the route is null', () => {
    const items = blogRailItems(posts, null);
    expect(items.some((item) => item.current)).toBe(false);
  });
});
