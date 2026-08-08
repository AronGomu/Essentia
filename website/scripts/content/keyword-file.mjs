import { fail } from './shared.mjs';

const ALLOWED_KEYS = new Set([
  'term',
  'category',
  'origin',
  'doc',
  'archetype',
  'preview',
  'reminder',
]);

/**
 * Parse one `docs/keywords/{id}.md` file into its front-matter data and
 * definition body. Mirrors the blog post front-matter dialect exactly.
 *
 * @returns {{ data: Record<string, string>, definition: string }}
 */
export function parseKeywordFile(text, id) {
  const match = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/.exec(text);
  if (!match) fail(`keyword ${id}: missing front matter`);
  const [, rawFrontMatter, rawBody] = match;

  const data = {};
  for (const line of rawFrontMatter.split('\n')) {
    if (!line.trim()) continue;
    const lineMatch = /^([a-zA-Z]+):\s?(.*)$/.exec(line);
    if (!lineMatch)
      fail(`keyword ${id}: malformed front-matter line "${line}"`);
    const [, key, value] = lineMatch;
    if (!ALLOWED_KEYS.has(key))
      fail(`keyword ${id}: unknown front-matter key ${key}`);
    data[key] = value.trim();
  }

  return { data, definition: rawBody.trim() };
}
