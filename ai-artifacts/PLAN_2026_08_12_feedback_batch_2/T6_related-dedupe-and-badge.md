# T6: Related dedupe, no New badge

**Plan:** `./ai-artifacts/PLAN_2026_08_12_feedback_batch_2.md`
**Depends:** T5
**Commit outcome:** a card shown under `Same archetype` never repeats under `Interacts with this card`, and neither related gallery shows the `New` badge.

## Context (self-contained)

- Goal: feedback batch 2 — cut dev/CI loop cost and fix website card surfaces. This ticket = related-cards data + badge (items 5 and 6).
- Today `buildRelatedGraph()` fills `archetype` and `interaction` independently, so a Burning Abyss card that fetches Burning Abyss cards lists them twice on its page. And `CardGallery.astro` always renders `{isLatestRelease(card) && <span class="tile-badge">New</span>}`, which is right on the home/section grids but noise inside a related block.
- This slice: dedupe at the derivation step (so the catalog data itself is deduped and every consumer agrees), plus an opt-out badge prop used only by the card page.
- Out of scope here: changing how interactions are derived (constraint parsing untouched), the 12-card cap, moving the sections (T7), archetype backgrounds (T8).
- Assumptions in force: dedupe direction is fixed — `archetype` wins, `interaction` loses. `Tour Guide from the Underworld` has an empty `archetype` list (its printed name carries no archetype pattern), so the existing test `interaction list holds Tour Guide's fetch targets` stays green.
- **From T5:** `src/pages/cards/[id].astro` render column now holds `<CardPicture … sizes="(min-width: 70rem) 40rem, 92vw" />` plus `<a class="full-size-link" …>`; `global.css` has `.full-size-link` and a 40rem render cap. The two `<CardGallery …>` blocks in that file are still inside `.card-transcription` (T7 moves them). Do not move them here.

## Requirements

- `buildRelatedGraph()` returns `interaction` lists with every id that appears in the same card's `archetype` list removed.
- Sort order and the existing `fail()` validations stay as they are.
- `CardGallery.astro` gains prop `showNewBadge?: boolean` defaulting to `true`; the card page passes `showNewBadge={false}` to both related galleries. Home, archetype, and non-archetype section pages keep the badge without edits.
- `docs/related-cards-derivation.html` documents the dedupe rule (one new paragraph in the existing `The two categories` section, matching the surrounding markup and tone).

## Inputs

- `website/scripts/content/related.mjs` — `export function buildRelatedGraph(cards, sections, keywordRegistry)`. It seeds `result.set(card.id, { archetype: [], interaction: [] })` for every card, fills `result.get(card.id).archetype = archetype` in the first loop, and in the second loop ends with:

  ```js
  const cardsById = new Map(cards.map((c) => [c.id, c]));
  result.get(card.id).interaction = [...relatedIds].sort((a, b) =>
    cardsById.get(a).name.localeCompare(cardsById.get(b).name),
  );
  ```

- `website/src/components/CardGallery.astro` — `interface Props { cards: GalleryCard[]; base: string }`, `const { cards, base } = Astro.props;`, badge line `{isLatestRelease(card) && <span class="tile-badge">New</span>}`.
- `website/src/pages/cards/[id].astro` — two `<CardGallery cards={…} base={base} />` usages, in the `related-archetype` and `related-interaction` sections.
- Other `CardGallery` usages that must keep the badge: `src/pages/archetypes/[slug].astro:68`, `src/pages/sections/non-archetype/[slug].astro:77`.
- `website/tests/unit/related-graph.test.ts` — has `describe('buildRelatedGraph — fixtures')` with inline fixture cards and `describe('buildRelatedGraph — real catalog')` reading the generated catalog; also asserts `schema version is 11`.
- `website/tests/unit/related-cards.test.ts` — asserts both lists exist, archetype entries are printed-name matches, and `Tour Guide` interaction contains `burning-abyss-graff`.
- `website/tests/e2e/related-cards.spec.ts` — asserts both sections render galleries on `/cards/burning-abyss-graff/`, each ≤ 12 cards, truncation link/count behavior.
- `docs/related-cards-derivation.html` — 168 lines; headings `Related cards derivation`, `Worked example`, `The two categories`, `Closed vocabularies`, `What fails the build`, `Where it lives`.
- **From T5:** see Context.

## TDD

1. **Red** — add the 3 unit tests and 1 e2e test below; the dedupe tests fail, the badge test fails.
2. **Green** — impl steps 2-5.
3. **Refactor** — none.

