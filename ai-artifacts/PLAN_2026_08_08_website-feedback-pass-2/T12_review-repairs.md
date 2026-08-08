# T12: Review and repairs

**Plan:** `./ai-artifacts/PLAN_2026_08_08_website-feedback-pass-2.md`
**Depends:** T4, T5, T6, T10, T11
**Commit outcome:** Every feedback line of pass 2 is verified on the built site, the whole verification suite is green, and the project documentation and ADR index tell the truth about the new keyword, intro, reading-order and navigation model.

## Context (self-contained)

- Goal: website feedback pass 2 — keyword rulings in `docs/keywords/{id}.md`, the Ash
  Blossom text fix, markdown section intros, square/slow hero art, brand in the
  header, rail toggles inside the nav, docs/blog navigation in the rail, and a
  back-to-top control.
- This slice: the closing pass. Walk every feedback line against the built site, run
  every gate, and repair whatever drifted while the earlier tickets landed.
- Out of scope here: new features, new copy beyond fixing what an earlier ticket got
  wrong, re-rendering cards other than Ash Blossom.
- Assumptions in force: `graphify` is not installed — do not run it and do not add
  `graphify update .` to any workflow.

## Requirements

- Full verification block from `AGENT.md` is green.
- Every acceptance row in the checklist below is confirmed by looking at the built
  output or the running dev server, not by reading source.
- Documentation updated so nothing describes a deleted mechanism:
  - `docs/KEYWORDS.md` — points at `docs/keywords/{id}.md` (T2 already edits this;
    verify it survived).
  - `docs/CONTEXT.md` — the sources-of-truth map names `docs/keywords/{id}.md`,
    `website/content/section-intros/`, and `website/content/reading-order.json`, and
    no longer names `website/content/keywords.json`.
  - `docs/GLOSSARY.md` — entries for **keyword file**, **section intro**,
    **reading order**, **reading nav**, **back-to-top**, following the existing entry
    style (activate `.claude/skills/make-glossary-aron/SKILL.md`).
  - `website/DESIGN.md` — the brand/wordmark placement paragraph mentions the header,
    not the rail; the reading-surface section no longer describes a `reading-rail`.
  - `website/README.md` — content pipeline list mentions `reading-order.json` and
    `section-intros/`.
  - `docs/ADR/README.md` — `Proposed` list gains 0020–0026 (0020, 0021, 0022 are
    already on disk but missing from the index; add them too).
- `docs/website-information-architecture.html` regenerated: route map unchanged, but
  the navigation model, content pipeline and gate sections describe the rail-owned
  reading nav, the header brand, the per-keyword docs files, and the reading-order
  config.

## Inputs

- Verification block from `AGENT.md`:
  ```bash
  python -m unittest discover -s tests
  python .script/lint_mse_card_style.py
  python .script/release_package.py validate
  cd website && npm run ci && npm run test:e2e
  ```
- `docs/ADR/proposed/0023-keyword-rulings-in-per-keyword-docs.md`,
  `0024-section-intro-prose-in-content.md`,
  `0025-catalog-rail-owns-reading-navigation.md`,
  `0026-reading-order-config.md` — written alongside this plan; they must still match
  what shipped, and any deviation is recorded in the ADR's `Consequences`.
- `docs/website-information-architecture.html` — dark-mode standalone HTML doc, no
  external assets; its `<style>` block is the house style to preserve.
- **From Depends:**
  - T4: `cards_mse/01_alpha/LOTA-0001-Alpha_0.1/` rebuilt; Ash Blossom's `rule_text`
    is `… interacts with Deck <i-auto>(<b>Draw</b>, <b>Mill X</b>, <b>Search</b>, etc.)</i-auto>; <b>Counter</b> it.`;
    `.script/lint_mse_card_style.py` has the MSE009 enumeration exemption.
  - T3: `docs/keywords/{id}.md` files carry `preview` and `reminder`;
    `previewKeywordsFor()` and `reminderDefinitions()` live in
    `website/src/lib/catalog.ts`.
  - T5: `website/content/section-intros/{slug}.md` ×5; `catalog.sections[].introMarkdown`.
  - T6: `.catalog-hero-art { aspect-ratio: 1 / 1 }`, 900 ms transform transition.
  - T10: `Navigation.svelte` takes `mode`/`readingKind`/`readingGroups`;
    `DocsRail.astro` and `BlogRail.astro` are deleted; `check-chrome.mjs` requires
    `class="reading-switch"` on reading pages.
  - T11: `check-chrome.mjs` requires `class="back-to-top"` on every page but `404.html`.

## TDD

1. **Red** — run the full verification block and record every failure verbatim.
2. **Green** — repair each failure at its source ticket's file, not by weakening a test.
3. **Refactor** — remove any leftover dead code the pass created (unused imports,
   orphaned CSS, orphaned test fixtures); keep green.

## Test plan

