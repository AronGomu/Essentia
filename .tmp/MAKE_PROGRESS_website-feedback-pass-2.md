# Progress: website-feedback-pass-2

- Goal: ship feedback batch 2 on the Astro site under `website/` — rule text on all 50 cards,
  keyword ruling wording, docs/blog reading surface, retractable catalog rail, global Find
  palette, flash-free transitions, repo-root `blog/`, brand logo set.
- Plan index: `ai-artifacts/PLAN_2026_08_07_website-feedback-pass-2.md`
- Tickets dir: `ai-artifacts/PLAN_2026_08_07_website-feedback-pass-2/`
- Workspace: branch `plan/website-feedback-pass-2` (based on `plan/website-feedback-pass`)
- Started: 2026-08-08
- Updated: 2026-08-08

## Success

- [x] All 11 tickets terminal `done` with evidence — see Status table
- [x] Website CI green — re-verified at FINAL HEAD `2db8087` in a clean detached worktree: `npm run ci` **exit 0**, 46 test files / **432 tests**, 151 pages, `dist scan: clean`, `chrome: 151 pages carry the site header`; `budgets:check` exit 0. (Earlier run at `ca7805f`: `npm run ci` **exit 0**, 44 test files / 396 tests, 151 pages built, `csp: hashed inline content in 151 HTML files`, `dist scan: clean`, `chrome: 151 pages carry the site header`; `npm run budgets:check` exit 0 (9 JS, 151 HTML, 215 images, 50 print masters, 16 MiB).
- [x] Python suite: **no NEW failures vs. base** — baseline at `4929e83` measured 2026-08-08: `Ran 120 tests … FAILED (failures=50, errors=5)`. Green was never achievable; criterion corrected to no-regression. Re-check each ticket.
- [x] MSE style lint: **no NEW findings vs. base** — baseline 249–251 findings, exit 1, pre-existing. Criterion corrected to no-regression.
- [x] Release package validate green — `lifecycle valid`, exit 0 (T2, before the M9 MSE edit landed). Re-run after the user rebuilds that package.
- [x] Publication rights gate — `npm run rights:check` exits 1 with `Public artifact blocked: owner approval remains pending in content/asset-rights.json`. **Pre-existing and by design**: `website/content/asset-rights.json` has `publicationStatus: "pending-owner-approval"`, `approvedAt: null` at base `4929e83`, and neither that file nor `check-rights.mjs` is touched by this plan's 11 commits. Not a defect; it is the owner's deliberate hold on public deployment.
- [x] Every ticket commit pushed — 11 commits `4929e83..ca7805f`, `git log origin/plan/website-feedback-pass-2..HEAD` = 0. No `cards_mse/`, `ai-artifacts/`, `ai_artefacts/` or `.tmp/` path appears in any of them.

### Out of scope

- MSE card sources under `cards_mse/` (except the one Draghig verification in T3)
- `.script/` Python tooling (frozen per plan Assumption A3)
- `launcher/`, `print/`, print pipeline, render regeneration, locked-package artefacts
- Deck persistence model; WEBSITE_V2_SPEC phases not named in the plan

## Status

| ID  | Title                              | File                                  | State   | Evidence | Note |
| --- | ---------------------------------- | ------------------------------------- | ------- | -------- | ---- |
| T1  | Reading-surface design tokens      | `T1_reading-surface-tokens.md`         | done    | `de6ade2` — 8 `--reading-*` tokens; `npm run ci` exit 0, 322 tests; 0 consumers in dist = no visual change | ship skill not invoked (see M8) |
| T2  | MSE multi-line field parse fix     | `T2_mse-field-parse-fix.md`            | done    | `55f1270` — empty ruleText 26→0; `npm run ci` exit 0; `release_package validate` valid | deep / ship production |
| T3  | Keyword ruling wording             | `T3_keyword-ruling-wording.md`         | done    | `194906a` — 12 rulings restated; `npm run ci` exit 0; no new py failures (121 ran, same 50/5) | dep T2 |
| T4  | Hover rulings beside the card      | `T4_hover-rulings-side-panel.md`       | done    | `59d53f2` — `hover-placement.ts` 6/6 unit; `npm run ci` exit 0, 317 tests | dep T2; e2e host-blocked |
| T5  | Retractable catalog rail           | `T5_retractable-catalog-rail.md`       | done    | `34e83d3` — `catalog-rail.ts` unit + build gate asserts `data-catalog`/`rail-toggle` on every page; `npm run ci` exit 0, 373 tests | —    |
| T6  | Flash-free fade transition         | `T6_fade-page-transition.md`           | done    | `391f524` — zero-delay cross-fade + `color-scheme: dark` meta gated on all 151 pages; `npm run ci` exit 0 | ship skill not invoked (M8) |
| T7  | Hero art reveals full art on hover | `T7_catalog-hero-full-art.md`          | done    | `7aab2c0` — hover swaps `object-fit: contain` + `scale(1)`; 5/5 unit; `npm run ci` + budgets exit 0 | —    |
| T8  | Blog sources at repo-root `blog/`  | `T8_blog-source-at-repo-root.md`       | done    | `94f3e6c` — `git mv` R100, post sha256 + `catalog.ts` byte-identical before/after; `npm run ci` exit 0, 330 tests | deep / ship production |
| T9  | Docs + Blog surface build          | `T9_docs-blog-reading-surface.md`      | done    | `fc019bd` — `reading-shell`/`reading-rail` in built `dist/`; `npm run ci` + `budgets:check` exit 0 in isolated worktree | dep T1, T8 |
| T10 | Global Find palette                | `T10_global-find-palette.md`           | done    | `ec54cf7` — privacy gate armed (injected local deck → build throws); `npm run ci` exit 0, 363 tests; budgets pass | dep T8; deep / ship production |
| T11 | Essentia logo + icon set           | `T11_brand-logo-adoption.md`           | done    | `ca7805f` — 10 derivatives + manifest + default OG (opaque, asserted); `npm run ci` exit 0, 396 tests; budgets 215 images within limits | ship skill not invoked (M8) |

States: pending|running|done|failed|blocked_user|blocked_dep|skipped

Execution order (topo-serial): T2 → T3 → T4 → T1 → T8 → T9 → T10 → T5 → T6 → T7 → T11

## Assumptions

- **M1** — Base branch is `plan/website-feedback-pass` (34 commits ahead of `main`, unmerged),
  not `main`. Plan 2 builds directly on pass-1 artefacts (keyword registry, docs/blog routes,
  hover panel), so basing on `main` would make every ticket unbuildable.
- **M2** — `AGENT.md` says `ai-artifacts/` must not be committed. That overrides the make
  skill's "stage own ticket-file checkbox updates". Ticket-file checkboxes are ground truth
  **on disk**, and are deliberately left out of every commit. `.tmp/` likewise.
- **M3** — The working tree was already dirty on entry (rename of `ai_artefacts/` →
  `ai-artifacts/`, `AGENT.md`/`AGENTS.md`, ADR + GLOSSARY edits, `.tmp/`). Left untouched and
  uncommitted rather than folded into this plan's commits; workers stage only their own
  intentional paths.
- **M4** — Ticket `manual:` validation lines needing a human at a browser are satisfied by an
  automated equivalent where one exists (built-output assertion, Playwright e2e, DOM/CSS
  assertion). Where no automated equivalent exists the box stays **unchecked** and is reported
  as residual risk. A manual check is never a hard stop and never a reason to ask the user.
- **M6** — Success criteria "Python suite green" and "MSE lint green" were unachievable on entry: the base commit `4929e83` already fails both (50 failures/5 errors; ~249 lint findings). Independently measured in a read-only worktree, not taken on a worker's word. Both criteria are therefore **no-regression** bars. Fixing them is out of this plan's scope.
- **M7** — `npm run test:e2e` is unrunnable in this environment: Playwright's chromium/firefox/webkit all abort at launch on a missing `libglib-2.0.so.0`, before any test logic. Verified pre-existing on the unmodified tree. The e2e gate is therefore deferred to CI / a machine with full Playwright system deps; every ticket substitutes unit tests plus assertions over built `dist/` output. Parent will additionally drive a real Chrome pass over `npm run preview` at the end of the run to cover the interaction checks.
- **M8** — T1's worker did not invoke the `ship` skill, executing the ticket's own TDD/Impl/Check plan directly and self-reporting the deviation. Accepted rather than re-run: the ticket carried frozen token values and zero design decisions, and the deliverable was independently verified (`npm run ci` exit 0, pure-insertion diff, 0 consumers of the new tokens in built CSS). Recorded because it makes T1's `Ship terminal` field absent. T6's worker made the same call for the same reason (its ticket supplied literal CSS to apply). Both deliverables were independently verified; accepted in both cases.
- **M9** — `cards_mse/01_alpha/LOTA-0001-Alpha_0.1/01_YGO_Legend_of_the_Alpha.mse-set/set` was edited **outside this run**, while it was in progress (set symbol assigned; MSE also wrote a new `symbol1.mse-symbol`). `cards_mse/` is explicitly Out of scope, and reverting it or re-running `release_package.py rebuild` would destroy in-flight editor work, so it is left exactly as found. Consequence: `npm run content` / `npm run ci` fail in the shared tree with `package hash mismatch` for a reason unrelated to any ticket. From T9 onward, workers gather CI evidence in a disposable detached `git worktree` at HEAD carrying only their own diff. **Needs the user:** run `python .script/release_package.py rebuild` for that package once the MSE edit is finished, or discard it.
- **M5** — Plan assumptions A1–A9 are in force verbatim; see the plan index.

## Log

- 2026-08-08 baseline captured in a detached worktree at `4929e83`: python suite 50 failures/5 errors, `lint_mse_card_style.py` exit 1 with ~249 findings. Both PRE-EXISTING → success criteria 2 and 3 relaxed from "green" to "no regression" (Assumption M6).
- 2026-08-08 T2 done — `55f1270`, pushed.
- 2026-08-08 T3 done — `194906a`, pushed.
- 2026-08-08 T4 done — `59d53f2`, pushed. `npm run test:e2e` cannot run in this sandbox (Playwright browsers fail at launch: `libglib-2.0.so.0` missing); confirmed pre-existing on the pre-change tree. Assumption M7.
- 2026-08-08 T1 done — `de6ade2`, pushed. Worker executed the ticket directly instead of routing through `ship` (M8).
- 2026-08-08 T8 done — `94f3e6c`, pushed. Contract published for T9/T10: sources at `blog/YYYY-MM-DD-slug.md`, regenerate with `cd website && npm run content`.
- 2026-08-08 **shared-tree hazard found** — `cards_mse/.../01_YGO_Legend_of_the_Alpha.mse-set/set` changed `symbol:` to `symbol1.mse-symbol` (+ new untracked `symbol1.mse-symbol`) at 11:37-11:38, mid-run. Signature of Magic Set Editor writing a set symbol: the user's own concurrent work, not a worker's. `npm run content:check` in the shared tree now dies with `package hash mismatch` at `validatePackageHashes`. Left untouched (M9); remaining workers validate in a disposable worktree.
- 2026-08-08 T9 done — `fc019bd`, pushed. Worker flagged a ticket-internal inconsistency (prose says `.docs-rail`/`.docs-body` disappear; Impl steps + Check plan keep them as compound classes) and followed the executable spec. Accepted.
- 2026-08-08 T10 done — `ec54cf7`, pushed. Privacy invariant proven by arming the gate, not asserted. Worker caught two real defects in the ticket's own Impl steps: the literal `withBase` import pulled the whole catalog into the client island (386 KB chunk, budgets red) and a stale `SearchPalette.svelte` reference. Both fixed in-ticket.
- 2026-08-08 user's MSE session has grown to ~14 modified + 2 untracked files under `cards_mse/`. Still untouched by this run.
- 2026-08-08 T5 done — `34e83d3`, pushed.
- 2026-08-08 T6 done — `391f524`, pushed. Ticket line numbers had drifted from earlier commits on this branch; worker located blocks by content match and confirmed the quoted snippets matched.
- 2026-08-08 T7 done — `7aab2c0`, pushed.
- 2026-08-08 T11 done — `ca7805f`, pushed. All 11 tickets terminal `done`.
- 2026-08-08 `npm run rights:check` ENOENT on `website/src/generated/rights-inventory.json` explained: that file is a **generated** artefact of `npm run content`, which cannot run in the shared tree because of the M9 MSE hazard. Not a code defect; it regenerates as soon as the package hash is rebuilt.
- 2026-08-08 reviewer fanout launched — 4 deep read-only children: correctness, security/privacy, scope-drift, tests.

- 2026-08-08 pre-flight: branch `plan/website-feedback-pass-2` created from
  `plan/website-feedback-pass`, pushed to origin. All 11 ticket files verified present.
  T11 masters verified present at `/home/aron/Downloads/essentia-{letter-mark,wordmark}-logo.png`.

## Design hook findings — reviewed, left unchanged

`website/src/styles/global.css:220` and `:281` animate `margin-left` on `.site-header` and
`main, .site-footer` (from T5). Classified **intentional, not a defect**:

- The rail itself already uses the cheap path — `.desktop-catalog` slides via
  `transform: translateX(-100%)` (`:1685-1691`). Only the content offset animates.
- `transform` is not a substitute on the content side: collapsing sets `--sidebar: 0rem`
  (`:1682`) so the page genuinely **reflows** into the reclaimed 17rem. Translating `main`
  would slide it off-screen at its old width — the opposite of the ticket's requirement.
- Discrete, user-initiated, 220ms, once per toggle. Bounded layout cost, not continuous
  or scroll-driven.

No config ignore filed — suppression needs the user's explicit confirmation, and the
finding is worth re-surfacing if the rail is ever rewritten.

## Reviewer fanout — 4 deep read-only children, all reported

Confirmed clean on the two highest risks:
- **Frozen-hash contract holds.** `legacyVisualFields` byte-identical to the base-commit
  `parseFields` (function-body `diff` empty); golden vector re-derived independently from a
  verbatim base-commit parser (`18ca11e6…83144`, exact match); all 50 attestations pass at HEAD.
  Differential over 231 card files: new parser's key set is a strict subset of the old, zero
  fields lost, 90 legacy-only keys all truncated `<error-spelling…>` fragments.
- **Privacy invariant holds**, verified against a real build, not the gate: `deck:local:` appears
  in exactly one `dist/` file, as the runtime template that *builds* the key — zero occurrences
  in all 151 HTML files. Decoded island props: 91 entries, `set(source) == {'catalog'}`.
  `essentia.v1.decks` never appears in `dist/`.
- No gate weakened: all four `check-chrome.mjs` edits are pure insertions; `scan-dist.mjs`'s
  `.webmanifest` addition is net-strengthening; every `railChrome` fixture edit is additive and
  no `toEqual([])` was downgraded.

### Dispatched to fix (F1 code, F2 tests)

Code: wordmark stretched 32% by `min-width`; Find palette never closes on fragment nav;
view-transition blend override inverts its own mechanism (~25% blackfoil bleed); unguarded
`localStorage` property read desyncs the rail toggle; 13→35 of 50 card meta descriptions now
truncate mid-word; `blog.mjs` silently drops post-shaped directories; `Salvage` +
`nekroz-recovery` registry/doc desync; `404.html` exempt from the privacy gate;
`purpose: "any maskable"` on icons with no safe zone; `scan-dist` blind to C2PA chunks.

Tests: five suites proven unable to fail by mutation (`catalog-hero-art`, `brand-assets`
master guard, `reading-shell` measure, `chrome` reminder row, `catalog-rail` storage key)
plus `blog.test.ts` writing fixtures into the live repo `blog/`.

### NOT fixed — needs the user

- **C2PA provenance in `website/brand/*.png`, already public.** Both masters carry a `caBX`
  manifest with a stable account identifier `019bc403-5cd7-7669-afe6-fdb17177d428` (same in
  both files despite different signing CAs), `O=OpenAI OpCo, LLC`, `softwareAgent: gpt-image`,
  `digitalSourceType: trainedAlgorithmicMedia`, and microsecond RFC-3161 timestamps. The
  **published site is clean** — sharp-re-encoded derivatives carry no `caBX`, and `dist/` has
  zero hits. Exposure is via the git repo only, and the branch is already pushed. Stripping the
  masters in a new commit stops future clones of HEAD; removing it from history needs a
  force-push over published history, which this run will not do unprompted.
- **Attribution wording.** `website/src/pages/legal/index.astro:75-78` says the marks are
  "original project assets, created for this project" and ADR 0022 says "the user supplied two
  brand masters", while the embedded manifest records `gpt-image` / `trainedAlgorithmicMedia`.
  Plan assumption A9 treated them as first-party. How the marks' provenance is described is a
  factual claim only the owner can settle; left untouched.

### Residual risk — logged, not fixed

- Rail slide-out never animates: `--sidebar: 0rem` collapses `.desktop-catalog`'s width to 0, so
  `translateX(-100%)` of a 0-width box is a 0px move. Functionally correct, 220ms black gap.
- `hover-placement.ts` budgets in `px` (320/16) while the CSS lays out in `rem` (20rem/1rem);
  they agree only at a 16px root font. At 20px the "fits right" branch is taken when it doesn't.
- `wordmark-640.png` / `mark-128.png` generated, shipped, referenced nowhere (~31 KB dead).
- Privacy gate walks only `*.html` and matches one literal encoding; not reachable today (Node
  has no `localStorage`), but it is canary-incomplete.
- `mse-markup.ts` `strippedPattern` cannot cross an HTML entity; safe for today's single literal
  annotation, would leak raw `<error-spelling:…>` if MSE ever wrote a path containing `&`/`<`/`>`.
- e2e `Find reaches a doc` presses the hotkey immediately after `goto` with no hydration wait —
  plausible first-CI flake.
- Several coverage gaps: `renderBrandAsset` exported for testing but never called; blog loader's
  raw-HTML/duplicate-slug/symlink/size branches untested; registry↔doc wording drift unguarded
  for 11 of 12 rulings; `CardHoverPreview` DOM glue untested.

## Fix passes after review

- **F1 — code defects, 10/10 fixed**, one commit each (`8497dd1` … `1af7325`): wordmark stretch,
  Find palette staying open on fragment nav, inverted view-transition blend, unguarded
  `localStorage` read, mid-word meta descriptions (35 of 50 now cut on a word boundary + `…`,
  reusing `a1f083b`'s docs helper), silently-dropped post directories, `Salvage` +
  `nekroz-recovery` doc desync, `404.html` privacy exemption, false `maskable` claim,
  C2PA-blind `scan-dist`. Masters deliberately NOT modified.
- **F2 — test defects, 12/12 fixed** (`cf48072` … `2db8087`), each with a red/green mutation
  proof: five suites were provably unable to fail (reduced-motion hero, master-in-public guard,
  measure cap, bold-phrase row, rail storage key) plus blog fixtures writing into the live repo.
  F2.5 required extracting `writeRailState`/`applyRailState` into `catalog-rail.ts` (behavior
  byte-identical) because the write path was unreachable from a unit test where it stood.

## Parent browser pass — real Chrome over `npm run preview` at `2db8087`

Closes the manual gaps the missing Playwright host left open. Verified working:

- **T2** card rule text renders on `/cards/nekroz-brionac/`; no `error-spelling` leak.
- **T3** new wording live in hover rulings (`Abyssal Curse`, `Descent`, `On Send Grave`).
- **T4** hover panel puts rulings in a column **beside** the render, not underneath.
- **T5** rail collapses and expands; content reflows to full width.
- **T6** `color-scheme: dark` present.
- **T7** hero art zooms **out** to the whole illustration on hover — confirmed by before/after.
- **T10** `Ctrl+K` opens Find; grouped index; typing `nek` filters across Cards and Docs.
- **T11** favicon, apple-touch-icon and manifest all linked.
- **F1.5** meta description now ends `…that was…` on a word boundary.

### NEW finding the browser pass caught that no reviewer did

**The site has no visible brand at desktop width.** `.compact-brand` is `display: none` above
64rem and only becomes `display: block` inside `@media (width<=64rem)`; below 44rem it swaps to
the square letter mark. So the wordmark T11 shipped is visible **only** in the 44–64rem band.
Above that the sole brand was the sidebar text node in `Navigation.svelte` — which T11 scoped
out — and **T5 now lets the visitor collapse that sidebar away**, leaving a page with no logo
and no wordmark anywhere. Confirmed live at 1869px: collapsed rail → zero brand on screen.
Neither ticket owns this; it only appears with T5 and T11 both live, which is why the diff-based
reviewers could not see it. Not fixed — the fix is a design decision (show `.compact-brand` when
the rail is collapsed, or restyle the header) and T11's ticket explicitly scoped header/nav
restyling out.
