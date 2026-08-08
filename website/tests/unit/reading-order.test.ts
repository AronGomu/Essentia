import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  loadReadingOrder,
  postGroups,
} from '../../scripts/content/reading-order.mjs';

// Every fixture directory, not just the most recent one: a test that calls
// `fixture()` more than once used to leak all but the last into /tmp.
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

const validDocsGroup = {
  key: 'overview',
  label: 'Overview',
  files: ['docs/PRESENTATION.md'],
};
const catchAllDocsGroup = {
  key: 'archetypes',
  label: 'Archetypes',
  files: null,
};
const catchAllBlogGroup = { key: 'all', label: 'All posts', slugs: null };

describe('loadReadingOrder', () => {
  it('rejects a doc path that walks out of docs/', async () => {
    // `/^docs\/.*\.md$/` accepted `docs/../../../../etc/passwd.md`. There was
    // no exploit path — `loadDocs` only reads what its own walk found — but the
    // error it produced pointed at the reading order rather than the traversal.
    for (const bad of [
      'docs/../../../../etc/passwd.md',
      'docs/../secrets.md',
      'docs/rules/../../../x.md',
    ]) {
      await expect(
        loadReadingOrder(
          fixture({
            schemaVersion: 1,
            docs: [
              { key: 'overview', label: 'Overview', files: [bad] },
              catchAllDocsGroup,
            ],
            blog: [catchAllBlogGroup],
          }),
        ),
      ).rejects.toThrow(`reading group overview: invalid doc ${bad}`);
    }
  });

  it('still accepts an ordinary nested doc path', async () => {
    // …and the rejection above stays meaningful only while this passes.
    const { docs } = await loadReadingOrder(
      fixture({
        schemaVersion: 1,
        docs: [
          {
            key: 'overview',
            label: 'Overview',
            files: ['docs/rules/ZONES.md', 'docs/01_burning_abyss/RULES.md'],
          },
          catchAllDocsGroup,
        ],
        blog: [catchAllBlogGroup],
      }),
    );
    expect(docs[0]?.files).toEqual([
      'docs/rules/ZONES.md',
      'docs/01_burning_abyss/RULES.md',
    ]);
  });

  it('loads the shipped config', async () => {
    const { docs, blog } = await loadReadingOrder();
    expect(docs.length).toBe(6);
    expect(docs.map((group) => group.key)).toEqual([
      'overview',
      'design',
      'rules',
      'keywords',
      'archetypes',
      'project',
    ]);
    expect(blog.length).toBe(1);
  });

  it('rejects a wrong schemaVersion', async () => {
    const file = fixture({
      schemaVersion: 2,
      docs: [validDocsGroup, catchAllDocsGroup],
      blog: [catchAllBlogGroup],
    });
    await expect(loadReadingOrder(file)).rejects.toThrow(
      /reading order must use schemaVersion 1/,
    );
  });

  it('rejects a duplicate docs key', async () => {
    const file = fixture({
      schemaVersion: 1,
      docs: [
        { key: 'overview', label: 'Overview', files: ['docs/PRESENTATION.md'] },
        { key: 'overview', label: 'Overview 2', files: ['docs/CONTEXT.md'] },
        catchAllDocsGroup,
      ],
      blog: [catchAllBlogGroup],
    });
    await expect(loadReadingOrder(file)).rejects.toThrow(
      /duplicate reading group overview/,
    );
  });

  it('rejects a non-kebab key', async () => {
    const file = fixture({
      schemaVersion: 1,
      docs: [
        {
          key: 'Over_view',
          label: 'Overview',
          files: ['docs/PRESENTATION.md'],
        },
        catchAllDocsGroup,
      ],
      blog: [catchAllBlogGroup],
    });
    await expect(loadReadingOrder(file)).rejects.toThrow(
      /invalid reading group key Over_view/,
    );
  });

  it('rejects an empty label', async () => {
    const file = fixture({
      schemaVersion: 1,
      docs: [
        { key: 'overview', label: '', files: ['docs/PRESENTATION.md'] },
        catchAllDocsGroup,
      ],
      blog: [catchAllBlogGroup],
    });
    await expect(loadReadingOrder(file)).rejects.toThrow(
      /reading group overview: label is required/,
    );
  });

  it('rejects two catch-all docs groups', async () => {
    const file = fixture({
      schemaVersion: 1,
      docs: [
        catchAllDocsGroup,
        { key: 'archetypes2', label: 'Archetypes 2', files: null },
      ],
      blog: [catchAllBlogGroup],
    });
    await expect(loadReadingOrder(file)).rejects.toThrow(
      /exactly one docs group may use files: null/,
    );
  });

  it('rejects zero catch-all docs groups', async () => {
    const file = fixture({
      schemaVersion: 1,
      docs: [validDocsGroup],
      blog: [catchAllBlogGroup],
    });
    await expect(loadReadingOrder(file)).rejects.toThrow(
      /exactly one docs group may use files: null/,
    );
  });

  it('rejects a duplicate file across groups', async () => {
    const file = fixture({
      schemaVersion: 1,
      docs: [
        { key: 'rules', label: 'Rules', files: ['docs/RULES.md'] },
        { key: 'rules2', label: 'Rules 2', files: ['docs/RULES.md'] },
        catchAllDocsGroup,
      ],
      blog: [catchAllBlogGroup],
    });
    await expect(loadReadingOrder(file)).rejects.toThrow(
      /doc docs\/RULES\.md is listed twice/,
    );
  });

  it('rejects two catch-all blog groups', async () => {
    const file = fixture({
      schemaVersion: 1,
      docs: [validDocsGroup, catchAllDocsGroup],
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
    // The catch-all claims nothing extra once every post is already spoken
    // for by explicit groups, so it must not appear as an empty section.
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
