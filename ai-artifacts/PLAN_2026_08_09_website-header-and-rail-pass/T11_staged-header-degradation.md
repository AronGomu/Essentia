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

## Impl steps

- [ ] 1. Write the stage table into this ticket as a table of
      (width → expected declarations), then encode it in
      `compact-header.test.ts`. Run; confirm red.
- [ ] 2. Split the `@media (max-width: 44rem)` header rules into the three
      staged blocks. Keep the 44rem stage byte-identical in effect to what T5
      shipped.
- [ ] 3. Run the unit tests; confirm green.
- [ ] 4. Add an e2e case to `header-row.spec.ts` asserting one row at each stage
      boundary width, and that `Learn` is visible inline in the stage-1 band.
- [ ] 5. Run the e2e through the Docker runbook on all three projects.
- [ ] 6. If any control's 400px width changed, update
      `website/shared/header-row.mjs`'s constants and its unit test, and note it.
- [ ] 7. Update `website/DESIGN.md` and
      `docs/ADR/proposed/0029-compact-header-at-phone-widths.md` to describe the
      staged degradation rather than a single breakpoint.
- [ ] 8. Delete `website/playwright-report/` and `website/test-results/`, then
      run `cd website && npm run format && npm run ci`.
- [ ] 9. Run `graphify update .` from the repo root.

## Outputs

- Files touched: `website/src/styles/global.css`, `compact-header.test.ts`,
  `header-row.spec.ts`, `DESIGN.md`, ADR 0029, possibly `shared/header-row.mjs`.
- Behaviour change: three ordered degradation stages instead of one.

## Validation

- [ ] `Learn` renders inline in the header in the stage-1 band — observed
- [ ] Find is an icon-only square in the stage-2 band with links still inline
- [ ] one row at every stage boundary and at 400px, all three engines
- [ ] `cd website && npm run ci` exits 0
- [ ] commit msg draft: `feat(website): shed header width in ordered stages`
