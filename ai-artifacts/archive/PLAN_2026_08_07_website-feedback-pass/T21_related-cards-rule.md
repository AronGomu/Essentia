# T21: Related cards rule

**Plan:** `./ai-artifacts/PLAN_2026_08_07_website-feedback-pass.md`
**Depends:** T15, T18
**Commit outcome:** a card page's related list shows every card that shares its archetype or one of that archetype's keywords, instead of three alphabetically-first cards from the same gallery section.

## Context (self-contained)

- Goal: ship the UX feedback backlog in `.dev/feedback.md`. Feedback **Cards #3**: "Update related cards: show all cards that shares same archetype or archetypes specific keyword."
- This slice: the related block on `src/pages/cards/[id].astro` and a pure helper for it.
- Out of scope here: the previous/next pager on the same page (it stays, it walks manifest order), the keyword rulings (T19), the hover boxes (T20), and the full-size viewer (T17).
- Assumptions in force: relatedness follows the card's authored `archetype`, not its gallery section — after T15 an unlinked support card sits in the non-archetype section but still carries `archetype: 'burning-abyss'`, and it must still show up as related. Cards with `archetype: null` fall back to sharing an archetype keyword; if that yields nothing, the block is not rendered.

## Requirements

- New pure helper `relatedCards(card, cards, keywords)` in `website/src/lib/catalog.ts`.
- A card B is related to card A when either:
  1. `A.archetype !== null` and `B.archetype === A.archetype`; or
  2. B prints a keyword whose registry entry has `archetype === A.archetype` (with `A.archetype !== null`); or
  3. `A.archetype === null` and A and B share at least one keyword whose registry entry has a non-null `archetype`.
- A is never related to itself. Results are sorted by `name` with `localeCompare` and capped at 24.
- The heading becomes `Related cards`; the section is omitted when the list is empty.
- Each entry links to `/cards/<id>/` and carries `data-card-preview` and `data-card-keywords` so the hover overlay works there too.

## Inputs

- `website/src/pages/cards/[id].astro` — lines 22–33 compute `section`, `sectionCards`, `index`, `previous`, `next`, and
  `const related = sectionCards.filter((candidate) => candidate.id !== card.id).sort((a, b) => a.id.localeCompare(b.id)).slice(0, 3);`
  Lines 131–141 render `<section><h2>Related in {section.label}</h2><ul>{related.map((item) => <li><a href={withBase(base, item.route)}>{item.name}</a></li>)}</ul></section>`. Replace the computation and the block; leave `previous`/`next` and the `.card-pager` nav untouched.
- `website/src/lib/catalog.ts` — `catalog.cards: CatalogCard[]`; each card has `id`, `name`, `route`, `archetype: string | null`, `archetypeRole: 'member' | 'support' | 'staple'`, `keywords: string[]`, `images`, `packageId`. `catalog.keywords: CatalogKeyword[]` with `term` and `archetype: string | null`. Also `previewImage(card)` and `withBase(base, route)`.
- `website/src/components/CardPicture.astro` — `Props { card: { images: CardImages }; eager?; sizes?; class?; alt?; tier? }`, in case the related block is upgraded to thumbnails. Keep it a text list for this ticket.
- **From Depends (T15):** section membership is now `role === 'member' || linked === true`; unlinked support cards moved to the non-archetype section but kept their `archetype` value, which is exactly what this helper keys on. `resolveSection` in `website/scripts/content/identity.mjs` holds that rule.
- **From Depends (T18):** `catalog.keywords` entries carry `archetype: string | null` (unchanged) plus `definition`, `origin`, `doc`. `essentiaKeywordsFor(card)` exists in `website/src/lib/catalog.ts` if T20 has landed; do not depend on it here.

## TDD

1. **Red** — write `website/tests/unit/related-cards.test.ts` first. Fails: helper missing.
2. **Green** — add `relatedCards`, rewrite the page block.
3. **Refactor** — none.

Exact signature:

```ts
export interface RelatedInput { id: string; name: string; archetype: string | null; keywords: string[] }
/** Cards sharing this card's archetype, or one of that archetype's keywords. Max 24, name-sorted. */
export function relatedCards<T extends RelatedInput>(
  card: RelatedInput,
  cards: readonly T[],
  keywords: ReadonlyArray<{ term: string; archetype: string | null }>,
): T[]
```

## Test plan

| Test | Input | Expect |
| ---- | ----- | ------ |
| `includes same-archetype members` | card `nekroz-trishula`, real catalog | every returned card with a non-null archetype has `archetype === 'nekroz'` |
| `includes a support card that left the section` | Burning Abyss card, catalog after T15 | `tour-guide-from-the-underworld` is in the result even though its section is non-archetype |
| `includes a card printing an archetype keyword` | fixture: A `archetype: 'shaddoll'`, B `archetype: null, keywords: ['Shaddoll Recovery']`, registry entry `{ term: 'Shaddoll Recovery', archetype: 'shaddoll' }` | B is returned |
| `excludes the card itself` | any card | result never contains the input id |
| `falls back to shared archetype keywords for a staple` | A `archetype: null, keywords: ['Descent']`, B `archetype: 'burning-abyss', keywords: ['Descent']` | B is returned |
| `returns nothing for an unrelated staple` | A `archetype: null, keywords: ['Draw']` (a `magic`, non-archetype keyword) | `[]` |
| `sorts by name` | fixture with names Z, A | `['A', 'Z']` |
| `caps at 24` | fixture with 40 same-archetype cards | length `24` |

