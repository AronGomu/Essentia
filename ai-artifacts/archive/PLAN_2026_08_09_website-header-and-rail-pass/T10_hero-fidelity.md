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

- [x] 1. Measure the baseline: check out `main`'s `global.css` into a scratch
      copy, build, and record the rendered `.catalog-hero` text-column and
      art-column widths at 1440px and 1280px on `/archetypes/nekroz/`. Write
      the numbers into this ticket. Restore the branch state afterwards.

      **Measured `main` baseline** — `git show main:website/src/styles/global.css`
      written over the branch copy, built and served through the Docker
      Playwright runbook, `/archetypes/nekroz/`, rail expanded (default), all
      three projects:

      | viewport | text column | art column | gutter | row width |
      | --- | --- | --- | --- | --- |
      | 1440 | **656.000** | **393.600** | 86.400 | 1136 |
      | 1280 | **562.000** | **337.200** | 76.800 | 976 |

      chromium / firefox / webkit agreed to under 0.01px (firefox read
      393.5999755859375 and 337.20001220703125 for the art). Text column starts
      at x=288 and the art ends at x=1424 (1440) / x=1264 (1280) — i.e. the row
      spans the full `.page-shell`, confirming the parent's arithmetic
      (`main` 1168 → `.page-shell` 1136 at 1440). ±2% bands, therefore:
      1440 text 642.88–669.12, art 385.73–401.47; 1280 text 550.76–573.24,
      art 330.46–343.94. Branch `global.css` restored afterwards (`git status`
      clean for that path).
- [x] 2. Update `catalog-hero-layout.test.ts:31-35`: the art must be hidden at
      900px. Rename the test so it no longer claims tablets keep the art.

      `it('the hero art survives on tablets')` → `it('the hero art goes as soon
      as the hero stacks')`, asserting `display: none` at 900 **and** 1024, the
      single-column switch at 1024, and that 1025 still shows the art. The cap
      and gutter tests were rewritten in the same pass (steps 5–6). Red
      confirmed: `npx vitest run tests/unit/catalog-hero-layout.test.ts` →
      `Tests  4 failed | 4 passed (8)`, including
      `AssertionError: expected undefined to be 'none'` at line 65.
- [x] 3. Add the e2e column-width assertions against the step-1 baseline
      (±2%). Confirm red.

      Added `the hero columns keep their pre-pass widths at {1440,1280}` (±2%
      on both columns plus a gutter < half the `main` gutter) and `the
      archetype hero art goes with the single-column switch` (hidden at 900,
      visible at 1280) to `tests/e2e/showcase.spec.ts`. Red on the T7 CSS,
      chromium: `3 failed / 2 passed` — text column off by **4.80%** at 1440
      and **4.98%** at 1280 (the `fr` tracks had eaten the whole gutter
      reduction), and `toBeHidden()` at 900px received `visible`.
- [x] 4. Move `.catalog-hero-art { display: none }` from the 44rem block to the
      64rem block so it fires with the single-column switch.

      `display: none` now sits on the existing `.catalog-hero-art` rule in
      `@media (max-width: 64rem)`, next to the `grid-template-columns: 1fr`
      switch; the whole rule (and its comment) is gone from the 44rem block.
      `max-width: 24rem; margin-inline: auto` stay authored — two tests pin
      them and they keep the stacked sizing correct for anything that shows
      the art again. Unit proof:
      `resolve('.catalog-hero-art', 'display', 1024) === 'none'` and
      `… 1025 !== 'none'` both green.
- [x] 5. Hold the column sizes: keep the reduced gap, but stop the `fr` tracks
      absorbing it — e.g. cap the art track, or use fixed/`minmax` bases plus
      `justify-content: center`. Verify against the step-1 numbers, not by eye.

      Took the user's own suggestion — padding — rather than re-cutting the
      tracks, so the authored `minmax(0, 1.25fr) minmax(18rem, 0.75fr)` ratio
      survives untouched:

      ```css
      --hero-track-inset: clamp(2rem, 6vw, 7rem);   /* what `main` reserved */
      --hero-gutter: clamp(1.5rem, 2.5vw, 3rem);     /* what is now visible */
      gap: var(--hero-gutter);
      padding-inline: calc((var(--hero-track-inset) - var(--hero-gutter)) / 2);
      ```

      The identity is exact and viewport-independent: tracks resolve against
      `row − 2·padding − gap = row − inset`, which is what `main` gave them.
      Re-measured on the built site, same harness as step 1:

      | viewport | text (base → now) | art (base → now) | gutter |
      | --- | --- | --- | --- |
      | 1440 | 656.000 → **656.016** (+0.002%) | 393.600 → **393.609** (+0.002%) | 86.4 → **36.0** (−58.3%) |
      | 1280 | 562.000 → **562.000** (0.000%) | 337.200 → **337.219** (+0.006%) | 76.8 → **32.0** (−58.3%) |

      Both columns land three orders of magnitude inside the ±2% band. The row
      itself is still the full shell (1136 / 976); what moved is the content
      inside it — text starts at x=313.19 instead of 288 and the art ends at
      1398.81 instead of 1424 at 1440px, i.e. the pair is now inset ~25px on
      each side and reads as centred.
- [x] 6. Fix or remove the inert `width: min(100%, 72rem)` cap and correct the
      comment at `global.css:836-838`.

      **Removed**, along with the `margin-inline: auto` that only existed to
      centre the capped row. It was inert below ~1456px viewport (measured:
      the row is 1136px at 1440 and 976px at 1280, both under the 1152px cap)
      and above that width it was the second thing resizing the columns away
      from their `main` widths — so it had to go for Requirement 2 anyway. The
      comment above `.catalog-hero` is rewritten to state what actually holds
      the columns still, with no claim about `.page-shell`'s 88rem. Unit
      proof: `resolve('.catalog-hero', 'width'|'margin-inline', 1440)` are both
      `undefined`.
