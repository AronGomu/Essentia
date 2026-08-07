import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { parseFrontMatter, loadPosts } from '../../scripts/content/blog.mjs';
import { CONTENT } from '../../scripts/content/shared.mjs';

const BLOG_ROOT = path.join(CONTENT, 'blog');

async function writeFixturePost(dirName: string, content: string) {
  const dir = path.join(BLOG_ROOT, dirName);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, 'index.md'), content, 'utf8');
  return dir;
}

const FIXTURE_DIRS: string[] = [];

afterEach(async () => {
  let dir: string | undefined;
  while ((dir = FIXTURE_DIRS.pop())) {
    await rm(dir, { recursive: true, force: true });
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

  it('excludes drafts', async () => {
    const dir = await writeFixturePost(
      '2026-08-02-a-draft-post',
      '---\ntitle: Draft\ndate: 2026-08-02\nauthor: A\nsummary: s\ndraft: true\n---\nbody',
    );
    FIXTURE_DIRS.push(dir);
    const posts = await loadPosts();
    expect(posts.some((post) => post.slug === 'a-draft-post')).toBe(false);
  });

  it('sorts newest first', async () => {
    const dirA = await writeFixturePost(
      '2026-08-03-post-a',
      '---\ntitle: Post A\ndate: 2026-08-03\nauthor: A\nsummary: s\n---\nbody',
    );
    const dirB = await writeFixturePost(
      '2026-08-04-post-b',
      '---\ntitle: Post B\ndate: 2026-08-04\nauthor: A\nsummary: s\n---\nbody',
    );
    FIXTURE_DIRS.push(dirA, dirB);
    const posts = await loadPosts();
    expect(posts[0].date > posts[1].date).toBe(true);
  });

  it('splits tags', async () => {
    const dir = await writeFixturePost(
      '2026-08-05-tagged-post',
      '---\ntitle: Tagged\ndate: 2026-08-05\nauthor: A\nsummary: s\ntags: release, alpha\n---\nbody',
    );
    FIXTURE_DIRS.push(dir);
    const posts = await loadPosts();
    const post = posts.find((p) => p.slug === 'tagged-post');
    expect(post.tags).toEqual(['release', 'alpha']);
  });
});
