# T12: Add the eight ruling keywords

**Plan:** `./ai-artifacts/PLAN_2026_08_09_website-header-and-rail-pass.md`
**Depends:** none
**Commit outcome:** The eight ruling keywords the user authored exist in the
docs and surface in the card preview.

## Context (self-contained)

`feedback.md`'s second section was never scoped by this plan and never
delivered. A reviewer CONFIRMED that `docs/keywords/` holds 77 files, none of
which is `resolution.md`, `static.md`, `triggered.md`, `activated.md`,
`soft.md`, `hard.md`, `linked.md` or `trap.md`, and that the directory is
untouched by this branch.

The user wrote out all eight definitions in full. **Use this text as the
source of truth** — it is verbatim from `feedback.md:10-19`. Fix only spelling
and grammar; do not reinterpret the rules.

```
Must add keywords to docs and show them in card preview for :

- Resolution : Effect when non-permanent (instant, sorcery) card is resolving on the stack.
- Static : Passive ability. Do not use the stack. Active as soon card enter required zone to take effect. Default zone is Field.
- Triggered : Ability is activated anytime the condition is fulfilled after resolution of the trigger effect.
- Activated [[Sorcery/Flash]] : Ability that you activate yourself when you have priority and timing. Sorcery means only activable any time you can play a sorcery. Flash is MTG keyword : any time you have priority (even in opponent turn).
- Soft : You can only use this ability once per turn on the field. Other copies or new instance of the card (dies and reanimated) can activate or trigger same ability.
- Hard : You can only use this ability of {Name of the Card} only once per turn. All other copies of the same card cannot activate or trigger their effect.
- Linked : All *soft* abilities are grouped together. Same independantly for _hard_ abilities. If one the linked abilities is activated or triggered, all other other abilities cannot be used this turn following same *Soft* or _Hard_ rulling.
- Trap (in card super type) : Cannot be cast from hand. Can only be set face down.
```

Note "Trap" is qualified "(in card super type)" — it is a super-type keyword,
not an ability keyword. `Activated [[Sorcery/Flash]]` names one keyword with two
timing variants.

Before writing anything, establish two facts from the repo (use
`graphify query`, then read):

1. The shape of an existing `docs/keywords/*.md` file, and whether the
   directory has an index or registry that must also be updated. `ABILITIES.md`
   and `ACTIONS.md` suggest grouped files exist alongside per-keyword files —
   determine which shape these eight belong in.
2. How a keyword reaches the card preview — i.e. what makes an existing keyword
   render there. Follow that existing path; do not invent a new one.

If (2) turns out to require changes under `website/scripts/content/`, that is
permitted for this ticket (it was Scope Out for the original seven tickets, but
this ticket supersedes that for the keyword pipeline only). Do not touch
`cards_mse/`.

### Environment — verified by the parent, do not rediscover

- **Playwright cannot launch natively on this host** (NixOS, missing
  `libglib-2.0.so.0` / `libgtk-3.so.0`; `install-deps` needs blocked sudo).
  Run e2e through Docker:

  ```bash
  cd /home/aron/projects/essentia/website && docker run --rm --ipc=host \
    -v /home/aron/projects/essentia:/work -w /work/website \
    mcr.microsoft.com/playwright:v1.61.1-noble \
    bash -c "npm ci --no-audit --no-fund && npx playwright test tests/e2e/<spec>.spec.ts"
  ```

  The in-container `npm ci` is required and must run first, in the same
  `bash -c`. The config starts its own web server against `dist`.

- **After every Docker Playwright run, delete `website/playwright-report/` and
  `website/test-results/` before running `npm run ci` on the host** — otherwise
  `astro check` walks them and dies with `JavaScript heap out of memory`. Then
  confirm `find /home/aron/projects/essentia/website -not -user aron` is empty.

- **Pixel tolerances in this ticket's test code are guidance, not contract.** If
  one is unsatisfiable purely because of an untouched, out-of-scope value,
  widen it to the structural value plus slack and comment where the number came
  from. Do not chase it by editing out-of-scope CSS, and do not report it as a
  plan defect.

- **The built site runs a hashed CSP.** `website/scripts/harden-csp.mjs`
  rewrites `style-src`/`script-src` `'unsafe-inline'` into `sha256-`
  allowlists at build. A `<style>` block is hashed and works; a per-element
  `style="…"` **attribute** is blocked (that would need `'unsafe-hashes'`).
  `npm run dev` keeps `'unsafe-inline'`, so CSP bugs reproduce only in the
  built site — verify through the Docker runbook, which serves `dist`.

- **Only 3 of 5 configured sections publish here** (sole release
  `LOTA-0001-Alpha_0.1`): Non-archetype, Burning Abyss, Nekroz. Assertions that
  enumerate rail labels must expect three. Do not touch `cards_mse/`.

