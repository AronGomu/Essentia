import { lstat, readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { headingSlug } from '../../src/lib/markdown.ts';
import { ROOT, fail, slugify } from './shared.mjs';

const DOCS_ROOT = path.join(ROOT, 'docs');
const MAX_DOC_BYTES = 262_144;

export const DOC_GROUPS = [
  {
    key: 'overview',
    label: 'Overview',
    files: ['docs/PRESENTATION.md', 'docs/CONTEXT.md', 'docs/GLOSSARY.md'],
  },
  {
    key: 'design',
    label: 'Design',
    files: [
      'docs/DESIGN.md',
      'docs/design/CONVERSION.md',
      'docs/design/BALANCE.md',
      'docs/design/FRAMES.md',
    ],
  },
  {
    key: 'rules',
    label: 'Rules',
    files: [
      'docs/RULES.md',
      'docs/rules/DECK_BUILDING.md',
      'docs/rules/CARD_TYPES.md',
      'docs/rules/ZONES.md',
      'docs/rules/SUMMONING.md',
      'docs/rules/TEMPLATING.md',
      'docs/rules/DECKLISTS_ALPHA_0.1.md',
    ],
  },
  {
    key: 'keywords',
    label: 'Keywords',
    files: [
      'docs/KEYWORDS.md',
      'docs/keywords/ACTIONS.md',
      'docs/keywords/EVENTS.md',
      'docs/keywords/ABILITIES.md',
      'docs/keywords/COSTS_AND_PROCEDURES.md',
    ],
  },
  { key: 'archetypes', label: 'Archetypes', files: null },
  {
    key: 'project',
    label: 'Project',
    files: ['docs/RELEASES.md', 'docs/SET_PROMOTIONS.md', 'docs/MSE.md'],
  },
];

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

async function discoverDocPaths() {
  const output = [];
  async function walk(current) {
    for (const entry of await readdir(current, { withFileTypes: true })) {
      const absolute = path.join(current, entry.name);
      const relative = path.relative(ROOT, absolute).split(path.sep).join('/');
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
  await walk(DOCS_ROOT);
  return output;
}

function groupFor(relativePath, archetypeOrder) {
  for (const group of DOC_GROUPS) {
    if (group.files) {
      const index = group.files.indexOf(relativePath);
      if (index !== -1) return { group, order: index };
    }
  }
  if (/^docs\/0\d_[^/]+\/[A-Z_]+\.md$/.test(relativePath)) {
    const archetypeGroup = DOC_GROUPS.find((g) => g.key === 'archetypes');
    const order = archetypeOrder.indexOf(relativePath);
    return { group: archetypeGroup, order };
  }
  return null;
}

/** @returns {Promise<DocEntry[]>} sorted by group order then title */
export async function loadDocs() {
  const discovered = await discoverDocPaths();
  const knownPaths = new Set(discovered);

  const archetypeOrder = discovered
    .filter((relative) => /^docs\/0\d_[^/]+\/[A-Z_]+\.md$/.test(relative))
    .sort((a, b) => a.localeCompare(b));

  const entries = [];
  for (const relative of discovered) {
    const placement = groupFor(relative, archetypeOrder);
    if (!placement) fail(`doc ${relative} is not listed in DOC_GROUPS`);

    const raw = await readFile(path.join(ROOT, relative), 'utf8');
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

  const groupIndex = new Map(
    DOC_GROUPS.map((group, index) => [group.key, index]),
  );
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
