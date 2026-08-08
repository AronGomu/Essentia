import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { CONTENT, fail } from './shared.mjs';

export const READING_ORDER_FILE = path.join(CONTENT, 'reading-order.json');
const KEY_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SLUG_RE = /^[a-z0-9-]+$/;

function validateGroups(groups, { itemsField, itemRe, itemLabel }) {
  const seenKeys = new Set();
  const seenItems = new Set();
  let catchAllCount = 0;

  for (const group of groups) {
    const { key, label } = group;
    if (!KEY_RE.test(key)) fail(`invalid reading group key ${key}`);
    if (seenKeys.has(key)) fail(`duplicate reading group ${key}`);
    seenKeys.add(key);
    if (typeof label !== 'string' || label.trim() === '')
      fail(`reading group ${key}: label is required`);

    const items = group[itemsField];
    if (items === null) {
      catchAllCount += 1;
      continue;
    }
    if (!Array.isArray(items) || items.length === 0)
      fail(
        `reading group ${key}: ${itemsField} must be null or a non-empty array`,
      );
    for (const item of items) {
      if (typeof item !== 'string' || !itemRe.test(item))
        fail(`reading group ${key}: invalid ${itemLabel} ${item}`);
      if (seenItems.has(item))
        fail(`${itemLabel} ${item} is listed twice in the reading order`);
      seenItems.add(item);
    }
  }

  if (catchAllCount !== 1)
    fail(
      `exactly one ${itemLabel === 'doc' ? 'docs' : 'blog'} group may use ${itemsField}: null`,
    );
}

// `.*` also accepted `docs/../../../../etc/passwd.md`. There is no exploit —
// `loadDocs` only reads paths that came out of its own `docs/` walk — but the
// error a traversing path produces ("not listed in the reading order") points
// at the wrong thing entirely. Reject the segment outright, like `SLUG_RE`.
const DOC_FILE_RE = /^(?!.*(?:^|\/)\.\.(?:\/|$))docs\/[^\\]*\.md$/;

/**
 * Parses and validates `website/content/reading-order.json`, failing the
 * build loudly on any malformed shape rather than letting a page silently
 * drop out of the docs or blog rail.
 *
 * @param {string} [file]
 * @returns {Promise<{ docs: Array<{key:string,label:string,files:string[]|null}>, blog: Array<{key:string,label:string,slugs:string[]|null}> }>}
 */
export async function loadReadingOrder(file = READING_ORDER_FILE) {
  const raw = await readFile(file, 'utf8');
  const data = JSON.parse(raw);

  if (data.schemaVersion !== 1) fail('reading order must use schemaVersion 1');
  if (!Array.isArray(data.docs) || !Array.isArray(data.blog))
    fail('invalid reading order');

  validateGroups(data.docs, {
    itemsField: 'files',
    itemRe: DOC_FILE_RE,
    itemLabel: 'doc',
  });
  validateGroups(data.blog, {
    itemsField: 'slugs',
    itemRe: SLUG_RE,
    itemLabel: 'slug',
  });

  return { docs: data.docs, blog: data.blog };
}

/** Blog groups filled from loaded posts; explicit slugs first, catch-all takes the rest. */
export function postGroups(groups, posts) {
  const bySlug = new Map(posts.map((post) => [post.slug, post]));
  const claimed = new Set();
  const output = [];
  for (const group of groups) {
    if (group.slugs === null) continue;
    for (const slug of group.slugs)
      if (!bySlug.has(slug))
        fail(`blog group ${group.key}: unknown post ${slug}`);
    group.slugs.forEach((slug) => claimed.add(slug));
  }
  for (const group of groups) {
    const slugs =
      group.slugs === null
        ? posts
            .filter((post) => !claimed.has(post.slug))
            .map((post) => post.slug)
        : group.slugs;
    if (slugs.length)
      output.push({ key: group.key, label: group.label, slugs });
  }
  return output;
}
