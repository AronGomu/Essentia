import { describe, expect, it } from 'vitest';
import { catalog } from '../../src/lib/catalog';

describe('blog corpus', () => {
  it('publishes the introduction article', () => {
    expect(
      catalog.posts.some(
        (post) => post.slug === 'legend-of-alpha-project-introduction',
      ),
    ).toBe(true);
  });

  it('routes every post under /blog/', () => {
    expect(catalog.posts.length).toBeGreaterThan(0);
    expect(catalog.posts.every((post) => post.route.startsWith('/blog/'))).toBe(
      true,
    );
  });
});
