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

- [ ] 1. Reproduce all six probes from Context and record that each guard is
      currently green under mutation. Revert each mutation.
- [ ] 2. Add shorthand expansion to `resolve()` for `padding`, `margin`,
      `inset`. Document the helper's remaining blind spots in a header comment:
      no descendant/id-selector resolution, `@media` range syntax
      (`width <= 64rem`) is dropped by `css.ts:76`, and `!important` is returned
      as part of the value.
- [ ] 3. Fix `brandHoldsTheLeftEdge()` to inspect child order rather than
      returning early on `justify-content`, and remove `space-between` from one
      of the two sets (decide which by what the assertion means).
- [ ] 4. Extend the containing-block property list in `header-priority.test.ts`.
- [ ] 5. Make `header-row.mjs`'s constants verifiable: either derive them from
      `global.css` at build time, or add a test that parses the CSS and fails
      when a constant drifts. Correct `BREADCRUMB_MIN_PX` against the authored
      `min-width: 0`.
- [ ] 6. Add a test that actually executes `check-header-row.mjs`'s warning
      branch and asserts both that it warns and that it exits 0.
- [ ] 7. Re-run all six probes; each guard must now be red under mutation.
      Revert every mutation and confirm the suite is green.
- [ ] 8. Delete `website/playwright-report/` and `website/test-results/`, then
      run `cd website && npm run format && npm run ci`.
- [ ] 9. Run `graphify update .` from the repo root.

## Outputs

- Files touched: test support and unit tests, `website/shared/header-row.mjs`,
  possibly `website/scripts/check-header-row.mjs`. No site CSS.
- Behaviour change: none at runtime; the guards gain teeth.

## Validation

- [ ] each of the six mutations turns its guard red — recorded pair by pair
- [ ] with all mutations reverted, `cd website && npm run ci` exits 0
- [ ] `resolve()`'s documented blind spots are written down
- [ ] commit msg draft: `test(website): make the header and rail guards fail on real regressions`
