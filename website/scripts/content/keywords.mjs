import { lstat, readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { ROOT, fail } from './shared.mjs';
import { parseKeywordFile } from './keyword-file.mjs';
import {
  normalizeQuotes,
  normalizeKeyword,
  splitComposite,
} from '../../shared/keywords.mjs';

export { normalizeQuotes, normalizeKeyword, splitComposite };

export const KEYWORDS_DIR = path.join(ROOT, 'docs', 'keywords');
export const KEYWORD_FILE_RE = /^([a-z0-9]+(?:-[a-z0-9]+)*)\.md$/;

const CATEGORIES = new Set([
  'action',
  'event',
  'ability',
  // Rides in the numbered italic ability prefix, never in bold. Its own
  // category because `extractAbilityMetadata` may only resolve prefix tokens
  // against these entries.
  'ability-metadata',
  'cost-procedure',
  // Printed in the card's super type line. Own category for the same reason:
  // `Ritual Summon Sorcery` must not resolve the `Summon` action keyword.
  'super-type',
  'archetype',
]);

const ORIGINS = new Set(['magic', 'essentia']);

const MAX_KEYWORD_BYTES = 32_768;

/** Parse a required `true`/`false` front-matter value, or fail the build. */
function booleanField(id, key, raw) {
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  fail(`keyword ${id}: ${key} must be true or false`);
}

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
    // `lstat`, not `stat`: every other loader this pipeline runs refuses a
    // symlinked input, and a `doc:` pointing at one would claim a file outside
    // the repository as its owner. Nothing reads the path, so this is a
    // consistency fix rather than a leak.
    return (await lstat(path.join(ROOT, relative))).isFile();
  } catch {
    return false;
  }
}

export async function loadKeywordRegistry(directory = KEYWORDS_DIR) {
  const entries = (await readdir(directory, { withFileTypes: true })).sort(
    (a, b) => a.name.localeCompare(b.name),
  );

  const byTerm = new Map();
  for (const entry of entries) {
    // Decide from the directory entry alone before touching the filesystem:
    // `docs/keywords/` also holds the UPPER_CASE module docs, and stat-ing a
    // name we are about to skip turns an unrelated concurrent delete into an
    // ENOENT that aborts the whole build.
    if (entry.isDirectory()) continue;
    if (!KEYWORD_FILE_RE.test(entry.name)) continue;

    const file = path.join(directory, entry.name);
    const info = await lstat(file);
    if (info.isSymbolicLink())
      fail(`keyword ${entry.name}: symlinks are not allowed`);
    if (info.size > MAX_KEYWORD_BYTES)
      fail(`keyword ${entry.name}: file exceeds ${MAX_KEYWORD_BYTES} bytes`);

    const id = KEYWORD_FILE_RE.exec(entry.name)[1];
    const { data, definition } = parseKeywordFile(
      await readFile(file, 'utf8'),
      id,
    );

    for (const key of [
      'term',
      'category',
      'origin',
      'doc',
      'preview',
      'reminder',
    ]) {
      if (!data[key]) fail(`keyword ${id}: missing required key ${key}`);
    }
    // `archetype` is required for an archetype keyword, and allowed on any
    // other category too: `on-cast-spellbook` is `category: event` with
    // `archetype: spellbook`, and the orchestrator publishes it regardless.
    if (data.category === 'archetype' && !data.archetype)
      fail(`keyword ${id}: missing required key archetype`);

    if (!CATEGORIES.has(data.category))
      fail(`keyword ${id}: invalid keyword entry ${data.term}`);
    if (!ORIGINS.has(data.origin))
      fail(`keyword ${id}: origin must be magic or essentia`);
    // The term reaches a raw-HTML sink: `BaseLayout.astro` serialises the
    // ruling map into a `<script type="application/json">` block with
    // `set:html`, so a term containing `</script>` would close that block and
    // become live markup on every page. Guard it exactly like `definition`.
    if (/[<>]/.test(data.term))
      fail(`keyword ${id}: term must be plain text without < or >`);
    if (data.term !== normalizeKeyword(data.term))
      fail(`keyword ${id} must be stored in normalized form`);

    if (/\n/.test(definition))
      fail(`keyword ${id}: definition must be a single paragraph`);
    if (
      typeof definition !== 'string' ||
      definition.trim() !== definition ||
      definition.length < 20 ||
      definition.length > 400 ||
      /[<>]/.test(definition)
    )
      fail(`keyword ${id}: definition must be 20-400 plain-text characters`);

    if (!(await docExists(data.doc)))
      fail(`keyword ${id}: doc ${data.doc} does not exist`);

    if (byTerm.has(data.term))
      fail(`keyword ${id}: duplicate keyword term ${data.term}`);

    const preview = booleanField(id, 'preview', data.preview);
    const reminder = booleanField(id, 'reminder', data.reminder);
    if (preview && !reminder)
      fail(
        `keyword ${id}: preview requires reminder — the published-HTML gate demands a reminder for any previewed term`,
      );

    byTerm.set(data.term, {
      id,
      term: data.term,
      category: data.category,
      archetype: data.archetype ?? undefined,
      origin: data.origin,
      doc: data.doc,
      definition,
      preview,
      reminder,
    });
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
          `${source}: unknown keyword ${JSON.stringify(term)} — add docs/keywords/{id}.md or fix the card text`,
        );
      found.add(term);
    }
  }
  return [...found].sort((a, b) => a.localeCompare(b));
}

