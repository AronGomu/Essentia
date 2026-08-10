# T13: Review repairs

**Plan:** `./ai-artifacts/PLAN_2026_08_08_website-feedback-pass-2.md`
**Depends:** T12
**Commit outcome:** Every defect the four-dimension reviewer fanout confirmed against built
output is repaired at its source, and each repair is pinned by a test that provably fails
without it.

## Context (self-contained)

- This ticket was written by the parent orchestrator **after** all twelve plan tickets
  landed, from the findings of four independent deep reviewers (correctness, security,
  scope-drift, tests) over `git diff 09ab091..7c71603`.
- Every item below was **demonstrated**, not theorised — each carries the reviewer's
  reproduction. Do not re-litigate whether a finding is real; reproduce it, fix it, pin it.
- Baseline at HEAD `7c71603`: `npm run ci` exit 0, `Test Files 52 passed (52)`,
  `Tests 522 passed (522)`, `151 page(s) built`, `dist scan: clean`.
- Out of scope: anything not listed here. In particular do **not** fix the pre-existing
  Python suite failures (52 failures / 5 errors), the 249 pre-existing MSE lint findings,
  `rights:check` (owner approval), or the missing Playwright system libraries.

## Priorities

Land **P0 and P1 completely**. Then P2, then P3. If you run out of road, stop at a clean
commit boundary and report exactly what is left — do not half-land an item.

---

## P0 — blocker

- [x] **P0.1 Version pages ignore the `reminder` flag.**
      `website/src/pages/cards/[id]/versions/[package].astro:21-23` still builds
      `ruleDefinitions` from **every** catalog keyword and passes it to `<RichText
      definitions={ruleDefinitions}>` (:67), while `cards/[id].astro:37` was switched to
      `reminderDefinitions()`. Result: the same card renders differently per route.
      Reproduction at HEAD: `dist/cards/effect-veiler/index.html` renders
      `<strong>Counter</strong>` bare, but
      `dist/cards/effect-veiler/versions/alpha-LOTA-0001-Alpha-0-1/index.html` renders
      `<strong>Counter</strong><span class="reminder">(Cancel a spell or ability on the
      Stack; …)</span>`. Also affects `ash-blossom-and-joyous-spring` and
      `nekroz-trishula` version pages.
      Fix: use `reminderDefinitions()` here too.
      Validate: rebuild; assert **zero** `<span class="reminder">` follows
      `<strong>Counter</strong>` on any of the 151 pages, version routes included. Add a
      unit test that fails if this route reverts to the unfiltered map.
      **Evidence:** `[package].astro` now uses `reminderDefinitions()`. Before: `dist/cards/effect-veiler/versions/…` rendered `<strong>Counter</strong><span class="reminder">…`, the card route did not; 3 pages affected. After: 0 pages carry a Counter reminder. Mutation (restore the unfiltered map): `keyword-rulings.test.ts` 2 failed, and `npm run build` fails naming ash-blossom, effect-veiler and nekroz-trishula.

## P1 — functional defects that leave a ticket's stated outcome unmet

- [x] **P1.1 The wordmark is not top-left on the home page.**
      `website/src/styles/global.css:222` `.site-header { justify-content: flex-end }` plus
      `:262-264` `.breadcrumb { margin-right: auto }` — the auto margin lives only on the
      breadcrumb, and `check-chrome.mjs:64-69` exempts `index.html` from having one. Built
      `dist/index.html` header is `<a class="compact-brand">…</a><nav class="utility-nav">`
      with no auto margin, so above 64rem the wordmark sits flush **right** on `/`. Every
      other page hides the bug because it has a breadcrumb. Below 64rem the
      `justify-content: space-between` override (:1074) masks it too.
      Fix: make the brand hold the left edge on every page, breadcrumb or not.
      Validate: assert in built CSS/markup that on `/` the brand is the first flex child
      and is left-anchored. Test must go red if `margin-right: auto` is removed from
      whatever element carries it.
      **Evidence:** `.site-header` is `justify-content: flex-start`, the auto margin moved from `.breadcrumb` to `.utility-nav`, and the `space-between` override at ≤64rem is gone. Before (HEAD dist): `.site-header{…justify-content:flex-end}` + `.breadcrumb{margin-right:auto}` with the home header's children being brand, utility-nav, search-trigger — no breadcrumb, so no auto margin. `header-brand.test.ts` now derives anchoring from the resolved cascade (`tests/support/css.ts`). Mutations: full revert to the HEAD shape → 2 failed (`home page at 1440px`); drop `margin-left: auto` from `.utility-nav` → 1 failed.