| Test | Input | Expect |
| ---- | ----- | ------ |
| Python suite | `python -m unittest discover -s tests` | exit 0 |
| MSE style | `python .script/lint_mse_card_style.py` | exit 0 |
| Package lifecycle | `python .script/release_package.py validate` | exit 0 |
| Website CI | `cd website && npm run ci` | exit 0 |
| Website e2e | `cd website && npm run test:e2e` | exit 0 |
| Link check | `cd website && npm run links:check` | exit 0 |
| Budgets | `cd website && npm run budgets:check` | exit 0 |
| Rights | `cd website && npm run rights:check` | exit 0 |
| Dead reference sweep | `grep -rn 'content/keywords.json\|DocsRail\|BlogRail\|reading-rail\|essentiaKeywordsFor\|introFromDoc\|DOC_GROUPS' website/src website/scripts website/tests docs *.md` | no hits |

## Acceptance checklist (built site)

- [ ] `docs/keywords/mill-n.md` edited → `npm run content` → new text on the site;
      a brand-new `docs/keywords/*.md` file appears as a keyword without code changes
- [ ] `/sections/non-archetype/non-archetype/` — hero art square, bigger, slow un-zoom
- [ ] `/sections/non-archetype/non-archetype/` — intro reads "All cards not part of
      any defined archetype. Collection of classic Yu-Gi-Oh! Staples"
- [ ] Hovering the Ash Blossom `gallery-card` lists **Mill N** and **Search** rulings
- [ ] Every `gallery-card` whose text contains `Mill X` shows the **Mill N** ruling
- [ ] `/cards/ash-blossom-and-joyous-spring/` — text reads
      `(Draw, Mill X, Search, etc.)` with the three actions bold
- [ ] `/cards/ash-blossom-and-joyous-spring/` — no `Counter(Cancel a spell …)` reminder
- [ ] `/archetypes/nekroz/` — the new three-paragraph intro with its bullet list
- [ ] `/archetypes/burning-abyss/` — the new aristocrats intro
- [ ] Header shows the wordmark at 1400 px and the letter mark at 390 px
- [ ] Nav has no text brand; collapsing the rail never hides the brand
- [ ] Rail has a toggle at its top and at its bottom; collapsed it is a visible strip
      that keeps both
- [ ] `/docs/` and `/blog/` — the left rail carries the `Docs | Blog` switcher and the
      article list; there is no in-page reading rail; the article body is wider
- [ ] `/cards/…` — the left rail is back to the catalog
- [ ] Editing `website/content/reading-order.json` reorders the docs list after
      `npm run content` (reverted afterwards)
- [ ] Back-to-top appears after scrolling, sits bottom-right, returns to the top

## Impl steps

- [ ] 1. `git status --short` — confirm no stray file from an earlier ticket
      (`website/scripts/migrate-keywords.mjs`, `migrate-keyword-flags.mjs`, temp
      fixtures) survived.
- [ ] 2. Run every command in the test plan; record failures.
- [ ] 3. Repair each failure at its source; never delete an assertion to pass.
- [ ] 4. Run the dead-reference sweep; delete whatever it finds.
- [ ] 5. Update `docs/CONTEXT.md`, `docs/GLOSSARY.md`, `website/DESIGN.md`,
      `website/README.md` per **Requirements**.
- [ ] 6. Verify `docs/ADR/README.md` lists 0020–0026 under `Proposed` (added when this
      plan was written) and that every bullet's title matches the `# ADR NNNN — …`
      heading of the file it links to.
- [ ] 7. Re-read the four new ADRs; if the shipped design deviates from any of them,
      append the deviation and its reason under that ADR's `Consequences`.
- [ ] 8. Update `docs/website-information-architecture.html`:
      - the "Navigation model" section describes: header = wordmark + breadcrumb +
        utility nav + Find; left rail = catalog on most pages, `Docs | Blog` switcher
        + article list on reading pages; two rail toggles inside the rail; collapsed
        rail is a 3.25rem strip.
      - the "Content pipeline" section names `docs/keywords/{id}.md`,
        `website/content/section-intros/{slug}.md`, and
        `website/content/reading-order.json` as inputs, and drops
        `website/content/keywords.json`.
      - the gates list names the `reading-switch` and `back-to-top` chrome rules.
      - keep the existing `<style>` block and the standalone/no-external-asset rule.
- [ ] 9. Re-run the full verification block one last time.
- [ ] 10. `cd website && npm run build && npm run preview` and walk the acceptance
      checklist in the browser.

## Outputs

- Files touched: `docs/CONTEXT.md`, `docs/GLOSSARY.md`, `docs/ADR/README.md`,
  `docs/website-information-architecture.html`, `website/DESIGN.md`,
  `website/README.md`, plus whatever repairs the gates demand.
- Public API / behaviour change: none beyond repairs.
- Migrate / config: none.

## Validation

- [ ] tests pass: `python -m unittest discover -s tests`; `python .script/lint_mse_card_style.py`; `python .script/release_package.py validate`; `cd website && npm run ci && npm run test:e2e`
- [ ] manual check: every row of the acceptance checklist above is ticked
- [ ] app functional — `cd website && npm run build` exits 0 and `npm run preview`
      serves every route in the checklist
- [ ] commit msg draft: `docs(website): record the pass-2 navigation and content model`
