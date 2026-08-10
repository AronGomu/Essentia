# T4: Hover rulings beside the card

**Plan:** `./ai-artifacts/PLAN_2026_08_07_website-feedback-pass-2.md`
**Depends:** T2
**Commit outcome:** The hover preview places its keyword rulings to the left or right of the card render — whichever side has room — never underneath.

## Context (self-contained)

- Goal: ship feedback batch 2 on the Astro site under `website/`.
- This slice: the feedback lines *"Instead of putting text rule under card preview when
  hovering, put it next right or left (where enough space left to show)"* and *"In Card
  hover preview. Also show text rule of essentia project specific keyword (e.g. Reanimate,
  Bounce, etc…)"*.
- Out of scope here: keyword wording (T3), the card detail page, the search palette, the
  catalog rail, page transitions.
- Assumptions in force: **A5** — the ruling boxes already receive every Essentia keyword
  including archetype ones (`BaseLayout.astro` filters on `origin === 'essentia'`, and
  `abyssal-curse` / `descent` / `nekroz-recovery` / `shaddoll-recovery` all carry that
  origin). They were invisible only because the affected cards had no rule text, which
  T2 fixed. This ticket is purely a placement change.

## What T2 (Depends) produced

All 50 published cards now have non-empty `ruleText`, so `catalog.cards[].keywords` is
populated for every card and `CardGallery.astro` emits a non-empty
`data-card-keywords="Discard,Search,Shuffle,Target"` style attribute on every tile.
`website/tests/unit/card-text.test.ts` guards that.

## Current implementation

`website/src/components/CardHoverPreview.astro`:

```astro
<aside class="card-hover-preview" aria-hidden="true">
  <img alt="" width="400" height="559" decoding="async" />
  <div class="keyword-rulings"></div>
</aside>
```

- `placePreview(target)` (line 16) computes `--preview-left` / `--preview-top` for a
  `width = Math.min(400, window.innerWidth - gap * 2)` box, preferring `rect.right + gap`
  and falling back to `rect.left - width - gap`.
- `showPreview(target)` (line 33) reads `target.dataset.cardKeywords`, looks each term up
  in the JSON blob `#keyword-rulings`, and appends a `<p class="keyword-ruling">` per hit.
- `website/src/styles/global.css` line 1296: `.card-hover-preview { display: grid; gap: 0.5rem; … width: min(25rem, calc(100vw - 2rem)); max-width: 25rem; }` — a single-column
  grid, so the rulings stack **below** the image. Line 1319 `.keyword-rulings { display: grid; gap: 0.4rem; }`, line 1323 `.keyword-ruling { … max-width: 400px; }`.
- Line 1507: the whole preview is `display: none` under
  `@media (hover: none), (pointer: coarse), (max-width: 58rem)`.

## Requirements

- The preview becomes a two-column flex/grid box: **card render** and **rulings column**.
- The rulings column sits on the side with the most free viewport space, computed at
  show time and on scroll/resize. Class `is-rulings-left` puts the rulings first in
  visual order (`flex-direction: row-reverse`), absent class puts them on the right.
- Card render column is a fixed `20rem`; rulings column is `min(22rem, …)` and is only
  rendered when the card has at least one Essentia keyword.
- When neither side fits (total needed width `> window.innerWidth - 2 * gap`), the rulings
  column is hidden entirely rather than falling back under the card — the feedback
  explicitly rejects the stacked layout.
- Extract the geometry decision into a pure, unit-testable function so the behaviour is
  asserted without a browser.

## Inputs

- `website/src/components/CardHoverPreview.astro` (whole file).
- `website/src/styles/global.css` lines 1296-1336 and 1507-1512.
- `website/src/layouts/BaseLayout.astro` lines 50-63 (`keywordRulings` JSON blob) — unchanged.
- `website/src/components/CardGallery.astro` line 27 (`data-card-keywords`) — unchanged.
- `website/scripts/check-chrome.mjs` lines 62-68 — asserts every `data-card-preview` trigger
  also carries `data-card-keywords`. Must keep passing.
- **From Depends (T2):** every card has rule text and therefore real keyword data.

## New pure module

Create `website/src/lib/hover-placement.ts`:

```ts
export interface PreviewRect { left: number; right: number; top: number; height: number }
export interface Viewport { width: number; height: number }
export interface PreviewPlacement {
  left: number;
  top: number;
  /** rulings render to the left of the card render */
  rulingsLeft: boolean;
  /** false when neither side fits and the rulings column must be dropped */
  showRulings: boolean;
}
export const PREVIEW_GAP = 16;
export const CARD_WIDTH = 320;
export const RULINGS_WIDTH = 320;
export const PREVIEW_HEIGHT = 448;

export function placeHoverPreview(
  rect: PreviewRect,
  viewport: Viewport,
  hasRulings: boolean,
): PreviewPlacement;
```

