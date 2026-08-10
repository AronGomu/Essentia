# T3: Header — 3 inline links, no `⋯`

**Plan:** `./ai-artifacts/PLAN_2026_08_10_feedback_batch.md`
**Depends:** none
**Commit outcome:** `Learn`, `Blog`, `Decks` render inline in the header row at
every width down to 400px; the `⋯` popover is gone from markup, CSS and budget.

## Context (self-contained)

- Goal: `feedback.md` item 3 — there is room for the three header links, so the
  three-dot menu must go. It must still hold one row at 400px.
- This slice: header only. Site chrome, no page content.
- Out of scope here: the drawer trigger (`☰`, catalog rail), the Find palette, the
  breadcrumb, brand mark, any page below the header.
- Assumptions in force: labels stay `Learn` / `Blog` / `Decks`; "Dex" in the feedback
  means the existing `Decks` link.

## Requirements

- `.utility-more` button deleted from the DOM at every width.
- `.utility-menu` is a plain flex row at every width; no `popover` attribute, no
  `popovertarget`, no `:popover-open` rule.
- `.label-full` / `.label-short` behaviour is unchanged above 44rem (`Learn` short
  label already wins below 64rem — do not touch that rule).
- Header holds one row and does not overflow at 400, 704, 896 and 1024px, with and
  without a breadcrumb.
- `website/shared/header-row.mjs` describes what is actually rendered: the
  `utility-more` control record is replaced by one record per link, each with the real
  measured width, and `tests/unit/header-row.test.ts` still cross-checks
  `px === Σ cssPx + intrinsicPx`.
- Padding relief, needed because three links replace one 39.2px button: inside the
  existing `@media (max-width: 44rem)` block, `.utility-menu a { padding: 0.5rem 0.55rem }`
  (was `0.5rem 0.8rem` from the base rule). Record the new numbers in `header-row.mjs`.

## Inputs

- `website/src/layouts/BaseLayout.astro` lines 163-197: `<nav class="utility-nav">`,
  the `.utility-more` button, the `.utility-menu` popover div with three `<a>`.
- `website/src/styles/global.css`: base `.utility-menu a` at line 254,
  `.utility-menu` at line 271, `.utility-more` at line 288, and the
  `@media (max-width: 44rem)` overrides at lines 1748-1766.
- `website/shared/header-row.mjs`: `COMPACT_VIEWPORT_PX = 400`,
  `HEADER_PADDING_INLINE` (32px), `HEADER_GAP` (7.2px), `HEADER_CONTROLS`
  (`compact-brand` 32, `drawer-trigger` 34, `utility-more` 39.2, `search-trigger` 39.8),
  `BREADCRUMB` (0), `headerRowBudget()`.
- `website/tests/unit/header-row.test.ts` — re-reads each `cssPx` pair from `global.css`
  at 400px and fails when the arithmetic disagrees.
- `website/tests/e2e/header-row.spec.ts` — `rowCount()`, `STAGE_BOUNDARIES`, and the
  test `` `Learn` renders inline in the header row above the `⋯` stage `` which asserts
  `.utility-more` is hidden at 705-1024px.
- Current budget at 400px: content 173.8px, available 368px.
- **From Depends:** none.

## TDD

1. **Red** — update `tests/unit/header-row.test.ts` and `tests/e2e/header-row.spec.ts`
   first (assert no `.utility-more` in the DOM, three links visible at 400px). Run, watch
   them fail.
2. **Green** — edit `BaseLayout.astro`, `global.css`, `shared/header-row.mjs`.
3. **Refactor** — delete every now-dead rule and comment mentioning the popover.

## Test plan

