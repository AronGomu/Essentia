# T7: Hero art reveals full art on hover

**Plan:** `./ai-artifacts/PLAN_2026_08_07_website-feedback-pass-2.md`
**Depends:** none
**Commit outcome:** Hovering an archetype/section hero image zooms **out** until the whole illustration is visible instead of staying cropped.

## Context (self-contained)

- Goal: ship feedback batch 2 on the Astro site under `website/`.
- This slice: the feedback line *"update catalog-hero-art: if hovering, zoom out to full
  image size (we must see the full art)"*, on the Archetypes pages.
- Out of scope here: the home page `.hero-art` (a different, full-bleed element), the
  `.section-tile` tiles, the card gallery zoom, generating new art.
- Assumptions in force: none specific.

## Current implementation

`website/src/styles/global.css`, inside `@layer components`:

```css
  .catalog-hero-art {                /* line 723 */
    width: 100%;
    aspect-ratio: 3 / 2;
    overflow: hidden;
    border-radius: var(--radius);
    background: var(--blackfoil);
  }
  .catalog-hero img {                /* line 730 */
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform 600ms var(--ease-out);
  }
  @media (hover: hover) and (pointer: fine) {   /* line 736 */
    .catalog-hero-art img { transform: scale(1.08); }
    .catalog-hero-art:hover img { transform: scale(1); }
  }
```

The hero source is a **square** 624×624 webp (`content/art/<slug>-hero.webp`, produced by
`npm run hero:art`) shown in a 3:2 box with `object-fit: cover`, so the top and bottom of
the illustration are always cropped away. Undoing `scale(1.08)` on hover is not enough —
`cover` still crops. The whole art only appears with `object-fit: contain`.

Consumers: `website/src/pages/archetypes/[slug].astro` line 52 and
`website/src/pages/sections/non-archetype/[slug].astro` (same `.catalog-hero-art` block).
`website/scripts/check-chrome.mjs` lines 71-84 asserts the hero `<img src>` matches
`^<base>art/[a-z0-9-]+-hero\.webp$` on every `archetypes/` and `sections/` page — keep that
markup intact.

## Requirements

- Resting state: unchanged framing (`object-fit: cover`, `transform: scale(1.08)`).
- Hover **and** keyboard focus within the hero: `object-fit: contain`, `transform: scale(1)`,
  so the entire square illustration fits the 3:2 frame, letterboxed against
  `var(--blackfoil)`.
- The change is animated: `object-fit` is not interpolable, so drive the reveal with
  `transform` + an `object-fit` swap at the transition midpoint is **not** required —
  instead animate `scale` and cross-fade a `filter: brightness()` so the swap is not jarring.
  Concretely: transition `transform` (600 ms) and `opacity` (180 ms); set `object-fit` with
  no transition. Keep it simple and deterministic.
- `@media (prefers-reduced-motion: reduce)` keeps the reveal but drops the animation
  (the existing block at line 919-928 already forces `transform: none` for
  `.catalog-hero-art img` and `.catalog-hero-art:hover img`; extend it to keep `contain`
  on hover so the feature still works without motion).
- Touch/coarse pointers keep the resting crop — there is no hover there.

## Inputs

- `website/src/styles/global.css` lines 711-743 and 908-937.
- `website/src/pages/archetypes/[slug].astro`, `website/src/pages/sections/non-archetype/[slug].astro`.
- `website/scripts/check-chrome.mjs` lines 71-84.
- `website/tests/unit/hero-art.test.ts` — existing suite for the hero art pipeline.
- **From Depends:** none.

## Check plan

| Test                                         | Input                    | Expect                                                                       |
| -------------------------------------------- | ------------------------ | ----------------------------------------------------------------------------- |
| `crops the hero at rest`                     | `src/styles/global.css`  | `.catalog-hero img` block declares `object-fit: cover`                        |
| `reveals the whole art on hover`             | `src/styles/global.css`  | a rule matching `.catalog-hero-art:hover img` declares `object-fit: contain`  |
| `reveals the whole art on focus-within`      | `src/styles/global.css`  | a rule matching `.catalog-hero-art:focus-within img` declares `object-fit: contain` |
| `resets the resting zoom on hover`           | `src/styles/global.css`  | the same hover rule declares `transform: scale(1)`                            |
| `keeps the reveal under reduced motion`      | `src/styles/global.css`  | the `prefers-reduced-motion` block does not reset `object-fit`                |

