# T9: Related graph in the catalog

**Plan:** `./ai-artifacts/PLAN_2026_08_10_feedback_batch.md`
**Depends:** none
**Commit outcome:** every card in `src/generated/catalog.ts` carries
`related: { archetype: string[], interaction: string[] }`, computed once per content
build, and the build fails on an unresolvable characteristic token.

## Context (self-contained)

- Goal: `feedback.md` item 8 — related cards must come in two categories: same
  archetype by printed name, and cards this card can interact with directly (Tour Guide
  summons a Fiend, so every Fiend is related).
- This slice: the derivation and its place in the generated catalog. No page changes.
- Out of scope here: the card page UI (T10), the hover box, the old `relatedCards()`
  helper (T10 deletes it), `cardVersions` entries.
- Assumptions in force: computed in the content build and embedded in `catalog.ts`, no
  separate cache file; unresolvable token = build failure; zero-match reference is legal.

## Requirements

- New module `website/scripts/content/related.mjs`, exporting:
  - `buildRelatedGraph(cards, sections)` → `Map<cardId, { archetype: string[], interaction: string[] }>`
  - `extractClauses(ruleTextPlain)` → `string[]`, split on `.`, `;`, `—`
  - `parseConstraints(clause, vocab)` → `{ subtypes, names, colors, supertypes, mv }`
- **Category 1 — archetype.** For a card whose `archetype` is `a`, every other card whose
  `name` contains the `namePattern` of section `a`, case-insensitive, quote-normalised.
  A card with `archetype === null` gets `[]`.
