# T7: Related band full width under bound pair

**Plan:** `./ai-artifacts/PLAN_2026_08_12_feedback_batch_2.md`
**Depends:** T6
**Commit outcome:** on a card page the render sticks while the text scrolls, then render and text scroll away together, and the two related-card sections sit below in one full-width tinted band.

## Context (self-contained)

- Goal: feedback batch 2 — cut dev/CI loop cost and fix website card surfaces. This ticket = card page scroll choreography + related band (item 7).
- Owner ask, verbatim intent: `Same Archetype` and `Interacts with this card` must use full width and sit under the card image; while scrolling only the text/rules move first, then card and text move together, giving the related block the whole width. Owner also chose the extra full-width band background to signal the change.
- Mechanism: `.card-detail` is already a 2-column grid whose `.render-column` is `position: sticky; top: calc(var(--header) + 2rem)`. Sticky already unsticks at the end of its containing block — so the "bind" is achieved by making the related sections **leave** `.card-transcription` and become siblings of `.card-detail`. Nothing else is needed for the choreography.
- Out of scope here: changing the related derivation (done in T6), the 12-card cap, the render size or full-size link (done in T5), hover preview (done in T4), archetype backgrounds (T8).
- Assumptions in force: page shell width is `min(100% - 2rem, 88rem)`; "full width" means the band background spans the viewport while its gallery content stays inside the shell width, so the site's column rhythm survives.
- **From T6:** `CardGallery.astro` takes `showNewBadge?: boolean` (default `true`) and both related galleries in `src/pages/cards/[id].astro` already pass `showNewBadge={false}`; `related.interaction` is deduped against `related.archetype` in the catalog. **From T5:** the render column also contains `<a class="full-size-link">`, and `.card-detail .render-column picture/img` is `width: 100%; max-width: 40rem`.

## Requirements

- Page structure becomes: `<article class="card-page">` → `<div class="page-shell card-detail">` (render column + transcription) → `<section class="related-band">` → `<div class="page-shell related-band-inner">` (the two related sections).
- Related sections keep their ids (`related-archetype`, `related-interaction`), headings, `.related-more` markup and 12-card cap exactly as they are — only their DOM position changes.
- Band styling: full-bleed background via `width: 100vw; margin-inline: calc(50% - 50vw)` on `.related-band`, a top hairline `1px solid var(--ruleline)`, and a tint `background: color-mix(in oklch, var(--sleeve) 55%, transparent)`.
- `.card-detail` keeps `position: sticky` on `.render-column` and the existing `@media (max-width: 44rem)` override that unsticks it.
- Related galleries get more width: inside `.related-band-inner`, `.card-grid` may use up to 6 columns from 90rem up (today the global rule is 5 at 90rem).
- Breadcrumb, pager, release history, rules, and design notes stay inside `.card-transcription`.

## Inputs

- `website/src/pages/cards/[id].astro` — today: `<article class="page-shell card-detail">` wraps `<div class="render-column">…</div>` and `<div class="card-transcription">…</div>`, and the two related `<section aria-labelledby="related-archetype|related-interaction">` blocks are the **last children of `.card-transcription`**, each holding `<h2 id=…>`, a `<CardGallery cards={…} base={base} showNewBadge={false} />`, and a conditional `<p class="related-more">`. Constants in scope: `RELATED_CAP = 12`, `archetypeRelated`, `interactionRelated`, `section`, `base`, `withBase`, `toGalleryCard`.
- `website/src/styles/global.css`:
  - `@layer layout`: `.page-shell { width: min(100% - 2rem, 88rem); margin-inline: auto; padding-block: var(--space-6); }`
  - `@layer components`: `.card-detail { display: grid; grid-template-columns: minmax(18rem, 0.85fr) minmax(20rem, 1.15fr); gap: clamp(2rem, 7vw, 7rem); align-items: start; }`, `.card-detail .render-column { position: sticky; top: calc(var(--header) + 2rem); }`, `.card-transcription { max-width: 72ch; }`
  - flat rule: `@media (min-width: 90rem) { .card-grid { grid-template-columns: repeat(5, minmax(0, 1fr)); } }`
  - flat rule: `@media (max-width: 44rem) { .card-detail { grid-template-columns: 1fr; } .card-detail .render-column { position: static; } }`
  - tokens available: `--ruleline`, `--sleeve`, `--space-6`, `--header`
- `website/tests/e2e/related-cards.spec.ts` — locators are `section:has(#related-archetype)` / `section:has(#related-interaction)` and `.gallery-card`; these keep working after the move. The truncation tests use `.related-more a` and `.related-more` text `^\d+ more$`.
- `website/tests/support/css.ts` — `resolve(css, selector, property, widthPx)`; matches authored selector strings verbatim, ignores specificity and layers.
- **From T6 / T5:** see Context.