Rules, in order:

1. `spaceRight = viewport.width - rect.right - PREVIEW_GAP`, `spaceLeft = rect.left - PREVIEW_GAP`.
2. `full = CARD_WIDTH + PREVIEW_GAP + RULINGS_WIDTH` when `hasRulings`, else `CARD_WIDTH`.
3. If `spaceRight >= full` → `left = rect.right + PREVIEW_GAP`, `rulingsLeft = false`, `showRulings = hasRulings`.
4. Else if `spaceLeft >= full` → `left = rect.left - PREVIEW_GAP - full`, `rulingsLeft = true`, `showRulings = hasRulings`.
5. Else `showRulings = false`; repeat 3-4 with `full = CARD_WIDTH`; if still neither side
   fits, clamp `left` to `Math.max(PREVIEW_GAP, viewport.width - CARD_WIDTH - PREVIEW_GAP)`.
6. `top = Math.min(Math.max(PREVIEW_GAP, rect.top + rect.height / 2 - PREVIEW_HEIGHT / 2), Math.max(PREVIEW_GAP, viewport.height - PREVIEW_HEIGHT - PREVIEW_GAP))`.

## Check plan

| Test                                        | Input                                                                 | Expect                                              |
| ------------------------------------------- | --------------------------------------------------------------------- | ---------------------------------------------------- |
| `puts rulings right when the right fits`    | rect `{left:100,right:300,top:100,height:200}`, vp `{width:1600,height:900}`, `true` | `{ rulingsLeft: false, showRulings: true, left: 316 }` |
| `flips to the left when the right is short` | rect `{left:900,right:1100,top:100,height:200}`, vp `{width:1200,height:900}`, `true` | `{ rulingsLeft: true, showRulings: true, left: 228 }`  |
| `drops rulings when neither side fits`      | rect `{left:380,right:520,top:0,height:200}`, vp `{width:900,height:900}`, `true`     | `{ showRulings: false }`                              |
| `never returns a negative left`             | rect `{left:0,right:20,top:0,height:10}`, vp `{width:360,height:640}`, `true`         | `left >= 16`                                          |
| `clamps top into the viewport`              | rect `{left:100,right:300,top:5000,height:200}`, vp `{width:1600,height:900}`, `false`| `top === 900 - 448 - 16`                              |
| `ignores rulings geometry when there are none` | rect `{left:100,right:300,top:100,height:200}`, vp `{width:700,height:900}`, `false` | `{ showRulings: false, left: 316 }`                  |

## TDD

1. **Red** — write `website/tests/unit/hover-placement.test.ts` with the 6 rows;
   run `cd website && npx vitest run tests/unit/hover-placement.test.ts` — module missing.
2. **Green** — add `src/lib/hover-placement.ts`; rerun.
3. **Refactor** — wire the component and the CSS to the new function.

## Impl steps

- [x] 1. Write `website/tests/unit/hover-placement.test.ts` with the 6 rows above. — Evidence: file created, 6 `it(...)` blocks.
- [x] 2. Run `cd website && npx vitest run tests/unit/hover-placement.test.ts` — confirm red. — Evidence: `Cannot find module '../../src/lib/hover-placement'`.
- [x] 3. Create `website/src/lib/hover-placement.ts` implementing the contract above. — Evidence: file created.
- [x] 4. Run the test — green. — Evidence: `Test Files 1 passed (1)`, `Tests 6 passed (6)`.
- [x] 5. Rewrite the markup in `website/src/components/CardHoverPreview.astro` to:
      ```astro
      <aside class="card-hover-preview" aria-hidden="true">
        <img class="preview-render" alt="" width="320" height="448" decoding="async" />
        <div class="keyword-rulings"></div>
      </aside>
      ```
- [x] 6. In the same file's `<script>`, import
      `{ placeHoverPreview, CARD_WIDTH, RULINGS_WIDTH, PREVIEW_GAP } from '../lib/hover-placement'`.
      Replace `placePreview` with a version that reads `preview.dataset.hasRulings === 'true'`,
      calls `placeHoverPreview`, then sets `--preview-left` / `--preview-top` and toggles
      `preview.classList.toggle('is-rulings-left', placement.rulingsLeft)` and
      `preview.classList.toggle('has-rulings', placement.showRulings)`. — Evidence: `placePreview` rewritten to call `placeHoverPreview` (only `placeHoverPreview` imported; `CARD_WIDTH`/`RULINGS_WIDTH`/`PREVIEW_GAP` unused by the component so left out of the import to satisfy eslint no-unused-vars — `npm run lint` passed).
