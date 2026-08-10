# T13: Give the new guards teeth

**Plan:** `./ai-artifacts/PLAN_2026_08_09_website-header-and-rail-pass.md`
**Depends:** T8 (run after it)
**Commit outcome:** The tests this pass added fail when the thing they claim to
protect actually regresses.

## Context (self-contained)

A deep test reviewer probed the new suite by mutation and CONFIRMED four guards
that pass while the regression they exist to catch is present. Each item below
was demonstrated, not theorised.

1. **`resolve()` does no shorthand expansion** — `website/tests/support/css.ts:109`.
   `header-priority.test.ts:66` asserts `.site-header`'s `padding-left` is
   `undefined` at five widths, to prove T1 removed the `8.8rem` floating-hamburger
   reservation. Probe: replacing the authored `padding: 0.7rem clamp(1rem, 3vw, 3rem)`
   with `padding: 0.7rem clamp(1rem, 3vw, 3rem) 0.7rem 8.8rem` — literally
   restoring the deleted reservation — still returns `undefined`. **Test green,
   brand pushed 141px right.** Same for `margin-left` at `:18`: adding
   `@media (min-width: 64rem){ .site-header { margin: 0 0 0 var(--sidebar) } }`
   returns `undefined`. Test green, header re-offset by the sidebar.

2. **`brandHoldsTheLeftEdge()` short-circuits** — `website/tests/unit/header-brand.test.ts:45`.
   Line 47 `if (START_LIKE.has(justify(width))) return true;` fires
   unconditionally because `.site-header` is authored `justify-content: flex-start`,
   so the helper never inspects child order at all. Probe: adding
   `.compact-brand { margin-left: auto }` (the documented historical
   flush-right-wordmark bug) still returns `true`; so does `.compact-brand { order: 9 }`.
   Two of the file's nine tests carry no information.
   Secondary: `space-between` is in **both** `START_LIKE` and `END_LIKE`, and
   `.utility-nav` is not the last header child (`.search-trigger` is), so
   `it('the utility nav holds the right edge')` would accept `space-between`.

3. **The containing-block guard lists 4 of ~10 properties** —
   `website/tests/unit/header-priority.test.ts:41-46`. `.desktop-catalog` is
   `position: fixed` and is now a DOM descendant of `.site-header`, so any
   property on the header that establishes a containing block for fixed
   descendants breaks the rail. The test guards `transform`, `filter`,
   `backdrop-filter`, `will-change`. It misses `contain` (`layout`/`paint`/
   `content`/`strict`), `container-type` (`inline-size`/`size`), `perspective`,
   and the individual `translate` / `rotate` / `scale` properties. Adding
   `container-type: inline-size` to `.site-header` — a plausible modernisation —
   makes the rail resolve `inset: var(--header) auto 0 0` against the header box
   instead of the viewport, collapsing it to header height, with this test green.

4. **The build guard is self-referential** — `website/shared/header-row.mjs:9-22`
   and `website/tests/unit/header-row.test.ts:12`. `HEADER_CONTROLS` hand-copies
   control widths (32 / 36 / 39.2 / 48) and gaps from `global.css`. Nothing
   cross-checks them against the CSS, so growing `.utility-more` to `6rem` makes
   the real header overflow 400px while `check-header-row.mjs` still computes
   248 ≤ 368 and prints nothing. The unit test asserts the module's own
   constants back at itself (`expect(budget.contentPx).toBe(248)`), which nudges
   a future maintainer to update the constant rather than the CSS.
   `BREADCRUMB_MIN_PX = 64` is already fiction — this branch authored
   `.breadcrumb { min-width: 0 }` (`global.css:1683`).
   The warning branch is also never executed by a test: the script is only
   source-grepped (`not.toMatch(/process\.exit\(1\)/)`, `toMatch(/console\.warn/)`),
   so `process.exitCode = 1` would pass all three greps.

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


## Requirements

1. `resolve()` expands the shorthands the suite relies on — at minimum
   `padding`, `margin`, `inset` — so a longhand assertion sees a value supplied
   via shorthand. Its limits are documented for the five test files that use it.
2. `brandHoldsTheLeftEdge()` actually inspects child order; both probes in
   Context (2) make it return `false`. `space-between` no longer counts as both.
