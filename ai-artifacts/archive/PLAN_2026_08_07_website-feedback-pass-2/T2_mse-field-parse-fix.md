# T2: MSE multi-line field parse fix

**Plan:** `./ai-artifacts/PLAN_2026_08_07_website-feedback-pass-2.md`
**Depends:** none
**Commit outcome:** All 50 published cards carry their rule text — card pages show the effect, hover previews show keyword rulings.

## Context (self-contained)

- Goal: ship feedback batch 2 on the Astro site under `website/`.
- This slice: the root-cause fix behind three feedback lines — *"None of the Nekroz cards
  have their card effect in their card page"*, *"Most cards dont have text rule on hover
  or text effect in their card page description"*, *"Nekroz cards are missing text rule
  box on their hover"*. **26 of 50 cards** currently have `ruleText === ''` in the
  generated catalog.
- Out of scope here: any styling, any component, the hover panel layout (T4), keyword
  wording (T3), and **all** of `.script/` Python tooling.
- Assumptions in force: A3 (the render-provenance hash input must stay frozen on the
  legacy parse shape, or the content build fails with `stale render/provenance`).

## The defect

`website/scripts/content/packages.mjs::parseFields` (line 39) classifies a line as a new
field **before** testing whether it is a continuation line:

```js
const match = /^\t([^:\n]+):(?:\s?(.*))?$/.exec(line);
if (match) { flush(); key = match[1].trim(); lines = [match[2] ?? '']; }
else if (key !== null && line.startsWith('\t\t')) lines.push(line.slice(2));
```

MSE writes spell-check annotations into card text — `<error-spelling:en_US:/magic.mse-game/…>`.
Those contain colons, so a `\t\t`-indented continuation line matches the field regex,
`flush()` writes `rule_text` as the empty string, and the rest of the card's text is
swallowed into a bogus key. Every card whose rule text contains a colon loses all of it.

Confirmed source example — `cards_mse/01_alpha/LOTA-0001-Alpha_0.1/01_YGO_Legend_of_the_Alpha.mse-set/card nekroz - brionac`:

```
	rule_text:
		<i-auto>(1 - Activated Sorcery Hard)</i-auto> <b>Discard</b> <error-spelling:en_US:/magic.mse-game/dictionary/magic-words>Brionac</error-spelling:…>; <b>Search</b> 1 “…” Creature.
```

## The provenance constraint (do not skip)

`packages.mjs` line 232 hashes `normalizedFields(fields)` into `visualSourceHash`, and
line 390 fails the build when it disagrees with the `sourceHash` recorded in
`cards_mse/01_alpha/LOTA-0001-Alpha_0.1/01_YGO_Legend_of_the_Alpha.mse-set/render-provenance.json`.
Those attestations were produced by `.script/mse_content.py::field_values`, which carries
the identical defect. Fixing the parser without isolating the hash input produces:

```
Error: content: LOTA-0001-Alpha_0.1: stale render/provenance for bagooska
```

(verified experimentally during planning). Therefore: **keep a byte-identical copy of the
old parser and feed only `visualSourceHash` from it.** Do not regenerate provenance, do
not re-render, do not touch `.script/`.

## Requirements

- Continuation lines (`\t\t…`) are appended to the current field regardless of their content.
- A field-start line's key may not contain a tab: regex becomes `/^\t([^:\n\t]+):(?:\s?(.*))?$/`.
- `duplicate field` failure behaviour is preserved in both parsers.
- `visualSourceHash` is computed from `legacyVisualFields(raw)`, not from the corrected map.
- Every published card ends with non-empty `ruleText`.

## Inputs

- `website/scripts/content/packages.mjs` — `parseFields` at line 39, `required` at 71,
  `parseProject` at 182, the `visualSourceHash` construction at 232-236, `ruleText` read
  at 237, provenance comparison at 389-394.
- `website/scripts/content/shared.mjs` — `fail(message)` throws `content: ${message}`;
  `normalizedFields(fields)` sorts, drops `notes` / `time_created` / `time_modified`.