## TDD

1. **Red** — write `website/tests/unit/catalog-hero-art.test.ts` with the 5 rows, reading
   `src/styles/global.css` with `readFileSync`. Run
   `cd website && npx vitest run tests/unit/catalog-hero-art.test.ts` — rows 2-4 fail.
2. **Green** — apply the CSS.
3. **Refactor** — none expected.

## Impl steps

- [x] 1. Write `website/tests/unit/catalog-hero-art.test.ts` with the 5 rows above.
      Slice the file between `'.catalog-hero-art {'` and the next `'.catalog-stats'` to keep
      assertions scoped.
- [x] 2. Run `cd website && npx vitest run tests/unit/catalog-hero-art.test.ts` — confirm red.
- [x] 3. In `website/src/styles/global.css`, extend `.catalog-hero img` (line 730) to:
      ```css
      .catalog-hero img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        transition:
          transform 600ms var(--ease-out),
          opacity 180ms linear;
      }
      ```
- [x] 4. Replace the `@media (hover: hover) and (pointer: fine)` block at line 736-743 with:
      ```css
      @media (hover: hover) and (pointer: fine) {
        .catalog-hero-art img {
          transform: scale(1.08);
        }
        /* The hero source is square and the frame is 3:2, so `cover` always
           crops. Undoing the resting zoom is not enough — only `contain`
           shows the whole illustration, letterboxed on --blackfoil. */
        .catalog-hero-art:hover img,
        .catalog-hero-art:focus-within img {
          object-fit: contain;
          transform: scale(1);
        }
      }
      ```
- [x] 5. In the `@media (prefers-reduced-motion: reduce)` block, leave the existing
      `transform: none` selectors untouched and add nothing that resets `object-fit`, so the
      reveal still happens instantly. Verify test row 5 passes.
- [x] 6. Make the hero focusable so `:focus-within` can fire: in
      `website/src/pages/archetypes/[slug].astro` and
      `website/src/pages/sections/non-archetype/[slug].astro`, change
      `<div class="catalog-hero-art">` to
      `<div class="catalog-hero-art" tabindex="0" role="img" aria-label={`${section.label} iconic card artwork`}>`
      and change the inner `<img …>` `alt` to `alt=""`. Keep the `src`, `width="624"`,
      `height="624"` and `fetchpriority="high"` attributes exactly as they are so the
      `check-chrome.mjs` hero gate still matches.
- [x] 7. Run `cd website && npx vitest run tests/unit/catalog-hero-art.test.ts` — green.
- [x] 8. Run `cd website && npm run format && npm run ci`.

## Outputs

- Touched: `website/src/styles/global.css`,
  `website/src/pages/archetypes/[slug].astro`,
  `website/src/pages/sections/non-archetype/[slug].astro`,
  `website/tests/unit/catalog-hero-art.test.ts` (new).
- Behaviour: hero art reveals its full illustration on hover/focus.

## Validation

- [x] `cd website && npx vitest run tests/unit/catalog-hero-art.test.ts` — 5 passed
- [x] `cd website && npm run ci` — exit 0, hero-art gate still passes on every section page
- [ ] manual: `npm run dev`, `/archetypes/nekroz/` — hover the hero, the full square art
      appears letterboxed; move away, it re-crops; Tab to it, same reveal — UNCHECKED: no
      browser available in this environment (residual risk, not a blocker)
- [ ] manual: `/sections/non-archetype/creatures/` behaves identically — UNCHECKED: same
      reason as above
- [ ] app functional — `npm run test:e2e` passes — CANNOT RUN: Playwright chromium missing
      system libs (libglib-2.0.so.0 etc.) in this environment; deferred gate per job brief
- [ ] commit msg draft: `feat(website): reveal the full hero illustration on hover`
