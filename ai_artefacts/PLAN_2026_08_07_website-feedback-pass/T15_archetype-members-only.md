# T15: Archetype members only

**Plan:** `./ai_artefacts/PLAN_2026_08_07_website-feedback-pass.md`
**Depends:** T1
**Commit outcome:** an archetype section contains only cards whose printed name carries the archetype pattern, plus any card explicitly linked in the identity registry; every other support card moves to the non-archetype section while keeping its archetype affinity for the related-cards rule.

## Context (self-contained)

- Goal: ship the UX feedback backlog in `.dev/feedback.md`. Feedback **Archetype #4**: "Remove all support cards from archetypes. Archetypes only contains card with archetype name or explicitly linked."
- This slice: the identity registry, its validation, and the section-resolution rule. No page changes.
- Out of scope here: the archetype page layout (T16) and the card page's related list (T21). Both consume the data this ticket reshapes.
- Assumptions in force: no card is explicitly linked today, so all 14 `role: support` cards move to the non-archetype section. `archetype` and `role` stay on those cards — they carry the affinity that T21 uses.

## Requirements

- `website/content/identities.json` entries may carry `"linked": true` (optional, boolean, `role: "support"` only).
- Section membership becomes: `role === 'member'` → its archetype section; `role === 'support'` and `linked === true` → its archetype section; everything else → the non-archetype section.
- The build fails on `linked` set for a `member` or `staple` card.
- The counts move: non-archetype grows by the number of published unlinked support cards; each archetype shrinks accordingly.

## Inputs

- `website/content/identities.json` — `schemaVersion: 3`, `cards: [{ archetype, retired, role, routeAliases, sources, stableId, withdrawn, supports? }]`. Fourteen entries currently have a non-null `archetype` with `role: "support"`: `absolute-king-back-jack`, `beatrice-lady-of-the-eternal`, `crane-crane`, `curse-of-the-shadow-prison`, `fiend-griefing`, `fiendish-rhino-warrior`, `high-priestess-of-prophecy`, `justice-of-prophecy`, `manju-of-the-ten-thousand-hands`, `mathematician`, `preparation-of-rites`, `senju-of-the-thousand-hands`, `sinister-shadow-games`, `tour-guide-from-the-underworld`.
- `website/scripts/content/identity.mjs` — `ROLES = new Set(['member','support','staple'])`; `loadRegistries()` validates each card and already fails when `archetype === null` without `role: 'staple'`, when a staple sets an archetype, or when `supports` names an unknown slug. `assertMembership(identity, cardName, registry)` cross-checks the printed name against every `namePatternRe`. `resolveSection(identity, registry)` currently returns `registry.nonArchetype` when `!identity.archetype` and the archetype section otherwise — **this is the function to change**.
- `website/scripts/content/packages.mjs` — calls `resolveSection` while building each card version; the returned section drives `sectionSlug`, `sectionLabel`, `sectionAccent`, `sectionRoute`.
- `website/scripts/content/orchestrator.mjs` — `sections.push({...})` builds `count`, `cardIds`, `latestModified` from `cards.filter((card) => card.sectionSlug === section.slug)`.
- `website/tests/unit/archetype.test.ts` — existing suite covering membership rules; extend it.
- `website/content/sections.json` — `iconicId` per section. `spellbook`'s iconic is `high-priestess-of-prophecy`, which is a **support** card and will move out of the spellbook section. The orchestrator already falls back to `sectionCards[0]` when the iconic id is not in the section, so the build stays green, but set `spellbook`'s `iconicId` to `spellbook-magician-of-prophecy` if such a member exists, otherwise leave it and let the fallback apply. Verify with `node -e "…"` against `src/generated/catalog.ts` before deciding.
- **From Depends (T1):** `npm run preflight` passes. Nothing else consumed.

## TDD

1. **Red** — add the cases below to `website/tests/unit/archetype.test.ts` against `resolveSection` and `assertLinked`. They fail.
2. **Green** — add `linked` validation and change `resolveSection`.
3. **Refactor** — none.

Exact API change in `website/scripts/content/identity.mjs`:

```js
/** Fails when `linked` is present on a card that is not an authored support card. */
export function assertLinked(identity)

/**
 * Section membership: printed-name members always sit in their archetype;
 * support cards only when explicitly linked; everything else is non-archetype.
 */
export function resolveSection(identity, registry) {
  const inArchetype = identity.role === 'member' || (identity.role === 'support' && identity.linked === true);
  if (!inArchetype || !identity.archetype) return registry.nonArchetype;
  const section = registry.sectionsBySlug.get(identity.archetype);
  if (!section) fail(`${identity.stableId}: unresolved archetype ${identity.archetype}`);
  return section;
}
```

