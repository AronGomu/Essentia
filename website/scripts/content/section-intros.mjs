import { lstat, readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { CONTENT, fail } from './shared.mjs';
import { truncateAtWordBoundary } from '../../src/lib/text.ts';

export const SECTION_INTROS_DIR = path.join(CONTENT, 'section-intros');

const SUMMARY_LIMIT = 360;
const MAX_INTRO_BYTES = 262_144;

/**
 * Flattens the first paragraph of a section intro body into plain text for
 * `<meta name="description">`. Mirrors `docDescription()`'s per-construct
 * strip so hyphenated words like `Yu-Gi-Oh!` survive intact, then truncates
 * at a word boundary — never emitting a list marker or a half-sentence.
 */
export function sectionIntroSummary(body) {
  const paragraph = body.split(/\n\s*\n/)[0] ?? '';
  const text = paragraph
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .split('\n')
    .map((line) =>
      line
        .replace(/^\s{0,3}#{1,6}\s+/, '')
        .replace(/^\s*>\s?/, '')
        .replace(/^\s*(?:[-*+]|\d+\.)\s+/, ''),
    )
    .filter((line) => !/^\s*\|?[\s:|-]*\|[\s:|-]*$/.test(line))
    .join('\n')
    .replace(/\|/g, ' ')
    .replace(/`+/g, '')
    .replace(/\*+/g, '')
    .replace(/(^|\W)_+(?=\S)/g, '$1')
    .replace(/(?<=\S)_+(?=\W|$)/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  return truncateAtWordBoundary(text, SUMMARY_LIMIT);
}

/**
 * @param {Set<string>} knownSlugs
 * @param {string} [directory] defaults to the repository's own
 *   `website/content/section-intros/`. Tests point it at a temp directory so
 *   fixtures never land in the working tree.
 * @returns {Promise<Map<string,string>>} slug -> markdown body, trimmed
 */
export async function loadSectionIntros(
  knownSlugs,
  directory = SECTION_INTROS_DIR,
) {
  const output = new Map();
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.name === '.gitkeep') continue;
    const source = path.join(directory, entry.name);
    const info = await lstat(source);
    if (
      info.isSymbolicLink() ||
      !entry.isFile() ||
      !entry.name.endsWith('.md') ||
      info.size > MAX_INTRO_BYTES
    )
      fail(`unsafe section intro ${entry.name}`);
    const slug = entry.name.slice(0, -3);
    if (!knownSlugs.has(slug)) fail(`unknown section intro ${slug}`);
    const raw = await readFile(source, 'utf8');
    if (/<\/?[A-Za-z][^>]*>|\{[^\n]*\}|!\[[^\]]*\]\([^)]*\)/.test(raw))
      fail(`unsafe section intro ${entry.name}`);
    for (const link of raw.matchAll(/\[[^\]]+\]\(([^)]+)\)/g))
      if (!/^(https:\/\/|mailto:|#|\/)/.test(link[1].trim()))
        fail(`unsafe section intro URL ${entry.name}`);
    output.set(slug, raw.trim());
  }
  for (const slug of knownSlugs)
    if (!output.has(slug))
      fail(
        `section ${slug}: missing intro file website/content/section-intros/${slug}.md`,
      );
  return output;
}
