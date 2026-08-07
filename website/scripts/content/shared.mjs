import { createHash } from 'node:crypto';
import { lstat, readdir, realpath, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const WEBSITE = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
);
export const ROOT = path.resolve(WEBSITE, '..');
export const CARDS_ROOT = path.join(ROOT, 'cards_mse');
export const CONTENT = path.join(WEBSITE, 'content');
export const GENERATED_PUBLIC = path.join(WEBSITE, 'public', 'generated');
export const GENERATED_SOURCE = path.join(WEBSITE, 'src', 'generated');

export const LIMITS = {
  set: 2_097_152,
  card: 524_288,
  image: 67_108_864,
  cards: 500,
  files: 20_000,
};

export const PUBLIC_STAGES = [
  {
    directory: '01_alpha',
    metadata: 'alpha',
    label: 'Alpha',
    marker: 'Alpha',
    versionPrefix: 'Alpha',
    rank: 1,
  },
  {
    directory: '02_beta',
    metadata: 'beta',
    label: 'Beta',
    marker: 'Beta',
    versionPrefix: 'Beta',
    rank: 2,
  },
  {
    directory: '03_release',
    metadata: 'release',
    label: 'Release',
    marker: 'Release',
    versionPrefix: 'Release',
    rank: 3,
  },
];

export const SET_ID_RE = /^[A-Z]{2,8}-\d{4}$/;
export const VERSION_RE = /^(Alpha|Beta|Release)_\d+\.\d+(?:\.\d+)?$/;
export const PACKAGE_STATUSES = new Set(['open', 'locked']);

export function fail(message) {
  throw new Error(`content: ${message}`);
}

/**
 * The catalog orders packages by stage rank, and `latestRelease` is the first
 * of them — so the NEW badge follows the most advanced stage. That is only the
 * newest release if stage order and release date agree, which is how the
 * lifecycle is defined: a stage has one date, and every package inside it
 * carries that date. This asserts the definition instead of trusting it, so a
 * future package that violates it fails the build rather than silently
 * mislabelling cards.
 *
 * @param {Array<{ id: string, stage: string, stageRank: number, releasedOn: string }>} packages
 * @returns {string[]} one line per violation, empty when the invariant holds
 */
export function stageDateIssues(packages) {
  const issues = [];
  const dateByStage = new Map();

  for (const item of packages) {
    const seen = dateByStage.get(item.stage);
    if (seen && seen.releasedOn !== item.releasedOn)
      issues.push(
        `stage ${item.stage} has two release dates: ${seen.id} on ${seen.releasedOn}, ${item.id} on ${item.releasedOn}`,
      );
    else if (!seen) dateByStage.set(item.stage, item);
  }

  const stages = [...dateByStage.values()].sort(
    (a, b) => a.stageRank - b.stageRank,
  );
  for (let index = 1; index < stages.length; index += 1) {
    const previous = stages[index - 1];
    const current = stages[index];
    if (current.releasedOn < previous.releasedOn)
      issues.push(
        `stage ${current.stage} (${current.releasedOn}) is dated before the earlier stage ${previous.stage} (${previous.releasedOn})`,
      );
  }

  return issues;
}

export function sha(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

export function stripMarkup(value) {
  return value
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function packageFolder(setId, version) {
  return `${setId}-${version}`;
}

export function renderName(name) {
  return `${name
    .replace(/:/g, ' -')
    .replace(/"/g, "'")
    .replace(/\//g, ' - ')
    .replace(/[<>|?*]/g, '')
    .replace(/[. ]+$/g, '')}.png`;
}

export function validDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T12:00:00Z`);
  return (
    !Number.isNaN(parsed.valueOf()) &&
    parsed.toISOString().slice(0, 10) === value
  );
}

export function validTimestamp(value) {
  return /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(value);
}

export function sectionRoute(section) {
  return section.kind === 'archetype'
    ? `/archetypes/${section.slug}/`
    : `/sections/non-archetype/${section.slug}/`;
}

export function normalizedFields(fields) {
  return `${[...fields]
    .filter(
      ([key]) => !['notes', 'time_created', 'time_modified'].includes(key),
    )
    .sort(([a], [b]) => a.localeCompare(b))
    .map(
      ([key, value]) =>
        `${key}:${value
          .split('\n')
          .map((line) => line.trimEnd())
          .join('\n')
          .trim()}`,
    )
    .join('\n')}\n`;
}

export async function safeFile(root, relative, limit) {
  if (
    !relative ||
    path.isAbsolute(relative) ||
    relative.includes('..') ||
    /^[A-Za-z]:/.test(relative)
  )
    fail(`unsafe path ${relative}`);
  const realRoot = await realpath(root);
  const candidate = path.resolve(realRoot, relative.replaceAll('\\', '/'));
  if (!candidate.startsWith(`${realRoot}${path.sep}`))
    fail(`path escape ${relative}`);
  let cursor = realRoot;
  for (const segment of relative.replaceAll('\\', '/').split('/')) {
    cursor = path.join(cursor, segment);
    if ((await lstat(cursor)).isSymbolicLink())
      fail(`linked path forbidden ${relative}`);
  }
  const resolved = await realpath(candidate);
  if (!resolved.startsWith(`${realRoot}${path.sep}`))
    fail(`real path escape ${relative}`);
  const info = await stat(resolved);
  if (!info.isFile() || info.size > limit)
    fail(`invalid/oversize file ${relative}`);
  return resolved;
}

export async function safeDirectory(root, relative) {
  if (
    !relative ||
    path.isAbsolute(relative) ||
    relative.includes('..') ||
    relative.includes('\\')
  )
    fail(`unsafe directory ${relative}`);
  const realRoot = await realpath(root);
  const candidate = path.resolve(realRoot, relative);
  const resolved = await realpath(candidate);
  const info = await lstat(candidate);
  if (
    !resolved.startsWith(`${realRoot}${path.sep}`) ||
    info.isSymbolicLink() ||
    !info.isDirectory()
  )
    fail(`unsafe directory ${relative}`);
  return candidate;
}

export async function walkFiles(root, current = root, output = []) {
  for (const entry of await readdir(current, { withFileTypes: true })) {
    const absolute = path.join(current, entry.name);
    const info = await lstat(absolute);
    if (info.isSymbolicLink()) fail(`linked package path ${absolute}`);
    if (entry.isDirectory()) await walkFiles(root, absolute, output);
    else if (entry.isFile() && entry.name !== 'package-sha256.json') {
      output.push(path.relative(root, absolute).split(path.sep).join('/'));
      if (output.length > LIMITS.files) fail('package file limit exceeded');
    } else if (!entry.isFile()) fail(`unsupported package entry ${absolute}`);
  }
  return output;
}
