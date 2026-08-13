import {
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  writeFile,
} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { parseFrontMatter, loadPosts } from '../../scripts/content/blog.mjs';
import { ROOT } from '../../scripts/content/shared.mjs';
import { renderSafeMarkdown } from '../../src/lib/markdown';

/** The repository's own posts — read, never written. */
const BLOG_ROOT = path.join(ROOT, 'blog');

/**
 * Fixtures live in a temp directory, never in the repository's `blog/`. A run
 * killed mid-test (Ctrl-C, CI timeout, OOM) used to strand a fixture there,
 * after which `npm run content` hard-fails and takes dev/check/build/ci with
 * it until someone spots the stray file.
 */
let fixtureRoot: string;

beforeEach(async () => {
  fixtureRoot = await mkdtemp(path.join(os.tmpdir(), 'essentia-blog-'));
});

afterEach(async () => {
  await rm(fixtureRoot, { recursive: true, force: true });
});

async function writeFixturePost(fileName: string, content: string) {
  const file = path.join(fixtureRoot, fileName);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, content, 'utf8');
  return file;
}

async function writeFixtureDirectory(dirName: string) {
  const dir = path.join(fixtureRoot, dirName);
  await mkdir(dir, { recursive: true });
  return dir;
}

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
  it('loads every published post in the repository', async () => {
    // Derived from what is actually committed under blog/, not pinned to a
    // corpus of one: publishing a second post must not turn this red.
    const expected: Array<{ slug: string; date: string }> = [];
    for (const name of await readdir(BLOG_ROOT)) {
      if (!name.endsWith('.md')) continue;
      const raw = await readFile(path.join(BLOG_ROOT, name), 'utf8');
      if (/^draft:\s*true\s*$/m.test(raw)) continue;
      const nameMatch = /^(\d{4}-\d{2}-\d{2})-(.+)\.md$/.exec(name);
      expect(nameMatch, name).not.toBeNull();
      expected.push({ date: nameMatch![1]!, slug: nameMatch![2]! });
    }
    expect(expected.length).toBeGreaterThan(0);

    const posts = await loadPosts();
    expect(
      posts.map((entry) => ({ slug: entry.slug, date: entry.date })),
    ).toEqual(
      expected.sort(
        (a, b) => b.date.localeCompare(a.date) || a.slug.localeCompare(b.slug),
      ),
    );
  });

  it('loads a flat post file', async () => {
    await writeFixturePost(
      '2026-02-02-fixture-one.md',
      '---\ntitle: Fixture One\ndate: 2026-02-02\nauthor: A\nsummary: s\n---\nbody',
    );
    const posts = await loadPosts(fixtureRoot);
    const post = posts.find((entry) => entry.slug === 'fixture-one');
    expect(post).toBeDefined();
    expect(post.route).toBe('/blog/fixture-one/');
    expect(post.title).toBe('Fixture One');
    expect(post.body).toBe('body');
  });

  it('extracts renderer-matching H2-H4 metadata', async () => {
    const body = [
      '## Opening',
      '',
      '### Details',
      '',
      '#### Deep note',
      '',
      '## Open/locked lifecycle (v2)',
    ].join('\n');
    await writeFixturePost(
      '2026-02-02-heading-fixture.md',
      `---\ntitle: Heading Fixture\ndate: 2026-02-02\nauthor: A\nsummary: s\n---\n${body}`,
    );

    const [post] = await loadPosts(fixtureRoot);
    expect(post.headings).toEqual([
      { id: 'opening', text: 'Opening', level: 2 },
      { id: 'details', text: 'Details', level: 3 },
      { id: 'deep-note', text: 'Deep note', level: 4 },
      {
        id: 'open-locked-lifecycle-v2',
        text: 'Open/locked lifecycle (v2)',
        level: 2,
      },
    ]);

    const rendered = renderSafeMarkdown(post.body);
    for (const heading of post.headings) {
      expect(rendered).toContain(`id="${heading.id}"`);
    }
  });

  it('ignores directories inside blog/', async () => {
    await writeFixtureDirectory('images');
    await writeFixturePost(
      '2026-02-02-fixture-one.md',
      '---\ntitle: Fixture One\ndate: 2026-02-02\nauthor: A\nsummary: s\n---\nbody',
    );
    const posts = await loadPosts(fixtureRoot);
    expect(posts.some((post) => post.slug === 'images')).toBe(false);
    // Only the one post written above: the asset directory is skipped, not
    // counted, and nothing else is in this root.
    expect(posts.map((post) => post.slug)).toEqual(['fixture-one']);
  });

  it('rejects a directory named like a post', async () => {
    // The pre-move layout: blog/2026-02-02-old-format/index.md. Skipping it
    // silently would drop the post from /blog/ with the build still green.
    await writeFixtureDirectory('2026-02-02-old-format');
    await expect(loadPosts(fixtureRoot)).rejects.toThrow(
      'content: post 2026-02-02-old-format: a post is a yyyy-mm-dd-slug.md file, not a directory',
    );
  });

  it('rejects a non-markdown file', async () => {
    await writeFixturePost('2026-02-02-x.txt', 'not markdown');
    await expect(loadPosts(fixtureRoot)).rejects.toThrow(
      'content: post 2026-02-02-x.txt: expected a .md file',
    );
  });

  it('rejects a filename that is not date-slug', async () => {
    await writeFixturePost(
      'notes.md',
      '---\ntitle: Notes\ndate: 2026-02-02\nauthor: A\nsummary: s\n---\nbody',
    );
    await expect(loadPosts(fixtureRoot)).rejects.toThrow(
      'content: post notes.md: filename must match yyyy-mm-dd-slug.md',
    );
  });

  it('rejects a date that disagrees with the name', async () => {
    await writeFixturePost(
      '2026-02-02-x.md',
      '---\ntitle: X\ndate: 2026-02-03\nauthor: A\nsummary: s\n---\nbody',
    );
    await expect(loadPosts(fixtureRoot)).rejects.toThrow(
      'does not match filename prefix 2026-02-02',
    );
  });

  it('excludes drafts', async () => {
    await writeFixturePost(
      '2026-08-02-a-draft-post.md',
      '---\ntitle: Draft\ndate: 2026-08-02\nauthor: A\nsummary: s\ndraft: true\n---\nbody',
    );
    const posts = await loadPosts(fixtureRoot);
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
    const posts = await loadPosts(fixtureRoot);
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
    const posts = await loadPosts(fixtureRoot);
    const post = posts.find((entry) => entry.slug === 'tagged-post');
    expect(post.tags).toEqual(['release', 'alpha']);
  });

  it('returns [] with no blog directory', async () => {
    // A real ENOENT from a root that does not exist, rather than a mocked
    // node:fs/promises: same branch, no module-registry surgery.
    expect(await loadPosts(path.join(fixtureRoot, 'absent'))).toEqual([]);
  });
});
