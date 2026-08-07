# T21: Related cards rule

**Plan:** `./ai_artefacts/PLAN_2026_08_07_website-feedback-pass.md`
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

- [ ] 1. Create `website/tests/unit/related-cards.test.ts` with the eight cases above.
- [ ] 2. Add `RelatedInput` and `relatedCards` to `website/src/lib/catalog.ts`. Build a `Map<string, string>` of keyword term → archetype from the `keywords` argument once, then evaluate the three rules.
- [ ] 3. In `website/src/pages/cards/[id].astro`, replace the `related` computation with
      `const related = relatedCards(card, catalog.cards, catalog.keywords);`
- [ ] 4. Replace the related `<section>` with:
      `{related.length > 0 && (<section><h2>Related cards</h2><ul class="related-cards">{related.map((item) => (<li><a href={withBase(base, item.route)} data-card-preview={withBase(base, previewImage(item))}>{item.name}</a></li>))}</ul></section>)}`
      and add `data-card-keywords` to the anchor if T20 has already landed, using the same expression that ticket uses.
- [ ] 5. Add `.related-cards { list-style: none; padding: 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 16rem), 1fr)); gap: 0.3rem 1rem; }` to `website/src/styles/global.css`.
- [ ] 6. Confirm the `.card-pager` previous/next nav above it is unchanged.
- [ ] 7. Run `npm run build`, `npm run links:check`, `npm run budgets:check`, `npm run format`, `npm run lint`, `npm run check`.

## Outputs

- Files touched: `website/src/lib/catalog.ts`, `website/src/pages/cards/[id].astro`, `website/src/styles/global.css`, `website/tests/unit/related-cards.test.ts` (new).
- Public API: `relatedCards`, `RelatedInput`.
- No migration.

## Validation

- [ ] `cd website && npx vitest run tests/unit/related-cards.test.ts` — 8 passed
- [ ] `cd website && npm run build && npm run links:check && npm run budgets:check` — exit 0
- [ ] manual check: `node scripts/serve-dist.mjs`, open `/cards/burning-abyss-dante/` — the related list holds every Burning Abyss card plus Tour Guide from the Underworld and Beatrice, and it no longer stops at three
- [ ] manual check: open a plain staple such as `/cards/dark-hole/` — no related section renders
- [ ] manual check: HTML page size for the largest card page stays under 500 KiB (`npm run budgets:check` covers it)
- [ ] `cd website && npm run ci` — exit 0
- [ ] app functional — previous/next pager still walks the section in manifest order
- [ ] commit msg draft: `feat(website): relate cards by archetype and archetype keywords`
