# T11: Stage the header's degradation the way it was asked for

**Plan:** `./ai-artifacts/PLAN_2026_08_09_website-header-and-rail-pass.md`
**Depends:** T5 (shipped, `d712955`), T6 (shipped, `41b780e`)
**Commit outcome:** The header sheds width in the three ordered stages the
feedback specifies, so "Learn" is actually visible in the header row before the
links fold into the `⋯` menu.

## Context (self-contained)

`feedback.md` line 8.6 asks for an **ordered** budget:

```
6. When reducing width to gain space :
   - first remove "about Essentia"
   - second reduce width of "Find" input up until becoming only a square icon button
   - regroup buttons into 3 dot dropdown menu
   - All all other same on a single row
```

Two deep reviewers CONFIRMED this landed as a single step. `.label-full{display:none}`,
`.label-short{display:inline}`, `.utility-more{display:inline-flex}`,
`.utility-menu{display:none}` and `.search-trigger{min-width:0}` all fire together in
the one `@media (max-width: 44rem)` block (`global.css:1127-1143`, `1697-1717`).
`grep -n "label-full\|label-short\|utility-more" website/src/styles/global.css`
shows only two sites: the base layer and that single media block.

Consequence for feedback line 8.2 ("'Learn about Essentia' text can be shorten
to 'Learn'"): `.label-short` is only ever rendered **inside the `⋯` popover**
(`BaseLayout.astro`, `.utility-menu a`), where horizontal space is
unconstrained. The shortening the user asked for — to save room in the header
row — never appears in the header row. 8.2 lands only in a degenerate form.

Neither the plan's Assumptions nor `T5_compact-header-overflow-menu.md` mentions
8.6 at all.

Stage boundaries are yours to choose and verify; sensible defaults, given the
existing 64rem and 44rem breakpoints:

- **Stage 1** (~56rem): `.label-full` → `.label-short` — links stay inline in
  the header, reading `Learn` / `Blog` / `Decks`.
- **Stage 2** (~50rem): `.search-trigger` collapses toward a square icon button.
- **Stage 3** (44rem, unchanged): links fold into the `⋯` popover.

Verify at each boundary that the header still holds one row; adjust the numbers
if it does not. The 400px single-row guarantee from T6 must survive unchanged.

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

1. There is a width band where the header shows `Learn` / `Blog` / `Decks`
   inline — `.label-short` visible, `.label-full` hidden, no `⋯` button.
2. There is a width band where the Find control is an icon-only square while
   the section links are still inline.
3. Below the final breakpoint the behaviour is exactly T5's: icons plus `⋯`.
4. The header holds one row at every stage boundary and at 400px.
5. `.utility-nav a` (`global.css:1671`) is not deleted — see Environment.

## Inputs

- `website/src/styles/global.css` (`@media` blocks ~1118-1143, ~1697-1724)
- `website/src/layouts/BaseLayout.astro` (`.label-full` / `.label-short` markup)
- `website/src/components/FindPalette.svelte` (`.search-trigger`)
- `website/tests/unit/compact-header.test.ts`
- `website/tests/e2e/header-row.spec.ts`
- `website/shared/header-row.mjs` — the build-guard constants; if a stage
  changes a control's width at 400px, update them and say so.

## TDD

1. **Red** — extend `compact-header.test.ts` with the stage table: for each
   boundary width, which of `.label-full` / `.label-short` / `.utility-more` /
   `.utility-menu` / `.search-trigger` resolve to which `display` / `min-width`.
   Use `resolve()` from `tests/support/css.ts`. Confirm red.
2. **Green** — split the single media block into the staged blocks.
3. **Refactor** — keep green.

## Stage table

Final boundaries: **64rem / 56rem / 44rem**. Root font is 16px, so 1024px /
896px / 704px. `—` means "nothing declares it"; `resolve()` returns `undefined`.

| viewport | stage | `.label-full` display | `.label-short` display | `.search-trigger` min-width | `.utility-more` display | `.utility-menu` display |
| -------- | ----- | --------------------- | ---------------------- | --------------------------- | ----------------------- | ----------------------- |
| 1440     | 0     | —                     | `none`                 | `min(22rem, 45vw)`          | `none`                  | `flex`                  |
| 1025     | 0     | —                     | `none`                 | `min(22rem, 45vw)`          | `none`                  | `flex`                  |
| 1024     | 1     | `none`                | `inline`               | `min(22rem, 45vw)`          | `none`                  | `flex`                  |
| 897      | 1     | `none`                | `inline`               | `min(22rem, 45vw)`          | `none`                  | `flex`                  |
| 896      | 2     | `none`                | `inline`               | `0`                         | `none`                  | `flex`                  |
| 705      | 2     | `none`                | `inline`               | `0`                         | `none`                  | `flex`                  |
| 704      | 3     | `none`                | `inline`               | `0`                         | `inline-flex`           | `none`                  |
| 400      | 3     | `none`                | `inline`               | `0`                         | `inline-flex`           | `none`                  |

**Boundary choice — the parent's ~56rem / ~50rem defaults did not hold; both
were moved up one step, and each move is measured.**

_Stage 1 → 64rem (default was ~56rem)._ On the pre-change build (Docker
Playwright sweep, chromium) the header was already 2–3 rows tall and
overflowing across the *entire* 44–64rem band, not just below 56rem. At 1024px
on `/archetypes/burning-abyss/` the header was 121px tall; the 160px wordmark
was crushed to 20.7px at 896px and to **0px** at 720–864px; the header
overflowed its own box by 15px (832), 46px (800), 70px (768), 95px (720).
Cause: from 64rem down the rail is replaced by a `.drawer-trigger`, so the
header *gains* a control at the width it loses a column — and
`Learn about Essentia` + `Catalog` then wrapped to two and three lines inside
their own buttons. 64rem is therefore where the budget actually breaks, and it
is an existing breakpoint rather than a new one. ~56rem would have left
57–64rem broken while "fixing" the band below it.

_Stage 2 → 56rem (default was ~50rem)._ Cut at 50rem first and re-swept: with
Find still holding `min(22rem, 45vw)` = 352px, inner pages ran out of room in
the band immediately above the boundary — 801px gave a 3-row 121px header with
the breadcrumb at its 75px min-content and the wordmark at 11.9px; 840px gave 2
rows. 56rem is the widest boundary that leaves no such band between stages 1
and 2, and it re-uses the number the parent had proposed for stage 1.

_Stage 3 stays at 44rem_, unchanged from T5.

## Impl steps

- [x] 1. Write the stage table into this ticket as a table of
      (width → expected declarations), then encode it in
      `compact-header.test.ts`. Run; confirm red.
      Evidence: table above; `staged header degradation` block added to
      `compact-header.test.ts`; `npx vitest run tests/unit/compact-header.test.ts`
      → `Tests  5 failed | 19 passed (24)`. The reds are exactly the stage-1 and
      stage-2 rows (1024, 896, 800, 705) plus the `⌘ K` hint row — all failing
      with `expected undefined to be 'none'`, i.e. nothing declares the staged
      values above 44rem, which is the defect.
- [x] 2. Split the `@media (max-width: 44rem)` header rules into the three
      staged blocks. Keep the 44rem stage byte-identical in effect to what T5
      shipped.
      Evidence: `global.css` now has `@media (max-width: 64rem)` (`.label-full`
      / `.label-short`) and `@media (max-width: 50rem)` (`.search-trigger`
      min-width + `kbd`) above the 44rem block; those four declarations were
      *moved*, not copied, out of the two 44rem blocks. Each new query's range
      contains 44rem, so at ≤44rem the same declarations still resolve to the
      same values — the stage-3 rows of the unit stage table (704px, 400px) are
      unchanged from T5 and pass.
- [x] 3. Run the unit tests; confirm green.
      Evidence: `npx vitest run tests/unit/` → `Test Files  59 passed (59) /
      Tests  650 passed (650)`. Two T5-era assertions that used 900px as
      "desktop" for the label swap were re-pointed at 1440px, since 900px is
      now inside stage 1; comment in the test records why.
- [x] 4. Add an e2e case to `header-row.spec.ts` asserting one row at each stage
      boundary width, and that `Learn` is visible inline in the stage-1 band.
      Evidence: three new tests — `the header holds one row at every stage
      boundary` (1024/896/704/400 × `/` and `/archetypes/burning-abyss/`, also
      asserting `header.scrollWidth - header.clientWidth <= 0`, because above
      44rem the header is `flex-wrap: nowrap` and the row count alone would be
      vacuous), `` `Learn` renders inline in the header row above the `⋯` stage``
      (1024/960/896/705: link visible, `.label-short` visible, `.label-full`
      hidden, no `⋯`, and the link's box inside the header's box), and `Find
      keeps its reserved width in stage 1 and squares off in stage 2`.
- [x] 5. Run the e2e through the Docker runbook on all three projects.
      Evidence: `npx playwright test tests/e2e/header-row.spec.ts …` in
      `mcr.microsoft.com/playwright:v1.61.1-noble` → `18 passed (44.8s)`,
      6 tests × chromium/firefox/webkit.
      One tolerance was widened per the Environment note: the stage-2 Find box
      is 39.8 × 49.2, so `|width − height|` is 9.39 (chromium) / 9.43 (firefox)
      / 9.42 (webkit) — the control's own vertical padding, which this ticket
      does not touch. Tolerance is 12 with those three numbers recorded in the
      comment, plus a structural assertion (`square.width < wide.width / 4`)
      that does not depend on it.
      A throwaway sweep spec measured every width 400→1280 on both pages:
      `rows=1` and `header overflow = 0` at **all** of them, with the stage
      transitions landing exactly on the boundaries — Find 39.8→352px between
      896 and 897, short labels off between 1024 and 1025, `⋯` on/off between
      704 and 705. The spec was deleted afterwards; it is not part of the diff.
- [x] 6. If any control's 400px width changed, update
      `website/shared/header-row.mjs`'s constants and its unit test, and note it.
      Evidence: **no change needed, and this was measured, not assumed.** At
      400px the same declarations resolve as before the split, and the sweep
      confirms identical rendered widths before and after: `compact-brand` 32,
      `drawer-trigger` 34, `utility-nav` 39.2, `search-trigger` 39.8 in both
      runs. `HEADER_CONTROLS` is untouched.
      Noted as residual risk, *not* fixed here: those constants already drifted
      from the real numbers before this ticket (`search-trigger` 48 vs measured
      39.8, `drawer-trigger` 36 vs 34). `check-header-row.mjs` only warns, and
      correcting them is out of T11's scope.
- [x] 7. Update `website/DESIGN.md` and
      `docs/ADR/proposed/0029-compact-header-at-phone-widths.md` to describe the
      staged degradation rather than a single breakpoint.
      Evidence: DESIGN.md's *One Home Rule* now names all three stages;
      ADR 0029 decision 1 is rewritten as the three-stage table with the
      measured reason for each boundary, decision 2 reads "from stage 1 down"
      instead of "at ≤44rem", and two consequences are added (the 44–64rem band
      is repaired; `Catalog`/`Find` also lose their text at 64rem).
- [x] 8. Delete `website/playwright-report/` and `website/test-results/`, then
      run `cd website && npm run format && npm run ci`.
      Evidence: both directories removed and
      `find /home/aron/projects/essentia/website -not -user aron` returned
      nothing, so the Docker runs left no root-owned files. `npm run format`
      reported every touched file already formatted. `npm run ci` →
      `CI_EXIT=0`, ending `csp: hashed inline content in 152 HTML files / dist
      scan: clean / 404: redirects to site root / chrome: 152 pages carry the
      site header`. `check-header-row.mjs` printed no `[warn] site-header may
      wrap …` line, so the 400px budget still fits.
- [x] 9. Run `graphify update .` from the repo root.
      Evidence: `Rebuilt: 3073 nodes, 4302 edges, 312 communities`,
      `graph.json, graph.html and GRAPH_REPORT.md updated in graphify-out`.

## Outputs

- Files touched: `website/src/styles/global.css`, `compact-header.test.ts`,
  `header-row.spec.ts`, `DESIGN.md`, ADR 0029, possibly `shared/header-row.mjs`.
- Behaviour change: three ordered degradation stages instead of one.

## Validation

- [x] `Learn` renders inline in the header in the stage-1 band — observed
      e2e `` `Learn` renders inline in the header row above the `⋯` stage``
      passes at 1024/960/896/705 on all three engines: the link is visible,
      `.label-short` is visible, `.label-full` is hidden, `.utility-more` is
      hidden, and the link's bounding box sits inside the header's own box —
      i.e. in the row, not in a popover. The sweep independently shows
      `short=True, more=False` from 705 to 1024 and `short=False` at 1025.
- [x] Find is an icon-only square in the stage-2 band with links still inline
      e2e `Find keeps its reserved width in stage 1 and squares off in stage 2`
      passes on all three engines: at 960px the box is 352 × 49.2 with the
      `⌘ K` hint visible; at 896px it is 39.8 × 49.2 with the hint hidden,
      `.utility-more` still hidden and the `Learn` link still visible.
- [x] one row at every stage boundary and at 400px, all three engines
      e2e `the header holds one row at every stage boundary` passes at
      1024/896/704/400 × {`/`, `/archetypes/burning-abyss/`} on
      chromium/firefox/webkit — `rowCount === 1` and header overflow `<= 0` at
      each. `18 passed (44.8s)` for the whole spec. The sweep goes further and
      shows `rows=1, hdrOv=0` at every width 400/500/600/704/705/800/860/896/
      897/900/940/980/1024/1025/1280 on both pages, so no broken band is left
      between the boundaries — the pre-change build had 2–3 row headers and up
      to 95px of overflow across most of that range.
- [x] `cd website && npm run ci` exits 0
      `CI_EXIT=0`; see Impl step 8.
- [x] commit msg draft: `feat(website): shed header width in ordered stages`
