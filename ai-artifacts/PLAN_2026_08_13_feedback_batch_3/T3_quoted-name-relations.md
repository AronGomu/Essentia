# T3: Quoted-name related-card model

**Plan:** `./ai-artifacts/PLAN_2026_08_13_feedback_batch_3.md`
**Depends:** none
**Commit outcome:** The quadratic constraint matcher is gone; a card relates to what its
rule text explicitly names, in both directions, and the related graph grows linearly.

## Context (self-contained)

- Goal: today `website/scripts/content/related.mjs` derives an `interaction` relation by
  parsing constraints (subtype, colour, supertype, mana value, quoted name) out of every
  rule-text clause and matching them against every other card. Leviair matches 41 of 49
  cards. Measured edge growth: 50 cards → 528 edges, 200 → 8 856, 800 → **143 328**. The CPU
  cost is fine (162 ms at 800); the payload in `catalog.ts` and in every card page is not.
- This slice: replace the derived `interaction` relation with a **quoted-name reference**
  relation. A card relates to what it literally names. Growth becomes one edge per quoted
  name per card.
- Out of scope here: the authored `archetype` relation (unchanged), the 12-tile cap
  (retained), any change to card rule text, any change to `content/identities.json`.
- Assumptions in force: measured on the live corpus, all 37 quoted tokens across all 50
  cards are self-references, so this ships with **zero live edges and zero guard failures**.
  Tests must therefore be fixture-based, never corpus-derived.

## Requirements

- `card.related` becomes `{ archetype: string[], references: Reference[], referencedBy: string[] }`.
- `Reference` is `{ kind: 'archetype', slug, label, route, count }` or `{ kind: 'card', id }`.
- Resolution order for each distinct quoted token on a card, first match wins:
  1. the token appears inside the card's **own** printed name → self-reference, no edge;
  2. the token equals a section's `namePattern` (case-insensitive) → archetype reference,
     unless it is the card's own `archetype`, in which case no edge;
  3. the token matches another card's printed name on a word boundary → card reference;
  4. nothing matched → `fail()` — the build guard survives.
- Both directions: an archetype reference adds the referencing card's id to the
  `referencedBy` of every member of that section; a card reference adds it to that card's
  `referencedBy`.
- Quote handling uses `normalizeQuotes` from `website/shared/keywords.mjs`
  (`replace(/[‘’]/g, "'").replace(/[“”]/g, '"')`) — rule text uses curly quotes.
- Every list is deterministically sorted: `references` by kind (`archetype` before `card`)
  then by label / target name; `referencedBy` by card name.
- The card page renders `References` and `Referenced by` blocks in place of
  `Interacts with this card`, each capped at 12.

## Inputs

- `website/scripts/content/related.mjs` — currently exports `COLOR_WORDS`,
  `SUPERTYPE_WORDS`, `extractClauses`, `parseConstraints`, `buildRelatedGraph`.
  `buildRelatedGraph(cards, sections, keywordRegistry)` returns
  `Map<id, { archetype: string[], interaction: string[] }>`.
- `website/scripts/content/orchestrator.mjs` — calls
  `const related = buildRelatedGraph(cards, sections, keywordRegistry);` then assigns
  `card.related = related.get(card.id) ?? { archetype: [], interaction: [] };`.
