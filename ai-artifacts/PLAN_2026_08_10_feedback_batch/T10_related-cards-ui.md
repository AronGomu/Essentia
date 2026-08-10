# T10: Related cards UI

**Plan:** `./ai-artifacts/PLAN_2026_08_10_feedback_batch.md`
**Depends:** T9
**Commit outcome:** the card page shows two headed related-card sections with
gallery-style thumbnails, capped at 12 each, and the old flat name list is gone.

## Context (self-contained)

- Goal: `feedback.md` item 8, presentation half — related cards split into
  "same archetype" and "interacts with this card", shown as cards, not bare names.
- This slice: `/cards/{id}` rendering plus removal of the superseded helper.
- Out of scope here: the derivation itself (done in T9), the version route, the
  hover-preview machinery (already global in `BaseLayout`).
- Assumptions in force: cap 12 per category; the archetype category links to its
  section page when truncated; the interaction category has no listing page, so it shows
  a count instead of a link.

## What T9 already produced (do not redo)

- `catalog.schemaVersion === 11`.
- Every entry of `catalog.cards` carries
  `related: { archetype: string[]; interaction: string[] }` — stable ids, name-sorted,
  uncapped, never containing the card's own id.
- `src/lib/catalog.ts` declares that field on `CatalogCard`.
- `website/scripts/content/related.mjs` owns the derivation; do not re-derive in a page.
- `relatedCards(card, cards, keywords)` and `interface RelatedInput` still exist in
  `src/lib/catalog.ts` and are still used by `/cards/{id}.astro`. This ticket deletes both.

## Requirements

- `/cards/{id}` renders, in this order, after the card pager:
  1. `<section aria-labelledby="related-archetype">` — `<h2 id="related-archetype">Same archetype</h2>`,
     a `<CardGallery>` of up to 12 cards. When `related.archetype.length > 12`, a trailing
     `<p class="related-more"><a href={sectionRoute}>View all {n} {sectionLabel} cards</a></p>`.
  2. `<section aria-labelledby="related-interaction">` — `<h2 id="related-interaction">Interacts with this card</h2>`,
     a `<CardGallery>` of up to 12 cards. When longer than 12, a trailing
     `<p class="related-more">{n - 12} more</p>` — no link, there is no listing page.
- A section renders only when its list is non-empty. Both empty → no related markup at all.
- Cards passed to `CardGallery` come from `toGalleryCard(cardsById.get(id)!)`.
- `CardGallery` already sorts by name, marks `isLatestRelease` and wires
  `data-card-preview` / `data-card-keywords`; do not duplicate any of that.
- `relatedCards()` and `RelatedInput` are deleted from `src/lib/catalog.ts`;
  `tests/unit/related-cards.test.ts` is rewritten against the catalog field.
- `.related-cards` CSS (the old `ul`) is deleted from `global.css`; add
  `.related-more { margin-top: var(--space-3); }`.

## Inputs

- `website/src/pages/cards/[id].astro`: imports `relatedCards`, `previewImage`,
  `previewKeywordsFor`; `const related = relatedCards(card, catalog.cards, catalog.keywords);`
  and the trailing `{related.length > 0 && (<section><h2>Related cards</h2><ul class="related-cards">…</ul></section>)}`.
- `website/src/components/CardGallery.astro`: `Props { cards: GalleryCard[]; base: string }`,
  renders `<div class="card-grid">` of `.gallery-card` anchors. Carries no hover aside of
  its own — `CardHoverPreview` is mounted once in `BaseLayout`, so two galleries on one
  page are safe.
- `website/src/lib/catalog.ts`: `toGalleryCard(card)`, `cardsById`, `sectionsBySlug`,
  `withBase(base, route)`; `CatalogSection` carries `route`, `label`, `count`.
- `website/src/styles/global.css`: `.related-cards` rule (to delete), `.card-grid` at
  line 908 (reused as is).
- `website/tests/unit/related-cards.test.ts` — three tests calling `relatedCards(...)`;
  all three are rewritten.
- **From Depends:** T9, as listed above.

## TDD

1. **Red** — rewrite `tests/unit/related-cards.test.ts` against `card.related` and add
   `website/tests/e2e/related-cards.spec.ts`. Both fail today.
2. **Green** — rewrite the card page block, delete the helper, delete the CSS.
3. **Refactor** — `npm run lint` must report no unused import in `[id].astro`.

