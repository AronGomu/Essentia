# T7: Catalog hero tightening

**Plan:** `./ai-artifacts/PLAN_2026_08_09_website-header-and-rail-pass.md`
**Depends:** none
**Commit outcome:** The archetype hero row is narrower and centred, with far less
air between the prose and the art, and the hero art is gone below 44rem.

## Context (self-contained)

- Goal: rework the Essentia website shell — full-width header menubar, rail
  docked beneath it, flat colour-coded rail, compact phone header, tighter
  archetype hero. This ticket is the hero.
- This slice: seventh of seven, and fully independent of the other six — it
  touches only `.catalog-hero*` rules in `website/src/styles/global.css`.
- Out of scope here: the header, the rail, the drawer, the card gallery below the
  hero, hero art assets, `website/scripts/content/`, `cards_mse/`, Python.
- Assumptions in force: the feedback's `http://localhost:4201/archetypes` means
  the archetype section pages — there is no `/archetypes` index route. The hero
  markup is shared by `website/src/pages/archetypes/[slug].astro` and
  `website/src/pages/sections/non-archetype/[slug].astro`, so both change
  together through the one class. "Remove Hero image on mobile ()" leaves the
  width unstated; it is read as the phone breakpoint `44rem`, matching the rest
  of this pass. Column sizes are unchanged, per "Keep their current size" —
  the row gets narrower and the gap smaller, the tracks keep their ratios.

Current state, verbatim, in `website/src/styles/global.css`:

```css
.catalog-hero {
  display: grid;
  grid-template-columns: minmax(0, 1.25fr) minmax(18rem, 0.75fr);
  gap: clamp(2rem, 6vw, 7rem);
  align-items: center;
  border-bottom: 1px solid var(--ruleline);
  padding-block: var(--space-2) var(--space-4);
}
```

- The hero sits inside `.page-shell`, which is `width: min(100% - 2rem, 88rem);
  margin-inline: auto;` — so at 1440px the two columns are pulled ~88rem apart.
- `@media (max-width: 64rem)` already collapses the hero to one column and caps
  `.catalog-hero-art { max-width: 24rem; margin-inline: auto; }`.
- `@media (max-width: 44rem)` (the block that also sets `.compact-brand img`)
  currently says nothing about the hero.
- `.catalog-hero-art` is `width: 100%; aspect-ratio: 1 / 1; overflow: hidden;`
  and carries `tabindex="0" role="img" aria-label="… iconic card artwork"` in the
  page markup. `display: none` removes it from the accessibility tree and from
  the tab order, which is what "remove on mobile" must mean.

Tests that already read these rules and must stay green —
`website/tests/unit/catalog-hero-art.test.ts`:

- `heroContainerBlock = sliceBlock(css, '.catalog-hero {', '.catalog-hero p {')`
  and asserts it matches `/padding-block:\s*var\(--space-2\) var\(--space-4\)/`
  and does **not** match `/padding-bottom:/`. Keep `padding-block` in the block
  and add no `padding-bottom`.
- `narrowViewportBlock = sliceBlock(css, '@media (max-width: 64rem)', '@media (max-width: 44rem)')`
  and asserts `.catalog-hero-art` there still has `max-width: 24rem` and no
  `max-height`. Do not touch the 64rem block.

Build gate that must keep passing — `website/scripts/check-chrome.mjs` requires
every `archetypes/**` and `sections/**` page to carry a
`<div class="catalog-hero-art">` whose `<img src>` matches
`^{base}art/[a-z0-9-]+-hero\.webp$`. Hiding with CSS keeps the markup, so the
gate is unaffected; removing the element from the `.astro` pages would fail the
build. **Do not touch the `.astro` pages.**

## Requirements

1. `.catalog-hero` gets `width: min(100%, 72rem); margin-inline: auto;` so the
   two columns sit closer to the middle of the page.
2. `.catalog-hero` gap drops from `clamp(2rem, 6vw, 7rem)` to
   `clamp(1.5rem, 2.5vw, 3rem)`.
3. `grid-template-columns`, `align-items`, `border-bottom` and `padding-block`
   are unchanged.
4. At ≤44rem, `.catalog-hero-art { display: none; }`.
5. The hero art still shows at 900px and 704.1px+ (the 64rem stacked layout).

## Inputs

- `website/src/styles/global.css`
- `website/tests/unit/catalog-hero-art.test.ts` (read only — its assertions are
  the fence above)
- `website/tests/support/css.ts` — `resolve(css, selector, property, widthPx)`
- `website/src/pages/archetypes/[slug].astro`,
  `website/src/pages/sections/non-archetype/[slug].astro` (read only — do not edit)
- **From Depends:** none.

## TDD

1. **Red** — add `website/tests/unit/catalog-hero-layout.test.ts` per the table
   below and run
   `cd website && npx vitest run tests/unit/catalog-hero-layout.test.ts tests/unit/catalog-hero-art.test.ts`;
   confirm the new file fails and the old one passes.
2. **Green** — apply the impl steps.
3. **Refactor** — none. Keep green.

## Test plan