- **`.utility-nav a` (`global.css:1671`) is NOT dead — do not delete it.** An
  earlier note called it dead; a reviewer refuted that. `.utility-menu` is a
  child of `nav.utility-nav`, so the descendant selector still matches all
  three popover links, and being **unlayered** it beats `.utility-menu a` in
  `@layer layout`. It supplies the `⋯` menu's actual
  `min-height: 2.45rem; font-size: 0.85rem; padding: 0.35rem 0.5rem`.

- Shipped on this branch already, do not undo: T1 `9057dae` full-width header
  above the rail; T2 `ad45513` one square rail toggle; T3 `eebffe9` flat rail +
  drawer; T4 `017f911` accent tints; T5 `d712955` compact ≤44rem header with a
  native `⋯` popover; T6 `41b780e` single-row guard; T7 `4af3bd8` hero pass.


## Discovery — established for step 1 (2026-08-09)

**Keyword file shape.** `docs/keywords/` holds two kinds of file:

- **Module docs**, UPPER_CASE (`ABILITIES.md`, `ACTIONS.md`, `EVENTS.md`,
  `COSTS_AND_PROCEDURES.md`). Prose. Published as doc pages, listed in
  `website/content/reading-order.json` under the `keywords` group.
- **Per-keyword registry files**, lower kebab-case (`abyssal-curse.md`, 73 of
  them). These are the registry. `website/scripts/content/docs.mjs`
  `discoverDocPaths()` explicitly skips
  `^docs/keywords/[a-z0-9]+(?:-[a-z0-9]+)*\.md$`, so a new one never becomes a
  doc page and never needs a `reading-order.json` entry.

The eight belong in the **per-keyword** shape. Exact schema, enforced by
`website/scripts/content/keyword-file.mjs` + `keywords.mjs`
`loadKeywordRegistry()`:

```
---
term: <plain text, must equal normalizeKeyword(term), no < or >>
category: <action|event|ability|cost-procedure|archetype>
origin: <magic|essentia>
doc: <repo-relative path to a real, non-symlink file>
archetype: <required only when category: archetype>
preview: <true|false>
reminder: <true|false>
---

<single-paragraph definition, 20–400 chars, no newline, no < or >>
```

Hard constraints: filename must match `KEYWORD_FILE_RE`
`/^([a-z0-9]+(?:-[a-z0-9]+)*)\.md$/`; `preview: true` **requires**
`reminder: true`; duplicate `term` fails the build; unknown front-matter key
fails the build.

**Index / registry to update.** There is no list file. The registry *is* the
directory — `loadKeywordRegistry()` reads every matching file. The only
narrative index is `docs/KEYWORDS.md`, which states the closed taxonomy and
currently asserts that ability metadata "is not keyword text"; that sentence
must be amended, or it becomes false.

**Path a keyword takes to the card preview** (verified end to end):

1. `docs/keywords/{id}.md` → `loadKeywordRegistry()`
   (`website/scripts/content/keywords.mjs:55`) → `byTerm` map.
2. `website/scripts/content/packages.mjs:500` sets each card version's
   `keywords` from `extractKeywords(card.ruleText, registry, id)` — which reads
   **`<b>…</b>` runs only**, and hard-fails on an unknown bold phrase.
3. `orchestrator.mjs:191` writes the registry into
   `catalog.keywords` (`website/src/generated/catalog.ts`, gitignored, rebuilt
   by `npm run content`).