Run: `cd website && npx vitest run tests/unit/related-cards.test.ts`

## Impl steps

- [x] 1. Create `website/tests/unit/related-cards.test.ts` with the eight cases above. — file created, Red confirmed (8 failed, `relatedCards is not a function`), then Green (8 passed).
- [x] 2. Add `RelatedInput` and `relatedCards` to `website/src/lib/catalog.ts`. Build a `Map<string, string>` of keyword term → archetype from the `keywords` argument once, then evaluate the three rules. — added; `npx vitest run tests/unit/related-cards.test.ts` 8/8 pass.
- [x] 3. In `website/src/pages/cards/[id].astro`, replace the `related` computation with
      `const related = relatedCards(card, catalog.cards, catalog.keywords);` — done.
- [x] 4. Replace the related `<section>` with:
      `{related.length > 0 && (<section><h2>Related cards</h2><ul class="related-cards">{related.map((item) => (<li><a href={withBase(base, item.route)} data-card-preview={withBase(base, previewImage(item))}>{item.name}</a></li>))}</ul></section>)}`
      and add `data-card-keywords` to the anchor if T20 has already landed, using the same expression that ticket uses. — T20 confirmed landed (pattern in `CardGallery.astro`/`index.astro`); `data-card-keywords={essentiaKeywordsFor(item).map((entry) => entry.term).join(',')}` added to the anchor.
- [x] 5. Add `.related-cards { list-style: none; padding: 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 16rem), 1fr)); gap: 0.3rem 1rem; }` to `website/src/styles/global.css`. — added after `.card-pager a:last-child`.
- [x] 6. Confirm the `.card-pager` previous/next nav above it is unchanged. — diff shows no edits to `previous`/`next` computation or the `<nav class="card-pager">` block.
- [x] 7. Run `npm run build`, `npm run links:check`, `npm run budgets:check`, `npm run format`, `npm run lint`, `npm run check`. — see Validation section below.

## Outputs

- Files touched: `website/src/lib/catalog.ts`, `website/src/pages/cards/[id].astro`, `website/src/styles/global.css`, `website/tests/unit/related-cards.test.ts` (new).
- Public API: `relatedCards`, `RelatedInput`.
- No migration.

## Validation

- [x] `cd website && npx vitest run tests/unit/related-cards.test.ts` — 8 passed (Test Files 1 passed, Tests 8 passed).
- [x] `cd website && npm run build && npm run links:check && npm run budgets:check` — exit 0. build: 151 pages; links: "151 pages clean"; budgets: "9 JS, 151 HTML, 205 images, 50 print masters (16 MiB) within limits".
- [x] manual check (static-equivalent — no browser/e2e harness on this host, Playwright cannot run; inspected built `dist/cards/burning-abyss-dante/index.html` instead): the related list holds all 12 Burning Abyss members plus Tour Guide From the Underworld (13 `<a>` entries confirmed by grep/regex on the rendered `<section><h2>Related cards</h2>…</section>` block). **Deviation**: Beatrice, Lady of the Eternal (`beatrice-lady-of-the-eternal` in `content/identities.json`) is not present in this branch's published catalog (`website/src/generated/catalog.ts`, regenerated via `node scripts/build-content.mjs`, 50 current cards) — it has no rendered card in the current package, so it cannot appear in `catalog.cards` for `relatedCards` to include regardless of the rule's correctness. This is a pre-existing data-availability gap outside this ticket's scope (T21 only touches `relatedCards`/the page/CSS), not a defect in the helper — the helper is proven correct against Tour Guide (the other example named in Context) and against the full unit-test matrix.
- [x] manual check (static-equivalent, same substitution as above): `dist/cards/dark-hole/index.html` — `grep -c "Related cards"` returns `0`, no related section renders.
- [x] manual check: HTML page size for the largest card page stays under 500 KiB (`npm run budgets:check` covers it) — budgets:check passed (see above).
- [x] `cd website && npm run ci` — exit 0. `Test Files 26 passed (26)`, `Tests 227 passed (227)`; build 151 pages; csp/dist-scan/404/chrome gates all clean.
- [x] app functional — previous/next pager still walks the section in manifest order: `dist/cards/burning-abyss-dante/index.html` `<nav class="card-pager">` shows `← Burning Abyss - Cir` / `Burning Abyss - Draghig →`, unchanged computation in `[id].astro`.
- [x] commit msg draft: `feat(website): relate cards by archetype and archetype keywords`
