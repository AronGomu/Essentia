import { lstat, readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { headingSlug } from '../../src/lib/markdown.ts';
import { ROOT, fail, slugify } from './shared.mjs';

const MAX_DOC_BYTES = 262_144;

/** `docs/rules/ZONES.md` → `/docs/rules/zones/`; `docs/PRESENTATION.md` → `/docs/`. */
export function docRoute(relativePath) {
  const withoutExtension = relativePath.replace(/\.md$/, '');
  if (withoutExtension === 'docs/PRESENTATION') return '/docs/';
  const segments = withoutExtension.split('/').slice(1).map(slugify);
  return `/docs/${segments.join('/')}/`;
}

const REPO_BLOB = 'https://github.com/AronGomu/YGO-x-MTG/blob/main';

function resolveLinkTarget(target, relativePath) {
  const dir = path.posix.dirname(relativePath);
  return path.posix.join(dir, target);
}

/** Rewrites relative `.md` links, keeps anchors, throws through fail() on an unknown target. */
export function rewriteDocLinks(body, relativePath, knownPaths) {
  return body.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, label, rawUrl) => {
    const url = rawUrl.trim();
    if (/^(?:https:\/\/|mailto:|#|\/)/i.test(url)) return match;

    const hashIndex = url.indexOf('#');
    const targetPath = hashIndex === -1 ? url : url.slice(0, hashIndex);
    const anchor = hashIndex === -1 ? '' : url.slice(hashIndex);

    const resolved = resolveLinkTarget(targetPath, relativePath);
    if (resolved.startsWith('../'))
      fail(`doc ${relativePath}: link target escapes the repository ${url}`);

    // ADRs stay off the site, so their citations point at the repository —
    // exactly like any target outside `docs/`.
    if (resolved.startsWith('docs/') && !resolved.startsWith('docs/ADR/')) {
      if (!knownPaths.has(resolved))
        fail(`doc ${relativePath}: unpublished link target ${resolved}`);
      return `[${label}](${docRoute(resolved)}${anchor})`;
    }

    return `[${label}](${REPO_BLOB}/${resolved}${anchor})`;
  });
}

async function discoverDocPaths(root) {
  const output = [];
  async function walk(current) {
    for (const entry of await readdir(current, { withFileTypes: true })) {
      const absolute = path.join(current, entry.name);
      const relative = path.relative(root, absolute).split(path.sep).join('/');
      if (relative === 'docs/ADR' || relative.startsWith('docs/ADR/')) continue;
      // Per-keyword ruling files are registry data, not doc pages.
      if (/^docs\/keywords\/[a-z0-9]+(?:-[a-z0-9]+)*\.md$/.test(relative))
        continue;
      const info = await lstat(absolute);
      if (info.isSymbolicLink()) fail(`linked doc path ${relative}`);
      if (entry.isDirectory()) {
        await walk(absolute);
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        const stats = await stat(absolute);
        if (stats.size > MAX_DOC_BYTES) fail(`oversize doc ${relative}`);
        output.push(relative);
      }
    }
  }
  await walk(path.join(root, 'docs'));
  return output;
}

function groupFor(relativePath, archetypeOrder, groups) {
  for (const group of groups) {
    if (group.files) {
      const index = group.files.indexOf(relativePath);
      if (index !== -1) return { group, order: index };
    }
  }
  if (/^docs\/0\d_[^/]+\/[A-Z_]+\.md$/.test(relativePath)) {
    const archetypeGroup = groups.find((g) => g.key === 'archetypes');
    const order = archetypeOrder.indexOf(relativePath);
    return { group: archetypeGroup, order };
  }
  return null;
}

/**
 * @param {object[]} groups the reading-order doc groups
 * @param {string} [root] repository root to read `docs/` from. Defaults to this
 *   repository; tests point it at a temp tree, exactly as `loadPosts(blogRoot)`
 *   and `loadSectionIntros(directory)` already allow — a fixture written into
 *   the tracked tree survives a SIGKILL or a vitest timeout and then breaks
 *   `npm run content` for everyone until a human deletes it.
 * @returns {Promise<DocEntry[]>} sorted by group order, authored order, title
 */
export async function loadDocs(groups, root = ROOT) {
  const discovered = await discoverDocPaths(root);
  const knownPaths = new Set(discovered);

  const archetypeOrder = discovered
    .filter((relative) => /^docs\/0\d_[^/]+\/[A-Z_]+\.md$/.test(relative))
    .sort((a, b) => a.localeCompare(b));

  // A config listing a file that does not exist on disk must fail as loudly
  // as one that omits a real doc — otherwise a typo'd path silently drops
  // the intended entry from its group without ever surfacing an error.
  for (const group of groups) {
    if (!group.files) continue;
    for (const file of group.files)
      if (!knownPaths.has(file))
        fail(
          `reading group ${group.key}: configured doc ${file} does not exist`,
        );
  }

  const entries = [];
  for (const relative of discovered) {
    const placement = groupFor(relative, archetypeOrder, groups);
    if (!placement) fail(`doc ${relative} is not listed in the reading order`);

    const raw = await readFile(path.join(root, relative), 'utf8');
    const lines = raw.split('\n');
    const titleMatch = /^#\s+(.+)$/.exec(lines[0] ?? '');
    if (!titleMatch) fail(`doc ${relative} has no # first heading`);
    const title = titleMatch[1].trim();

    const bodyLines = lines.slice(1);
    while (bodyLines.length && bodyLines[0].trim() === '') bodyLines.shift();
    const bodyRaw = bodyLines.join('\n');

    const headings = [];
    for (const match of bodyRaw.matchAll(/^(#{2,4})\s+(.+)$/gm)) {
      const level = match[1].length;
      const text = match[2].trim();
      headings.push({ id: headingSlug(text), text, level });
    }

    const body = rewriteDocLinks(bodyRaw, relative, knownPaths);

    entries.push({
      id: slugify(relative.replace(/^docs\//, '').replace(/\.md$/, '')),
      path: relative,
      route: docRoute(relative),
      title,
      group: placement.group.key,
      groupLabel: placement.group.label,
      order: placement.order,
      body,
      headings,
    });
  }

  const groupIndex = new Map(groups.map((group, index) => [group.key, index]));
  entries.sort(
    (a, b) =>
      groupIndex.get(a.group) - groupIndex.get(b.group) ||
      a.order - b.order ||
      a.title.localeCompare(b.title),
  );

  const seenRoutes = new Set();
  for (const entry of entries) {
    if (seenRoutes.has(entry.route)) fail(`duplicate doc route ${entry.route}`);
    seenRoutes.add(entry.route);
  }

  return entries;
}