- `website/src/lib/catalog.ts:112` — `related: { archetype: string[]; interaction: string[] };`
- `website/src/pages/cards/[id].astro` — `const RELATED_CAP = 12;`, `archetypeRelated` and
  `interactionRelated` are built near line 34; the two `<section>` blocks with headings
  `related-archetype` ("Same archetype") and `related-interaction` ("Interacts with this
  card") sit inside `<section class="related-band">`.
- Card shape available in the graph: `{ id, name, archetype, sectionSlug, subType, colors,
  supertypes, manaValue, ruleText, ruleTextPlain, keywords }`.
- Section shape: `{ slug, label, kind, namePattern, route, cardIds, count }`.
- `website/shared/keywords.mjs` — `export function normalizeQuotes(value)`.
- Existing tests to rewrite: `website/tests/unit/related-graph.test.ts`,
  `website/tests/unit/related-cards.test.ts`, `website/tests/e2e/related-cards.spec.ts`.

## TDD

1. **Red** — rewrite `related-graph.test.ts` against the new API and watch it fail.
2. **Green** — rewrite `related.mjs`, thread the new shape through, update the card page.
3. **Refactor** — only if needed. Keep green.

## Test plan

File: `website/tests/unit/related-graph.test.ts` — build fixture card and section arrays
inline; do not import the live catalog.

| Test                                                          | Input                                                                                     | Expect                                                                        |
| ------------------------------------------------------------- | ----------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `quotedNames extracts curly and straight quoted tokens once`  | `'Search 1 “Nekroz” Creature; Discard “Nekroz”.'`                                          | `['Nekroz']`                                                                  |
| `a foreign archetype name produces one archetype reference`   | staple card `{ archetype: null, ruleText: 'Search 1 “Nekroz” Creature' }`, Nekroz section with 3 members | `references` is `[{ kind: 'archetype', slug: 'nekroz', count: 3 }]` |
| `every member of the referenced archetype is referenced back` | same fixture                                                                                | each of the 3 members has `referencedBy` `['staple']`                          |
| `a card naming its own archetype produces no reference`       | member card `{ archetype: 'nekroz', name: 'Nekroz Unicore', ruleText: '… “Nekroz” …' }`     | `references` is `[]`                                                          |
| `a self-name reference produces no edge`                      | card `{ name: 'Maxx "C"', ruleText: 'Discard “C”.' }` plus a card named `Catastor`          | `references` is `[]` and `Catastor.referencedBy` is `[]`                       |
| `a foreign card name produces a card reference both ways`     | card A `{ name: 'Tutor', ruleText: 'Search “Dante”.' }`, card B `{ name: 'Dante' }`         | `A.references` is `[{ kind: 'card', id: 'b' }]`, `B.referencedBy` is `['a']`   |
| `an unknown quoted name fails the build`                      | card `{ ruleText: 'Search “Nonesuch”.' }`                                                   | `buildRelatedGraph` throws, message contains `Nonesuch`                        |
| `references are sorted archetype-first then by label`         | card naming one archetype and two cards                                                     | order is archetype, then the two cards alphabetically by name                  |

File: `website/tests/unit/related-cards.test.ts` — corpus invariants only:

| Test                                                 | Input             | Expect                                                                 |
| ---------------------------------------------------- | ----------------- | ---------------------------------------------------------------------- |
| `every related id resolves to a card in the catalog` | the live catalog  | every id in `archetype` and `referencedBy` is a known card id           |
| `no card references itself`                          | the live catalog  | no `references` entry of kind `card` has the card's own id              |

File: `website/tests/e2e/related-cards.spec.ts` — delete every assertion keyed on
`#related-interaction`. Keep the archetype-band tests, retargeted at `#related-archetype`.
Add one test: `a card with no references renders no references section` using any card whose
`related.references` is empty.

Run: `cd website && npx vitest run tests/unit/related-graph.test.ts tests/unit/related-cards.test.ts`
then `cd website && npm run build && npm run test:e2e`.

## Impl steps

- [x] 1. In `website/scripts/content/related.mjs`, delete `COLOR_WORDS`,
      `SUPERTYPE_WORDS`, `keywordOccursIn`, `extractClauses`, `parseMv`,
      `parseConstraints`, `matchesConstraints`, `hasNoConstraints`, `assertKnownNames`.
- [x] 2. Add `export function quotedNames(text)`: `normalizeQuotes(text ?? '')`, strip tags
      with `.replace(/<[^>]*>/g, ' ')`, match `/"([^"]+)"/g`, return de-duplicated tokens in
      first-seen order.
- [x] 3. Add a module-private `wordBoundaryTest(token)` returning a case-insensitive
      `RegExp` built as `` new RegExp(`\\b${escapeRegExp(token)}\\b`, 'i') `` with a local
      `escapeRegExp`.
- [x] 4. Change the signature to `export function buildRelatedGraph(cards, sections)` —
      the keyword registry is no longer an input.
- [x] 5. Seed the result as `{ archetype: [], references: [], referencedBy: [] }` per card
      and keep the existing archetype pass exactly as it is today.
- [x] 6. Add the reference pass: for each card, for each token from
      `quotedNames(card.ruleText ?? card.ruleTextPlain)`, apply the four-step resolution
      order from Requirements.
- [x] 7. On an archetype reference, push
      `{ kind: 'archetype', slug: section.slug, label: section.label, route: section.route, count: section.cardIds.length }`
      and append the referencing card's id to every member's `referencedBy`.
- [x] 8. On a card reference, push `{ kind: 'card', id: target.id }` and append the
      referencing card's id to `target.referencedBy`.
- [x] 9. On no match, call
      `fail(\`related: ${card.id} references unknown card/archetype ${JSON.stringify(token)}\`)`.
- [x] 10. After both passes, de-duplicate and sort every `references` array (archetype
      entries before card entries, then by `label` / target `name`) and every
      `referencedBy` array by card name.
- [x] 11. In `website/scripts/content/orchestrator.mjs`, change the call to
      `buildRelatedGraph(cards, sections)` and the fallback object to
      `{ archetype: [], references: [], referencedBy: [] }`.
- [x] 12. In `website/src/lib/catalog.ts`, replace the `related` field type with
      `related: { archetype: string[]; references: CardReference[]; referencedBy: string[] };`
      and add
      `export type CardReference = { kind: 'archetype'; slug: string; label: string; route: string; count: number } | { kind: 'card'; id: string };`
- [x] 13. In `website/src/pages/cards/[id].astro`, replace `interactionRelated` with
      `const references = card.related.references;` and
      `const referencedBy = card.related.referencedBy.map((id) => cardsById.get(id)!).filter(Boolean);`
- [x] 14. Replace the `related-interaction` section with two sections:
      `#related-references` headed `References`, rendering archetype entries as a link to
      `reference.route` labelled `` `${reference.label} (${reference.count} cards)` `` and
      card entries through `CardGallery`; and `#related-referenced-by` headed
      `Referenced by`, rendering `referencedBy.slice(0, RELATED_CAP)` through `CardGallery`
      with `showNewBadge={false}` and the existing `related-more` count line beyond the cap.
- [x] 15. Update the band's render condition to
      `archetypeRelated.length > 0 || references.length > 0 || referencedBy.length > 0`.
- [x] 16. Rewrite the three test files per the test plan.
- [x] 17. Update `docs/related-cards-derivation.html` to describe the quoted-name model,
      and add a superseded note pointing at `docs/ADR/proposed/0040-quoted-name-relations.md`.
- [x] 18. Repair `website/tests/unit/related-badge.test.ts` for the three related
      galleries — criterion: `cd website && npx vitest run` reports no
      `related-badge.test.ts` failure.

## Outputs

- Touched: `website/scripts/content/related.mjs`,
  `website/scripts/content/orchestrator.mjs`, `website/src/lib/catalog.ts`,
  `website/src/pages/cards/[id].astro`, `website/tests/unit/related-graph.test.ts`,
  `website/tests/unit/related-cards.test.ts`, `website/tests/e2e/related-cards.spec.ts`,
  `docs/related-cards-derivation.html`.
- Public shape change: `catalog.cards[].related.interaction` is gone, replaced by
  `references` and `referencedBy`.
- Supersedes ADR 0032 and ADR 0036.

## Validation

- [x] `cd website && npx vitest run` — 771 pass; sole failure is known owner-gated
      `asset-rights.test.ts` baseline, with no T3 regression
- [x] `cd website && npm run content` — exits 0, no `related:` failure on the live corpus
- [x] `node -e` sanity on the built catalog: every card has
      `related.references.length === 0` today, and no `interaction` key remains
- [x] `cd website && npm run check` — no type error from the new union; command retains
      3 unrelated pre-existing `tests/unit/image-cache.test.ts` errors
- [x] `cd website && npm run build` — green; focused `related-cards.spec.ts`
      passes Chromium, Firefox, and WebKit via authorized NixOS shim (15 passed)
- [x] manual check: `/cards/tour-guide-from-the-underworld/` still shows the 13-card
      `Same archetype` block and no empty `References` heading
- [x] commit msg draft: `feat(website): relate cards by the names they print`