- [x] **P1.2 Docs/blog navigation disappears entirely at ≤64rem.**
      `.reading-rail` used to become `position: static; order: -1` on narrow viewports. T10
      deleted it; the reading nav now lives only inside `<nav id="desktop-catalog">`, and
      `website/src/styles/global.css:1056-1059` sets `@media (max-width: 64rem) {
      .desktop-catalog { display: none } }`. The `<dialog class="mobile-drawer">` branch
      (`website/src/components/Navigation.svelte:181-218`) was never given a reading mode.
      Verified: `dist/docs/glossary/index.html` has exactly one `reading-switch`
      occurrence, all inside `#desktop-catalog`; the drawer holds only Non-Archetype +
      Archetypes. Consequence: on a phone, from `/docs/rules/zones/` there is **no** route
      to any other doc — the `/docs/` fallback body links 9 of 38.
      This is a regression caused by an in-scope deletion, so repairing it is in scope even
      though T10 declared the drawer out of scope.
      Fix: give the mobile drawer the same reading navigation the rail has.
      Validate: assert the built markup for a docs page and a blog page contains the
      reading groups inside the mobile drawer; test must go red if the drawer reverts to
      catalog-only.
      **Evidence:** The drawer gained a reading branch mirroring the rail's, plus a `check-chrome.mjs` rule asserting the drawer offers every destination the rail does. Before: `dist/docs/glossary/index.html` drawer had 0 `reading-switch` and 3 catalog hrefs. After: 1 switcher and 40 hrefs, 0 rail destinations missing. Mutations: drawer back to catalog-only → `reading-nav.test.ts` 1 failed and `npm run build` fails on every docs and blog page.

- [x] **P1.3 The MSE009 exemption is wider than its own comment claims.**
      `.script/lint_mse_card_style.py:107-108` `ENUMERATION_LEAD_IN_RE = /[(,]\s*$/` accepts
      a comma anywhere in the aside, and `:423-430` `ENUMERATED_ACTION_RE` accepts a
      trailing `or`. Executed against the linter's own harness:
      `<i-auto>(Deal 2 damage, <b>Draw</b>, then win.)</i-auto>` → `[]` at HEAD, `['MSE009']`
      at `09ab091`; `<i-auto>(<b>Counter</b> or nothing happens.)</i-auto>` → `[]` at HEAD,
      `['MSE009']` at `09ab091`. The in-code comment claims prose asides "keep raising
      MSE009", true only for the space-led form the test pins.
      Separately, the `visible[start:end].lstrip().startswith("(")` sub-condition in
      `is_enumerated_example()` is **unpinned**: deleting it leaves the whole Python class
      green. Uncovered input: `<i-auto>Choose one, <b>Draw</b>, or stop.</i-auto>` — a
      non-parenthesised italic run that today correctly raises MSE009.
      Fix: narrow the exemption so it matches a genuine enumeration of actions, and make
      the comment true. Pin every sub-condition.
      Validate: Ash Blossom still exempt; the three inputs above raise MSE009 again;
      repo-wide `python .script/lint_mse_card_style.py` finding count stays **exactly 249**
      (below 249 means you widened something; above means you broke a clean card). Each
      sub-condition mutation-tested: delete it, confirm a test goes red, restore.
      **Evidence:** The exemption is now structural: the italic aside must open with `(` and every comma-separated item must be a lone bold run or `etc.`. Before: `(Deal 2 damage, <b>Draw</b>, then win.)` → `[]`, `(<b>Counter</b> or nothing happens.)` → `[]`. After: both `['MSE009']`, Ash Blossom still exempt, repo-wide count exactly **249** with the finding list byte-identical to HEAD. Five sub-condition mutations each go red; a sixth (`item_start == item_end`) proved redundant and was deleted rather than left unpinnable.

- [x] **P1.4 The `preview` filter is unpinned and shrank a gate's coverage.**
      `website/src/layouts/BaseLayout.astro:82` — reverting
      `.filter((k) => k.preview)` to `.filter((k) => k.origin === 'essentia')` leaves
      **522/522 green and `npm run build` exit 0**. In the mutated build `#keyword-rulings`
      holds 51 entries without `Mill N`, while 19 gallery links still advertise
      `data-card-keywords="…,Mill N,…"` — the hover box renders empty.
      Compounding: switching the published map from `origin === 'essentia'` to `preview`
      shrank `check-chrome.mjs` `reminderIssues` coverage — 20 keywords are
      `reminder: true, preview: false`, so their inline reminders now render **unasserted**
      (52 remain covered). The gate fails open: a smaller map means fewer checks fire.
      Fix: pin the filter with a test, and restore reminder-gate coverage for the 20
      keywords that lost it (the gate should assert reminders against the `reminder` set,
      not the `preview` set).
      Validate: the revert mutation goes red; the reminder gate demonstrably covers all 72
      `reminder: true` keywords.

