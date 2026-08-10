# T2: Keyword files in docs

**Plan:** `./ai-artifacts/PLAN_2026_08_08_website-feedback-pass-2.md`
**Depends:** T1
**Commit outcome:** Every keyword ruling is one editable `docs/keywords/{id}.md` file; the build reads that directory, `website/content/keywords.json` is deleted, and adding a new file publishes a new keyword on the next `npm run content`.

## Context (self-contained)

- Goal: website feedback pass 2. This ticket delivers feedback item **Global 1**:
  "Map out all key words that show in hover previews to corresponding files in
  `docs/keywords/{keyword}.md`. Website build takes those as source of truth …
  allow editing directly into docs/ file to update the website on rebuild, and
  allow creating manually a new keyword file and automatically add it to the
  website on rebuild."
- This slice: a **pure migration**. Rendered output must be byte-identical before
  and after. The behaviour flags (`preview`, `reminder`) arrive in T3.
- Out of scope here: changing any ruling wording, changing which keywords appear in
  hover boxes or card-text reminders, touching MSE card data, touching the nav,
  hero art, section intros, or the docs/blog rails.
- Assumptions in force: `graphify` is not installed — do not run it. Per-keyword
  files live directly in `docs/keywords/`, distinguished from the four module docs
  by case: **lower-case kebab `.md` = keyword definition (never a doc page);
  UPPER_CASE `.md` = module doc (published)**.

## Requirements

- New directory content: `docs/keywords/{id}.md`, one file per registry entry,
  73 files, ids taken unchanged from `website/content/keywords.json`
  (`abyssal-curse`, `after-attack-or-block`, …, `xyz-alternative-cost`).