/**
 * The numbered italic ability prefix — `<i-auto>(1 - Activated <kw-a>Flash</kw-a>
 * Soft)</i-auto>`. `docs/rules/TEMPLATING.md` defines the shape and
 * `.script/lint_mse_card_style.py` (MSE003/MSE015) enforces it: metadata is
 * never bold, so `extractKeywords` cannot see it. `(no target)` and other
 * italic asides carry no `N - ` head and are not prefixes.
 */
const ABILITY_PREFIX_RE = /<i-auto>\(\s*\d+\s*-\s*([\s\S]*?)\)<\/i-auto>/g;

/** Registry terms of `category`, resolved from whitespace-separated tokens. */
function resolveTokens(tokens, registry, category) {
  const found = new Set();
  for (const token of tokens) {
    const term = normalizeKeyword(token);
    if (!term) continue;
    const entry = registry.get(term);
    // Lenient on purpose, unlike the bold taxonomy: `Flash`, `Sorcery` and
    // `Ritual` are documented metadata with no ruling file, and `Instant`,
    // `Creature` and friends are super types with none either. Failing here
    // would make every card in the set unbuildable for a missing hover ruling.
    if (entry?.category === category) found.add(term);
  }
  return found;
}

/**
 * Ability metadata invoked by this card's rule text, deduped and sorted.
 * `Hard Linked` is two registry terms; the linter keeps it as one printed
 * token, but the user authored `Hard` and `Linked` as separate rulings.
 */
export function extractAbilityMetadata(ruleText, registry) {
  const found = new Set();
  for (const match of (ruleText ?? '').matchAll(ABILITY_PREFIX_RE)) {
    const tokens = match[1]
      .replace(/<[^>]*>/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .split(' ');
    for (const term of resolveTokens(tokens, registry, 'ability-metadata'))
      found.add(term);
  }
  return [...found].sort((a, b) => a.localeCompare(b));
}

/**
 * Super-type keywords printed on this card, deduped and sorted. `supertypes`
 * is the closed token list `fields.mjs parseSupertypes()` already produced.
 */
export function extractSupertypeKeywords(supertypes, registry) {
  return [...resolveTokens(supertypes ?? [], registry, 'super-type')].sort(
    (a, b) => a.localeCompare(b),
  );
}

/**
 * Every keyword one card version invokes, from all three printed sites: bold
 * rule text, the italic ability prefix, and the super type line. One list, so
 * `previewKeywordsFor()` and the hover box need no new wiring.
 */
export function cardKeywords({ ruleText, supertypes }, registry, source) {
  const terms = new Set([
    ...extractKeywords(ruleText, registry, source),
    ...extractAbilityMetadata(ruleText, registry),
    ...extractSupertypeKeywords(supertypes, registry),
  ]);
  return [...terms].sort((a, b) => a.localeCompare(b));
}
