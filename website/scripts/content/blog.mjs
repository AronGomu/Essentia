import { lstat, readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { CONTENT, fail, validDate } from './shared.mjs';

const BLOG_ROOT = path.join(CONTENT, 'blog');
const MAX_POST_BYTES = 262_144;
const DIR_RE = /^(\d{4}-\d{2}-\d{2})-([a-z0-9-]+)$/;

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

/** @returns {Promise<Post[]>} non-draft posts, newest date first, then slug */
export async function loadPosts() {
  let entries;
  try {
    entries = await readdir(BLOG_ROOT, { withFileTypes: true });
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }

  const posts = [];
  const seenSlugs = new Set();

  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    const entryPath = path.join(BLOG_ROOT, entry.name);
    const entryInfo = await lstat(entryPath);
    if (entryInfo.isSymbolicLink())
      fail(`post ${entry.name}: symlinks are not allowed`);
    if (!entry.isDirectory()) fail(`post ${entry.name}: expected a directory`);

    const dirMatch = DIR_RE.exec(entry.name);
    if (!dirMatch)
      fail(`post ${entry.name}: directory name must match yyyy-mm-dd-slug`);
    const [, datePrefix, slug] = dirMatch;

    const indexPath = path.join(entryPath, 'index.md');
    const indexInfo = await lstat(indexPath);
    if (indexInfo.isSymbolicLink())
      fail(`post ${slug}: symlinks are not allowed`);
    if (!indexInfo.isFile()) fail(`post ${slug}: index.md must be a file`);
    if (indexInfo.size > MAX_POST_BYTES)
      fail(`post ${slug}: index.md exceeds ${MAX_POST_BYTES} bytes`);

    const raw = await readFile(indexPath, 'utf8');
    const { data, body } = parseFrontMatter(raw, slug);

    for (const key of ['title', 'date', 'author', 'summary']) {
      if (!data[key]) fail(`post ${slug}: missing required key ${key}`);
    }
    if (!validDate(data.date)) fail(`post ${slug}: date must be YYYY-MM-DD`);
    if (data.date !== datePrefix)
      fail(
        `post ${slug}: date ${data.date} does not match directory prefix ${datePrefix}`,
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