- [x] 7. Run the unit tests; confirm green.

      `cd website && npm run test` → `Test Files  59 passed (59)` /
      `Tests  639 passed (639)`, including all 8 of
      `catalog-hero-layout.test.ts` and all 10 of `catalog-hero-art.test.ts`.
- [x] 8. Run the hero e2e through the Docker runbook on all three projects.

      `npx playwright test tests/e2e/showcase.spec.ts -g hero` in
      `mcr.microsoft.com/playwright:v1.61.1-noble` → **15 passed (37.4s)**,
      i.e. all five hero tests green on chromium, firefox and webkit. Then the
      whole e2e directory on chromium (to catch collateral) → **25 passed
      (42.9s)**, including the axe accessibility sweeps.
- [x] 9. Delete `website/playwright-report/` and `website/test-results/`, then
      run `cd website && npm run format && npm run ci`.

      Both deleted; `find website -not -user aron` printed nothing (rootless
      Docker maps container root to `aron`). `npm run format` rewrote only
      `tests/unit/catalog-hero-layout.test.ts` (line wrapping). `npm run ci`
      → **EXIT=0**: `astro check` `0 errors, 0 warnings, 5 hints` (all
      pre-existing), `Tests  639 passed (639)`, build `152 page(s)`,
      `csp: hashed inline content in 152 HTML files`, `dist scan: clean`,
      `chrome: 152 pages carry the site header`. The temporary measurement
      spec was deleted before this run.
- [x] 10. Run `graphify update .` from the repo root.

      `[graphify watch] Rebuilt: 3067 nodes, 4296 edges, 316 communities`;
      `graph.json, graph.html and GRAPH_REPORT.md updated in graphify-out`.
      The warnings printed (9 zero-node JSON data files, 32 `.astro` partial
      parses) are pre-existing and unrelated to this ticket.

## Outputs

- Files touched: `website/src/styles/global.css`, hero unit tests,
  `website/tests/e2e/showcase.spec.ts`.
- Behaviour change: art hidden from 64rem down; columns hold their size.

### Known cost carried forward — Requirement 5 not delivered

The hidden hero art **is still downloaded**. `.catalog-hero-art` is hidden with
`display: none`, and the `<img fetchpriority="high" width="624" height="624">`
inside it (`src/pages/archetypes/[slug].astro:53-65`, mirrored by the
non-archetype section page) is fetched regardless. This ticket widens the band
where that waste happens — it used to start at 44rem, it now starts at 64rem —
so every viewport from 704px to 1024px newly pays for a WebP it never shows.

Not fixed here because every mechanism needs template work outside this
ticket's slice, and each carries its own risk:

- `<picture>` with a `<source media="(max-width: 64rem)">` pointing at a
  transparent placeholder needs a new asset *and* an `img-src data:`
  allowance in the hardened CSP (`scripts/harden-csp.mjs`) if the placeholder
  is a data URI.
- Dropping `fetchpriority="high"` for `loading="lazy"` does not reliably stop
  the fetch and would cost desktop LCP, where the art is the LCP element.
- A CSS `background-image` cannot be used: the URL is per-section, so it would
  have to ride on a `style="…"` attribute, which the hashed CSP blocks.

Recommend a follow-up ticket that owns the hero markup and the CSP `img-src`
directive together.

## Validation

- [x] hero unit tests pass, including the inverted tablet assertion

      `npx vitest run tests/unit/catalog-hero-layout.test.ts
      tests/unit/catalog-hero-art.test.ts` → `Test Files  2 passed (2)` /
      `Tests  18 passed (18)`. The inverted assertion is
      `it('the hero art goes as soon as the hero stacks')`, which pins
      `display: none` at 900 **and** 1024 and `!== 'none'` at 1025 — it was one
      of the 4 failures in the step-2 red run.

- [x] e2e column widths within ±2% of the recorded `main` baseline at 1440 and 1280

      `the hero columns keep their pre-pass widths at {1440,1280}` green on
      chromium, firefox and webkit. Measured deltas: +0.002% / +0.002% at 1440,
      0.000% / +0.006% at 1280 (step 5 table) — against 4.80% / 4.98% before
      the fix.

- [x] art hidden at 900px and 390px, present at 1280px — observed, not inferred

      Observed in a real browser on the built site, not read off the CSS:
      `the archetype hero art goes with the single-column switch` asserts
      `toBeHidden()` at 900×900 then `toBeVisible()` at 1280×900 on
      `/archetypes/burning-abyss/`, and `the archetype hero drops its art on a
      phone` asserts `toBeHidden()` at 390×800. All three green on all three
      engines. The same 900px assertion failed with `Received: visible` before
      the CSS change.

- [x] `cd website && npm run ci` exits 0

      `EXIT=0` — `format:check`, `lint`, `astro check` (`0 errors, 0
      warnings`), `Tests  639 passed (639)`, and the full build with
      `csp: hashed inline content in 152 HTML files` / `dist scan: clean`.

- [x] commit msg draft: `fix(website): hide the hero art with the single-column switch and hold the column sizes`

      Committed verbatim as `baa47b8` (5 files, +308/−37) and pushed to
      `origin/plan/website-header-and-rail-pass` (`25ec83c..baa47b8`). The
      modified `blog/2026-08-08-lota-alpha-v0-1-presentation.md` is the user's
      own writing and was deliberately left unstaged.
