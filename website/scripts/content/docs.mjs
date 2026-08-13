import { lstat, readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { headingSlug } from '../../src/lib/markdown.ts';
import { ROOT, fail, slugify } from './shared.mjs';

const MAX_DOC_BYTES = 262_144;

/** `02_burning_abyss` → `Burning Abyss`. */
export function groupLabelFor(directoryName) {
  return directoryName
    .replace(/^\d+[_-]/, '')
    .replace(/[_-]+/g, ' ')
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/** `docs/rules/ZONES.md` → `/docs/rules/zones/`. */
export function docRoute(relativePath, { isLanding = false } = {}) {
  if (isLanding) return '/docs/';
  const segments = relativePath
    .replace(/\.md$/, '')
    .split('/')
    .slice(1)
    .map(slugify);
  return `/docs/${segments.join('/')}/`;
}

const REPO_BLOB = 'https://github.com/AronGomu/YGO-x-MTG/blob/main';

function resolveLinkTarget(target, relativePath) {
  const dir = path.posix.dirname(relativePath);
  return path.posix.join(dir, target);
}

function rootDocPath(relativePath) {
  const segments = relativePath.slice('docs/'.length).split('/');
  return segments.length === 1;
}

function landingPathFor(knownPaths) {
  return [...knownPaths]
    .filter(rootDocPath)
    .sort((a, b) => a.localeCompare(b))[0];
}

/** Rewrites relative `.md` links, keeps anchors, throws through fail() on an unknown target. */
export function rewriteDocLinks(body, relativePath, knownPaths) {
  const landingPath = landingPathFor(knownPaths);
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
      return `[${label}](${docRoute(resolved, { isLanding: resolved === landingPath })}${anchor})`;
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

function placementFor(relative) {
  const segments = relative.slice('docs/'.length).split('/');
  const group = segments.length > 1 ? segments[0] : '';
  return { group, filename: segments.at(-1) };
}

function compareDocPaths(a, b) {
  const left = placementFor(a);
  const right = placementFor(b);
  if (left.group === '' && right.group !== '') return -1;
  if (left.group !== '' && right.group === '') return 1;
  return (
    left.group.localeCompare(right.group) ||
    left.filename.localeCompare(right.filename) ||
    a.localeCompare(b)
  );
}

/**
 * @param {string} [root] repository root to read `docs/` from. Defaults to this
 *   repository; tests point it at a temp tree, exactly as `loadPosts(blogRoot)`
 *   and `loadSectionIntros(directory)` already allow — a fixture written into
 *   the tracked tree survives a SIGKILL or a vitest timeout and then breaks
 *   `npm run content` for everyone until a human deletes it.
 * @returns {Promise<DocEntry[]>} root docs first, then folder and filename order
 */
export async function loadDocs(root = ROOT) {
  const discovered = (await discoverDocPaths(root)).sort(compareDocPaths);
  const knownPaths = new Set(discovered);
  const landingPath = discovered.find(rootDocPath);
  if (!landingPath) fail('docs: no root-level doc to serve /docs/');

  const orderByGroup = new Map();
  const entries = [];
  for (const relative of discovered) {
    const segments = relative.slice('docs/'.length).split('/');
    const group = segments.length > 1 ? segments[0] : '';
    const groupLabel = group ? groupLabelFor(group) : '';
    const order = orderByGroup.get(group) ?? 0;
    orderByGroup.set(group, order + 1);

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
      route: docRoute(relative, { isLanding: relative === landingPath }),
      title,
      group,
      groupLabel,
      order,
      body,
      headings,
    });
  }

  const seenRoutes = new Set();
  for (const entry of entries) {
    if (seenRoutes.has(entry.route)) fail(`duplicate doc route ${entry.route}`);
    seenRoutes.add(entry.route);
  }

  return entries;
}
