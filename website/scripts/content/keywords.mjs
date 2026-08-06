import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { CONTENT, fail } from './shared.mjs';

const CATEGORIES = new Set([
  'action',
  'event',
  'ability',
  'cost-procedure',
  'archetype',
]);

/** Curly quotes in card text must compare equal to straight quotes in the registry. */
function normalizeQuotes(value) {
  return value.replace(/[‘’]/g, "'").replace(/[“”]/g, '"');
}

/**
 * `Detach 1`, `Detach 2` and `Detach X` are one keyword with a parameter.
 * Fold standalone integer / X tokens to `N` so the registry holds one entry.
 */
export function normalizeKeyword(phrase) {
  return normalizeQuotes(phrase)
    .split(/\s+/)
    .map((token) => (/^(?:\d+|X)$/.test(token) ? 'N' : token))
    .join(' ')
    .trim();
}

/** `Detach 1 and Mill 3` and `Negate & Destroy` each invoke two keywords. */
export function splitComposite(phrase) {
  return phrase
    .split(/\s+(?:and|&)\s+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

export async function loadKeywordRegistry() {
  const file = path.join(CONTENT, 'keywords.json');
  const data = JSON.parse(await readFile(file, 'utf8'));
  if (data.schemaVersion !== 1 || !Array.isArray(data.keywords))
    fail('invalid keyword registry');
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
    if (entry.term !== normalizeKeyword(entry.term))
      fail(`keyword ${entry.term} must be stored in normalized form`);
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
