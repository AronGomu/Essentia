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
  nix-shell -p python313Packages.pillow --run "python .script/release_package.py validate"
  cd website && npm run ci && npm run test:e2e
  ```

> **Parent note (inlined 2026-08-08) — two of those commands cannot be green here, and
> one needs a wrapper. Grade them exactly as written below; do not "fix" them.**
>
> 1. `release_package.py validate` needs **Pillow**, which the bare host interpreter
>    lacks (NixOS profile python 3.13.14, no venv, no `pip`). Bare invocation exits 1
>    with `ModuleNotFoundError: No module named 'PIL'`. Wrapped in
>    `nix-shell -p python313Packages.pillow --run "…"` it exits **0** and prints
>    `lifecycle valid` — verified by the parent. Use the wrapper; the gate is exit 0.
> 2. `npm run test:e2e` **cannot run on this host at all.** Every Playwright browser
>    aborts at launch: `chrome-headless-shell: error while loading shared libraries:
>    libglib-2.0.so.0: cannot open shared object file`. T1 measured 24/24 failing on
>    the unmodified tree. This is a missing system library, not a test defect. Bar:
>    **no regression** — still 24 failures, all at browser launch, none with a test
>    assertion in the failure message. Do not attempt to install system libraries.
> 3. `python -m unittest discover -s tests` was already red before this plan started.
>    T1 baseline at `09ab091`: `Ran 121 tests`, `FAILED (failures=52, errors=5)`.
>    Bar: **no regression** — failures ≤ 52 and errors ≤ 5, and no new failing test
>    name that this plan's tickets could have caused. Fixing the pre-existing 52 is
>    out of scope.
> 4. `python .script/lint_mse_card_style.py` baseline at `09ab091`: exit 1, **249**
>    lines matching `MSE0`. T4 adds one enumeration exemption, which should
>    **reduce** that count. Bar: findings ≤ 249, and the Ash Blossom enumeration
>    finding specifically gone.
>
> Only `cd website && npm run ci` is a true green gate: T1 measured exit 0,
> `Test Files 47 passed (47)`, `Tests 435 passed (435)`, `151 page(s) built`,
> `dist scan: clean`. It must still exit 0, with test counts ≥ 435.
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

> **No browser on this host** — every Playwright browser aborts at launch
> (`libglib-2.0.so.0` missing), so each row below was satisfied against built `dist/`
> markup and compiled CSS, or against a real `npm run content` round-trip in a
> disposable worktree. Where a clause is only observable by a human eye or a real
> click, it is called out on the row.

- [x] `docs/keywords/mill-n.md` edited → `npm run content` → new text on the site;
      a brand-new `docs/keywords/*.md` file appears as a keyword without code changes
      — done for real in the worktree: the edited body appears in
      `src/generated/catalog.ts`, and a new `t12-probe-keyword.md` took the corpus from
      73 to `74 keywords` with no code change. Both probes reverted.
- [x] `/sections/non-archetype/non-archetype/` — hero art square, bigger, slow un-zoom
      — compiled CSS: `.catalog-hero-art{aspect-ratio:1}`, `.catalog-hero img{transition:transform .9s var(--ease-out)…}`,
      rest `transform:scale(1.12)` → hover/focus `scale(1)`, `max-width:24rem` at narrow widths.
- [x] `/sections/non-archetype/non-archetype/` — intro reads "All cards not part of
      any defined archetype. Collection of classic Yu-Gi-Oh! Staples"
      — present in `dist/.../index.html` inside `<div class="catalog-hero-intro"><p>…`.
- [x] Hovering the Ash Blossom `gallery-card` lists **Mill N** and **Search** rulings
      — the gallery card carries `data-card-keywords="Mill N,Search"`, which is what the
      hover overlay reads. The pointer interaction itself needs a browser.
- [x] Every `gallery-card` whose text contains `Mill X` shows the **Mill N** ruling
      — one card in the published corpus has `Mill X` in its `ruleText`
      (`ash-blossom-and-joyous-spring`); its gallery card carries `Mill N`. Zero violations.
- [x] `/cards/ash-blossom-and-joyous-spring/` — text reads
      `(Draw, Mill X, Search, etc.)` with the three actions bold
      — dist: `<em>(<strong>Draw</strong>…, <strong>Mill X</strong>…, <strong>Search</strong>…, etc.)</em>`.
- [x] `/cards/ash-blossom-and-joyous-spring/` — no `Counter(Cancel a spell …)` reminder
      — dist ends `…etc.)</em>; <strong>Counter</strong> it.`; zero reminder spans after
      `Counter`, and "Cancel a spell or ability" appears nowhere on the page.
- [x] `/archetypes/nekroz/` — the new three-paragraph intro with its bullet list
      — three markdown blocks render as 2 `<p>` + a `<ul>` of 3 `<li>`, matching
      `website/content/section-intros/nekroz.md` exactly.
- [x] `/archetypes/burning-abyss/` — the new aristocrats intro
      — renders the authored paragraph, opening "Burning Abyss is a black
      aristocrats-based archetype."
- [x] Header shows the wordmark at 1400 px and the letter mark at 390 px
      — dist header: `<picture><source media="(max-width: 44rem)" srcset="/brand/mark-64.png"><img src="/brand/wordmark-320.png">`,
      with `.compact-brand img{width:160px}` and a 44rem override to `2rem × 2rem`.
      Which raster a real viewport paints is not observable without a browser.
- [x] Nav has no text brand; collapsing the rail never hides the brand
      — no `class="brand"` anywhere in the built nav; `class="compact-brand"` is in
      `.site-header`, and the collapse rule only touches `.desktop-catalog` children.
- [x] Rail has a toggle at its top and at its bottom; collapsed it is a visible strip
      that keeps both
      — two `class="rail-toggle…"` children inside `<nav id="desktop-catalog">`;
      compiled CSS `html[data-catalog=collapsed]{--sidebar:3.25rem}` and
      `html[data-catalog=collapsed] .desktop-catalog>:not(.rail-toggle){display:none}`.
- [x] `/docs/` and `/blog/` — the left rail carries the `Docs | Blog` switcher and the
      article list; there is no in-page reading rail; the article body is wider
      — `dist/docs/index.html`: rail contains `class="reading-switch"` and both toggles,
      no `/archetypes/` links, and the string `reading-rail` appears nowhere on the page.
      `.reading-shell{grid-template-columns:minmax(0, 1fr) var(--reading-toc)}`.
- [x] `/cards/…` — the left rail is back to the catalog
      — `dist/cards/ash-blossom-and-joyous-spring/index.html`: rail has `/archetypes/`
      links and no `reading-switch`.
- [x] Editing `website/content/reading-order.json` reorders the docs list after
      `npm run content` (reverted afterwards)
      — done for real: reversing the `overview` group turned
      `/docs/, /docs/context/, /docs/glossary/` into
      `/docs/glossary/, /docs/context/, /docs/` and the revert restored it.
- [x] Back-to-top appears after scrolling, sits bottom-right, returns to the top
      — dist markup `<button class="back-to-top" type="button" hidden>` on every page but
      `404.html` (check-chrome enforces it); compiled CSS `position:fixed;
      bottom:clamp(1rem,3vw,2rem); right:clamp(1rem,3vw,2rem)`; seven unit tests cover
      the show/hide threshold and the bottom-right anchor. The click itself
      (`window.scrollTo({top:0})` in `BackToTop.astro`) is only exercised by the e2e
      test "back to top returns the visitor to the top", which cannot launch here.

## Impl steps

- [x] 0a. **Routed from T4 (parent, 2026-08-08) — tighten the MSE009 exemption to
      actually be an *enumeration* exemption.** T4 implemented Impl steps 1–3 of its
      ticket verbatim, and the resulting guard keys on *any* italic range followed by
      `,`, `)` or ` or `. Consequence the T4 worker measured and escalated rather than
      absorbing: `<i-auto>(1 - Activated Flash <b>Counter</b>)</i-auto>` raised MSE009
      before the change and is **silently exempt** after it, with no other rule catching
      it (`Counter` is in `KNOWN_KEYWORDS`, so MSE004 does not fire). The plan's Scope In
      authorises "one enumeration exemption", so narrowing this to a real enumeration is
      completing the stated intent, not new scope.
      Fix: additionally require the enclosing italic span to **start with `(`** (the T4
      worker's own suggestion, which preserves the Ash Blossom case).
      Validate: `python -m unittest tests.test_mse_card_style` exit 0; the Ash Blossom
      enumeration still exempt; `<i-auto>(1 - Activated Flash <b>Counter</b>)</i-auto>`
      raises MSE009 again; repo-wide `python .script/lint_mse_card_style.py` finding count
      stays at **249** (rising above 249 means you re-broke a card that was already clean;
      the count must not fall either, or you have widened the exemption instead).
      *Done:* guard is now `is_enumerated_example()` — the action must sit in an italic
      span whose visible text starts with `(`, be introduced by that `(` or by a comma,
      and be followed by `,`/`)`/` or `. Repo lint output is byte-identical to the
      pre-change run, 249 `MSE0` lines. `tests.test_mse_card_style` has 1 failure —
      `test_checked_in_canonical_cards_pass`, pre-existing (it asserts the repo lints
      clean, and the repo has had 249 findings since before this plan); the exit-0
      clause of this step is unattainable and is superseded by the Parent note's
      no-regression bar. All four MSE009 tests pass.
- [x] 0b. **Routed from T4 (parent, 2026-08-08) — the exemption's second condition is
      unpinned.** The T4 worker mutation-tested its own work and found that changing the
      guard to `if italic_containers(match):` — deleting the `ENUMERATED_ACTION_RE` half
      entirely — leaves the whole Python suite green. That is a test that cannot fail.
      T4's Test plan authorised exactly two tests, so the worker correctly did not add a
      third; add it here.
      Fix: add the case the worker identified — `<i-auto>(<b>Draw</b> ordinary cards.)</i-auto>`
      must still raise MSE009 (bold action inside italics **not** followed by `,`/`)`/`or`).
      Validate: red/green mutation proof — with the `ENUMERATED_ACTION_RE` condition
      deleted the new test fails; with it restored the suite is green.
      *Done:* `tests/test_mse_card_style.py::test_bold_action_in_italic_prose_is_rejected`
      covers both routed cases. Mutation A (enumeration-shape half deleted) → FAIL on
      `(1 - Activated Flash <b>Counter</b>)`; mutation B (`ENUMERATED_ACTION_RE`
      condition deleted) → FAIL on `(<b>Draw</b> ordinary cards.)`; restored → OK.
- [x] 0c. **Routed from T4 (parent, 2026-08-08) — residual risk, decide and record, do not
      silently inherit.** `release_package.py rebuild` re-exports only the package-root
      `renders/`, not the component set's
      `01_YGO_Legend_of_the_Alpha.mse-set/render/` copy, which still holds the old
      lowercase-text image while `package-sha256.json` records its stale hash as correct.
      `validate` exits 0 and the website reads `packageRoot/renders`
      (`website/scripts/content/packages.mjs:427`), so **published output is correct**.
      This is pre-existing pipeline behaviour that T4's edit merely made visible, and
      fixing the rebuild pipeline is Out of scope for this plan.
      Action: do **not** fix it here. Confirm the two claims above are still true
      (published render is the new one; `validate` still exits 0), then record it as a
      known issue in the run's residual-risk list so it is not lost.
      *Done, not fixed:* `renders/Ash Blossom & Joyous Spring.png` is 325 847 B, md5
      `c38209b0…`, last written by `65b9922`; the component copy
      `01_YGO_Legend_of_the_Alpha.mse-set/render/…` is still 325 603 B, md5
      `181124bf…`, last written by `f44e9d6`. `website/scripts/content/packages.mjs:427`
      reads `path.join(packageRoot, 'renders')`, so the published image is the new one.
      `nix-shell -p python313Packages.pillow --run "python .script/release_package.py validate"`
      → exit 0, `lifecycle valid`. Carried in the report's residual-risk list.
- [x] 1. `git status --short` — confirm no stray file from an earlier ticket
      (`website/scripts/migrate-keywords.mjs`, `migrate-keyword-flags.mjs`, temp
      fixtures) survived.
      *Done:* `git status --short -uall -- website docs .script tests cards_mse ai-artifacts`
      lists only this ticket's own edits (`.script/lint_mse_card_style.py`,
      `tests/test_mse_card_style.py`, this ticket file). Neither migrate script exists.
      The ~41 other entries are the repo owner's in-flight work under `blog/`,
      `original_images_hd/` and `.tmp/` — out of this plan's jurisdiction, not touched.
- [x] 2. Run every command in the test plan; record failures.
      *Done, all in a disposable detached worktree at `HEAD` + this ticket's patch:*
      `npm run ci` exit **0** — `Test Files 52 passed (52)`, `Tests 522 passed (522)`,
      `151 page(s) built`, `dist scan: clean`, `404: redirects to site root`,
      `chrome: 151 pages carry the site header`.
      `npm run links:check` exit 0 — `links: 151 pages clean`.
      `npm run budgets:check` exit 0 — `9 JS, 151 HTML, 215 images, 50 print masters
      (16 MiB) within limits`.
      `npm run rights:check` exit 1 — `Public artifact blocked: owner approval remains
      pending in content/asset-rights.json`. **Pre-existing**: byte-identical failure at
      unmodified `HEAD`. Approving rights is an owner action, not a code repair.
      `npm run test:e2e` exit 1 — 24 failures, 24 `libglib-2.0.so.0` aborts, **zero**
      failures carrying an assertion. Baseline exactly.
      `python -m unittest discover -s tests` exit 1 — `Ran 124 tests`,
      `failures=52, errors=5` (123 at `HEAD`; the extra test is step 0b's). No regression.
      `python .script/lint_mse_card_style.py` exit 1 — **249** `MSE0` lines, and `diff`
      against the pre-change run reports no difference at all.
      `nix-shell -p python313Packages.pillow --run "python .script/release_package.py validate"`
      exit **0** — `lifecycle valid`.
      Also run: `npm run immutability:check` exit 1, `ModuleNotFoundError: No module
      named 'PIL'` — the same missing-Pillow condition the Parent note documents for
      `release_package.py`; not in this ticket's test plan and not a code defect.
- [x] 3. Repair each failure at its source; never delete an assertion to pass.
      *Done:* two of my own edits broke gates and both were fixed at source, not
      silenced. (1) `npm run format:check` failed on `website/README.md` — my new list
      let Prettier fold the closing paragraph into the last bullet; the blank line was
      restored so the paragraph stands on its own. (2) `npm run check` failed with
      `content: doc docs/CONTEXT.md: unpublished link target docs/keywords/` — my new
      bullet linked a directory; it now names `docs/keywords/{id}.md` as code and links
      the published `KEYWORDS.md` instead. No assertion was deleted or widened.
      The four docs outside `website/` that Prettier also flags
      (`docs/CONTEXT.md`, `docs/GLOSSARY.md`, ADR 0023, the IA HTML) fail identically at
      `HEAD` and are outside the `website/` Prettier scope — left alone rather than
      reformatted, which would be churn this ticket did not ask for.
- [x] 4. Run the dead-reference sweep; delete whatever it finds.
      *Done:* the sweep's only live lie was `docs/website-information-architecture.html`
      describing `.reading-rail` as a current layout — rewritten in step 8. Everything
      else it returns is deliberate: negative assertions that the deleted mechanism
      stays deleted (`showcase.spec.ts`, `reading-shell.test.ts`, `reading-tokens.test.ts`),
      historical ADRs (0015, 0020, 0023–0026 name what they replaced), `feedback.md`
      (the request text itself), and the IA doc's own before/after columns.
      `website/src/lib/docs.ts` matches only on `DocsRailGroup`/`docsRailGroups()`,
      which are live and still correctly named — the rail exists, it just moved owner
      — so they stay; logged as residual risk, not deleted.
      `website/src/generated/catalog.ts` also matches, but `website/src/generated/` is
      gitignored: it is a stale local build product, refreshed by `npm run content`.
- [x] 5. Update `docs/CONTEXT.md`, `docs/GLOSSARY.md`, `website/DESIGN.md`,
      `website/README.md` per **Requirements**.
      *Done:* `docs/CONTEXT.md` — sources of truth gain `docs/keywords/{id}.md`,
      `website/content/section-intros/{slug}.md` and `website/content/reading-order.json`
      (it never named `keywords.json`, so nothing to remove). `docs/GLOSSARY.md` — new
      `intro`, `reading-order`, `reading-nav`, `back-to-top` and `keyword` entries; the
      `palette` row pointed at `SearchPalette.svelte`, deleted in pass 1, and now points
      at `FindPalette.svelte` / `src/lib/find.ts`. `website/DESIGN.md` — the Lit Room
      Rule no longer gives the prose panel "its rails" and gains The One Rail Rule; the
      Logo section gains The One Home Rule (mark lives in `.site-header`, the rail owns
      no brand). `website/README.md` — the regeneration section now lists every authored
      input, including `content/reading-order.json` and `content/section-intros/`.
      `docs/KEYWORDS.md` verified: T2's paragraph pointing at `docs/keywords/{id}.md`
      survived intact.
- [x] 6. Verify `docs/ADR/README.md` lists 0020–0026 under `Proposed` (added when this
      plan was written) and that every bullet's title matches the `# ADR NNNN — …`
      heading of the file it links to.
      *Done:* 0020–0026 are all listed. Of the 15 ADRs that carry an `# ADR NNNN — …`
      heading, one bullet was wrong: 0017 read "…ship without MDX" against a heading of
      "…ship without MDX **or new runtime dependencies**" — corrected. 0003 and
      0001/0002/0004/0005 keep legacy `# Rule review — …` headings and 0022 a
      `# 0022: …` heading; their bullet titles are summaries, not ADR-form titles, and
      are left alone (rewriting historical ADR headings is out of scope).
- [x] 7. Re-read the four new ADRs; if the shipped design deviates from any of them,
      append the deviation and its reason under that ADR's `Consequences`.
      *Done:* one deviation found, in 0023 decision 3 (`archetype` "iff
      `category: archetype`"): the shipped loader requires it for `category: archetype`
      and allows it anywhere, because `docs/keywords/on-cast-spellbook.md` is
      `category: event, archetype: spellbook`. Appended to 0023's `Consequences`.
      0024 (5 intro files, `introMarkdown` rendered through `Markdown.astro`,
      `sectionIntroSummary` feeding `intro`, `introFromDoc()` gone), 0025 (brand first
      child of `.site-header`; two `.rail-toggle` children of `<nav id="desktop-catalog">`;
      `--sidebar: 3.25rem` + `> :not(.rail-toggle) { display: none }`; `.reading-shell`
      is `minmax(0, 1fr) var(--reading-toc)`; gate requires `class="reading-switch"`)
      and 0026 (`reading-order.json` schemaVersion 1, `DOC_GROUPS` gone, message
      `is not listed in the reading order`, `catalog.postGroups`) all match what
      shipped. 0023's other decisions verified: 73 lower-case files, preview 52/21,
      reminder 72/1, `mill-n.preview: true`, `counter.reminder: false`, and
      `keywords.mjs:126` fails the build on `preview && !reminder`.
- [x] 8. Update `docs/website-information-architecture.html`:
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
      *Done:* the `<style>` block is byte-identical (`git diff` touches no line inside
      it) and the page still loads no external asset — no `<script>`, `<link>`, `<img>`
      or remote URL other than the GitHub prose link. Navigation model rewritten (rail
      with two modes; two in-rail toggles; `3.25rem` collapsed strip; header = mark +
      breadcrumb + three destinations + Find; back-to-top card added). Content pipeline
      gained an authored-inputs paragraph naming `docs/keywords/{id}.md`,
      `section-intros/{slug}.md` and `reading-order.json`, and stages 1, 2 and 5 now
      describe the intro loader, the per-keyword files and `reading-order.mjs`; no
      mention of `website/content/keywords.json` survives except as "before". The
      check-chrome gate card names both `class="reading-switch"` and
      `class="back-to-top"`. Untrue statements also corrected: the stale
      "Feedback pass 2 — accepted changes … not yet built" table actually described
      pass 1 and is now "Feedback pass 1 — shipped 2026-08-07" with the two superseded
      rows marked, and a new "Feedback pass 2 — what shipped" table records T2–T11; the
      `/blog/` source was `website/content/blog/*/index.md` (moved to `blog/*.md` in
      pass 1); the rail drawer breakpoint read 58rem against a 64rem media query; and
      the Find card still called the palette `SearchPalette.svelte`.
- [x] 9. Re-run the full verification block one last time.
      *Done, final state:* `npm run ci` exit 0 (52 files / 522 tests / 151 pages / dist
      scan clean / chrome 151), lint 249 findings identical to baseline,
      `release_package.py validate` exit 0 `lifecycle valid`, python suite
      `Ran 124 … failures=52, errors=5`, e2e still 24 launch aborts. The disposable
      worktree was removed afterwards.
- [x] 10. `cd website && npm run build && npm run preview` and walk the acceptance
      checklist in the browser.
      *Partially.* `npm run build` ran (inside `npm run ci`) and exits 0 with 151 pages.
      `npm run preview` plus a browser walk is **impossible on this host** — every
      Playwright browser aborts at launch with `libglib-2.0.so.0: cannot open shared
      object file`, and there is no other browser. Every acceptance row was instead
      satisfied against built `dist/` markup, compiled CSS, or a real `npm run content`
      round-trip; see the per-row evidence above, including the three clauses
      (hover interaction, which raster the header paints, the back-to-top click) that
      only a real browser can observe.

## Outputs

- Files touched: `docs/CONTEXT.md`, `docs/GLOSSARY.md`, `docs/ADR/README.md`,
  `docs/website-information-architecture.html`, `website/DESIGN.md`,
  `website/README.md`, plus whatever repairs the gates demand.
- Public API / behaviour change: none beyond repairs.
- Migrate / config: none.

## Validation

- [x] tests pass, graded against the Parent note rather than the literal "exit 0":
      `cd website && npm run ci` **exit 0** (52 files, 522 tests, 151 pages, dist scan
      clean, chrome 151) — the one true green gate, met.
      `python -m unittest discover -s tests` exit 1, `Ran 124 … failures=52, errors=5`
      — no regression on the documented 52/5 baseline.
      `python .script/lint_mse_card_style.py` exit 1, **249** findings, output identical
      to the pre-change run — the bar for step 0a, met exactly.
      `nix-shell -p python313Packages.pillow --run "python .script/release_package.py validate"`
      **exit 0**, `lifecycle valid`.
      `npm run test:e2e` exit 1, 24/24 aborting at browser launch on
      `libglib-2.0.so.0`, zero assertion failures — no regression.
- [x] manual check: every row of the acceptance checklist above is ticked — each one
      mechanically, against built `dist/` markup, compiled CSS, or a live
      `npm run content` round-trip, because this host has no browser. The clauses that
      need a real pointer, viewport or click are named on their rows.
- [x] app functional — `cd website && npm run build` exits 0 and 151 pages are built,
      link-checked and budget-checked. `npm run preview` was **not** walked: no browser
      exists on this host.
- [x] commit msg draft: `docs(website): record the pass-2 navigation and content model`