`assertLinked` failure messages (exact):

- `content: identity <stableId>: linked must be a boolean` when present and not a boolean
- `content: identity <stableId>: linked is support-only` when `linked === true` and `role !== 'support'`

## Test plan

| Test | Input | Expect |
| ---- | ----- | ------ |
| `keeps a named member in its archetype` | `resolveSection({ stableId:'nekroz-trishula', role:'member', archetype:'nekroz' }, registry)` | section slug `nekroz` |
| `moves an unlinked support card out` | `resolveSection({ stableId:'tour-guide-from-the-underworld', role:'support', archetype:'burning-abyss' }, registry)` | section slug `non-archetype` |
| `keeps an explicitly linked support card` | same identity plus `linked: true` | section slug `burning-abyss` |
| `keeps staples in non-archetype` | `{ role:'staple', archetype:null }` | section slug `non-archetype` |
| `rejects linked on a member` | `assertLinked({ stableId:'x', role:'member', linked:true })` | throws `content: identity x: linked is support-only` |
| `rejects a non-boolean linked` | `assertLinked({ stableId:'x', role:'support', linked:'yes' })` | throws `content: identity x: linked must be a boolean` |
| `allows linked absent` | `assertLinked({ stableId:'x', role:'support' })` | does not throw |
| `archetype sections hold only members` | real catalog after rebuild: for every `kind === 'archetype'` section, every card id resolves to an identity with `role === 'member'` or `linked === true` | passes |

Run: `cd website && npx vitest run tests/unit/archetype.test.ts`

## Impl steps

- [x] 1. Add the eight cases above to `website/tests/unit/archetype.test.ts`.
- [x] 2. Add `assertLinked` to `website/scripts/content/identity.mjs` and call it inside the card loop of `loadRegistries()`, right after the `ROLES` check.
- [x] 3. Replace the body of `resolveSection` with the version above.
- [x] 4. Run `npm run content:check` and record the new per-section counts printed by the summary line.
- [x] 5. Inspect `src/generated/catalog.ts` for the spellbook section's resolved `iconicId`; if the fallback picked something unrepresentative, set `iconicId` in `website/content/sections.json` to a published spellbook **member** and re-run.
- [x] 6. Add a one-paragraph note to `docs/CONTEXT.md` under `## Archetype documentation` stating that a website archetype section lists printed-name members plus explicitly linked support cards, and that support cards otherwise live in the non-archetype section while keeping their archetype affinity.
- [x] 7. Run `npm run build`, `npm run links:check`, `npm run format`, `npm run lint`, `npm run check`.

## Outputs

- Files touched: `website/scripts/content/identity.mjs`, `website/tests/unit/archetype.test.ts`, `docs/CONTEXT.md`, and `website/content/sections.json` only if step 5 requires it. `website/content/identities.json` changes only if a card is deliberately linked — none is, by default.
- Behaviour: archetype section membership narrows; non-archetype grows; `sectionSlug` on affected cards changes, which changes their gallery placement (their `/cards/<id>/` route is unchanged).
- Migration: none. `identities.json` schemaVersion stays `3`; `linked` is an optional additive key.

## Validation

- [x] `cd website && npx vitest run tests/unit/archetype.test.ts` — all pass (20/20)
- [x] `cd website && npm run content:check` — exit 0; the published support cards now count under non-archetype (`content: 1 releases, 3 sections, 50 current cards...`; non-archetype=22, burning-abyss=13, nekroz=15)
- [x] `cd website && npm run build && npm run links:check` — exit 0 (151 pages; `links: 151 pages clean`)
- [x] manual check (no browser harness on this host; substituted with static inspection of built `dist/**/index.html` per parent instruction): `dist/archetypes/burning-abyss/index.html` card-grid links are exactly the 13 printed-name Burning Abyss cards — Tour Guide From the Underworld and Beatrice are not among them (Beatrice is not published in this catalog at all, so it cannot appear anywhere)
- [x] manual check (same static substitution): `dist/sections/non-archetype/non-archetype/index.html` now lists `tour-guide-from-the-underworld` among its 22 cards
- [x] `cd website && npm run ci` — exit 0 (22 test files / 181 tests passed)
- [x] app functional — every card page still resolves at its original route (verified for all 4 published support cards among the 14 listed in Inputs: `manju-of-the-ten-thousand-hands`, `preparation-of-rites`, `senju-of-the-thousand-hands`, `tour-guide-from-the-underworld`; the other 10 are not published in this catalog)
- [ ] commit msg draft: `feat(website): restrict archetype sections to members and linked support cards`
