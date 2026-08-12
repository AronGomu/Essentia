# T4: Hover preview overlays the card at 75vh

**Plan:** `./ai-artifacts/PLAN_2026_08_12_feedback_batch_2.md`
**Depends:** none
**Commit outcome:** hovering a card tile shows the preview **on top of** that tile at up to 75% of viewport height, with keyword rulings floating on whichever side has room; the hover zone is still the tile itself.

## Context (self-contained)

- Goal: feedback batch 2 — cut dev/CI loop cost and fix website card surfaces. This ticket = hover preview geometry.
- Today: `placeHoverPreview()` puts a fixed 320×448 preview **beside** the tile plus an optional 320px rulings column, so a card-width of screen is wasted and the preview is small. Owner asked: keep the duplicate but put it over the original, size it to 75vh, keep the hover zone on the original tile.
- This slice: `src/lib/hover-placement.ts` geometry + `src/components/CardHoverPreview.astro` wiring + `global.css` rules + tests. No other page changes.
- Out of scope here: card detail page layout (T5/T7), related cards (T6), touch/pointer-coarse behavior beyond what exists, changing which keywords appear (`previewKeywordsFor` untouched), image tiers.
- Assumptions in force: card aspect ratio comes from the canonical render, 750 × 1046 → `PREVIEW_ASPECT = 1046 / 750`. Preview keeps `pointer-events: none`, so overlaying the tile cannot steal the hover.

## Requirements

- Preview height = `min(0.75 * viewport.height, height that keeps width within viewport - 2 * PREVIEW_GAP)`; width = `height / PREVIEW_ASPECT`.
- Preview centred on the tile's centre, then clamped so it stays fully inside the viewport with `PREVIEW_GAP` margin.
- Rulings column (20rem / 320px) floats outside the preview box, on the side with more free space; dropped when neither side has 320 + gap px.
- Hover/focus trigger stays `[data-card-preview]` on the tile; preview must not intercept pointer events.
- `.card-hover-preview` must paint above the tile (`--z-tooltip` already does this).
- Unit tests replace the old `placeHoverPreview` expectations; an e2e test proves the overlay actually covers the tile in a real browser.

## Inputs

- `src/lib/hover-placement.ts` — current exports: `PreviewRect {left, right, top, height}`, `Viewport {width, height}`, `PreviewPlacement {left, top, rulingsLeft, showRulings}`, consts `PREVIEW_GAP = 16`, `CARD_WIDTH = 320`, `RULINGS_WIDTH = 320`, `PREVIEW_HEIGHT = 448`, and `placeHoverPreview(rect, viewport, hasRulings)`.
- `src/components/CardHoverPreview.astro` — the `<aside class="card-hover-preview">` holds `<img class="preview-render" width="320" height="448">` and `<div class="keyword-rulings">`. Its inline `<script>` calls `placeHoverPreview({left: rect.left, right: rect.right, top: rect.top, height: rect.height}, {width: innerWidth, height: innerHeight}, hasRulings)` and sets `--preview-left` / `--preview-top`, toggling `.is-rulings-left` and `.has-rulings`. Handlers: `pointerover`, `pointerout`, `focusin`, `focusout`, `scroll` (passive), `resize`.
- `src/styles/global.css` lines 1446-1500 — `.card-hover-preview` (`display:flex; position:fixed; left:var(--preview-left,1rem); top:var(--preview-top,1rem); width:max-content; max-width:calc(100vw - 2rem); pointer-events:none; opacity:0; transform:scale(.96)`), `.is-rulings-left {flex-direction:row-reverse}`, `.preview-render {flex:0 0 20rem; width:20rem; height:auto}`, `.keyword-rulings {display:none}`, `.has-rulings .keyword-rulings {display:grid; flex:0 0 20rem; width:20rem; gap:.4rem}`, `.is-visible {opacity:1; transform:scale(1)}`.
- `tests/unit/hover-placement.test.ts` — 5+ tests asserting the old side-by-side numbers (e.g. `expect(result.left).toBe(316)`). These assertions are replaced by this ticket.
- `tests/e2e/ruling-keywords.spec.ts` — hovers `a.gallery-card` on `/archetypes/burning-abyss/` and asserts `.card-hover-preview .keyword-rulings` content. Must keep passing.
- **From Depends:** none.