- File shape, exactly:

  ```markdown
  ---
  term: Mill N
  category: action
  origin: magic
  doc: docs/keywords/ACTIONS.md
  ---

  Send N cards from the top of your Deck to the Grave. The quantity is always printed.
  ```

  `archetype: burning-abyss` is **required when** `category: archetype`, and
  **optional otherwise**.

  > **Parent correction (inlined 2026-08-08 — supersedes the original "present
  > **iff** `category: archetype`" wording everywhere in this ticket).** The
  > original iff-rule contradicts the real registry and would break the
  > "byte-identical output" requirement that governs this ticket. Measured against
  > the unmodified `HEAD:website/content/keywords.json` (73 entries):
  > - 4 entries have `category: archetype`; **all 4** carry an `archetype` field →
  >   the "required when archetype" half is true and must be enforced.
  > - **Exactly 1** entry has a non-archetype category **and** carries an
  >   `archetype` field: `on-cast-spellbook` — `category: "event"`,
  >   `archetype: "spellbook"`, `origin: "essentia"`,
  >   `doc: docs/04_spellbook/KEYWORDS.md`. It is live production data:
  >   `orchestrator.mjs` publishes `archetype: entry.archetype ?? null`
  >   irrespective of category, so that `"spellbook"` value already reaches the
  >   catalog today.
  >
  > Therefore: **keep `archetype` on `on-cast-spellbook` exactly as it is** — do not
  > change its `category`, do not drop the field, do not special-case the id. The
  > loader must accept an `archetype` key on any category and reject only a
  > `category: archetype` entry that is missing one.
- `website/scripts/content/keywords.mjs` loads that directory instead of the JSON
  file, keeping every current validation and adding the new ones listed below.
- `website/content/keywords.json` is **deleted**.
- `website/scripts/content/docs.mjs` never publishes a lower-case keyword file as a
  doc page.
- `npm run content` prints `… 73 keywords …` exactly as before, and
  `website/src/generated/catalog.ts` `keywords` array is unchanged apart from key
  ordering being stable.

## Inputs

- Read: `website/content/keywords.json` (73 entries; fields `id`, `term`,
  `category`, `archetype?`, `origin`, `doc`, `definition`).
- Read: `website/scripts/content/keywords.mjs` — current loader
  `loadKeywordRegistry(file = path.join(CONTENT, 'keywords.json'))` returning
  `Map<term, entry>`; also exports `extractKeywords`, and re-exports
  `normalizeQuotes`, `normalizeKeyword`, `splitComposite` from
  `website/shared/keywords.mjs`.
- Read: `website/scripts/content/docs.mjs` — `discoverDocPaths()` walks `docs/`,
  already skips `docs/ADR`; `groupFor()` calls `fail()` for any `.md` not listed in
  `DOC_GROUPS`.
- Read: `website/scripts/content/blog.mjs` — `parseFrontMatter(text, source)` shows
  the accepted front-matter dialect (`/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/`, one
  `key: value` per line).
- Read: `website/scripts/content/shared.mjs` — `ROOT`, `CONTENT`, `fail()`.
- Read: `website/scripts/content/orchestrator.mjs` line 81
  `const keywordRegistry = await loadKeywordRegistry();` and lines 197–205 that map
  the registry into `catalog.keywords`.
- **From Depends (T1):** baseline is green; the registry holds exactly **73**
  entries; `npm run ci` and `npm run test:e2e` pass on the pre-change tree.

## TDD

1. **Red** — add the new tests in `website/tests/unit/keywords.test.ts` (listed
   below) against the not-yet-written directory loader; they fail.
2. **Green** — write the loader and generate the 73 files; tests pass.
3. **Refactor** — delete `website/content/keywords.json` and the JSON-only fixture
   helper; keep green.

## Test plan

All in `website/tests/unit/keywords.test.ts` unless stated. Run with
`cd website && npm run test`.

| Test | Input | Expect |
| ---- | ----- | ------ |
| `loads every keyword file` | `await loadKeywordRegistry()` | `registry.size === 73` |
| `reads the definition from the file body` | `registry.get('Mill N')` | `.definition === 'Send N cards from the top of your Deck to the Grave. The quantity is always printed.'` |
| `keeps the archetype key` | `registry.get('Nekroz Recovery')` | `.category === 'archetype'` and `.archetype === 'nekroz'` |
| `derives the id from the filename` | `registry.get('Mill N')` | `.id === 'mill-n'` |
| `ignores the UPPER_CASE module docs` | `await loadKeywordRegistry()` | no entry whose `id` matches `/[A-Z_]/` |
| `rejects an unknown front-matter key` | fixture file with `colour: red` | rejects `/unknown front-matter key colour/` |
| `rejects a missing term` | fixture without `term:` | rejects `/missing required key term/` |
| `rejects a short definition` | fixture body `too short` | rejects `/definition must be 20-400 plain-text characters/` |
| `rejects HTML in a definition` | fixture body `a <b>bold</b> definition here` | rejects `/definition must be 20-400 plain-text characters/` |
| `rejects a multi-line definition` | fixture body `line one\n\nline two` | rejects `/definition must be a single paragraph/` |
| `rejects angle brackets in a term` | fixture `term: Demo <b>` | rejects `/term must be plain text without < or >/` |
| `rejects an unknown origin` | fixture `origin: konami` | rejects `/origin must be magic or essentia/` |
| `rejects a missing doc` | fixture `doc: docs/NOPE.md` | rejects `/doc docs\/NOPE\.md does not exist/` |
| `accepts a non-archetype entry carrying archetype` | fixture `category: event` + `archetype: spellbook` | loads, and `registry.get('On Cast "Spellbook"').archetype === 'spellbook'` |
| `rejects an archetype entry without archetype` | fixture `category: archetype`, no `archetype:` | rejects `/missing required key archetype/` |
| `rejects a duplicate term` | two fixture files with `term: Demo` | rejects `/duplicate keyword term Demo/` |
| `rejects an unnormalized term` | fixture `term: Detach 1` | rejects `/must be stored in normalized form/` |
| `rejects an id that is not kebab-case` (docs-corpus side) | file `docs/keywords/Bad_Name.md` | that file is **not** loaded as a keyword and **fails** the docs corpus with `/is not listed in DOC_GROUPS/` |
| `docs corpus skips keyword definition files` (`website/tests/unit/docs-corpus.test.ts`) | `await loadDocs()` | no entry whose `path` matches `/^docs\/keywords\/[a-z0-9-]+\.md$/` |
| `keyword count in the catalog` (`website/tests/unit/keywords.test.ts`) | `catalog.keywords` | length `73`; 22 `magic`, 51 `essentia` (unchanged) |

## Impl steps

- [x] 1. Create `website/scripts/content/keyword-file.mjs` exporting
      `parseKeywordFile(text, id)`:
      - Match `/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/`; no match → `fail(\`keyword ${id}: missing front matter\`)`.
      - Allowed keys, exactly: `new Set(['term','category','origin','doc','archetype'])`.
      - Per line `/^([a-zA-Z]+):\s?(.*)$/`; unknown key →
        `fail(\`keyword ${id}: unknown front-matter key ${key}\`)`; malformed line →
        `fail(\`keyword ${id}: malformed front-matter line "${line}"\`)`.
      - Return `{ data, definition: body.trim() }`.
- [x] 2. In `website/scripts/content/keywords.mjs` add
      `export const KEYWORDS_DIR = path.join(ROOT, 'docs', 'keywords');` and
      `export const KEYWORD_FILE_RE = /^([a-z0-9]+(?:-[a-z0-9]+)*)\.md$/;`.
- [x] 3. Rewrite the signature to
      `export async function loadKeywordRegistry(directory = KEYWORDS_DIR)`.
- [x] 4. Inside it: `readdir(directory, { withFileTypes: true })`, sort by
      `name.localeCompare`. For each entry: `lstat`; symlink →
      `fail(\`keyword ${entry.name}: symlinks are not allowed\`)`; size > `32_768` →
      `fail(\`keyword ${entry.name}: file exceeds 32768 bytes\`)`; skip directories;
      skip any name not matching `KEYWORD_FILE_RE`.
- [x] 5. `const id = KEYWORD_FILE_RE.exec(entry.name)[1];` then
      `const { data, definition } = parseKeywordFile(await readFile(file,'utf8'), id);`.
- [x] 6. Required keys `['term','category','origin','doc']`; missing →
      `fail(\`keyword ${id}: missing required key ${key}\`)`. When
      `data.category === 'archetype'`, `archetype` is also required with the same
      message. **Parent correction (inlined 2026-08-08):** when the category is
      *not* `archetype`, a present `archetype` is **allowed** — do **not** emit
      `archetype is only valid for category archetype`, and delete that branch if
      you already wrote it. Real record proving the rule: `on-cast-spellbook`
      (`category: event`, `archetype: spellbook`). See the boxed correction under
      "Requirements".
- [x] 7. Keep every existing validation, re-worded to the `keyword ${id}:` prefix:
      `CATEGORIES.has(category)`, `ORIGINS.has(origin)`, `!/[<>]/.test(term)`
      (message `term must be plain text without < or >`),
      `term === normalizeKeyword(term)` (message `must be stored in normalized form`),
      `await docExists(doc)` (message `doc ${doc} does not exist`).
- [x] 8. Definition validation: `/\n/.test(definition)` →
      `fail(\`keyword ${id}: definition must be a single paragraph\`)`; then the
      existing 20–400 / no-`<>` / trimmed rule with message
      `definition must be 20-400 plain-text characters`.
- [x] 9. Duplicate guards: `byTerm.has(term)` →
      `fail(\`keyword ${id}: duplicate keyword term ${term}\`)`.
- [x] 10. Build the entry object with the same shape the orchestrator consumes:
      `{ id, term, category, archetype: data.archetype ?? undefined, origin, doc, definition }`.
      Return `byTerm` (`Map<term, entry>`) — unchanged contract.
- [x] 11. Delete the `schemaVersion` check and the JSON `readFile` from
      `keywords.mjs`. Keep `extractKeywords` untouched.
- [x] 12. Write the one-shot migration script `website/scripts/migrate-keywords.mjs`:

      ```js
      import { mkdir, readFile, writeFile } from 'node:fs/promises';
      import path from 'node:path';
      const root = path.resolve(import.meta.dirname, '..', '..');
      const { keywords } = JSON.parse(
        await readFile(path.join(root, 'website/content/keywords.json'), 'utf8'),
      );
      const dir = path.join(root, 'docs/keywords');
      await mkdir(dir, { recursive: true });
      for (const k of keywords) {
        const lines = [`term: ${k.term}`, `category: ${k.category}`];
        if (k.archetype) lines.push(`archetype: ${k.archetype}`);
        lines.push(`origin: ${k.origin}`, `doc: ${k.doc}`);
        await writeFile(
          path.join(dir, `${k.id}.md`),
          `---\n${lines.join('\n')}\n---\n\n${k.definition}\n`,
          'utf8',
        );
      }
      console.log(`wrote ${keywords.length} keyword files`);
      ```

- [x] 13. `cd website && node scripts/migrate-keywords.mjs` → prints `wrote 73 keyword files`.
- [x] 14. `rm website/scripts/migrate-keywords.mjs` — it is a one-shot, never committed.
- [x] 15. `rm website/content/keywords.json`.
- [x] 16. In `website/scripts/content/docs.mjs`, inside `discoverDocPaths()`'s
      `walk()`, right after `const relative = …`, add:
      `if (/^docs\/keywords\/[a-z0-9]+(?:-[a-z0-9]+)*\.md$/.test(relative)) continue;`
      with the comment `// Per-keyword ruling files are registry data, not doc pages.`
- [x] 17. Update `website/tests/unit/keywords.test.ts`: replace the JSON `fixture()`
      helper with a directory-based one —
      `function fixture(frontMatter: Record<string,string>, body = VALID_BODY): string`
      that `mkdtempSync`es a directory, writes `demo.md` (or the given filename), and
      returns the directory path for `loadKeywordRegistry(dir)`. Add every row of the
      test plan.
- [x] 18. Add the docs-corpus exclusion test to `website/tests/unit/docs-corpus.test.ts`.
- [x] 19. Update `docs/KEYWORDS.md`: replace the sentence
      "The website's per-keyword ruling text lives in `website/content/keywords.json`
      and must agree with the owning module named in each entry's `doc` field; these
      modules stay the source of record." with:
      "The website's per-keyword ruling text lives in `docs/keywords/{id}.md`, one
      lower-case kebab-case file per keyword. That file is the source of record for
      the published ruling; its `doc:` key names the module that narrates the
      keyword. UPPER_CASE files in `docs/keywords/` remain module docs and are
      published as doc pages; lower-case files never are. Adding a file publishes a
      new keyword on the next `cd website && npm run content`."
- [x] 20. `cd website && npm run content` → stdout still ends with `… 73 keywords, … docs, … posts`.
      Observed: `content: 1 releases, 3 sections, 50 current cards, 50 versions, 73 keywords, 38 docs, 1 posts`, exit 0.
- [x] 21. `cd website && git diff --stat src/generated/catalog.ts` → confirm the
      `keywords` array is unchanged in content (only whitespace/order may move; if
      any `definition` differs, a file was written wrong — fix it, do not accept it).
      The prescribed command is inert here: `website/.gitignore:5:src/generated/`
      untracks the file, so `git diff` reports nothing. Substituted a stronger check —
      the `keywords` array was extracted from `catalog.ts` before the rebuild and
      after, and compared: **73 → 73, content-identical as a set (every `id`, `term`,
      `category`, `archetype`, `origin`, `doc`, `definition` byte-equal); zero
      `definition` deltas.** The only delta is position, for 8 ids
      (`exile`, `exile-from-grave`, `exile-n-plant-from-grave`, `on-enter`,
      `on-enter-or-mv2-opponent-creature-enter`, `on-enter-synchro`,
      `on-send-grave`, `on-send-grave-by-effect`) — the JSON was ASCII-sorted by
      `id`, whereas step 4's prescribed `name.localeCompare` sort of the filenames
      collates the hyphen differently. Permitted by this step.

## Outputs

- Files touched:
  - new: `docs/keywords/{73 ids}.md`, `website/scripts/content/keyword-file.mjs`
  - edited: `website/scripts/content/keywords.mjs`, `website/scripts/content/docs.mjs`,
    `website/tests/unit/keywords.test.ts`, `website/tests/unit/docs-corpus.test.ts`,
    `docs/KEYWORDS.md`
  - deleted: `website/content/keywords.json`
- Public API / behaviour change: `loadKeywordRegistry(directory?)` now takes a
  directory, not a file. Rendered site output is unchanged.
- Migrate / config: authors now edit `docs/keywords/{id}.md`.

## Validation

- [x] tests pass: `cd website && npm run test` and `cd website && npm run ci` →
      `npm run ci` exit **0**; `Test Files 47 passed (47)`, `Tests 448 passed (448)`
      (T1 baseline was 47 / 435 — the +13 are this ticket's new rows);
      `151 page(s) built`; `dist scan: clean`.
- [x] manual check: `printf -- '---\nterm: Demo Keyword\ncategory: action\norigin: essentia\ndoc: docs/KEYWORDS.md\n---\n\nA demonstration ruling written by hand for the smoke test.\n' > docs/keywords/demo-keyword.md && (cd website && npm run content)` prints `74 keywords`; then `rm docs/keywords/demo-keyword.md && (cd website && npm run content)` prints `73 keywords`
      → observed `… 74 keywords, 38 docs, 1 posts`, then after `rm` `… 73 keywords, 38 docs, 1 posts`.
- [x] manual check: `docs/keywords/mill-n.md` opens, edits, and its new text reaches `website/src/generated/catalog.ts` after `npm run content` (revert the edit afterwards)
      → edited the body to `… EDIT SMOKE TEST marker text.`, rebuilt, `grep -c` in
      `catalog.ts` = **1**; reverted, rebuilt, marker count = **0** and the original
      ruling count = **1**. Final `catalog.keywords` re-extracted and confirmed
      identical to the post-migration snapshot.
- [x] app functional — `cd website && npm run build` exits 0 → `BUILD_EXIT=0`.
- [x] commit msg draft: `feat(website): read keyword rulings from docs/keywords files`