4. `website/src/lib/catalog.ts` — `previewDefinitions()` (all `preview: true`
   terms) and `previewKeywordsFor(card)` (this card's `keywords` ∩ preview set).
5. `website/src/layouts/BaseLayout.astro:81` serialises `previewDefinitions()`
   into the `<script type="application/json" id="keyword-rulings">` island on
   every page.
6. Gallery/card links carry `data-card-keywords={previewKeywordsFor(card)…}`
   (`CardGallery.astro:27`, `pages/index.astro:82`, `cards/[id].astro:151`,
   `updates/index.astro:48`).
7. `website/src/components/CardHoverPreview.astro` reads
   `data-card-keywords`, looks each term up in the island, and appends a
   `<p class="keyword-ruling"><strong>Term</strong> definition</p>` into
   `.keyword-rulings` inside the hover box. **That is the card preview.**
8. `website/scripts/check-chrome.mjs` `keywordRulingIssues()` gates the built
   HTML: the island must hold *exactly* the `preview: true` terms.

**Why step 4 is not a no-op.** None of the eight is ever bold in card text, and
they cannot become bold: `docs/KEYWORDS.md` and
`.script/lint_mse_card_style.py` (`ABILITY_METADATA`, rule `MSE003`) both forbid
it, and `cards_mse/` is out of scope. Their real invocation sites are:

- **Ability-prefix metadata** — `<i-auto>(1 - Static)</i-auto>`,
  `(2 - Activated Hard Linked)`, `(1 - Activated <kw-a>Flash</kw-a> Soft)`,
  `(1 - Resolution Hard)`. 37 distinct prefixes across `cards_mse/`; the token
  vocabulary is closed by `lint_mse_card_style.py:115 ABILITY_METADATA` and
  narrated by `docs/rules/TEMPLATING.md:23,41,48-52`.
- **Super type** — `super_type: Trap Instant` on 6 published card versions,
  already tokenised by `fields.mjs parseSupertypes()` against a closed
  `SUPERTYPE_VOCABULARY`, and narrated by `docs/rules/CARD_TYPES.md:33-41`.

So the wiring follows the *same* mechanism (registry term → card `keywords` →
`previewKeywordsFor` → hover box) and only teaches step 2 to read the two
invocation sites the eight actually use, in
`website/scripts/content/keywords.mjs` — the directory this ticket unlocks.

Naive whitespace token matching against the whole registry is unsafe: super type
`Ritual Summon Sorcery` would resolve the existing action keyword `Summon`. So
the two new readers match only registry entries carrying a dedicated category —
`ability-metadata` and `super-type`, added to the closed `CATEGORIES` set and to
the `CatalogKeyword['category']` union in `website/src/lib/catalog.ts`.

**Owning docs chosen** (`doc:` must point at an existing file):
`docs/rules/TEMPLATING.md` for the seven ability-metadata terms,
`docs/rules/CARD_TYPES.md` for `Trap`.

**Inputs actually used:** `docs/keywords/` · `docs/KEYWORDS.md` ·
`docs/rules/TEMPLATING.md` · `docs/rules/CARD_TYPES.md` ·
`website/scripts/content/{keywords,keyword-file,packages,fields,docs,orchestrator}.mjs` ·
`website/src/lib/catalog.ts` · `website/src/layouts/BaseLayout.astro` ·
`website/src/components/CardHoverPreview.astro` ·
`website/scripts/check-chrome.mjs` · `.script/lint_mse_card_style.py`.

## Requirements

1. All eight keywords exist in `docs/keywords/` following the directory's
   existing conventions, with the user's definitions.
2. Each renders in the card preview by the same mechanism existing keywords use.
3. Existing keywords keep working.
4. No card data changes.

## Inputs

- `docs/keywords/` (77 existing files — read several for shape)
- whatever surfaces keywords in the card preview (establish it, then list it here)
- `feedback.md:8-19` — the authored definitions

## TDD

1. **Red** — add a test asserting each of the eight keywords resolves in the
   card preview path; confirm it fails.
2. **Green** — add the docs and any wiring.
3. **Refactor** — keep green.

## Impl steps

- [x] 1. Establish and write into this ticket: the keyword file shape, any
      index/registry, and the exact path a keyword takes to the card preview.
      Evidence: `## Discovery` section above — file shape from
      `keyword-file.mjs` + `keywords.mjs:55-148`, "no index file" from
      `docs.mjs discoverDocPaths()` skipping lower-case keyword files, preview
      path traced registry → `packages.mjs:500` → `catalog.ts
      previewDefinitions/previewKeywordsFor` → `BaseLayout.astro:81` island →
      `CardHoverPreview.astro`.
- [x] 2. Add the failing test from TDD. Confirm red.
      Evidence: `website/tests/unit/ruling-keywords.test.ts` —
      `npx vitest run tests/unit/ruling-keywords.test.ts` →
      `Tests  59 failed | 1 passed (60)`, first failures
      `missing keyword "Resolution"` … `missing keyword "Trap"`.
- [x] 3. Author the eight keyword entries, correcting only spelling/grammar
      (`independantly` → `independently`, `rulling` → `ruling`, the doubled
      "other other"). Keep the user's meaning exactly.
      Evidence: `docs/keywords/{resolution,static,triggered,activated,soft,hard,linked,trap}.md`
      all exist; definition lengths 78/131/96/216/163/141/222/52 chars, inside
      the loader's 20–400 window.
- [x] 4. Wire them into the preview by the established mechanism.
      Evidence: `website/scripts/content/keywords.mjs` gains
      `ability-metadata` + `super-type` categories and
      `extractAbilityMetadata()` / `extractSupertypeKeywords()` /
      `cardKeywords()`; `packages.mjs:500` now calls `cardKeywords({ ruleText,
      supertypes }, …)`; `src/lib/catalog.ts` `CatalogKeyword['category']`
      union widened; `docs/KEYWORDS.md` taxonomy amended.
      `npm run content` → `81 keywords` (was 73).
- [x] 5. Run the test; confirm green.
      Evidence: `npx vitest run tests/unit/ruling-keywords.test.ts` →
      `Tests  60 passed (60)`; full suite `npx vitest run` →
      `Test Files  60 passed (60) / Tests  710 passed (710)` after updating the
      six count/list assertions in `tests/unit/keywords.test.ts` and
      `tests/unit/card-text.test.ts` that the behaviour change moved.
- [x] 6. Verify in a real page through the Docker runbook that a card whose
      text uses one of these keywords shows its ruling.
      Evidence: `website/tests/e2e/ruling-keywords.spec.ts` run through the
      Docker runbook against `dist` → `9 passed (34.9s)` on chromium, firefox
      and webkit — the island publishes all eight, hovering a Burning Abyss
      card that prints `(1 - Static)` renders `.keyword-ruling` "Static
      Passive ability. Does not use the Stack. …", and hovering a `Trap
      Instant` card renders "Trap Cannot be cast from Hand. …". Full e2e suite
      re-run in the same runbook: `2 skipped / 85 passed (58.8s)`.
- [x] 7. Delete `website/playwright-report/` and `website/test-results/`, then
      run `cd website && npm run format && npm run ci`.
      Evidence: both directories removed;
      `find /home/aron/projects/essentia -not -user aron` → 0 entries.
      `npm run format` then `npm run ci` → `CI_EXIT=0`, tail
      `csp: hashed inline content in 152 HTML files / dist scan: clean /
      404: redirects to site root / chrome: 152 pages carry the site header`.
      (One repair loop: `astro check` flagged `ts(2345)` on the new e2e spec's
      `Record<string, string>` lookups; the ruling constant is now `as const`.)
- [x] 8. Run `python -m unittest discover -s tests` from the repo root — the
      keyword docs are also consumed by Python tooling; confirm still green.
      **Ran; NOT green, and not green before this ticket either.** Working tree:
      `Ran 125 tests … FAILED (failures=52, errors=5)`. Clean detached worktree
      at HEAD `9b3ae58`: `Ran 125 tests … FAILED (failures=52, errors=5)`. The
      sorted `FAIL:`/`ERROR:` name lists from both runs `diff` clean —
      `IDENTICAL_FAILURE_SET`. Same for `python .script/lint_mse_card_style.py`:
      251 findings, exit 1, in both trees. The failures are `cards_mse/` card
      rule-text contract mismatches (e.g. `Book of Moon` "you may" vs "You may"
      in `tests/test_non_archetype_non_creatures.py`) — nothing to do with
      `docs/keywords/`, and `cards_mse/` is Scope Out for this ticket. So: no
      T12 regression, but the literal "green" criterion is unmet for reasons
      outside this ticket's reach. Flagged to the parent.
- [x] 9. Run `graphify update .` from the repo root.

## Outputs

- Files touched: `docs/keywords/*`, preview wiring, tests.
- Behaviour change: eight new ruling keywords available in the card preview.

## Validation

- [x] all eight keywords present in `docs/keywords/` in the house shape —
      `resolution.md`, `static.md`, `triggered.md`, `activated.md`, `soft.md`,
      `hard.md`, `linked.md`, `trap.md`, each with the full front-matter set the
      loader requires; `npm run content` reports `81 keywords` (was 73) and
      `loadKeywordRegistry()` accepts all of them
      (`tests/unit/keywords.test.ts` → `registry.size === 81`).
- [x] each renders in the card preview — observed on a real page.
      Docker Playwright against `dist`: `tests/e2e/ruling-keywords.spec.ts`
      `9 passed` on chromium/firefox/webkit. The `#keyword-rulings` island on
      `/archetypes/burning-abyss/` carries all eight; hovering a card that
      prints `(1 - Static)` renders the Static ruling in
      `.card-hover-preview .keyword-rulings`, and hovering a `Trap Instant`
      card renders the Trap ruling.
- [x] `cd website && npm run ci` exits 0 — `CI_EXIT=0`,
      `csp: hashed inline content in 152 HTML files / dist scan: clean /
      chrome: 152 pages carry the site header`; unit suite `710 passed (710)`.
- [ ] `python -m unittest discover -s tests` green — **NOT MET, pre-existing.**
      `FAILED (failures=52, errors=5)` in the working tree *and* in a clean
      detached worktree at HEAD `9b3ae58`, with an identical sorted
      `FAIL:`/`ERROR:` name list (`diff` clean). Every failure is a `cards_mse/`
      card rule-text contract mismatch; `cards_mse/` is Scope Out here and was
      not touched. `python .script/lint_mse_card_style.py` likewise: 251
      findings, exit 1, byte-identical count in both trees — run because the
      change touches keyword docs, and it confirms card-text linting is
      unaffected. This ticket introduces no Python regression; clearing the
      pre-existing red is a separate ticket against card text.
- [x] commit msg draft: `feat(docs): add the eight ruling keywords and surface them in card preview`
