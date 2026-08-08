import { lstat, readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { ROOT, fail, validDate } from './shared.mjs';

const BLOG_ROOT = path.join(ROOT, 'blog');
const MAX_POST_BYTES = 262_144;
const FILE_RE = /^(\d{4}-\d{2}-\d{2})-([a-z0-9-]+)\.md$/;
/**
 * A directory named like a post — `yyyy-mm-dd-slug`, the shape every post had
 * before they became flat files. Silently skipping one would drop a real post
 * from /blog/ with the build still exiting 0, so it is an error. Directories
 * that do not look like a post (`images/`, `art/`) stay reserved for assets and
 * are skipped as before.
 */
const DIRECTORY_POST_RE = /^\d{4}-\d{2}-\d{2}-[a-z0-9-]+$/;

export const ALLOWED_POST_KEYS = new Set([
  'title',
  'date',
  'author',
  'summary',
  'tags',
  'draft',
]);

/** @returns {{ data: Record<string,string>, body: string }} */
export function parseFrontMatter(text, source) {
  const match = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/.exec(text);
  if (!match) fail(`post ${source}: missing front matter`);
  const [, rawFrontMatter, rawBody] = match;

  const data = {};
  for (const line of rawFrontMatter.split('\n')) {
    if (!line.trim()) continue;
    const lineMatch = /^([a-zA-Z]+):\s?(.*)$/.exec(line);
    if (!lineMatch)
      fail(`post ${source}: malformed front-matter line "${line}"`);
    const [, key, value] = lineMatch;
    if (!ALLOWED_POST_KEYS.has(key))
      fail(`post ${source}: unknown front-matter key ${key}`);
    data[key] = value.trim();
  }

  return { data, body: rawBody.trim() };
}

/**
 * @param {string} [blogRoot] directory to read posts from; defaults to the
 *   repository's own `blog/`. Tests point it at a temp directory so fixtures
 *   never land in the working tree, where a leftover one breaks every build.
 * @returns {Promise<Post[]>} non-draft posts, newest date first, then slug
 */
export async function loadPosts(blogRoot = BLOG_ROOT) {
  let entries;
  try {
    entries = await readdir(blogRoot, { withFileTypes: true });
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }

  const posts = [];
  const seenSlugs = new Set();

  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    const entryPath = path.join(blogRoot, entry.name);
    const entryInfo = await lstat(entryPath);
    if (entryInfo.isSymbolicLink())
      fail(`post ${entry.name}: symlinks are not allowed`);
    // Directories under blog/ are reserved for per-post assets, not posts.
    if (entryInfo.isDirectory()) {
      if (DIRECTORY_POST_RE.test(entry.name))
        fail(
          `post ${entry.name}: a post is a yyyy-mm-dd-slug.md file, not a directory`,
        );
      continue;
    }
    if (!entry.name.endsWith('.md'))
      fail(`post ${entry.name}: expected a .md file`);

    const fileMatch = FILE_RE.exec(entry.name);
    if (!fileMatch)
      fail(`post ${entry.name}: filename must match yyyy-mm-dd-slug.md`);
    const [, datePrefix, slug] = fileMatch;

    if (!entryInfo.isFile()) fail(`post ${slug}: expected a file`);
    if (entryInfo.size > MAX_POST_BYTES)
      fail(`post ${slug}: file exceeds ${MAX_POST_BYTES} bytes`);

    const raw = await readFile(entryPath, 'utf8');
    const { data, body } = parseFrontMatter(raw, slug);

    for (const key of ['title', 'date', 'author', 'summary']) {
      if (!data[key]) fail(`post ${slug}: missing required key ${key}`);
    }
    if (!validDate(data.date)) fail(`post ${slug}: date must be YYYY-MM-DD`);
    if (data.date !== datePrefix)
      fail(
        `post ${slug}: date ${data.date} does not match filename prefix ${datePrefix}`,
      );
    if (data.summary.length > 240)
      fail(`post ${slug}: summary exceeds 240 characters`);
    if (
      data.draft !== undefined &&
      data.draft !== 'true' &&
      data.draft !== 'false'
    )
      fail(`post ${slug}: draft must be true or false`);
    if (/<\/?[A-Za-z][^>]*>/.test(body))
      fail(`post ${slug}: raw HTML is not allowed`);

    if (seenSlugs.has(slug)) fail(`post ${slug}: duplicate slug`);
    seenSlugs.add(slug);

    if (data.draft === 'true') continue;

    posts.push({
      slug,
      route: `/blog/${slug}/`,
      title: data.title,
      date: data.date,
      author: data.author,
      summary: data.summary,
      tags: data.tags
        ? data.tags
            .split(',')
            .map((tag) => tag.trim())
            .filter(Boolean)
        : [],
      body,
    });
  }

  posts.sort(
    (a, b) => b.date.localeCompare(a.date) || a.slug.localeCompare(b.slug),
  );
  return posts;
}