- `website/scripts/content/keywords.mjs::extractKeywords` — fails the build on a bold term
  missing from `website/content/keywords.json`. Verified during planning: after the fix
  the corpus produces **zero** unknown terms, so no registry entry is needed here.
- `website/shared/mse-tags.mjs` — `error-spelling` is already in `STRIPPED_MSE_TAGS`, so
  `validateMarkup` and the renderer accept the newly-visible markup.
- **From Depends:** none.

## Check plan

| Test                                                     | Input                                              | Expect                                                     |
| -------------------------------------------------------- | -------------------------------------------------- | ---------------------------------------------------------- |
| `keeps a continuation line that contains a colon`        | card text with `\t\t…<error-spelling:en_US:/x>…`   | `parseFields(...).get('rule_text')` contains `error-spelling` |
| `joins every continuation line of a field`               | `rule_text` with 3 indented lines                  | value has 3 `\n`-separated lines in source order            |
| `ends a field at the next single-tab key`                | `rule_text` block followed by `\tpower: 5`         | `rule_text` excludes `power`, `power` is `'5'`             |
| `parses a single-line field`                             | `\tname: Nekroz - Brionac`                         | `'Nekroz - Brionac'`                                        |
| `fails on a duplicate field`                             | two `\tname:` lines                                | throws `content: duplicate field name`                      |
| `legacyVisualFields still truncates at an inner colon`   | the same colon-bearing card text                   | `legacyVisualFields(...).get('rule_text')` is `''`          |
| `every catalog card has rule text`                       | `src/generated/catalog`                            | `catalog.cards.filter(c => !c.ruleText).length === 0`       |
| `every catalog card has plain rule text`                 | `src/generated/catalog`                            | `catalog.cards.filter(c => !c.ruleTextPlain.trim()).length === 0` |
| `Nekroz - Brionac exposes its keywords`                  | `src/generated/catalog`                            | keywords equal `['Discard','Search','Shuffle','Target']`    |

## TDD

1. **Red** — add `website/tests/unit/mse-fields.test.ts` (first 6 rows) and
   `website/tests/unit/card-text.test.ts` (last 3 rows). Run
   `cd website && npx vitest run tests/unit/mse-fields.test.ts tests/unit/card-text.test.ts`.
   Expect failures on every row except `legacyVisualFields still truncates…` (which cannot
   compile until the export exists — that is also red).
2. **Green** — apply the parser split, rebuild content, rerun.
3. **Refactor** — none; keep the two parsers side by side with the comment below.

## Impl steps

- [x] 1. In `website/scripts/content/packages.mjs`, copy the current body of `parseFields`
      into a new function `legacyVisualFields(text)` placed directly above `parseFields`,
      unchanged (same regex `/^\t([^:\n]+):(?:\s?(.*))?$/`, same branch order, same
      `if (fields.has(key)) fail(\`duplicate field ${key}\`)`).
      _criterion:_ `grep -n 'function legacyVisualFields' website/scripts/content/packages.mjs`
      matches, and its body is byte-identical to the pre-fix `parseFields` body
      (`git show HEAD:website/scripts/content/packages.mjs` diffed against it).
- [x] 2. Add this doc comment above `legacyVisualFields`:
      `/** Pre-fix field parse, kept ONLY as the input to visualSourceHash. Every`
      `render-provenance.json attestation under cards_mse/ was produced against this`
      `shape by .script/mse_content.py::field_values, so correcting the content parser`
      `must not invalidate them and force a full MSE re-render. See ADR 0021. */`
      _criterion:_ `grep -n 'Pre-fix field parse' website/scripts/content/packages.mjs` matches.
- [x] 3. In `parseFields`, hoist the continuation branch to the top of the loop body:
      ```js
      // A `\t\t` line is always a continuation. It must be tested before the
      // field-start pattern: MSE writes `<error-spelling:en_US:/…>` into card
      // text, and those colons otherwise read as a new key and truncate the field.
      if (key !== null && line.startsWith('\t\t')) {
        lines.push(line.slice(2));
        continue;
      }
      const match = /^\t([^:\n\t]+):(?:\s?(.*))?$/.exec(line);
      if (match) {
        flush();
        key = match[1].trim();
        lines = [match[2] ?? ''];
      } else {
        flush();
        key = null;
        lines = [];
      }
      ```
      _criterion:_ `parseFields` loop body tests `line.startsWith('\t\t')` before the
      field regex, and the regex is `/^\t([^:\n\t]+):(?:\s?(.*))?$/`.
