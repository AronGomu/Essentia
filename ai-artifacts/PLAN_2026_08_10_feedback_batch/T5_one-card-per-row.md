# T5: One card per row under 480px

**Plan:** `./ai-artifacts/PLAN_2026_08_10_feedback_batch.md`
**Depends:** none
**Commit outcome:** every card list shows exactly one card per row at 400px; the
homepage new-cards grid keeps two columns between 480px and 640px.

## Context (self-contained)

- Goal: `feedback.md` item 4 — at the 400px minimum width, a card list must never put
  two cards side by side. The homepage new-cards grid is the only offender.
- This slice: CSS grid rules plus the tests that lock them.
- Out of scope here: card counts and labels (T4), spacing (T6), the gallery grid's
  desktop columns.
- Assumptions in force: breakpoint is 30rem (480px), so 480-640px keeps two columns.

## Requirements

- `.new-card-grid` is a single column at every width ≤ 30rem.
- `.new-card-grid` keeps two columns from 30rem to 40rem, three to 70rem, five above.
- `.card-grid` (archetype and non-archetype galleries) is verified — not changed — to
  already be one column at 400px: its track floor is `min(100%, 14rem)` = 224px against
  a 368px shell.
- `.related-card-grid` does not exist yet; T10 introduces it and reuses `.card-grid`, so
  no work here.

## Inputs

- `website/src/styles/global.css`:
  - `.new-card-grid { grid-template-columns: repeat(5, minmax(0, 1fr)) }` at line 776
  - `@media (max-width: 70rem) { .new-card-grid { repeat(3, …) } }` at line 800
  - `@media (max-width: 40rem) { .new-card-grid { repeat(2, …) } }` at line 805
  - `.card-grid { grid-template-columns: repeat(auto-fit, minmax(min(100%, 14rem), min(100%, 25rem))) }` at line 908
- `website/tests/unit/new-card-grid.test.ts` — `ruleFor(selector)` helper that extracts a
  whole rule from `global.css` and asserts exactly one rule matches the selector. It will
  need a media-aware variant, because `.new-card-grid` will then have four rules.
- **From Depends:** none.

## TDD

1. **Red** — extend `tests/unit/new-card-grid.test.ts` with the column tests and add
   `tests/e2e/card-lists-400.spec.ts`; run both and watch them fail.
2. **Green** — add the 30rem media rule.
3. **Refactor** — generalise `ruleFor` into `rulesFor` returning every matching rule, so
   the existing single-rule assertions still read clearly.

## Test plan

| Test | Input | Expect |
| --- | --- | --- |
| `new-card-grid.test.ts` › `collapses to one column at 30rem` | `global.css` | a `@media (max-width: 30rem)` block contains `.new-card-grid { grid-template-columns: 1fr }` |
| `new-card-grid.test.ts` › `keeps two columns between 30rem and 40rem` | `global.css` | the `max-width: 40rem` rule still declares `repeat(2, minmax(0, 1fr))` |
| `card-lists-400.spec.ts` › `homepage new cards are one per row at 400px` | 400×800, `/` | every `.new-card-grid > li` shares the same `x`, and count of distinct `y` equals count of items |
| `card-lists-400.spec.ts` › `the archetype gallery is one per row at 400px` | 400×800, `/archetypes/burning-abyss/` | every `.gallery-card` shares the same `x` |
| `card-lists-400.spec.ts` › `two per row at 560px` | 560×800, `/` | `.new-card-grid > li` have exactly 2 distinct `x` values |

## Impl steps

- [x] 1. In `global.css`, directly after the `@media (max-width: 40rem)` block that holds
      `.new-card-grid`, add:
      ```css
      @media (max-width: 30rem) {
        .new-card-grid {
          grid-template-columns: 1fr;
        }
      }
      ```
- [x] 2. In `tests/unit/new-card-grid.test.ts`, add `rulesFor(selector)` returning all
      matching rules; keep `ruleFor` as `rulesFor(...)` asserted to have length 1.
- [x] 3. Add the two unit tests from the test plan.
- [x] 4. Create `website/tests/e2e/card-lists-400.spec.ts` with the three viewport tests,
      reading boxes through `boundingBox()` and rounding to the nearest pixel before
      comparing.

## Outputs

- `website/src/styles/global.css`, `website/tests/unit/new-card-grid.test.ts`,
  `website/tests/e2e/card-lists-400.spec.ts`.
- Behaviour change: one column below 480px on the homepage grid.

## Validation

- [x] `cd website && npx vitest run tests/unit/new-card-grid.test.ts` → pass
- [x] `cd website && npx playwright test tests/e2e/card-lists-400.spec.ts` → pass across 2 browsers
      (Chromium + WebKit pass via a local, uncommitted `playwright.config.local.ts`
      that points `executablePath` at the nix-store playwright-driver browsers, since
      the npm-downloaded ones fail to launch on NixOS; firefox fails to launch here —
      pre-existing, unrelated, per the repo notes)
- [ ] manual check: 400px viewport on `/` shows one card per row; 560px shows two
- [x] `cd website && npm run ci` → pass
- [x] commit msg draft: `fix(website): show one card per row below 480px`