## TDD

1. **Red** — rewrite `tests/unit/hover-placement.test.ts` for the new geometry and add `tests/e2e/hover-overlay.spec.ts`. Both fail against current code.
2. **Green** — impl steps 2-7.
3. **Refactor** — none.

## Test plan

| Test                                                       | Input                                                                                    | Expect                                                                                          |
| ---------------------------------------------------------- | ---------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `sizes the preview to 75% of viewport height`               | rect `{left:100,right:300,top:200,width:200,height:280}`, viewport `{width:1600,height:900}` | `height === 675`, `width === Math.round(675 / (1046/750))` within 0.5px                          |
| `centres the preview on the tile`                          | same                                                                                     | `left + width/2 === 200`, `top + height/2 === 340` (both ±0.5)                                    |
| `clamps into the viewport`                                 | rect at `{left:0,right:120,top:0,width:120,height:160}`, viewport `{width:1600,height:900}` | `left >= 16`, `top >= 16`, `left + width <= 1584`, `top + height <= 884`                          |
| `shrinks to fit a narrow viewport`                         | viewport `{width:320,height:1200}`                                                        | `width <= 320 - 32`, `height === width * (1046/750)` ±0.5                                        |
| `floats rulings on the side with room`                     | tile near left edge, viewport `{width:1600,height:900}`, `hasRulings: true`                | `showRulings === true`, `rulingsLeft === false`                                                  |
| `flips rulings left when the right is short`               | tile near right edge, viewport `{width:1600,height:900}`, `hasRulings: true`               | `rulingsLeft === true`                                                                           |
| `drops rulings when neither side fits`                     | viewport `{width:900,height:900}`, `hasRulings: true`                                     | `showRulings === false`                                                                          |
| e2e `preview overlaps the hovered tile`                    | `/archetypes/burning-abyss/`, hover first `a.gallery-card`                                | preview box intersects ≥ 60% of the tile box area                                                |
| e2e `preview is about 75% of the viewport height`          | same, viewport 1440×900                                                                  | preview `height` within `[0.7, 0.76] * 900`                                                       |
| e2e `hover zone stays on the tile`                         | same                                                                                     | `.card-hover-preview` computed `pointer-events === 'none'`; moving pointer to page body hides it  |

## Impl steps

- [ ] 1. Rewrite `tests/unit/hover-placement.test.ts` per the table (import `PREVIEW_ASPECT`, `PREVIEW_GAP`, `RULINGS_WIDTH`, `VIEWPORT_HEIGHT_FRACTION` from the module). Add `tests/e2e/hover-overlay.spec.ts` using `page.setViewportSize({width:1440,height:900})`, `tile.hover()`, then `tile.boundingBox()` and `page.locator('.card-hover-preview').boundingBox()` for the intersection maths.
- [ ] 2. Rewrite `src/lib/hover-placement.ts`:

  ```ts
  export interface PreviewRect {
    left: number;
    right: number;
    top: number;
    width: number;
    height: number;
  }
  export interface Viewport { width: number; height: number }
  export interface PreviewPlacement {
    left: number;
    top: number;
    width: number;
    height: number;
    rulingsLeft: boolean;
    showRulings: boolean;
  }

  export const PREVIEW_GAP = 16;
  export const RULINGS_WIDTH = 320;
  /** Canonical render is 750 × 1046, so the preview keeps that exact ratio. */
  export const PREVIEW_ASPECT = 1046 / 750;
  export const VIEWPORT_HEIGHT_FRACTION = 0.75;

  export function placeHoverPreview(
    rect: PreviewRect,
    viewport: Viewport,
    hasRulings: boolean,
  ): PreviewPlacement {
    const maxHeight = viewport.height * VIEWPORT_HEIGHT_FRACTION;
    const maxWidth = viewport.width - PREVIEW_GAP * 2;
    const height = Math.min(maxHeight, maxWidth * PREVIEW_ASPECT);
    const width = height / PREVIEW_ASPECT;

    const clamp = (value: number, size: number, extent: number) =>
      Math.max(PREVIEW_GAP, Math.min(value, Math.max(PREVIEW_GAP, extent - size - PREVIEW_GAP)));

    const left = clamp(rect.left + rect.width / 2 - width / 2, width, viewport.width);
    const top = clamp(rect.top + rect.height / 2 - height / 2, height, viewport.height);

    const spaceRight = viewport.width - (left + width) - PREVIEW_GAP;
    const spaceLeft = left - PREVIEW_GAP;
    const rulingsLeft = spaceLeft > spaceRight;
    const showRulings = hasRulings && Math.max(spaceLeft, spaceRight) >= RULINGS_WIDTH;

    return { left, top, width, height, rulingsLeft, showRulings };
  }
  ```