| Test | Input | Expect |
| --- | --- | --- |
| `header-row.test.ts` › `budget covers exactly the rendered controls` | `HEADER_CONTROLS` | names are `['compact-brand','drawer-trigger','utility-learn','utility-blog','utility-decks','search-trigger']` |
| `header-row.test.ts` › existing cross-check | each control's `cssPx` | `px === Σ cssPx + intrinsicPx` for every record, including the three new ones |
| `header-row.test.ts` › `fits at 400px with a breadcrumb` | `headerRowBudget(400, { withBreadcrumb: true })` | `.fits === true` |
| `header-row.spec.ts` › `the header holds one row at 400px` | 400×800, `/` and `/archetypes/burning-abyss/` | `rowCount === 1` (unchanged test, must stay green) |
| `header-row.spec.ts` › `the three section links are inline at 400px` | 400×800 | all three `.utility-menu a` visible, each box inside the `.site-header` box |
| `header-row.spec.ts` › `no popover trigger exists` | 400, 705, 896, 1024px | `page.locator('.utility-more')` count `=== 0` |
| `header-row.spec.ts` › `the header holds one row at every stage boundary` | 1024/896/704/400 | `rowCount === 1` and `scrollWidth - clientWidth <= 0` |

## Impl steps

- [ ] 1. In `BaseLayout.astro`, delete the `<button class="utility-more" …>` element and
      its explanatory comment.
- [ ] 2. In the same file, change `<div class="utility-menu" id="utility-menu" popover>`
      to `<div class="utility-menu" id="utility-menu">`.
- [ ] 3. In `global.css`, delete the whole `.utility-more { … }` rule (line ~288) and its
      `:hover` / `:focus` siblings if they only serve that selector.
- [ ] 4. In `global.css`, inside `@media (max-width: 44rem)`, delete
      `.utility-more { display: inline-flex }`, the `.utility-menu { display: none; position: fixed; … }`
      override and `.utility-menu:popover-open { … }`.
- [ ] 5. In the same media block, add `.utility-menu a { padding: 0.5rem 0.55rem; }`.
- [ ] 6. In `global.css`, delete the comment above `.utility-menu` that explains the
      popover/UA-rule interaction — it is no longer true.
- [ ] 7. Measure the three link widths on the built site at 400px:
      `npx playwright test tests/e2e/header-row.spec.ts --project=chromium --headed` is not
      needed — instead add a temporary `console.log` assertion, or run
      `node -e` against `npx playwright` in a scratch file. Record each width to one decimal.
- [ ] 8. In `shared/header-row.mjs`, replace the `utility-more` record with three records
      named `utility-learn`, `utility-blog`, `utility-decks`. Each:
      `px: <measured>`, `cssPx: [['.utility-menu a','padding-left'], ['.utility-menu a','padding-right']]`,
      `intrinsicPx: <measured − 17.6>` with a comment stating the glyph run and the 2×1px border.
- [ ] 9. In the same file, add `UTILITY_GAP` handling: `.utility-menu { gap: 0.35rem }`
      contributes `2 × 5.6px`. Fold it into the `utility-blog` record's `intrinsicPx` **or**
      add it as an explicit measurement entry — pick the explicit entry and add it to
      `HEADER_MEASUREMENTS` so the cross-check walks it.
- [ ] 10. Update the module docstring: the compact header now carries three links, not a
      `⋯` trigger.
- [ ] 11. Update `tests/unit/header-row.test.ts` name list and add the `fits at 400px` test.
- [ ] 12. Update `tests/e2e/header-row.spec.ts`: rewrite the
      `` `Learn` renders inline … above the `⋯` stage `` test into
      `the three section links are inline at every width`, add the `no popover trigger`
      test, and drop every `.utility-more` visibility expectation from the Find test.
- [ ] 13. Update `docs/website-shell-chrome.html` where it documents the `⋯` stage.

## Outputs

- `website/src/layouts/BaseLayout.astro`, `website/src/styles/global.css`,
  `website/shared/header-row.mjs`, `website/tests/unit/header-row.test.ts`,
  `website/tests/e2e/header-row.spec.ts`, `docs/website-shell-chrome.html`.
- Behaviour change: no popover anywhere; three inline links at all widths.

## Validation

- [ ] `cd website && npx vitest run tests/unit/header-row.test.ts` → pass
- [ ] `cd website && npm run build` → `check-header-row.mjs` prints no `[warn] site-header may wrap`
- [ ] `cd website && npx playwright test tests/e2e/header-row.spec.ts` → pass on all 3 browsers
- [ ] manual check: 400px viewport, `/archetypes/burning-abyss/`, three links visible, one row
- [ ] `cd website && npm run ci` → pass
- [ ] commit msg draft: `fix(website): keep the three section links inline instead of a popover`
