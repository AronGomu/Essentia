import { describe, expect, it } from 'vitest';
import { catalog, latestPost } from '../../src/lib/catalog';

describe('latestPost', () => {
  it('returns the newest post', () => {
    expect(latestPost(catalog)).toBe(catalog.posts[0]);
  });

  it('is undefined for an empty list', () => {
    expect(latestPost({ posts: [] })).toBeUndefined();
  });
});