## P2 — tests that cannot fail, and unpinned behaviour

Each item: reproduce the stated mutation, confirm it is currently green, add or repair the
test, then confirm the same mutation now goes red, and restore.
      **Evidence:** Extracted `previewDefinitions()` beside `reminderDefinitions()`; `check-chrome.mjs` now asserts the `#keyword-rulings` island equals the `preview` set exactly, and judges reminders against the **`reminder`** set (72 terms) rather than the page's own preview map (52). Mutations: filter back to `origin === 'essentia'` → 2 unit failures **and** `npm run build` fails on every page; reminder gate back to the page map → `chrome.test.ts` 2 failed.

- [x] **P2.1** `website/scripts/content/docs.mjs:152` — deleting `a.order - b.order ||`
      from the sort leaves 522/522 green. The `rules` group would silently flip from the
      authored order to alphabetical-by-title. Authored within-group order is the headline
      of commit `e3c9c82`. (Reversing the order *is* caught by `docs-corpus.test.ts:104`;
      dropping the key entirely is not.)
      **Evidence:** `docs-corpus.test.ts` now asserts the `rules` group's loaded paths equal the authored `files`, guarded by a second assertion that the authored order differs from alphabetical-by-title. Mutation: delete `a.order - b.order ||` → 1 failed.
- [x] **P2.2** `website/tests/unit/back-to-top.test.ts:23-26` `ignores nonsense scroll
      positions` cannot fail — deleting `Number.isFinite(scrollY) &&` from
      `website/src/lib/back-to-top.ts:9` leaves 7/7 green, because both `-10 >= 480` and
      `NaN >= 480` are already false. Either pin the guard with an input that distinguishes
      it, or delete the dead guard. Do not leave both.
      **Evidence:** Added `Number.POSITIVE_INFINITY` / `NEGATIVE_INFINITY`, the only inputs that distinguish the guard. Mutation: delete `Number.isFinite(scrollY) &&` → 1 failed.
- [x] **P2.3** `website/tests/unit/section-intro.test.ts` — three loader guards have zero
      coverage; replacing each with a constant-false condition leaves 6/6 green:
      `section-intros.mjs:61` (symlink), `:64` (`MAX_INTRO_BYTES`), `:73` (link-scheme
      allowlist). The last is what stops `[x](javascript:alert(1))` in an authored intro
      reaching rendered hero markdown — cover it first.
      **Evidence:** Three new cases: `javascript:` link (plus a positive case for the four allowed schemes), symlinked intro, and a 262 145-byte intro (plus one at exactly the ceiling). Mutations: link-scheme allowlist → red; size guard → red; symlink → red once both `isSymbolicLink()` and `!entry.isFile()` are disabled — `isSymbolicLink()` alone is redundant, a symlink Dirent is never `isFile()`.
- [x] **P2.4** `website/tests/unit/docs-corpus.test.ts:130-154` writes its fixture into the
      **tracked** repo tree (`docs/keywords/Bad_Name.md`). Cleanup lives only in `finally`,
      which does not run on SIGKILL, a vitest timeout, or an aborted CI job — one
      interrupted run poisons `npm run check`/`build`/`ci` until a human deletes the file,
      and it dirties `git status` in a repo whose owner works concurrently. Confirmed: the
      file present makes `npm run content` hard-fail at `docs.mjs:114`.
      `loadDocs` takes `groups` but no docs root, so this needs a source change: give
      `loadDocs` an explicit root parameter (mirroring `loadPosts(blogRoot)`) and point the
      test at a temp dir.
      **Evidence:** `loadDocs(groups, root = ROOT)`, mirroring `loadPosts(blogRoot)`. The fixture now lives in `mkdtemp`, with an `afterEach` that removes every temp root. Verified: a full `vitest run` leaves `docs/keywords/Bad_Name.md` absent and `git status` on `docs/` empty. A second test pins that the default root still reads the repository.
- [x] **P2.5** `website/tests/unit/keywords.test.ts:134` — `mkdtempSync` with no cleanup,
      leaking **+17 `/tmp/essentia-keyword-registry-*` dirs per suite run; 1252 already
      accumulated on this machine.** Sibling suites clean up correctly. Add an `afterEach`.
      Also remove the already-leaked directories.
      **Evidence:** `afterEach` removes every directory `fixture()` hands out, plus the one inline `mkdtempSync`. The same leak in `reading-order.test.ts` (only the newest dir was removed) is fixed too. Removed the 1286 already-leaked `/tmp/essentia-keyword-registry-*` dirs; a full suite run now leaves **0**.