- **Category 2 — interaction.** For each clause of `ruleTextPlain`:
  - the clause is considered **only** when it contains at least one of the card's own
    action keywords (`card.keywords` ∩ registry entries with `category === 'action'` or
    `'cost-procedure'`). This is what keeps Xyz material lines (`2 Creatures MV 1`) from
    relating every MV-1 creature to every Xyz card.
  - constraints collected from the clause: `subtype` (one of the 14 race words in the
    catalog's `subType` vocabulary), `name` (any `“…”` quoted run), `color`
    (`white|blue|black|red|green`), `supertype` (`Ritual|Xyz|Fusion|Synchro|Link|Trap`),
    `mv` (`MV <int>` / `MV X`, optional `or less` / `or more` suffix).
  - a candidate card matches the clause when it satisfies **every** constraint kind
    present in that clause; the union over clauses, minus the card itself, is the
    interaction list.
- Both lists are sorted by card name and stored as stable ids, uncapped. Capping is a
  presentation concern and belongs in T10.
- **Build failures**, thrown through the existing `fail()` helper from
  `scripts/content/shared.mjs`:
  - a quoted run that matches neither a section `namePattern` nor any card `name`
    (substring, quote-normalised, case-insensitive);
  - an `MV` token followed by anything other than an integer, `X`, or the word `meets`
    (`whose MV meets its Ritual cost` is prose and must stay legal).
- `catalog.schemaVersion` 10 → 11. `CatalogCard` in `src/lib/catalog.ts` gains
  `related: { archetype: string[]; interaction: string[] }`.

## Inputs

- `website/scripts/content/orchestrator.mjs`: builds `cards`, `sections`, `keywords`,
  then the `catalog` object literal at line ~211, then `writeAtomic(GENERATED_SOURCE/catalog.ts …)`.
  `CATALOG_SCHEMA_VERSION` lives in `scripts/content/shared.mjs`.
- `website/scripts/content/shared.mjs`: `fail(message)` aborts the build.
- `website/shared/keywords.mjs`: `normalizeQuotes()` folds `“ ” ‘ ’` to straight quotes.
- Card fields available per card: `id`, `name`, `archetype`, `subType`, `types`,
  `supertypes`, `colors`, `manaValue`, `keywords`, `ruleTextPlain`.
- Section fields: `slug`, `kind`, `namePattern` (e.g. `Burning Abyss`, `Nekroz`).
- Catalog vocabulary today: subtypes `Aqua, Bird, Dragon, Fairy, Fiend, Human, Insect,
  Machine, Psychic, Rock, Warrior, Wizard, Wyrm, Zombie`; quoted runs include card-name
  fragments (`“Dante”`, `“Barbar”`, `“Maxx”`, `“C”`) as well as archetype names.
- Reference case: `tour-guide-from-the-underworld`, rule text
  `(1 - Triggered Hard) On Enter — Summon 1 Fiend MV 1 Creature from Hand or Deck. It loses its abilities on Field.`
  → clause 1 holds action `Summon`, constraints `{subtype: Fiend, mv: 1}`.
- **From Depends:** none.

## TDD

1. **Red** — write `website/tests/unit/related-graph.test.ts` against fixtures **and**
   against the real generated catalog.
2. **Green** — implement `related.mjs`, wire it into the orchestrator, bump the schema.
3. **Refactor** — keep `buildRelatedGraph` pure: it takes arrays, touches no filesystem.

## Test plan

| Test | Input | Expect |
| --- | --- | --- |
| `extractClauses splits on sentence punctuation` | `'A — b. c; d'` | `['A','b','c','d']` (trimmed, empties dropped) |
| `parseConstraints reads a subtype and an MV` | `'Summon 1 Fiend MV 1 Creature from Deck'` | `{subtypes:['Fiend'], mv:{op:'=',value:1}, names:[], colors:[], supertypes:[]}` |
| `parseConstraints accepts "MV 2 or less"` | `'Search 1 Ritual Creature MV 2 or less'` | `mv:{op:'<=',value:2}`, `supertypes:['Ritual']` |
| `parseConstraints leaves "MV meets" alone` | `'…whose MV meets its Ritual cost'` | `mv === null`, no throw |
| `unknown quoted run fails the build` | fixture card with `“Zorblax”`, no such card | throws, message contains `Zorblax` |
| `malformed MV fails the build` | `'Summon 1 Creature MV soon'` | throws, message contains `MV` |
| `archetype category uses the printed name` | real catalog, `burning-abyss-graff` | every id in `related.archetype` resolves to a card whose `name` contains `Burning Abyss`; `burning-abyss-graff` not in its own list |
| `Tour Guide relates to every Fiend it can summon` | real catalog | `cardsById.get('tour-guide-from-the-underworld').related.interaction` contains `burning-abyss-graff` and `burning-abyss-cir` |
| `material lines do not create relations` | real catalog, `downerd-magician` (`2+ Creatures MV 1`, no action keyword in that clause) | that clause contributes nothing; assert `related.interaction` excludes a plain MV-1 vanilla creature that shares no other constraint |
| `a card never relates to itself` | real catalog, all cards | no card id appears in its own two lists |
| `schema version is 11` | real catalog | `catalog.schemaVersion === 11` |

## Impl steps

- [ ] 1. Create `website/scripts/content/related.mjs` with `extractClauses`,
      `parseConstraints`, `buildRelatedGraph`, and module-level constants
      `COLOR_WORDS = { white: 'W', blue: 'U', black: 'B', red: 'R', green: 'G' }` and
      `SUPERTYPE_WORDS = ['Ritual','Xyz','Fusion','Synchro','Link','Trap']`.
- [ ] 2. Build the subtype vocabulary inside `buildRelatedGraph` from the cards' own
      `subType` fields — never a hardcoded race list, so a new race cannot silently miss.
- [ ] 3. Implement the two failure paths through `fail()` from `./shared.mjs`.
- [ ] 4. In `orchestrator.mjs`, after `cards` and `sections` are final and before the
      `catalog` literal, add
      `const related = buildRelatedGraph(cards, sections);` and attach it:
      `for (const card of cards) card.related = related.get(card.id) ?? { archetype: [], interaction: [] };`
- [ ] 5. Bump `CATALOG_SCHEMA_VERSION` in `scripts/content/shared.mjs` from 10 to 11.
- [ ] 6. In `src/lib/catalog.ts`, add `related: { archetype: string[]; interaction: string[] }`
      to `CatalogCard` and change `schemaVersion: 10` to `11` on the `Catalog` interface.
- [ ] 7. Create `website/tests/unit/related-graph.test.ts` per the test plan. Import the
      module under test with `await import('../../scripts/content/related.mjs')`, matching
      how `tests/unit/content-orchestrator.test.ts` loads build modules.
- [ ] 8. Run `npm run content` and eyeball the two lists for `tour-guide-from-the-underworld`
      and `nekroz-cycle` before committing.
- [ ] 9. Add `docs/ADR/proposed/0032-derived-related-cards.md` and link it from
      `docs/ADR/README.md`.

## Outputs

- `website/scripts/content/related.mjs`, `website/scripts/content/orchestrator.mjs`,
  `website/scripts/content/shared.mjs`, `website/src/lib/catalog.ts`,
  `website/tests/unit/related-graph.test.ts`,
  `docs/ADR/proposed/0032-derived-related-cards.md`, `docs/ADR/README.md`.
- Public shape change: `catalog.schemaVersion === 11`; each card carries `related`.
- `relatedCards()` in `src/lib/catalog.ts` still exists and still powers the card page
  until T10 replaces it — the site keeps working on this commit.

## Validation

- [ ] `cd website && npx vitest run tests/unit/related-graph.test.ts` → pass
- [ ] `cd website && npm run content` → exits 0, prints the one-line content summary
- [ ] `cd website && npx vitest run` → 0 failures (existing `related-cards.test.ts` untouched)
- [ ] `cd website && npm run ci` → pass
- [ ] app functional — card pages still render their current related list
- [ ] commit msg draft: `feat(website): derive archetype and interaction relations in the content build`
