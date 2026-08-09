import { describe, expect, it } from 'vitest';
import { catalog } from '../../src/lib/catalog';

describe('blog corpus', () => {
  it('publishes the project presentation article', () => {
    expect(
      catalog.posts.some(
        (post) => post.slug === 'essentia-project-presentation',
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