- [x] **P2.6** `website/scripts/check-chrome.mjs:79` and `:98` — the class-token regexes
      only tolerate a **trailing** modifier. Demonstrated by direct call:
      `class="nav-block reading-switch"` → flagged as missing the switcher;
      `class="chrome-btn rail-toggle"` → flagged as missing the toggle. The comment at
      `:96-97` overstates what the gate does. Fix both regexes to match a class token in
      any position, and extend `chrome.test.ts:768` to cover the leading-modifier
      direction. Mirror-image: `website/tests/unit/reading-nav.test.ts:126,141,150` asserts
      `class="reading-switch"` as an exact attribute string, so it breaks on exactly the
      change the gate was loosened to permit — loosen it the same way.
      **Evidence:** Both class regexes replaced by `hasClassToken()`, matching the token in any position. `chrome.test.ts` gained leading-modifier and lookalike cases for both `reading-switch` and `rail-toggle`; `reading-nav.test.ts` was loosened the same way. Mutation: restore the trailing-only regex → `chrome.test.ts` 2 failed.

## P3 — cheap hardening, only after P0–P2 are green

- [x] **P3.1** `website/tests/unit/header-brand.test.ts:33-39` — appending
      `@media (min-width: 64rem) { .compact-brand { display: none } }` leaves 4/4 green
      with the brand invisible on desktop. That is the exact mirror of the bug T7 fixed.
      Make the test consider media-query overrides.
      **Evidence:** `header-brand.test.ts` resolves `display` for `.compact-brand` through the cascade at 1440/1280/900/704/390 px. Mutation: append `@media (min-width: 64rem) { .compact-brand { display: none } }` → 1 failed.
- [x] **P3.2** `website/src/components/Navigation.svelte:146-153` — on nested reading pages
      two links carry `aria-current="page"`, and `/docs/` is announced as both "current
      page" and "current location". Verified on `dist/docs/rules/zones/index.html`. Use
      `aria-current="true"` on the switcher (CSS selector at `global.css:427` follows).
      **Evidence:** The switcher emits `aria-current="true"`; `global.css` selector follows; the two e2e assertions updated. Before, `dist/docs/rules/zones/index.html` carried **two** `aria-current="page"` links inside the rail (`/docs/` and `/docs/rules/zones/`); after, one per nav.
- [x] **P3.3** `website/scripts/content/reading-order.mjs:46` — `DOC_FILE_RE =
      /^docs\/.*\.md$/` accepts `docs/../../../../etc/passwd.md`. No exploit path (the read
      is gated by `knownPaths.has(file)` at `docs.mjs:105`), but the error is misleading.
      Reject traversal explicitly. The sibling `SLUG_RE` is already tight.
      **Evidence:** `DOC_FILE_RE` rejects any `..` segment. Mutation: restore `/^docs\/.*\.md$/` → `reading-order.test.ts` 1 failed.
- [x] **P3.4** `website/scripts/content/keywords.mjs:36-49` — `docExists()` rejects `..` and
      absolute paths but does not `lstat` for symlinks, unlike every other loader this run
      touched. No leak (the path is only `stat`ed, never read), consistency gap only.
      **Evidence:** `docExists()` uses `lstat`. No dedicated test: with no symlink inside the repository and `ROOT` not injectable here, the change is unobservable from the test surface — it is behaviour-identical for every non-symlink input, which the existing `docs/NOPE.md` case still covers.
- [x] **P3.5** `website/tests/unit/back-to-top.test.ts:47` — `source.indexOf('<BackToTop')`
      is a prefix match; renaming to `<BackToTopButton />` keeps it green. Anchor it.
      **Evidence:** Anchored to `/<BackToTop\s*\/>/` plus the import line. Mutation: rename to `<BackToTopButton />` → 1 failed.
- [x] **P3.6** `website/tests/e2e/showcase.spec.ts:186` — clicks a `client:load` island
      immediately after `goto` with no hydration wait; the branch already fixed this exact
      race for the Find hotkey in `c7f5eb5`, and the helper is at `showcase.spec.ts:80-93`.
      Use it.

## The two e2e specs that will fail on first execution