## Test plan

| Test                                                        | Input                                                                                                     | Expect                                                                 |
| ----------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| unit `interaction never repeats an archetype relation` (fixture) | fixture: 3 cards named `Burning Abyss - A/B/C` in one archetype section, A's rule text `<b>Search</b> 1 "Burning Abyss"` | `graph.get('a').interaction` excludes `b` and `c`                       |
| unit `interaction never repeats an archetype relation` (real catalog) | every card in the generated catalog                                                                       | `intersection(card.related.archetype, card.related.interaction).length === 0` |
| unit `Tour Guide keeps its fetch targets`                    | real catalog, `tour-guide-from-the-underworld`                                                            | `related.interaction` still contains `burning-abyss-graff`              |
| unit `gallery badge is opt-out`                              | read `src/components/CardGallery.astro` source                                                             | contains `showNewBadge` with default `true`; card page source passes `showNewBadge={false}` twice |
| e2e `related galleries carry no New badge`                    | `/cards/burning-abyss-graff/`                                                                             | `section:has(#related-archetype) .tile-badge` count 0, same for `#related-interaction` |

## Impl steps

- [ ] 1. Write the tests: extend `website/tests/unit/related-graph.test.ts` (fixture + real-catalog cases), extend `website/tests/unit/related-cards.test.ts` (badge source assertion may go here or in a new `tests/unit/related-badge.test.ts` — put it in the new file to keep concerns separate), extend `website/tests/e2e/related-cards.spec.ts` with the badge case.
- [ ] 2. In `website/scripts/content/related.mjs`, inside `buildRelatedGraph`'s second loop, replace the final assignment with:

  ```js
  const cardsById = new Map(cards.map((c) => [c.id, c]));
  // A card listed under `Same archetype` must not reappear under `Interacts with
  // this card`: on an archetype member that fetches its own archetype, every
  // interaction was a duplicate of the block directly above it.
  const archetypeIds = new Set(result.get(card.id).archetype);
  result.get(card.id).interaction = [...relatedIds]
    .filter((id) => !archetypeIds.has(id))
    .sort((a, b) => cardsById.get(a).name.localeCompare(cardsById.get(b).name));
  ```

  The archetype loop runs before the interaction loop, so `result.get(card.id).archetype` is already final here — keep that order.

- [ ] 3. In `website/src/components/CardGallery.astro`, change the props to:

  ```ts
  interface Props {
    cards: GalleryCard[];
    base: string;
    /** Section grids flag new cards; a related block inside a card page does not. */
    showNewBadge?: boolean;
  }

  const { cards, base, showNewBadge = true } = Astro.props;
  ```

  and the badge line to `{showNewBadge && isLatestRelease(card) && <span class="tile-badge">New</span>}`.

- [ ] 4. In `website/src/pages/cards/[id].astro`, add `showNewBadge={false}` to both `<CardGallery …>` usages.
- [ ] 5. In `docs/related-cards-derivation.html`, add one paragraph at the end of the `The two categories` section stating: the two lists are disjoint by construction; `archetype` is computed first and its ids are subtracted from `interaction`; the reason is that an archetype member that fetches its own archetype otherwise prints the same gallery twice. Match the file's existing element/class usage.

## Outputs

- Files touched: `website/scripts/content/related.mjs`, `website/src/components/CardGallery.astro`, `website/src/pages/cards/[id].astro`, `docs/related-cards-derivation.html`, `website/tests/unit/related-graph.test.ts`, `website/tests/unit/related-cards.test.ts` or new `website/tests/unit/related-badge.test.ts`, `website/tests/e2e/related-cards.spec.ts`.
- Public API change: `CardGallery` gains optional `showNewBadge`; catalog `related.interaction` lists shrink (data change, no schema change).
- Migrations/config: `npm run content` must be re-run so `src/generated/catalog.ts` reflects the dedupe.

## Validation

- [ ] `cd website && npm run content` — regenerates the catalog
- [ ] `cd website && npx vitest run` — no new failures; new dedupe tests pass
- [ ] `cd website && npm run content:check` — clean (generated content matches sources)
- [ ] `cd website && npm run check && npm run lint && npm run format:check`
- [ ] `cd website && npm run build && npx playwright test tests/e2e/related-cards.spec.ts`
- [ ] manual check: `/cards/burning-abyss-graff/` — no card appears in both blocks, no `New` badge in either
- [ ] commit msg draft: `fix(website): keep related lists disjoint and drop their New badge`