| Test                                          | Input                                                        | Expect                                    |
| --------------------------------------------- | ------------------------------------------------------------ | ------------------------------------------- |
| `the hero row is capped and centred`          | `resolve(css, '.catalog-hero', 'width', 1440)` / `'margin-inline'` | `'min(100%, 72rem)'` / `'auto'`        |
| `the columns sit closer together`             | `resolve(css, '.catalog-hero', 'gap', 1440)`                  | `'clamp(1.5rem, 2.5vw, 3rem)'`             |
| `the column ratio is untouched`               | `resolve(css, '.catalog-hero', 'grid-template-columns', 1440)`| `'minmax(0, 1.25fr) minmax(18rem, 0.75fr)'`|
| `the hero art is gone on phones`              | `resolve(css, '.catalog-hero-art', 'display', 390)`           | `'none'`                                    |
| `the hero art survives on tablets`            | `resolve(css, '.catalog-hero-art', 'display', 900)`           | `undefined` (never `'none'`)                |
| `the stacked layout is untouched`             | `resolve(css, '.catalog-hero-art', 'max-width', 900)`         | `'24rem'`                                   |
| `the vertical rhythm is untouched`            | `resolve(css, '.catalog-hero', 'padding-block', 1440)`        | `'var(--space-2) var(--space-4)'`           |
| e2e `the hero art is hidden on a phone`       | viewport 390×800, `/archetypes/burning-abyss/`                | `.catalog-hero-art` hidden; the `<h1>` and the card gallery still visible |
| e2e `the hero columns sit close on desktop`   | viewport 1400×900, `/archetypes/burning-abyss/`               | art box `x` − (text box `x` + text box `width`) ≤ 56 |

## Impl steps

- [ ] 1. Create `website/tests/unit/catalog-hero-layout.test.ts` with the seven
      unit rows above, importing `resolve` from `../support/css` and reading
      `../../src/styles/global.css`.
- [ ] 2. Run `cd website && npx vitest run tests/unit/catalog-hero-layout.test.ts`;
      confirm red.
- [ ] 3. In `website/src/styles/global.css`, replace the `.catalog-hero` block
      with:
      ```css
      /* The row is capped well inside `.page-shell`'s 88rem so the prose and the
         art meet near the middle of the page instead of at its two edges. Both
         tracks keep their authored ratios — only the row width and the gutter
         between them shrink. */
      .catalog-hero {
        display: grid;
        width: min(100%, 72rem);
        margin-inline: auto;
        grid-template-columns: minmax(0, 1.25fr) minmax(18rem, 0.75fr);
        gap: clamp(1.5rem, 2.5vw, 3rem);
        align-items: center;
        border-bottom: 1px solid var(--ruleline);
        padding-block: var(--space-2) var(--space-4);
      }
      ```
- [ ] 4. In `@media (max-width: 44rem)` — the block near line 1087 that holds
      `.compact-brand img`, `.search-trigger`, `.site-footer`, `.section-heading`,
      `.card-detail` — add:
      ```css
      /* A phone gets the prose and the gallery; the square hero art costs a
         whole viewport of scrolling before the first card. */
      .catalog-hero-art {
        display: none;
      }
      ```
- [ ] 5. Run
      `cd website && npx vitest run tests/unit/catalog-hero-layout.test.ts tests/unit/catalog-hero-art.test.ts`;
      both must be green. If `catalog-hero-art.test.ts` broke, the `.catalog-hero`
      block lost `padding-block` or grew a `padding-bottom` — fix that, do not
      edit the old test.
- [ ] 6. Append to `website/tests/e2e/showcase.spec.ts`:
      ```ts
      test('the archetype hero drops its art on a phone', async ({ page }) => {
        await page.setViewportSize({ width: 390, height: 800 });
        await page.goto(urlFor('/archetypes/burning-abyss/'));
        await expect(page.locator('.catalog-hero-art')).toBeHidden();
        await expect(page.getByRole('heading', { name: 'Burning Abyss', level: 1 })).toBeVisible();
        await expect(page.locator('.gallery-card').first()).toBeVisible();
      });

      test('the archetype hero columns sit close on desktop', async ({ page }) => {
        await page.setViewportSize({ width: 1400, height: 900 });
        await page.goto(urlFor('/archetypes/burning-abyss/'));
        const text = (await page.locator('.catalog-hero > div').first().boundingBox())!;
        const art = (await page.locator('.catalog-hero-art').boundingBox())!;
        expect(art.x - (text.x + text.width)).toBeLessThanOrEqual(56);
      });
      ```
- [ ] 7. Run `cd website && npx playwright test tests/e2e/showcase.spec.ts --project=chromium`; confirm green.
- [ ] 8. Run `cd website && npm run build` alone and confirm `check-chrome.mjs`
      still reports nothing for `archetypes/**` and `sections/**` (the hero
      markup is untouched, only its CSS changed).
- [ ] 9. Run `cd website && npm run format && npm run ci`.
- [ ] 10. Run `graphify update .` from the repo root.

## Outputs

- Files touched: `website/src/styles/global.css`,
  `website/tests/unit/catalog-hero-layout.test.ts` (new),
  `website/tests/e2e/showcase.spec.ts`.
- Behaviour change: the archetype/non-archetype hero row is capped at 72rem,
  centred, with a smaller gutter; no hero art below 44rem.
- No API change, no migration, no config change.

## Validation

- [ ] `cd website && npx vitest run tests/unit/catalog-hero-layout.test.ts tests/unit/catalog-hero-art.test.ts` passes
- [ ] `cd website && npm run ci` passes
- [ ] `cd website && npx playwright test tests/e2e/showcase.spec.ts` passes on all three projects
- [ ] manual: `/archetypes/nekroz/` at 1440px — the prose and the art read as one
      centred row; at 390px the art is gone and the first card is above the fold
- [ ] app functional — every route renders, no console error
- [ ] commit msg draft: `fix(website): tighten the catalog hero and drop its art on phones`