Playwright cannot run on this host, so these were caught by static analysis against built
output. Fix them; you cannot verify them, and must say so.
      **Evidence:** The first `collapseButtons.first().click()` is now wrapped in `expect.poll` on `data-catalog`, the same shape as `openFindWithHotkey`; poll stops at the first answered click, so it never double-toggles. **Unverified by execution** — Playwright cannot launch on this host.

- [x] **P1.5** `website/tests/e2e/showcase.spec.ts:217` `back to top returns the visitor to
      the top` **will fail**. `page.mouse.wheel(0, 2000)` at the default mouse position
      `(0,0)` scrolls the **catalog rail**, not the document: `global.css:351-362` makes
      `.desktop-catalog` `position: fixed; inset: 0 auto 0 0; width: 17rem` with
      `overflow-y: auto`, and at Desktop Chrome's 1280×720 the rail holds 40 links and is
      itself scrollable. Chromium latches the wheel to that innermost scroller, so
      `window.scrollY` stays 0, `shouldShowBackToTop(0)` is false, the button keeps
      `hidden`, and `toBeVisible()` times out.
      Fix shape: `page.evaluate(() => window.scrollTo(0, 2000))`, or move the mouse over the
      document first (`page.mouse.move(900, 400)`).

Selectors verified **correct** against built dist and needing no change: the
`.compact-brand img` / zero-`brand` assertions, the docs spec's
`aria-label="Documentation and blog"` + `Zones` link, the blog spec's `aria-current`, and
the collapse spec's two `Collapse catalog` buttons.
      **Evidence:** Replaced `page.mouse.wheel` with `page.evaluate(() => window.scrollTo(0, 2000))`, wrapped in `expect.poll` for the `client:load` hydration race. **Unverified by execution** — Playwright cannot launch on this host (`libglib-2.0.so.0` missing).

## Scope-drift repair

- [x] **P1.6 Restore the two unrequested section intros.**
      The plan Goal says "rewrite the **three** section intros" (non-archetype, nekroz,
      burning-abyss), and T5's own Context repeats that. T5 impl steps 12–13 nevertheless
      mandated **new copy** for `website/content/section-intros/shaddoll.md` and
      `spellbook.md`, which now ships live on `/archetypes/shaddoll/` and
      `/archetypes/spellbook/` and feeds their `<meta description>`. Baseline text,
      recoverable via the pre-T5 `introFromDoc()` output at `09ab091`:
      - shaddoll: `Shaddoll is black Control / Value / Fusion.`
      - spellbook: `Spellbook is a Wizard/spell-chain archetype … multiple spells in one turn.`
      (recover the exact strings from `09ab091`, do not retype from this summary)
      The file migration was forced; the rewording was not.
      Fix: restore both files' body text to the baseline wording, keeping the new file
      format. Leave the three requested rewrites alone.
      Validate: `/archetypes/shaddoll/` and `/archetypes/spellbook/` built `<meta
      description>` match the `09ab091` values.
      **Evidence:** Both bodies restored to the exact `introFromDoc()` output recomputed at `09ab091`: `Shaddoll is black Control / Value / Fusion.` and the Spellbook paragraph. Pinned in `section-intro.test.ts` at both the loader and the `sectionIntroSummary()` (meta-description) level. Mutation: reword shaddoll → 1 failed. NB `/archetypes/shaddoll/` and `/archetypes/spellbook/` are not built routes in this corpus (3 sections publish), so the assertion is at the summary the description is derived from.

## Validation

- [x] `npm run ci` exit 0 in a disposable worktree, tests **≥ 522**, still **151 pages**,
      `dist scan: clean`
      **Evidence:** exit **0** in `wt-t13`: `Test Files 52 passed (52)`, `Tests 571 passed (571)` (was 522), `151 page(s) built`, `dist scan: clean`, `chrome: 151 pages carry the site header`.
- [x] `python .script/lint_mse_card_style.py` → exactly **249** `MSE0` lines
      **Evidence:** **249** `MSE0` lines, and `diff` against the HEAD run is empty — the same 249 findings, not a coincidental total.
- [x] `python -m unittest discover -s tests` → no regression (≤52 failures, ≤5 errors),
      new Python tests passing
      **Evidence:** `Ran 125 tests` (was 124), `failures=52, errors=5` — the pre-existing set, unchanged. The new MSE009 cases pass.
- [x] every mutation named in P0–P2 reproduced green-before / red-after
      **Evidence:** 21 mutations applied and reverted mechanically (`scratchpad/mutate.py`): **all 21 red**, each against a gate that is green at baseline. Plus 3 dist-level reverts that fail `npm run build`.
- [x] commit msg draft: `fix(website): repair the defects found by the pass-2 review`
      **Evidence:** used verbatim, split across three commits by priority band.