## Test plan

| Test | Input | Expect |
| --- | --- | --- |
| `related-cards.test.ts` › `every card carries both lists` | catalog | each card's `related.archetype` and `related.interaction` are arrays of known ids |
| `related-cards.test.ts` › `archetype list holds only printed-name matches` | `burning-abyss-graff` | every id resolves to a name containing `Burning Abyss` |
| `related-cards.test.ts` › `interaction list holds Tour Guide's fetch targets` | `tour-guide-from-the-underworld` | contains `burning-abyss-graff` |
| `related-cards.test.ts` › `the old helper is gone` | `src/lib/catalog.ts` source | does not contain `export function relatedCards` |
| `related-cards.spec.ts` › `both categories render with headings` | `/cards/burning-abyss-graff/` | `#related-archetype` and `#related-interaction` visible |
| `related-cards.spec.ts` › `each category shows at most 12 cards` | same | each section's `.gallery-card` count `<= 12` |
| `related-cards.spec.ts` › `truncated archetype category links to its section` | a card whose archetype list exceeds 12 | `.related-more a` href ends with that section route |
| `related-cards.spec.ts` › `truncated interaction category shows a count, not a link` | a card whose interaction list exceeds 12 | `.related-more` text matches `/^\d+ more$/`, contains no `a` |
| `related-cards.spec.ts` › `a card with no relations renders no related section` | a card with both lists empty (skip the test if none exists) | `#related-archetype` count `=== 0` |

## Impl steps

- [x] 1. In `[id].astro`, replace the `relatedCards(...)` call with:
      ```ts
      const RELATED_CAP = 12;
      const archetypeRelated = card.related.archetype.map((id) => cardsById.get(id)!).filter(Boolean);
      const interactionRelated = card.related.interaction.map((id) => cardsById.get(id)!).filter(Boolean);
      ```
- [x] 2. Import `CardGallery` and `toGalleryCard`; drop the `relatedCards` import, and drop
      `previewImage` / `previewKeywordsFor` if the related block was their only user
      (check the rest of the file first — `previewKeywordsFor` is also used by T8's Rules
      block if that ticket landed; keep it then).
      Note: `previewImage` was dropped (only user was the old related block);
      `previewKeywordsFor` is kept — the Rules block uses it.
- [x] 3. Replace the old related `<section>` with the two sections described in
      Requirements, each rendering
      `<CardGallery cards={list.slice(0, RELATED_CAP).map(toGalleryCard)} {base} />`.
- [x] 4. Delete `export function relatedCards` and `export interface RelatedInput` from
      `src/lib/catalog.ts`.
- [x] 5. In `global.css`, delete the `.related-cards` rule and add `.related-more`.
- [x] 6. Rewrite `tests/unit/related-cards.test.ts` per the test plan.
- [x] 7. Create `website/tests/e2e/related-cards.spec.ts`. Pick the truncation fixtures by
      reading `src/generated/catalog.ts` inside the test setup rather than hardcoding a card
      whose list length may change.
- [x] 8. Update `docs/CONTEXT.md` where it describes the related-cards rule
      ("A website archetype section lists printed-name members plus…") so it names the two
      categories and points at ADR 0032.

## Outputs

- `website/src/pages/cards/[id].astro`, `website/src/lib/catalog.ts`,
  `website/src/styles/global.css`, `website/tests/unit/related-cards.test.ts`,
  `website/tests/e2e/related-cards.spec.ts`, `docs/CONTEXT.md`.
- Public API change: `relatedCards()` and `RelatedInput` removed from `src/lib/catalog.ts`.

## Validation

- [x] `cd website && npx vitest run tests/unit/related-cards.test.ts` → pass
- [x] `cd website && npx playwright test tests/e2e/related-cards.spec.ts` → pass across 2 browsers
      (Chromium + WebKit only; Firefox cannot launch in this environment, pre-existing/unrelated;
      ran via ignored `playwright.config.local.ts`)
- [x] `cd website && npm run lint` → no unused imports in `[id].astro`
- [x] manual check: `/cards/tour-guide-from-the-underworld/` shows Fiends under
      `Interacts with this card`
- [x] `cd website && npm run ci` → pass
- [x] commit msg draft: `feat(website): split related cards into archetype and interaction galleries` — landed as `99f12ff`