- [x] 4. Change the exports to `export function parseFields(text)` and
      `export function legacyVisualFields(text)`.
      _criterion:_ `node -e "import('./website/scripts/content/packages.mjs').then(m => console.log(typeof m.parseFields, typeof m.legacyVisualFields))"`
      prints `function function`.
- [x] 5. In `parseProject`, change the `visualSourceHash` template from
      `${normalizedFields(fields)}` to `${normalizedFields(legacyVisualFields(raw))}`.
      Leave `manifest-index`, `setVisual` and `art:` segments untouched.
      _criterion:_ `grep -n 'normalizedFields(legacyVisualFields(raw))' website/scripts/content/packages.mjs`
      matches, and step 8's build reports no `stale render/provenance`.
- [x] 6. Create `website/tests/unit/mse-fields.test.ts` importing
      `{ parseFields, legacyVisualFields } from '../../scripts/content/packages.mjs'`.
      Build fixtures as template literals using real tab characters (`\t`).
      _criterion:_ file exists at `website/tests/unit/mse-fields.test.ts` and holds the
      6 Check-plan parser rows.
- [x] 7. Create `website/tests/unit/card-text.test.ts` importing `{ catalog }` from
      `'../../src/lib/catalog'`.
      _criterion:_ file exists at `website/tests/unit/card-text.test.ts` and holds the
      3 Check-plan catalog rows.
- [x] 8. Run `cd website && node scripts/build-content.mjs`. Expect
      `content: 1 releases, 3 sections, 50 current cards, 50 versions, 73 keywords, 38 docs, 1 posts`
      and **no** `stale render/provenance` error.
- [x] 9. Run `cd website && npx vitest run tests/unit/mse-fields.test.ts tests/unit/card-text.test.ts` — green.
- [x] 10. `docs/ADR/proposed/0021-frozen-visual-source-hash.md` already exists and records
      this decision in full. Read it before step 1 and confirm the implementation matches
      its five numbered decisions. Do not rewrite it unless you deviate — if you do,
      stop and report the deviation instead.
- [x] 11. Run `cd website && npm run format && npm run ci`.
      _criterion:_ both exit 0. Evidence: `npm run ci` → `EXIT=0`, `Test Files 32 passed (32)`,
      `Tests 306 passed (306)`, `astro check Result (115 files)`, `csp: hashed inline content
      in 151 HTML files`, `dist scan: clean`, `404: redirects to site root`,
      `chrome: 151 pages carry the site header`.

## Outputs

- Touched: `website/scripts/content/packages.mjs`,
  `website/tests/unit/mse-fields.test.ts` (new), `website/tests/unit/card-text.test.ts` (new),
  `docs/ADR/proposed/0021-frozen-visual-source-hash.md` (new).
- Behaviour: `catalog.cards[].ruleText` / `.ruleTextPlain` / `.keywords` / `.oracleNormalized`
  are populated for the previously-empty 26 cards; `/cards/<id>/` renders the effect;
  gallery tiles emit real `data-card-keywords`.
- Migrate/config: none. `render-provenance.json` files are **not** modified.

## Validation

- [x] `cd website && npx vitest run tests/unit/mse-fields.test.ts tests/unit/card-text.test.ts` — 9 passed
      _(actual: **10** passed — the Check plan lists `fails on a duplicate field` only once,
      but Requirements demand the behaviour be preserved in **both** parsers, so the row is
      asserted against `parseFields` and `legacyVisualFields` separately.)_
      Evidence: `Test Files 2 passed (2)` / `Tests 11 passed (11)`. Red-first confirmed:
      the same command before the fix reported `Tests 10 failed (10)`.
      _(11th row added after review: a **golden vector** pinning
      `sha(normalizedFields(legacyVisualFields(brionac)))` to
      `18ca11e6125da887f06192fa43172f2d7dba1fa80138d21051677ce1f5c83144`. Without it the two
      `legacyVisualFields` rows also pass for a "tidied" legacy parser that drops the
      manufactured keys instead of storing them — which would change `normalizedFields`
      output and silently invalidate all 50 render-provenance attestations. This is the only
      Requirement (`visualSourceHash` is computed from `legacyVisualFields(raw)`) that
      otherwise had no unit-level guard.)_