- [ ] 3. In `src/components/CardHoverPreview.astro`, extend the rect passed in with `width: rect.width` and set the returned size as custom properties:

  ```ts
  preview.style.setProperty('--preview-left', `${placement.left}px`);
  preview.style.setProperty('--preview-top', `${placement.top}px`);
  preview.style.setProperty('--preview-width', `${placement.width}px`);
  preview.style.setProperty('--preview-height', `${placement.height}px`);
  ```

  Keep the two `classList.toggle` calls unchanged.

- [ ] 4. In the same file, change the `<img class="preview-render" width="320" height="448">` attributes to `width="750" height="1046"` so the intrinsic ratio matches the render and the browser reserves the right box before decode.
- [ ] 5. Replace the CSS block at `src/styles/global.css:1446-1482` with:

  ```css
  .card-hover-preview {
    position: fixed;
    z-index: var(--z-tooltip);
    left: var(--preview-left, 1rem);
    top: var(--preview-top, 1rem);
    width: var(--preview-width, 20rem);
    height: var(--preview-height, 28rem);
    pointer-events: none;
    opacity: 0;
    transform: scale(0.96);
    filter: drop-shadow(0 0 0.55rem var(--accent))
      drop-shadow(0 1rem 1.6rem oklch(0.02 0 0 / 0.8));
    transition:
      opacity 100ms linear,
      transform 120ms var(--ease-out);
  }
  .card-hover-preview .preview-render {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }
  .card-hover-preview .keyword-rulings {
    display: none;
  }
  .card-hover-preview.has-rulings .keyword-rulings {
    display: grid;
    position: absolute;
    top: 0;
    left: calc(100% + 1rem);
    width: 20rem;
    gap: 0.4rem;
  }
  .card-hover-preview.has-rulings.is-rulings-left .keyword-rulings {
    left: auto;
    right: calc(100% + 1rem);
  }
  ```

  Delete the now-unused `.card-hover-preview.is-rulings-left { flex-direction: row-reverse; }` rule. Keep `.card-hover-preview.is-visible`, `.keyword-ruling`, and `.keyword-ruling strong` exactly as they are.

- [ ] 6. `npx vitest run tests/unit/hover-placement.test.ts` — green.
- [ ] 7. `npm run build && npx playwright test tests/e2e/hover-overlay.spec.ts tests/e2e/ruling-keywords.spec.ts` — green in all three browsers.

## Outputs

- Files touched: `src/lib/hover-placement.ts`, `src/components/CardHoverPreview.astro`, `src/styles/global.css`, `tests/unit/hover-placement.test.ts`, `tests/e2e/hover-overlay.spec.ts` (new).
- Public API change: `PreviewRect` gains required `width`; `PreviewPlacement` gains `width`/`height`; consts `CARD_WIDTH` and `PREVIEW_HEIGHT` removed, `PREVIEW_ASPECT` and `VIEWPORT_HEIGHT_FRACTION` added.
- Migrations/config: none.

## Validation

- [ ] `cd website && npx vitest run` — no new failures
- [ ] `cd website && npm run check` — no type errors (the `PreviewRect` field is required, so any missed call site fails here)
- [ ] `cd website && npm run lint && npm run format:check`
- [ ] `cd website && npm run build`
- [ ] `cd website && npx playwright test tests/e2e/hover-overlay.spec.ts tests/e2e/ruling-keywords.spec.ts`
- [ ] manual check: `npm run dev`, hover a tile on `/archetypes/nekroz/` — big preview sits over the tile, rulings float beside it, moving the pointer off the tile hides it
- [ ] commit msg draft: `feat(website): overlay the hover preview on the card at 75vh`
