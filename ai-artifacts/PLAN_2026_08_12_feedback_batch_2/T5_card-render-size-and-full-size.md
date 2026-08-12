# T5: Card render fills column + full-size link

**Plan:** `./ai-artifacts/PLAN_2026_08_12_feedback_batch_2.md`
**Depends:** T4
**Commit outcome:** the card page render fills its column up to 40rem (was hard-capped at 25rem) and a `Show full size` link under it opens the 1500 × 2092 print master PNG in a new tab.

## Context (self-contained)

- Goal: feedback batch 2 — cut dev/CI loop cost and fix website card surfaces. This ticket = card render size (item 8) + full-size link (item 4).
- Owner pasted the inspector edit that removes `width: min(100%, 25rem)` / `max-width: 25rem`, and chose "fill the column, cap at 40rem".
- Real pixel budget: canonical MSE render 750 × 1046, `display` webp tier 750 px wide (151 KB), print master 1500 × 2092 PNG (~1.1 MB) already generated per card as `/generated/releases/<package>/<id>-print.png` and exposed as `card.images.print.url`. There is no 1920 px source. So 40rem (640 px) stays near 1:1 at DPR 1, and "full size" means the print master.
- Out of scope here: adding a new image tier or changing `website/scripts/content/images.mjs`, related-cards changes (T6), moving related sections (T7), hover preview (done in T4).
- Assumptions in force: CSP is `img-src 'self' data:` and forbids inline `style=""`; a plain `<a>` is used, not a `<button>` with a handler.
- **From T4:** `src/lib/hover-placement.ts` now exports `PreviewRect` **with a required `width`**, `PreviewPlacement` with `width`/`height`, `PREVIEW_ASPECT`, `VIEWPORT_HEIGHT_FRACTION`, `PREVIEW_GAP`, `RULINGS_WIDTH`; `CardHoverPreview.astro` sets `--preview-width` / `--preview-height`; `.card-hover-preview` CSS is now a fixed-size overlay box. Do not re-edit those.

## Requirements

- `.card-detail .render-column picture`/`img`: `width: 100%`, `max-width: 40rem`, `height: auto`, `margin-inline: auto`.
- `CardPicture` on the card page gets `sizes="(min-width: 70rem) 40rem, 92vw"` so the browser picks the display tier correctly.
- A link directly under the render: text `Show full size`, `href` = `card.images.print.url` through `withBase`, `target="_blank"`, `rel="noopener"`, class `full-size-link`, and an accessible name that includes the card name (`aria-label={`Show ${card.name} at full size`}`).
- Link is styled like the existing buttons (reuse the `.card-pager a` visual language: 1px `--ruleline` border, `--sleeve` background, 0.5rem radius), centred under the image, `width: fit-content`.
- The link must render on every card page, including cards whose print master is a fallback (`images.print.draftResolution === true`); in that case append ` (draft)` to the visible text.

## Inputs

- `src/pages/cards/[id].astro` — `const { card } = Astro.props;`, `const base = import.meta.env.BASE_URL;`, imports `CardPicture`, `CardGallery`, `Markdown`, `RichText`, and `{ catalog, cardsById, sectionsBySlug, formatDate, withBase, toGalleryCard, previewKeywordsFor }` from `../../lib/catalog`. The render column is:

  ```astro
  <div class="render-column">
    <CardPicture card={card} tier="display" eager alt={`${card.name} card render`} />
  </div>
  ```

- `src/components/CardPicture.astro` — props `{ card, eager?, sizes?, class?, alt?, tier? }`, default `sizes = '(min-width: 70rem) 18rem, (min-width: 40rem) 30vw, 80vw'`.
- `src/lib/catalog.ts` — `CardImages { thumb, display, print, width, height }`; `PrintImage` carries `url`, `width`, `height`, `dpi`, `draftResolution`; helper `withBase(base, route)`.
- `src/styles/global.css` — inside `@layer components`, the rule to change:

  ```css
  .card-detail .render-column picture,
  .card-detail .render-column img {
    width: min(100%, 25rem);
    max-width: 25rem;
    height: auto;
    margin-inline: auto;
  }
  ```

  `.card-detail` itself is `grid-template-columns: minmax(18rem, 0.85fr) minmax(20rem, 1.15fr)`; `@media (max-width: 44rem)` collapses it to one column and unsticks `.render-column`.