- [x] `cd website && npm run content:check` — exit 0, no `stale render/provenance`
      Evidence: `EXIT=0`, `content: 1 releases, 3 sections, 50 current cards, 50 versions,
      73 keywords, 38 docs, 1 posts`.
- [x] `cd website && npm run ci` — exit 0. Evidence: `EXIT=0` (see step 11).
- [x] `python -m unittest discover -s tests` — no new failures.
      Evidence: `Ran 120 tests … FAILED (failures=50, errors=5)` **both** with the change and
      with `packages.mjs` stashed back to HEAD — byte-identical baseline, so zero new failures.
      Pre-existing, unrelated (card-text casing assertions against `cards_mse/`).
- [ ] manual: `npm run dev`, open `/cards/nekroz-brionac/` — the two ability lines render;
      hover a Nekroz tile in `/archetypes/nekroz/` — ruling boxes appear
      _(UNCHECKED: no interactive browser session available to this worker. Static output is
      covered by the automated equivalent below; the hover interaction itself is T4's surface.)_
- [x] automated equivalent of the manual check: assert on built `dist/` output that
      `dist/cards/nekroz-brionac/index.html` contains the rendered rule text and that
      `dist/archetypes/nekroz/index.html` tiles emit non-empty `data-card-keywords`.
      _criterion (corrected):_ a **one-off post-`npm run build` assertion over `dist/`**, run
      and evidenced below — **not** a committed vitest row. The original criterion I wrote here
      claimed `card-text.test.ts` would cover it; that was wrong and is retracted. `npm run ci`
      orders `test` **before** `build`, so a committed dist-reading vitest row would read a
      stale or absent `dist/` on a clean checkout. Closing that properly means extending
      `scripts/check-chrome.mjs` (a post-build gate), which is outside this ticket's four
      declared Outputs. Left as residual risk instead of silently widening scope.
      Evidence (post-`npm run build`, asserted against `dist/`):
      `card page ability line 1 rendered: true`, `card page ability line 2 rendered: true`,
      `raw error-spelling leaked into HTML: false`,
      `nekroz archetype tiles: empty 0 of 12`, `home tiles: empty data-card-keywords 0 of 13`,
      `empty data-card-keywords on card page: 0 of 14`.
- [x] app functional — build gate `chrome: … pages carry the site header` still passes
      Evidence: `chrome: 151 pages carry the site header`, `npm run ci` exit 0.
- [x] extra repo gate: `python .script/release_package.py validate` — `lifecycle valid:
      /home/aron/projects/essentia/cards_mse`, exit 0 (run as
      `uv run --with pillow python .script/release_package.py validate`; the bare `python`
      lacks Pillow in this environment). This is the gate the frozen `visualSourceHash`
      protects, so its passing is the load-bearing proof.
- [ ] extra repo gate: `python .script/lint_mse_card_style.py` — exits 1 with 251 findings.
      _(UNCHECKED: pre-existing card-content lint debt, provably not caused by this change —
      the script reads only `cards_mse/` and `.script/`, and `git status --porcelain cards_mse/
      .script/ website/content/` returns 0 lines, i.e. its inputs are byte-identical to HEAD.
      ADR 0021 consequence 4 records this under-linting explicitly.)_
- [x] corpus differential (extra evidence, not required by the plan): ran both parsers over
      all 231 `card *` files under `cards_mse/`. Result — `fields LOST by corrected parser: 0`,
      `bogus keys invented by legacy parser: 98`, `new-parser bogus keys: 0`,
      `files that GAINED rule text: 62`, `files containing a 3+ tab line: 0`, neither parser
      threw. The corrected parse is a strict superset of the legacy parse: it never drops a
      field, it only stops inventing them.
- [x] commit msg draft: `fix(website): stop truncating MSE fields at an inner colon`
