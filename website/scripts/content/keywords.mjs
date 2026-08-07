import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { CONTENT, ROOT, fail } from './shared.mjs';
import {
  normalizeQuotes,
  normalizeKeyword,
  splitComposite,
} from '../../shared/keywords.mjs';

export { normalizeQuotes, normalizeKeyword, splitComposite };

const CATEGORIES = new Set([
  'action',
  'event',
  'ability',
  'cost-procedure',
  'archetype',
]);

const ORIGINS = new Set(['magic', 'essentia']);

/** The owning doc must be a real file inside the repo, never an escaping path. */
async function docExists(relative) {
  if (
    typeof relative !== 'string' ||
    !relative.trim() ||
    path.isAbsolute(relative) ||
    relative.split('/').includes('..')
  )
    return false;
  try {
    return (await stat(path.join(ROOT, relative))).isFile();
  } catch {
    return false;
  }
}

export async function loadKeywordRegistry(
  file = path.join(CONTENT, 'keywords.json'),
) {
  const data = JSON.parse(await readFile(file, 'utf8'));
  if (data.schemaVersion !== 2)
    fail('keyword registry must use schemaVersion 2');
  if (!Array.isArray(data.keywords)) fail('invalid keyword registry');
  const byTerm = new Map();
  const ids = new Set();
  for (const entry of data.keywords) {
    if (
      typeof entry.term !== 'string' ||
      !entry.term.trim() ||
      !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(entry.id ?? '') ||
      !CATEGORIES.has(entry.category) ||
      ids.has(entry.id) ||
      byTerm.has(entry.term)
    )
      fail(`invalid keyword entry ${entry.term ?? entry.id ?? 'unknown'}`);
    // The term reaches a raw-HTML sink: `BaseLayout.astro` serialises the
    // ruling map into a `<script type="application/json">` block with
    // `set:html`, so a term containing `</script>` would close that block and
    // become live markup on every page. Guard it exactly like `definition`.
    if (/[<>]/.test(entry.term))
      fail(`keyword ${entry.term}: term must be plain text without < or >`);
    if (entry.term !== normalizeKeyword(entry.term))
      fail(`keyword ${entry.term} must be stored in normalized form`);
    if (
      typeof entry.definition !== 'string' ||
      entry.definition.trim() !== entry.definition ||
      entry.definition.length < 20 ||
      entry.definition.length > 400 ||
      /[<>]/.test(entry.definition)
    )
      fail(
        `keyword ${entry.id}: definition must be 20-400 plain-text characters`,
      );
    if (!ORIGINS.has(entry.origin))
      fail(`keyword ${entry.id}: origin must be magic or essentia`);
    if (!(await docExists(entry.doc)))
      fail(`keyword ${entry.id}: doc ${entry.doc} does not exist`);
    ids.add(entry.id);
    byTerm.set(entry.term, entry);
  }
  return byTerm;
}

/**
 * Extract every bold invocation from MSE rule text and resolve it against the
 * closed registry. An unknown phrase fails the build — the taxonomy is closed.
 */
export function extractKeywords(ruleText, registry, source) {
  const found = new Set();
  for (const match of (ruleText ?? '').matchAll(/<b>([\s\S]*?)<\/b>/g)) {
    const raw = match[1]
      .replace(/<[^>]*>/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    if (!raw) continue;
    for (const part of splitComposite(raw)) {
      const term = normalizeKeyword(part);
      if (!term) continue;
      if (!registry.has(term))
        fail(
          `${source}: unknown keyword ${JSON.stringify(term)} — add it to content/keywords.json or fix the card text`,
        );
      found.add(term);
    }
  }
  return [...found].sort((a, b) => a.localeCompare(b));
}