- [x] 7. In `showPreview`, after populating `keywordRulingsEl`, set
      `preview.dataset.hasRulings = String(keywordRulingsEl.childElementCount > 0)` **before**
      calling `placePreview(target)`. — Evidence: line added in `showPreview` before `placePreview(target)` call.
- [x] 8. Replace the `.card-hover-preview` block in `website/src/styles/global.css`
      (lines 1296-1318) with:
      ```css
      .card-hover-preview {
        display: flex;
        flex-direction: row;
        align-items: flex-start;
        gap: 1rem;
        position: fixed;
        z-index: var(--z-tooltip);
        left: var(--preview-left, 1rem);
        top: var(--preview-top, 1rem);
        width: max-content;
        max-width: calc(100vw - 2rem);
        pointer-events: none;
        opacity: 0;
        transform: scale(0.96);
        filter: drop-shadow(0 0 0.55rem var(--accent))
          drop-shadow(0 1rem 1.6rem oklch(0.02 0 0 / 0.8));
        transition:
          opacity 100ms linear,
          transform 120ms var(--ease-out);
      }
      .card-hover-preview.is-rulings-left {
        flex-direction: row-reverse;
      }
      .card-hover-preview .preview-render {
        flex: 0 0 20rem;
        width: 20rem;
        height: auto;
      }
      .card-hover-preview .keyword-rulings {
        display: none;
      }
      .card-hover-preview.has-rulings .keyword-rulings {
        display: grid;
        flex: 0 0 20rem;
        width: 20rem;
        gap: 0.4rem;
      }
      .card-hover-preview.is-visible {
        opacity: 1;
        transform: scale(1);
      }
      ```
- [x] 9. Delete the now-duplicated `.keyword-rulings { display: grid; gap: 0.4rem; }` rule at
      old line 1319 and change `.keyword-ruling { … max-width: 400px; }` to `max-width: none;`. — Evidence: `.keyword-rulings` display:grid now lives only under `.card-hover-preview.has-rulings .keyword-rulings`; `.keyword-ruling` has `max-width: none;`.
- [x] 10. Leave the `@media (hover: none), (pointer: coarse), (max-width: 58rem)` hide rule
      at line 1507 untouched — narrow viewports keep no hover preview at all. — Evidence: `git diff` shows no change to that block.
- [x] 11. Run `cd website && npm run format && npm run ci`. — Evidence: both exit 0; `npm run ci` output ends `chrome: 151 pages carry the site header`.

## Outputs

- Touched: `website/src/lib/hover-placement.ts` (new),
  `website/tests/unit/hover-placement.test.ts` (new),
  `website/src/components/CardHoverPreview.astro`, `website/src/styles/global.css`.
- Behaviour: hover preview is a horizontal pair; rulings never appear under the render.

## Validation

- [x] `cd website && npx vitest run tests/unit/hover-placement.test.ts` — 6 passed. — Evidence: `Test Files 1 passed (1)`, `Tests 6 passed (6)`.
- [x] `cd website && npm run test` — all pass. — Evidence: `npm run ci` (which runs `npm run test`) reported `Tests 317 passed (317)`.
- [x] `cd website && npm run ci` — exit 0, `chrome:` gate still reports every page. — Evidence: exit 0; last lines `dist scan: clean`, `404: redirects to site root`, `chrome: 151 pages carry the site header`.
- [ ] manual: `npm run dev`, `/archetypes/burning-abyss/`; hover a tile in the **left**
      column → rulings appear on its right; hover a tile in the **right** column → rulings
      appear on its left; hover a card with no Essentia keyword → render only, no gap
      — NOT DONE: no interactive browser available in this environment. Covered instead by
      the 6 unit tests over `placeHoverPreview`, which assert the exact left/right-flip and
      no-rulings-drop geometry this manual check exercises. Residual risk: real-DOM class
      toggling (`is-rulings-left`/`has-rulings`) and CSS application are unverified live.
- [ ] app functional — `npm run test:e2e` passes — BLOCKED: fails in this sandbox with
      `error while loading shared libraries: libglib-2.0.so.0: cannot open shared object file`
      at Chromium/Firefox/WebKit launch, for all 18 tests uniformly (fails before any test
      logic runs). Confirmed pre-existing: identical failure reproduced via `git stash` on
      the pre-change tree (base `194906a`). Not a regression from this ticket; environment is
      missing system libraries for Playwright browsers.
- [x] commit msg draft: `feat(website): show hover keyword rulings beside the card render`
