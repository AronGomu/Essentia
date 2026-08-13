import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  loadReadingOrder,
  postGroups,
} from '../../scripts/content/reading-order.mjs';

const dirs: string[] = [];

function fixture(data: unknown): string {
  const dir = mkdtempSync(path.join(tmpdir(), 'reading-order-'));
  dirs.push(dir);
  const file = path.join(dir, 'reading-order.json');
  writeFileSync(file, JSON.stringify(data), 'utf8');
  return file;
}

afterEach(() => {
  for (const dir of dirs.splice(0))
    rmSync(dir, { recursive: true, force: true });
});

const catchAllBlogGroup = { key: 'all', label: 'All posts', slugs: null };

describe('loadReadingOrder', () => {
  it('loads the shipped blog config', async () => {
    const { blog } = await loadReadingOrder();
    expect(blog).toEqual([catchAllBlogGroup]);
  });

  it('rejects a wrong schemaVersion', async () => {
    const file = fixture({
      schemaVersion: 2,
      blog: [catchAllBlogGroup],
    });
    await expect(loadReadingOrder(file)).rejects.toThrow(
      /reading order must use schemaVersion 1/,
    );
  });

  it('rejects two catch-all blog groups', async () => {
    const file = fixture({
      schemaVersion: 1,
      blog: [catchAllBlogGroup, { key: 'all2', label: 'All 2', slugs: null }],
    });
    await expect(loadReadingOrder(file)).rejects.toThrow(
      /exactly one blog group may use slugs: null/,
    );
  });
});

describe('postGroups', () => {
  const posts = [
    { slug: 'c', date: '2026-01-03' },
    { slug: 'b', date: '2026-01-02' },
    { slug: 'a', date: '2026-01-01' },
  ];

  it('assigns unlisted posts to the catch-all', () => {
    const groups = postGroups(
      [{ key: 'all', label: 'All posts', slugs: null }],
      posts,
    );
    expect(groups.length).toBe(1);
    expect(groups[0]?.slugs).toEqual(['c', 'b', 'a']);
  });

  it('honours an explicit slug order', () => {
    const groups = postGroups(
      [
        { key: 'featured', label: 'Featured', slugs: ['b'] },
        { key: 'all', label: 'All posts', slugs: null },
      ],
      posts,
    );
    const featured = groups.find((group) => group.key === 'featured');
    const all = groups.find((group) => group.key === 'all');
    expect(featured?.slugs).toEqual(['b']);
    expect(all?.slugs).toEqual(['c', 'a']);
  });

  it('rejects an unknown slug', () => {
    expect(() =>
      postGroups(
        [
          { key: 'featured', label: 'Featured', slugs: ['ghost'] },
          { key: 'all', label: 'All posts', slugs: null },
        ],
        posts,
      ),
    ).toThrow(/blog group featured: unknown post ghost/);
  });

  it('drops empty groups', () => {
    const groups = postGroups(
      [
        { key: 'featured', label: 'Featured', slugs: ['a', 'b', 'c'] },
        { key: 'all', label: 'All posts', slugs: null },
      ],
      posts,
    );
    expect(groups.map((group) => group.key)).toEqual(['featured']);
  });
});
