import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { parseFrontMatter, loadPosts } from '../../scripts/content/blog.mjs';
import { ROOT } from '../../scripts/content/shared.mjs';

const BLOG_ROOT = path.join(ROOT, 'blog');

const FIXTURE_PATHS: string[] = [];

async function writeFixturePost(fileName: string, content: string) {
  const file = path.join(BLOG_ROOT, fileName);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, content, 'utf8');
  FIXTURE_PATHS.push(file);
  return file;
}

async function writeFixtureDirectory(dirName: string) {
  const dir = path.join(BLOG_ROOT, dirName);
  await mkdir(dir, { recursive: true });
  FIXTURE_PATHS.push(dir);
  return dir;
}

afterEach(async () => {
  let fixture: string | undefined;
  while ((fixture = FIXTURE_PATHS.pop())) {
    await rm(fixture, { recursive: true, force: true });
  }
});

describe('parseFrontMatter', () => {
  it('parses front matter and body', () => {
    expect(
      parseFrontMatter('---\ntitle: A\ndate: 2026-08-01\n---\nbody text', 'x'),
    ).toEqual({
      data: { title: 'A', date: '2026-08-01' },
      body: 'body text',
    });
  });

  it('rejects a missing front-matter block', () => {
    expect(() => parseFrontMatter('no front matter', 'src')).toThrow(
      'post src: missing front matter',
    );
  });

  it('rejects an unknown key', () => {
    expect(() =>
      parseFrontMatter(
        '---\ntitle: A\ndate: 2026-08-01\nhero: x.png\n---\nbody',
        'src',
      ),
    ).toThrow('unknown front-matter key hero');
  });
});

describe('loadPosts', () => {
  it('loads the migrated post', async () => {
    const posts = await loadPosts();
    expect(posts).toHaveLength(1);
    expect(posts[0].slug).toBe('legend-of-alpha-project-introduction');
    expect(posts[0].date).toBe('2026-08-01');
  });

  it('loads a flat post file', async () => {
    await writeFixturePost(
      '2026-02-02-fixture-one.md',
      '---\ntitle: Fixture One\ndate: 2026-02-02\nauthor: A\nsummary: s\n---\nbody',
    );
    const posts = await loadPosts();
    const post = posts.find((entry) => entry.slug === 'fixture-one');
    expect(post).toBeDefined();
    expect(post.route).toBe('/blog/fixture-one/');
    expect(post.title).toBe('Fixture One');
    expect(post.body).toBe('body');
  });

  it('ignores directories inside blog/', async () => {
    await writeFixtureDirectory('images');
    const posts = await loadPosts();
    expect(posts.some((post) => post.slug === 'images')).toBe(false);
    expect(posts).toHaveLength(1);
  });

  it('rejects a directory named like a post', async () => {
    // The pre-move layout: blog/2026-02-02-old-format/index.md. Skipping it
    // silently would drop the post from /blog/ with the build still green.
    await writeFixtureDirectory('2026-02-02-old-format');
    await expect(loadPosts()).rejects.toThrow(
      'content: post 2026-02-02-old-format: a post is a yyyy-mm-dd-slug.md file, not a directory',
    );
  });

  it('rejects a non-markdown file', async () => {
    await writeFixturePost('2026-02-02-x.txt', 'not markdown');
    await expect(loadPosts()).rejects.toThrow(
      'content: post 2026-02-02-x.txt: expected a .md file',
    );
  });

  it('rejects a filename that is not date-slug', async () => {
    await writeFixturePost(
      'notes.md',
      '---\ntitle: Notes\ndate: 2026-02-02\nauthor: A\nsummary: s\n---\nbody',
    );
    await expect(loadPosts()).rejects.toThrow(
      'content: post notes.md: filename must match yyyy-mm-dd-slug.md',
    );
  });

  it('rejects a date that disagrees with the name', async () => {
    await writeFixturePost(
      '2026-02-02-x.md',
      '---\ntitle: X\ndate: 2026-02-03\nauthor: A\nsummary: s\n---\nbody',
    );
    await expect(loadPosts()).rejects.toThrow(
      'does not match filename prefix 2026-02-02',
    );
  });

  it('excludes drafts', async () => {
    await writeFixturePost(
      '2026-08-02-a-draft-post.md',
      '---\ntitle: Draft\ndate: 2026-08-02\nauthor: A\nsummary: s\ndraft: true\n---\nbody',
    );
    const posts = await loadPosts();
    expect(posts.some((post) => post.slug === 'a-draft-post')).toBe(false);
  });

  it('sorts newest first', async () => {
    await writeFixturePost(
      '2026-02-02-post-a.md',
      '---\ntitle: Post A\ndate: 2026-02-02\nauthor: A\nsummary: s\n---\nbody',
    );
    await writeFixturePost(
      '2026-03-03-post-b.md',
      '---\ntitle: Post B\ndate: 2026-03-03\nauthor: A\nsummary: s\n---\nbody',
    );
    const posts = await loadPosts();
    const dates = posts.map((post) => post.date);
    expect(dates.indexOf('2026-03-03')).toBeLessThan(
      dates.indexOf('2026-02-02'),
    );
  });

  it('splits tags', async () => {
    await writeFixturePost(
      '2026-08-05-tagged-post.md',
      '---\ntitle: Tagged\ndate: 2026-08-05\nauthor: A\nsummary: s\ntags: release, alpha\n---\nbody',
    );
    const posts = await loadPosts();
    const post = posts.find((entry) => entry.slug === 'tagged-post');
    expect(post.tags).toEqual(['release', 'alpha']);
  });

  it('returns [] with no blog directory', async () => {
    vi.resetModules();
    vi.doMock('node:fs/promises', async (importOriginal) => {
      const actual = await importOriginal<typeof import('node:fs/promises')>();
      return {
        ...actual,
        default: actual,
        readdir: async () => {
          const error = new Error('ENOENT') as NodeJS.ErrnoException;
          error.code = 'ENOENT';
          throw error;
        },
      };
    });
    try {
      const isolated = await import('../../scripts/content/blog.mjs');
      expect(await isolated.loadPosts()).toEqual([]);
    } finally {
      vi.doUnmock('node:fs/promises');
      vi.resetModules();
    }
  });
});