3. The containing-block guard covers `contain`, `container-type`, `perspective`,
   `translate`, `rotate`, `scale` in addition to the current four.
4. `header-row.mjs`'s constants are either derived from `global.css` or
   cross-checked against it by a test that fails when they drift; the warning
   branch is executed by a real test, not grepped.
5. Every mutation named in Context turns its guard red. Prove each, then revert.

## Inputs

- `website/tests/support/css.ts`
- `website/tests/unit/header-brand.test.ts`, `header-priority.test.ts`,
  `header-row.test.ts`
- `website/shared/header-row.mjs`, `website/scripts/check-header-row.mjs`
- `website/src/styles/global.css` — **read only**; this ticket changes tests and
  test infrastructure, not site CSS.

## TDD

For each of the four items: apply the exact mutation from Context, confirm the
guard is **green** (reproducing the reviewer's probe), fix the guard, confirm it
is now **red**, revert the mutation, confirm green. Record each pair.

## Impl steps

- [x] 1. Reproduce all six probes from Context and record that each guard is
      currently green under mutation. Revert each mutation.
      **Evidence — all six reproduce; `npx vitest run tests/unit/header-priority.test.ts
      tests/unit/header-brand.test.ts tests/unit/header-row.test.ts` printed
      `Test Files 3 passed (3) / Tests 28 passed (28)` under every one:**
      P1a `.site-header { padding: 0.7rem clamp(1rem, 3vw, 3rem) 0.7rem 8.8rem }` → 28 passed.
      P1b appended `@media (min-width: 64rem){ .site-header { margin: 0 0 0 var(--sidebar) } }` → 28 passed.
      P2a `.compact-brand { margin-left: auto }` → 28 passed.
      P2b `.compact-brand { order: 9 }` → 28 passed.
      P3 `.site-header { container-type: inline-size }` → 28 passed.
      P4 `.utility-more { width: 6rem }` → 28 passed, **and**
      `node scripts/check-header-row.mjs` printed nothing and exited 0.
      Each mutation reverted with `git checkout -- src/styles/global.css`;
      `git status --short` shows global.css clean.
- [x] 2. Add shorthand expansion to `resolve()` for `padding`, `margin`,
      `inset`. Document the helper's remaining blind spots in a header comment:
      no descendant/id-selector resolution, `@media` range syntax
      (`width <= 64rem`) is dropped by `css.ts:76`, and `!important` is returned
      as part of the value.
      **Evidence:** `website/tests/support/css.ts` — `expandShorthand()` covers
      `padding`/`margin`/`inset` plus their `-block`/`-inline` forms;
      `splitTopLevel()` keeps `clamp(1rem, 3vw, 3rem)` whole. Six blind spots
      written up in the file header (exact-string selectors + no specificity,
      `@layer` order not honoured, media *range* syntax dropped, `!important`
      returned in the value, nothing evaluated, logical props mapped LTR).
      With expansion on, the full suite showed exactly one new failure —
      `header-priority > the header reserves no room for a floating hamburger`,
      `expected 'clamp(1rem, 3vw, 3rem)' to be undefined` — i.e. the assertion
      the reviewer said was reading a longhand nobody authors. Rewritten to
      compare `padding-left` against `padding-right` and pin the gutter.
      P1a now RED: `expected '8.8rem' to be 'clamp(1rem, 3vw, 3rem)'`.
      P1b now RED: `at 1440px, got var(--sidebar): expected false to be true`.
- [x] 3. Fix `brandHoldsTheLeftEdge()` to inspect child order rather than
      returning early on `justify-content`, and remove `space-between` from one
      of the two sets (decide which by what the assertion means).
      **Evidence:** helper now checks `order` (lowest wins), then
      `margin-left: auto` on the brand, and only then packing. `space-between`
      removed from `END_LIKE` — it pins the *last* child, and the last header
      child is `.search-trigger`, not `.utility-nav`. Child lists extended with
      `.search-trigger` to match the real header.
      P2a RED (2 failures), P2b RED (2 failures), both
      `expected false to be true`.
- [x] 4. Extend the containing-block property list in `header-priority.test.ts`.
      **Evidence:** list is now `transform, filter, backdrop-filter,
      will-change, contain, container-type, container, perspective, translate,
      rotate, scale`. P3 RED:
      `container-type at 1440px: expected 'inline-size' to be undefined`.
- [x] 5. Make `header-row.mjs`'s constants verifiable: either derive them from
      `global.css` at build time, or add a test that parses the CSS and fails
      when a constant drifts. Correct `BREADCRUMB_MIN_PX` against the authored
      `min-width: 0`.
      **Evidence:** every number in `shared/header-row.mjs` is now a
      `{ px, cssPx, intrinsicPx }` record — `cssPx` names the authored
      `[selector, property]` declarations, `intrinsicPx` is the glyph+border
      remainder CSS cannot state, each with its arithmetic in a comment.
      `header-row.test.ts` re-reads every `cssPx` term from `global.css` at
      400px through the new `lengthPx()` and fails when
      `px !== Σ cssPx + intrinsicPx`.
      Constants corrected against a real 400px render:
      `drawer-trigger` 36 → 34 (8+8 padding + 18 glyph/border),
      `search-trigger` 48 → 39.8 (0 min-width + 14.4 + 14.4 + 11),
      `BREADCRUMB_MIN_PX` 64 → `BREADCRUMB.px` 0 (`.breadcrumb { min-width: 0 }`).
      Budget follows: `contentPx` 248 → 173.8, 176.8 → 166.6.
      **P4 RED:** `.utility-more { width: 6rem }` →
      `utility-more: expected 96 to be close to 39.2` **and**
      `the budget is the sum of the CSS-derived widths: expected 173.8 to be
      close to 230.6` (2 failures; previously 0).
      **P6 RED (the drift that was already present):** restoring 36 / 48 / 64
      → 6 failures, including `search-trigger: expected 39.8 to be close to 48`
      and `breadcrumb: expected +0 to be close to 64` — i.e. this test would
      have caught the drift the moment it was introduced.
- [x] 6. Add a test that actually executes `check-header-row.mjs`'s warning
      branch and asserts both that it warns and that it exits 0.
      **Evidence:** `check-header-row.mjs` now reads
      `process.env.HEADER_ROW_VIEWPORT_PX` (default `COMPACT_VIEWPORT_PX`), so
      `header-row.test.ts` spawns the real script twice via `execFile`:
      `the guard is silent at the real compact viewport` (exit 0, empty stderr)
      and `the guard warns — and still exits 0 — when the row overflows`
      (`HEADER_ROW_VIEWPORT_PX=200` → exit 0, stderr matches
      `[warn] site-header may wrap at 200px` and
      `with a breadcrumb: needs …px, has 168px`). The three source greps this
      replaces are gone.
      **P7 RED:** inserting `process.exitCode = 1;` into the warning branch —
      which passed all three old greps unchanged — now fails
      `the guard warns — and still exits 0…: expected 1 to be +0`.
- [x] 6b. *(parent addendum)* T8 added `'unsafe-hashes'` / `'unsafe-eval'`
      rejection to `harden-csp.mjs` and `scan-dist.mjs` but proved it only by
      invoking the scripts by hand, deliberately leaving unit coverage to this
      ticket. Add it to `website/tests/unit/dist-csp.test.ts`.
      **Evidence:** four new tests — two driving the real `scan-dist.mjs` over a
      temp `OUT_DIR` (`unsafe-hashes or unsafe-eval CSP`, and asserting the
      older `unsafe inline CSP` rule does *not* fire, so the new rule is load
      bearing), two driving the real `harden-csp.mjs` (`CSP hardening
      incomplete — 'unsafe-hashes'` / `'unsafe-eval'`), plus a success case
      proving the rewrite still produces a `sha256-` allowlist. 10 passed.
      **P8 RED:** deleting T8's `forbidden` entry from `scan-dist.mjs` and
      shrinking `harden-csp.mjs`'s `weakened` list back to `'unsafe-inline'`
      alone → all four fail (`4 failed | 6 passed`). Both scripts restored;
      `git diff --stat` on them is empty.
- [x] 7. Re-run all six probes; each guard must now be red under mutation.
      Revert every mutation and confirm the suite is green.
      **Evidence — `npx vitest run tests/unit/header-priority.test.ts
      tests/unit/header-brand.test.ts tests/unit/header-row.test.ts`, one
      mutation at a time, `git checkout -- src/styles/global.css` between each
      (before: every row read `37 passed`):**
      | probe | after |
      | --- | --- |
      | p1a-padding-left | `3 failed \| 34 passed (37)` |
      | p1b-margin-left | `1 failed \| 36 passed (37)` |
      | p2a-brand-margin-auto | `2 failed \| 35 passed (37)` |
      | p2b-brand-order | `2 failed \| 35 passed (37)` |
      | p3-container-type | `1 failed \| 36 passed (37)` |
      | p4-utility-more-6rem | `2 failed \| 35 passed (37)` |
      | p5-space-between | `1 failed \| 36 passed (37)` |
      | *no mutation* | `37 passed (37)` |
      Two further pairs are recorded under steps 5 and 6b: P6 (the constant
      drift that was already present) and P7 (`process.exitCode = 1` in the
      warning branch), plus P8 (T8's CSP rejection removed).
      `git status --short src/` empty — no mutation survives.
- [x] 8. Delete `website/playwright-report/` and `website/test-results/`, then
      run `cd website && npm run format && npm run ci`.
      **Evidence:** both directories removed (`ls` → `No such file or
      directory` for each); `find website -not -user aron` empty.
      `npm run format` reformatted only `tests/support/css.ts` and
      `tests/unit/header-row.test.ts` (whitespace).
      `npm run ci` → **`EXIT=0`**, `astro check` `- 0 errors`,
      `Test Files 60 passed (60)` / `Tests 724 passed (724)` (710 before),
      build finished `csp: hashed inline content in 152 HTML files`,
      `dist scan: clean`, `404: redirects to site root`,
      `chrome: 152 pages carry the site header`, and
      `check-header-row.mjs` silent.
- [x] 9. Run `graphify update .` from the repo root.
      **Evidence:** `[graphify watch] Rebuilt: 3107 nodes, 4357 edges, 322
      communities`; `graph.json, graph.html and GRAPH_REPORT.md updated in
      graphify-out`.

## Outputs

- Files touched: test support and unit tests, `website/shared/header-row.mjs`,
  possibly `website/scripts/check-header-row.mjs`. No site CSS.
- Behaviour change: none at runtime; the guards gain teeth.

## Validation

- [x] each of the six mutations turns its guard red — recorded pair by pair
      **Nine pairs recorded, every one green-before / red-after:**
      | probe | mutation | before | after |
      | --- | --- | --- | --- |
      | P1a | `.site-header { padding: … 0.7rem 8.8rem }` | 28 passed | 3 failed |
      | P1b | `@media (min-width: 64rem){ .site-header { margin: 0 0 0 var(--sidebar) } }` | 28 passed | 1 failed |
      | P2a | `.compact-brand { margin-left: auto }` | 28 passed | 2 failed |
      | P2b | `.compact-brand { order: 9 }` | 28 passed | 2 failed |
      | P3 | `.site-header { container-type: inline-size }` | 28 passed | 1 failed |
      | P4 | `.utility-more { width: 6rem }` | 28 passed + guard silent | 2 failed |
      | P5 | `space-between` + `.utility-nav` loses its auto margin | 9 passed | 1 failed |
      | P6 | constants back to 36 / 48 / 64 (the drift already present) | n/a — was the shipped state | 6 failed |
      | P7 | `process.exitCode = 1` in the warning branch | passed all 3 greps | 1 failed |
      | P8 | T8's `'unsafe-hashes'`/`'unsafe-eval'` rejection deleted | 10 passed | 4 failed |
      Every mutation reverted; `git diff --stat -- website/src/styles/global.css`
      is empty and a `+`-line grep for `8.8rem` / `container-type: inline-size` /
      `order: 9` / `width: 6rem` / `process.exitCode` finds hits only in ticket
      prose and in code comments that quote the probes.
- [x] with all mutations reverted, `cd website && npm run ci` exits 0
      **`EXIT=0`**; `Test Files 60 passed (60)` / `Tests 724 passed (724)`;
      `astro check` `- 0 errors`.
- [x] `resolve()`'s documented blind spots are written down
      Six of them, in the `website/tests/support/css.ts` file header: exact-string
      selectors with no specificity, `@layer` order not honoured, media *range*
      syntax dropped, `!important` returned inside the value and not honoured as
      priority, nothing evaluated (with `lengthPx()` throwing rather than
      skipping), logical properties mapped as horizontal-tb LTR.
- [x] commit msg draft: `test(website): make the header and rail guards fail on real regressions`