## TDD

1. **Red** — add `tests/unit/card-related-band.test.ts` and `tests/e2e/card-related-band.spec.ts`; both fail.
2. **Green** — impl steps 2-5.
3. **Refactor** — none.

## Test plan

| Test                                                       | Input                                                                                          | Expect                                                                       |
| ---------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| unit `related sections are not inside the transcription`   | source of `src/pages/cards/[id].astro`                                                          | `related-archetype` index > `card-transcription` closing `</div>` index; `related-band` present |
| unit `band spans the viewport`                             | `resolve(css, '.related-band', 'width', 1440)`                                                  | `'100vw'`                                                                     |
| unit `band content keeps the shell width`                  | `resolve(css, '.page-shell', 'width', 1440)`                                                    | `'min(100% - 2rem, 88rem)'`                                                   |
| unit `render column is still sticky above 44rem`           | `resolve(css, '.card-detail .render-column', 'position', 1440)` / at 600                        | `'sticky'` / `'static'`                                                       |
| e2e `related band sits below the card grid`                | `/cards/burning-abyss-graff/`, viewport 1440×900                                                | `.related-band` bounding box `y` > `.card-detail` box `y + height - 1`         |
| e2e `related band is wider than the transcription column`  | same                                                                                           | `.related-band` box width > `.card-transcription` box width                    |
| e2e `render unsticks at the end of the detail block`       | same; scroll to `document.body.scrollHeight`                                                    | `.render-column img` box `bottom` < `.related-band` box `top` (it scrolled away) |

## Impl steps

- [ ] 1. Write the two test files. For the e2e scroll test use `page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))`, then `await page.waitForTimeout(150)` before reading boxes.
- [ ] 2. In `website/src/pages/cards/[id].astro`, restructure the template: change the outer element to `<article class="card-page">`; inside it add `<div class="page-shell card-detail">` containing the existing `.render-column` and `.card-transcription` (unchanged content **minus** the two related sections); after that `</div>`, add

  ```astro
  {
    (archetypeRelated.length > 0 || interactionRelated.length > 0) && (
      <section class="related-band" aria-label="Related cards">
        <div class="page-shell related-band-inner">
          {/* the two related <section> blocks, moved verbatim */}
        </div>
      </section>
    )
  }
  ```

  Move both related `<section>` blocks in unchanged, including `showNewBadge={false}` and the `.related-more` conditionals.

- [ ] 3. In `website/src/styles/global.css` `@layer components`, add after the `.card-transcription` rule:

  ```css
  .related-band {
    /* Full-bleed: the band background leaves the shell, its content does not. */
    width: 100vw;
    margin-inline: calc(50% - 50vw);
    border-top: 1px solid var(--ruleline);
    background: color-mix(in oklch, var(--sleeve) 55%, transparent);
  }
  .related-band-inner {
    display: grid;
    gap: var(--space-6);
  }
  ```

- [ ] 4. Add a flat rule next to the existing 90rem `.card-grid` rule:

  ```css
  @media (min-width: 90rem) {
    .related-band-inner .card-grid {
      grid-template-columns: repeat(6, minmax(0, 1fr));
    }
  }
  ```

- [ ] 5. Check `.card-page` needs no rule of its own (it is a plain block wrapper). If `npm run build` reports an unused-class lint or the band overflows horizontally, add `.card-page { overflow-x: clip; }` — nothing else.

## Outputs

- Files touched: `website/src/pages/cards/[id].astro`, `website/src/styles/global.css`, `website/tests/unit/card-related-band.test.ts` (new), `website/tests/e2e/card-related-band.spec.ts` (new).
- Public API change: card page markup gains `.card-page`, `.related-band`, `.related-band-inner`; `.card-detail` is no longer the outermost element.
- Migrations/config: none.

## Validation

- [ ] `cd website && npx vitest run` — no new failures
- [ ] `cd website && npm run check && npm run lint && npm run format:check`
- [ ] `cd website && npm run build`
- [ ] `cd website && npx playwright test tests/e2e/card-related-band.spec.ts tests/e2e/related-cards.spec.ts tests/e2e/card-rules-block.spec.ts`
- [ ] manual check: `/cards/burning-abyss-graff/` — scroll: text moves first, card holds, then both leave, related band spans full width with a visible tint
- [ ] no horizontal scrollbar at 1440, 1024, 390 px widths
- [ ] commit msg draft: `feat(website): move related cards into a full-width band below the card`