- `tests/support/css.ts` — `resolve(css, selector, property, widthPx)` reads what a rule resolves to at a given viewport width. Read its documented blind spots before asserting: it matches selector strings verbatim and ignores specificity, so assert against the exact authored selector list.
- `tests/unit/` naming convention: one file per concern, `*.test.ts`, vitest `describe`/`it`.
- **From T4:** see Context.

## TDD

1. **Red** — add `tests/unit/card-render-width.test.ts` and `tests/e2e/card-full-size.spec.ts`. Both fail.
2. **Green** — impl steps 2-5.
3. **Refactor** — none.

## Test plan

| Test                                                     | Input                                                                                                      | Expect                                            |
| -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| `render column caps at 40rem`                            | `resolve(css, '.card-detail .render-column picture,\n  .card-detail .render-column img', 'max-width', 1440)` (use the helper's comma-list support) | `'40rem'`                                          |
| `render column fills its column`                         | same selector, `'width'`, 1440                                                                              | `'100%'`                                           |
| `no 25rem cap survives anywhere`                         | raw `global.css` text                                                                                       | does not match `/render-column[^}]*25rem/s`        |
| e2e `full size link points at the print master`          | `/cards/nekroz-trishula/`, locator `a.full-size-link`                                                       | `href` ends `-print.png`, `target="_blank"`, `rel` contains `noopener` |
| e2e `full size target is a real image`                   | `request.get(href)`                                                                                        | status 200, `content-type` starts `image/png`      |
| e2e `render is wider than the old cap on desktop`        | viewport 1440×900, `picture` bounding box on `/cards/nekroz-trishula/`                                       | `width > 400` and `width <= 640`                   |

## Impl steps

- [ ] 1. Write `tests/unit/card-render-width.test.ts` (read `src/styles/global.css` with `node:fs/promises`, use `resolve` from `../support/css`) and `tests/e2e/card-full-size.spec.ts` (Playwright, `basePath` prefix pattern copied from `tests/e2e/related-cards.spec.ts`).
- [ ] 2. In `src/pages/cards/[id].astro`, replace the render column block with:

  ```astro
  <div class="render-column">
    <CardPicture
      card={card}
      tier="display"
      eager
      alt={`${card.name} card render`}
      sizes="(min-width: 70rem) 40rem, 92vw"
    />
    <a
      class="full-size-link"
      href={withBase(base, card.images.print.url)}
      target="_blank"
      rel="noopener"
      aria-label={`Show ${card.name} at full size`}
    >
      Show full size{card.images.print.draftResolution && ' (draft)'}
    </a>
  </div>
  ```

- [ ] 3. In `src/styles/global.css`, inside `@layer components`, replace the `.card-detail .render-column picture, .card-detail .render-column img` rule body with:

  ```css
  .card-detail .render-column picture,
  .card-detail .render-column img {
    width: 100%;
    max-width: 40rem;
    height: auto;
    margin-inline: auto;
  }
  ```

- [ ] 4. Add directly after that rule:

  ```css
  .full-size-link {
    display: block;
    width: fit-content;
    margin: 0.9rem auto 0;
    border: 1px solid var(--ruleline);
    border-radius: 0.5rem;
    background: var(--sleeve);
    color: var(--cardstock);
    padding: 0.45rem 0.9rem;
    font-size: 0.9rem;
    text-decoration: none;
  }
  .full-size-link:hover,
  .full-size-link:focus-visible {
    border-color: var(--accent);
    color: var(--accent);
  }
  ```

- [ ] 5. `npm run build` then `npx playwright test tests/e2e/card-full-size.spec.ts`.

## Outputs

- Files touched: `src/pages/cards/[id].astro`, `src/styles/global.css`, `tests/unit/card-render-width.test.ts` (new), `tests/e2e/card-full-size.spec.ts` (new).
- Public API change: new `.full-size-link` element on every card page.
- Migrations/config: none.

## Validation

- [ ] `cd website && npx vitest run` — no new failures
- [ ] `cd website && npm run check && npm run lint && npm run format:check`
- [ ] `cd website && npm run build` — includes `check-404`, `scan-dist`, `harden-csp`; a stray inline style or bad link fails here
- [ ] `cd website && npx playwright test tests/e2e/card-full-size.spec.ts tests/e2e/showcase.spec.ts`
- [ ] `cd website && npm run budgets:check` — print masters were already shipped, so the total must not move
- [ ] manual check: `/cards/nekroz-trishula/` shows a visibly bigger render; clicking `Show full size` opens the raw PNG
- [ ] commit msg draft: `feat(website): widen the card render and link the print master`
