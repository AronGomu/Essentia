# T10: Make the catalog hero match what was asked

**Plan:** `./ai-artifacts/PLAN_2026_08_09_website-header-and-rail-pass.md`
**Depends:** T7 (shipped, `4af3bd8`)
**Commit outcome:** The hero art disappears as soon as the hero goes
single-column, and the two hero columns keep the size they had before this pass.

## Context (self-contained)

T7 delivered `feedback.md` lines 9.1 and 9.2, but two deep reviewers
independently found both delivered against the wrong reading.

**9.2 — wrong breakpoint (CONFIRMED).** The user wrote:

```
Remove Hero image on mobile size (when everything is placed on 1 column and
Title on page + description is placed before hero-image)
```

The width was **stated**, as a layout condition. `.catalog-hero` becomes
`grid-template-columns: 1fr` at `@media (max-width: 64rem)`
(`global.css:1118-1120`), but `.catalog-hero-art { display: none }` only fires
at `@media (max-width: 44rem)` (`global.css:1127`, `:1135-1137`). So across the
whole **704px–1024px** band the hero is single-column with the title and
description stacked above the art — exactly the state the user described — and
the art is still shown. `website/tests/unit/catalog-hero-layout.test.ts:31-35`
actively enshrines the bug: `it('the hero art survives on tablets')` asserts
`display !== 'none'` at **900px**, inside that band. The plan's Assumption
called this "the unstated width"; it was stated.

**9.1 — "Keep their current size" is not held (CONFIRMED, arithmetic).** The
user wrote:

```
I want the text and image in catalog-hero section to be a bit more centered on
the row. Either add padding for each or a justify something that help reducing
a bit the space between the 2. Keep their current size.
```

T7 shrank the gap `clamp(2rem, 6vw, 7rem)` → `clamp(1.5rem, 2.5vw, 3rem)` and
added `width: min(100%, 72rem); margin-inline: auto` (`global.css:838-846`).
The tracks are `minmax(0, 1.25fr) minmax(18rem, 0.75fr)` — `fr` tracks absorb
every pixel the gap gives back, so **both columns grow**. Reducing the gap
without pinning the tracks cannot hold their size.

The `72rem` cap is additionally **inert at ordinary widths**, and the source
comment claiming it is "capped well inside `.page-shell`'s 88rem" is wrong.
Parent's arithmetic, for you to trust: `.page-shell` is
`min(100% - 2rem, 88rem)` (`global.css:326`); at a 1440px viewport with the
rail expanded (`--sidebar: 17rem` = 272px) `main` is 1168px, so `.page-shell`
is `min(1136, 1408)` = **1136px**, below the 1152px cap. The cap only starts
binding above roughly a 1456px viewport.

Deliver the user's own suggested mechanism: bring the columns closer **without
resizing them** — padding/justification, not `fr` redistribution.

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

1. `.catalog-hero-art` is hidden at every width where `.catalog-hero` is
   single-column — i.e. the hide breakpoint matches the single-column
   breakpoint (`64rem`), not `44rem`.
2. At 1440px and at 1280px viewport, the rendered text column and art column
   widths are each within **±2%** of their widths at commit `main`.
3. The horizontal space between the two columns is visibly smaller than at
   `main`.
4. Any comment describing the cap states the truth, or the cap is removed.
5. The hero image is not fetched at all on widths where it is hidden, or —
   if that requires template changes beyond this ticket — this is recorded as a
   known cost in Outputs. `display: none` still downloads the
   `fetchpriority="high"` 624×624 WebP.

## Inputs

- `website/src/styles/global.css` (`.catalog-hero*`, ~838-846, ~1118-1137)
- `website/tests/unit/catalog-hero-layout.test.ts`, `catalog-hero-art.test.ts`
- `website/tests/e2e/showcase.spec.ts` (hero tests)
- `website/src/pages/archetypes/[slug].astro` (hero markup, ~53-65)
- Baseline: `git show main:website/src/styles/global.css` for the pre-pass
  column widths you must hold.

## TDD

1. **Red** — invert `it('the hero art survives on tablets')` to assert the art
   is hidden at 900px, and add an e2e assertion pinning both column widths
   against the `main` baseline you measured. Confirm both fail.
2. **Green** — move the hide breakpoint to 64rem; replace the `fr`
   redistribution with padding/justification that holds the column sizes.
3. **Refactor** — keep green.

## Impl steps

- [ ] 1. Measure the baseline: check out `main`'s `global.css` into a scratch
      copy, build, and record the rendered `.catalog-hero` text-column and
      art-column widths at 1440px and 1280px on `/archetypes/nekroz/`. Write
      the numbers into this ticket. Restore the branch state afterwards.
- [ ] 2. Update `catalog-hero-layout.test.ts:31-35`: the art must be hidden at
      900px. Rename the test so it no longer claims tablets keep the art.
- [ ] 3. Add the e2e column-width assertions against the step-1 baseline
      (±2%). Confirm red.
- [ ] 4. Move `.catalog-hero-art { display: none }` from the 44rem block to the
      64rem block so it fires with the single-column switch.
- [ ] 5. Hold the column sizes: keep the reduced gap, but stop the `fr` tracks
      absorbing it — e.g. cap the art track, or use fixed/`minmax` bases plus
      `justify-content: center`. Verify against the step-1 numbers, not by eye.
- [ ] 6. Fix or remove the inert `width: min(100%, 72rem)` cap and correct the
      comment at `global.css:836-838`.
- [ ] 7. Run the unit tests; confirm green.
- [ ] 8. Run the hero e2e through the Docker runbook on all three projects.
- [ ] 9. Delete `website/playwright-report/` and `website/test-results/`, then
      run `cd website && npm run format && npm run ci`.
- [ ] 10. Run `graphify update .` from the repo root.

## Outputs

- Files touched: `website/src/styles/global.css`, hero unit tests,
  `website/tests/e2e/showcase.spec.ts`.
- Behaviour change: art hidden from 64rem down; columns hold their size.

## Validation

- [ ] hero unit tests pass, including the inverted tablet assertion
- [ ] e2e column widths within ±2% of the recorded `main` baseline at 1440 and 1280
- [ ] art hidden at 900px and 390px, present at 1280px — observed, not inferred
- [ ] `cd website && npm run ci` exits 0
- [ ] commit msg draft: `fix(website): hide the hero art with the single-column switch and hold the column sizes`
