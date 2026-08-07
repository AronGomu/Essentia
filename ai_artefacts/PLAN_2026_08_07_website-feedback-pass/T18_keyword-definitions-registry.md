# T18: Keyword definitions registry

**Plan:** `./ai_artefacts/PLAN_2026_08_07_website-feedback-pass.md`
**Depends:** T1
**Commit outcome:** every one of the 73 registered keywords carries a one-sentence ruling, an origin (Magic evergreen vs Essentia-specific), and a back-reference to its owning doc, and the build fails if a keyword is added without them.

## Context (self-contained)

- Goal: ship the UX feedback backlog in `.dev/feedback.md`. Two items need keyword rule text at render time: **Cards #2** ("For card effect: after keyword, add (rule text of keyword from rules)") and **Card Hover** ("add 1 rounded border textbox for each essentia specific keyword with actual text ruling").
- This slice: the data only. T19 renders it inside card text; T20 renders it in the hover preview.
- Out of scope here: any page, component, or style change; a `/keywords/` index route; changing the closed-taxonomy build failure for unknown bold phrases.
- Assumptions in force: definitions are authored in `website/content/keywords.json`, not parsed out of `docs/keywords/*.md` — only 16 of the 73 terms have a machine-locatable definition block today. Each entry carries a `doc` path so the narrative docs stay the source of record. See `docs/ADR/proposed/0015-keyword-definitions-in-registry.md`.

## Requirements

- `website/content/keywords.json` goes to `schemaVersion: 2`; every entry gains `definition`, `origin`, `doc`.
- `definition`: plain text, 20–400 characters, no HTML, no leading/trailing whitespace.
- `origin`: `'magic'` (a Magic evergreen whose meaning is unchanged) or `'essentia'` (defined by this project).
- `doc`: repo-relative path to the owning documentation file; the build fails when the file does not exist.
- `CatalogKeyword` gains the three fields; nothing else about the keyword pipeline changes.

## Inputs

- `website/content/keywords.json` — `{ schemaVersion: 1, source: "…", keywords: [{ id, term, category, archetype? }] }`, 73 entries, `category` ∈ `action | event | ability | cost-procedure | archetype`.
- `website/scripts/content/keywords.mjs` — `CATEGORIES` set; `normalizeQuotes`, `normalizeKeyword(phrase)` (folds a standalone integer or `X` token to `N`), `splitComposite(phrase)` (splits on ` and ` / ` & `), `loadKeywordRegistry()` which validates each entry and returns a `Map` keyed by `term`, and `extractKeywords(ruleText, registry, source)` which fails the build on an unknown bold phrase. Add the new field validation inside `loadKeywordRegistry`.
- `website/scripts/content/orchestrator.mjs` — near line 188: `const keywords = [...keywordRegistry.values()].map((entry) => ({ id: entry.id, term: entry.term, category: entry.category, archetype: entry.archetype ?? null }));`. Extend that projection.
- `website/src/lib/catalog.ts` — `export interface CatalogKeyword { id: string; term: string; category: 'action'|'event'|'ability'|'cost-procedure'|'archetype'; archetype: string | null }` plus `export const keywordsByTerm`.
- `website/tests/unit/keywords.test.ts` — existing suite over `normalizeKeyword`, `splitComposite`, `extractKeywords`. Extend it.
- Owning docs: `docs/keywords/ACTIONS.md`, `docs/keywords/EVENTS.md`, `docs/keywords/ABILITIES.md`, `docs/keywords/COSTS_AND_PROCEDURES.md`, `docs/01_burning_abyss/KEYWORDS.md`, `docs/02_shaddoll/KEYWORDS.md`, `docs/03_nekroz/KEYWORDS.md`, `docs/04_spellbook/KEYWORDS.md`.
- **From Depends (T1):** `npm run preflight` passes. Nothing else consumed.

## TDD

1. **Red** — add the cases below to `website/tests/unit/keywords.test.ts`. They fail.
2. **Green** — extend the validator, then author all 73 entries, then extend the catalog projection and types.
3. **Refactor** — none.

Validator additions inside `loadKeywordRegistry()`, with exact messages:

- `content: keyword registry must use schemaVersion 2` when `data.schemaVersion !== 2`
- `content: keyword <id>: definition must be 20-400 plain-text characters` when `definition` is missing, not a string, trimmed length outside 20–400, or matches `/[<>]/`
- `content: keyword <id>: origin must be magic or essentia`
- `content: keyword <id>: doc <path> does not exist` when `ROOT/<doc>` is not a readable file

## Authoritative registry content

Author every entry exactly as below. `EVENTS` = `docs/keywords/EVENTS.md`, `ACTIONS` = `docs/keywords/ACTIONS.md`, `ABILITIES` = `docs/keywords/ABILITIES.md`, `COSTS` = `docs/keywords/COSTS_AND_PROCEDURES.md`, `BA` = `docs/01_burning_abyss/KEYWORDS.md`, `SD` = `docs/02_shaddoll/KEYWORDS.md`, `NK` = `docs/03_nekroz/KEYWORDS.md`, `SB` = `docs/04_spellbook/KEYWORDS.md`.

| id | origin | doc | definition |
| --- | --- | --- | --- |
| `abyssal-curse` | essentia | BA | If you control another creature without “Burning Abyss” in its name, Destroy this creature. |
| `after-attack-or-block` | essentia | EVENTS | The first legal trigger window after combat damage involving this creature resolves. It does not occur if the creature leaves combat first. |
| `alternative-cost` | essentia | COSTS | An unnumbered casting cost printed before the abilities that replaces the normal cost when its stated condition is met. |
| `attach` | essentia | ACTIONS | Make the indicated card material under the indicated Xyz creature. |
| `bounce` | essentia | ACTIONS | Return the indicated permanent to its owner's Hand. |
| `bounded-n` | essentia | ABILITIES | This card is the bounder: its controller chooses up to N other creatures they control, which become bounded. The link lasts only while the bounder stays on the Field. |
| `cast` | magic | ACTIONS | Put a spell on the Stack and pay its cost. Reserved for spells; never used for a Summon. |
| `counter` | magic | ACTIONS | Cancel a spell or ability on the Stack; it resolves for no effect and goes to the Grave. |
| `descent` | essentia | BA | Sorcery-speed activated ability: if you have not summoned a “Burning Abyss” creature this turn, Summon this card from your Hand. |
| `destroy` | magic | ACTIONS | Send the indicated permanent to the Grave as a destruction event, so On Destroy triggers fire. |
| `detach-n` | essentia | ACTIONS | Send N materials from an Xyz creature to the Grave. Before a colon or semicolon it is a cost; after an event and em dash it is a mandatory triggered action. |
| `discard` | magic | ACTIONS | Put the indicated card from your Hand into the Grave. |
| `double-strike` | magic | ABILITIES | Magic evergreen: this creature deals both first-strike and regular combat damage. |
| `draw` | magic | ACTIONS | Put the top card of your Deck into your Hand. |
| `effect-indestructible` | essentia | ABILITIES | This creature cannot be destroyed by a spell or ability. Combat damage and non-effect destruction still destroy it. |
| `exile` | magic | ACTIONS | Move the indicated card to the Exile zone. |
| `exile-from-grave` | essentia | ACTIONS | Compound cost: activate this ability only from the Grave, exiling this card from the Grave as part of the cost. |
| `exile-n-plant-from-grave` | essentia | ACTIONS | Cost: exile N Plant cards from your Grave. |
| `flip` | essentia | EVENTS | Event: a face-down creature turns face up. |
| `flying` | magic | ABILITIES | Magic evergreen: this creature can be blocked only by creatures with Flying or Reach. |
| `fusion-alternative-cost` | essentia | COSTS | An Alternative Cost line that replaces the normal Fusion materials with the stated payment and still performs a proper Fusion Summon. |
| `fusion-summon` | essentia | COSTS | Named procedure that puts a Fusion creature onto the Field from the Sideboard using the stated materials and zones. |
| `hand-summon` | essentia | ACTIONS | Summon from your Hand: put the card onto the Field without casting it or paying its mana cost. Proper-summon restrictions still apply. |
| `haste` | magic | ABILITIES | Magic evergreen: this creature can attack and use tap abilities the turn it enters. |
| `hexproof` | magic | ABILITIES | Magic evergreen: this card cannot be targeted by opponents' spells or abilities. |
| `indestructible` | magic | ABILITIES | Magic evergreen: this permanent cannot be destroyed by damage or by destruction effects. |
| `mill-n` | magic | ACTIONS | Send the top N cards of your Deck to the Grave. The quantity is always printed. |
| `negate` | essentia | ACTIONS | Target a permanent, spell, or ability: a permanent loses its abilities and its abilities on the Stack are countered; a spell or ability is countered. |
| `nekroz-recovery` | essentia | NK | If you control no creatures: Exile this card and 1 other “Nekroz” from the Grave; Search 1 non-Creature Ritual Summon “Nekroz”. |
| `on-block-or-blocked` | essentia | EVENTS | Event: this creature blocks or becomes blocked. |
| `on-blocked` | essentia | EVENTS | Event: this creature becomes blocked. |
| `on-cast-spellbook` | essentia | SB | Event: you cast a “Spellbook” spell, before it resolves. |
| `on-destroy` | essentia | EVENTS | Event: this card is destroyed and sent to the Grave. |
| `on-end-step` | essentia | EVENTS | Event: the beginning of your end step. It recurs while the card stays on the Field. |
| `on-enter` | essentia | EVENTS | Event: this card enters the Field. |
| `on-enter-or-mv2-opponent-creature-enter` | essentia | EVENTS | Event: this card enters the Field, or an opponent's creature of mana value 2 or greater enters. |
| `on-enter-synchro` | essentia | EVENTS | Event: a Synchro creature enters under your control, including this card. |
| `on-exile` | essentia | EVENTS | Event: this card is exiled from any zone. |
| `on-fusion-summon` | essentia | EVENTS | Event: a Fusion creature enters through its own Fusion Summon. Generic movement does not trigger it. |
| `on-leave-field` | essentia | EVENTS | Event: this card leaves the Field. |
| `on-link-summon` | essentia | EVENTS | Event: a Link creature enters through its own Link Summon. Generic movement does not trigger it. |
| `on-opponent-activation-or-attack` | essentia | EVENTS | Event: an opponent activates an ability or declares an attack. Activation means an ability on the Stack, not a spell cast. |
| `on-opponent-creature-enter` | essentia | EVENTS | Event: a creature enters under an opponent's control. |
| `on-opponent-summon` | essentia | EVENTS | Event: an opponent performs a Summon action. Casting a creature normally does not count. |
| `on-sacrifice` | essentia | EVENTS | Event: this card is sacrificed, or used as Ritual creature material. |
| `on-send-grave` | essentia | EVENTS | Event: this card enters the Grave from any zone. |
| `on-send-grave-by-effect` | essentia | EVENTS | Event: a card effect puts this card into the Grave. Costs, rules actions, and combat do not count. |
| `on-upkeep` | essentia | EVENTS | Event: the start of your upkeep, unless the card names the opponent's. |
| `protection-from-creatures` | magic | ABILITIES | Magic evergreen: this permanent cannot be damaged, enchanted, blocked, or targeted by creatures. |
| `protection-from-everything` | magic | ABILITIES | Magic evergreen: this permanent cannot be damaged, enchanted, blocked, or targeted by anything. |
| `reanimate` | essentia | ACTIONS | Return the target card from its Grave to the Field. Proper-summon rules still apply. |
| `reclaim` | essentia | ACTIONS | Move the indicated card from Exile to your Hand. |
| `release` | essentia | ACTIONS | Move the indicated card from Exile to the Field. Proper-summon rules apply. |
| `return` | magic | ACTIONS | Move the indicated card back to the stated zone. |
| `reveal` | magic | ACTIONS | Show the indicated card to all players, then return it to where it was unless told otherwise. |
| `ritual-summon` | essentia | COSTS | Named procedure that puts a Ritual creature onto the Field using the stated materials and conditions. |
| `sacrifice` | magic | ACTIONS | Send a permanent you control to the Grave, as a cost or as an effect. |
| `salvage` | essentia | ACTIONS | Move the indicated card from your Grave to your Hand. |
| `scry-n` | magic | ACTIONS | Magic evergreen: look at the top N cards of your Deck, then put any number of them on the bottom and the rest back on top in any order. |
| `search` | essentia | ACTIONS | Search your Deck for the named object, reveal it when required, put it into your Hand, then shuffle. |
| `send` | essentia | ACTIONS | Move the indicated card to the Grave from the stated zone without destroying it. |
| `set` | essentia | ACTIONS | Put a card face down on the Field under Trap or explicit rules. Setting does not use the Stack, cast the card, pay its cost, or trigger On Cast. |
| `shaddoll-recovery` | essentia | SD | On Send Grave — Salvage 1 non-Creature “Shaddoll”. |
| `shuffle` | essentia | ACTIONS | Put the indicated objects into their owner's Deck, then shuffle that Deck. |
| `slow-blink-n-any-creature` | essentia | ACTIONS | Target 0 to N creatures; Exile them until the next end step, then Return them to the Field under their owner's control. |
| `spell-affinity` | essentia | SB | If you control 1 “Spellbook” creature you may Cast this spell for free. Usable once each turn, and only on a “Spellbook” Sorcery. |
| `summon` | essentia | ACTIONS | Put the indicated card onto the Field from the stated zone without casting it or paying its mana cost. Proper-summon restrictions still apply. |
| `target` | magic | ACTIONS | Choose the legal object an effect will apply to, when the effect is announced. Targeting is never a cost. |
| `this-turn-on-end-step` | essentia | EVENTS | A one-shot delayed instruction created during resolution that happens at your end step this turn, then expires. |
| `trample` | magic | ABILITIES | Magic evergreen: excess combat damage is assigned to the defending player. |
| `vigilance` | magic | ABILITIES | Magic evergreen: this creature does not tap when attacking. |
| `ward-n` | magic | ABILITIES | Magic evergreen: when this permanent becomes the target of an opponent's spell or ability, counter it unless they pay N. |
| `xyz-alternative-cost` | essentia | COSTS | Line that replaces the normal Xyz materials: it uses the indicated creature as material, performs a proper Xyz Summon, and states any material transfer. |

Curly quotes (`“ ”`) above are intentional — they mirror the printed card text.

## Test plan

| Test | Input | Expect |
| ---- | ----- | ------ |
| `every registered keyword has a definition` | `await loadKeywordRegistry()` | all 73 entries have a `definition` of trimmed length 20–400 |
| `every registered keyword has an origin` | same | every `origin` ∈ `{'magic','essentia'}` |
| `every doc path exists` | same | every `doc` resolves to an existing file under the repo root |
| `rejects schemaVersion 1` | registry fixture with `schemaVersion: 1` | throws `content: keyword registry must use schemaVersion 2` |
| `rejects a short definition` | entry with `definition: 'too short'` | throws containing `definition must be 20-400 plain-text characters` |
| `rejects HTML in a definition` | `definition: 'a <b>bold</b> definition here'` | throws containing `definition must be 20-400 plain-text characters` |
| `rejects an unknown origin` | `origin: 'konami'` | throws containing `origin must be magic or essentia` |
| `rejects a missing doc` | `doc: 'docs/NOPE.md'` | throws containing `doc docs/NOPE.md does not exist` |
| `catalog exposes the new fields` | `catalog.keywords[0]` | has `definition`, `origin`, `doc` |
| `counts the keyword origins` | `catalog.keywords` grouped by `origin` | `magic` = 22, `essentia` = 51, total 73 |

Run: `cd website && npx vitest run tests/unit/keywords.test.ts`

## Impl steps

- [x] 1. Add the ten cases above to `website/tests/unit/keywords.test.ts`.
      _Criterion:_ `npx vitest run tests/unit/keywords.test.ts` reports the ten new case names and they fail (red). **Met:** `Tests  10 failed | 11 passed (21)`.
- [x] 2. Add the four validations to `loadKeywordRegistry()` in `website/scripts/content/keywords.mjs`, importing `ROOT` from `./shared.mjs` for the doc existence check.
      _Criterion:_ the four negative-fixture cases (`rejects schemaVersion 1`, `rejects a short definition`, `rejects HTML in a definition`, `rejects an unknown origin`, `rejects a missing doc`) pass. **Met:** all five reject-cases green in `Tests  21 passed (21)`.
- [x] 3. Rewrite `website/content/keywords.json`: set `schemaVersion` to `2`, replace the `source` note with `"authored registry; definitions mirror the owning docs listed per entry"`, and add `definition`, `origin`, `doc` to all 73 entries using the table above verbatim.
      _Criterion:_ `node -e` over the file reports 73 entries, `schemaVersion === 2`, 22 `magic` + 51 `essentia`, and every `definition` trimmed length inside 20–400. **Met:** `entries 73 origins { essentia: 51, magic: 22 }`, `definition length min/max 34 166`, `untrimmed or angle-bracketed 0`; a row-by-row diff against this ticket's table reported `ALL 73 ROWS MATCH THE TICKET TABLE VERBATIM`.
- [x] 4. Extend the `keywords` projection in `website/scripts/content/orchestrator.mjs` with `definition: entry.definition, origin: entry.origin, doc: entry.doc`.
      _Criterion:_ after `npm run content:check`, `src/generated/catalog.ts` contains `"definition"`, `"origin"` and `"doc"` inside the `keywords` array. **Met:** `grep -c '"definition":'` = 73, `grep -c '"doc":'` = 73.
- [x] 5. Add `definition: string; origin: 'magic' | 'essentia'; doc: string;` to `CatalogKeyword` in `website/src/lib/catalog.ts`.
      _Criterion:_ `npm run check` (astro check) exits 0.
- [x] 6. Add `export const essentiaKeywordsByTerm = new Map(catalog.keywords.filter((keyword) => keyword.origin === 'essentia').map((keyword) => [keyword.term, keyword]));` beside the existing `keywordsByTerm`.
      _Criterion:_ the export exists in `website/src/lib/catalog.ts` and `npm run check` exits 0. **Met:** export present; see step 8.
- [x] 7. Add one sentence to `docs/KEYWORDS.md` under `## Closed taxonomy` stating that the website's per-keyword ruling text lives in `website/content/keywords.json` and must agree with the owning module named in each entry's `doc` field.
      _Criterion:_ `grep -n 'website/content/keywords.json' docs/KEYWORDS.md` matches. **Met:** matches at `docs/KEYWORDS.md:13`.
- [x] 8. Run `npm run content:check`, `npm run build`, `npm run format`, `npm run lint`, `npm run check`.
      _Criterion:_ every one of the five commands exits 0. **Met:** `content:check` -> `73 keywords`; `build` -> `151 page(s) built`, `BUILD_EXIT=0`; `format` clean; `lint` (eslint) silent; `check` (astro) -> `0 errors / 0 warnings`.

## Outputs

- Files touched: `website/content/keywords.json`, `website/scripts/content/keywords.mjs`, `website/scripts/content/orchestrator.mjs`, `website/src/lib/catalog.ts`, `website/tests/unit/keywords.test.ts`, `docs/KEYWORDS.md`.
- Public API: `CatalogKeyword.definition | origin | doc`, `essentiaKeywordsByTerm` — consumed by T19 and T20.
- Migration: keyword registry schemaVersion 1 → 2.

## Validation

- [x] `cd website && npx vitest run tests/unit/keywords.test.ts` — 10 passed
      **Met:** `Tests  21 passed (21)` = the 10 new cases plus the 11 pre-existing ones in the file.
- [x] `cd website && npm run content:check` — exit 0, `73 keywords` in the summary line
      **Met:** `content: 1 releases, 3 sections, 50 current cards, 50 versions, 73 keywords, 38 docs, 1 posts`.
- [x] `cd website && npm run build` — exit 0
      **Met:** `BUILD_EXIT=0`, `151 page(s) built`, gates: `dist scan: clean`, `404: redirects to site root`, `chrome: 151 pages carry the site header`.
- [x] manual check: `node -e "const c=require('./src/generated/catalog.ts')"` is not valid — instead run `grep -c '"origin": "essentia"' src/generated/catalog.ts` and confirm `51`, and `grep -c '"origin": "magic"' src/generated/catalog.ts` and confirm `22`
      **Met:** `51` and `22` exactly; also `grep -c '"definition":'` = 73 and `grep -c '"doc":'` = 73.
- [x] `cd website && npm run ci` — exit 0
      **Met:** `CI_EXIT=0`, `Tests  202 passed (202)`, astro `0 errors / 0 warnings`.
- [x] catalog shape changed → `CATALOG_SCHEMA_VERSION` bumped 6 → 7 in `website/scripts/content/orchestrator.mjs`, `Catalog.schemaVersion` in `website/src/lib/catalog.ts`, and the assertion in `website/tests/unit/catalog.test.ts` (parent-directed addendum; the ticket predates the catalog reaching v6). **Met:** generated catalog carries `"schemaVersion": 7`; `npm run ci` exit 0.
- [x] app functional — no visible page change; card text still renders and the closed-taxonomy build failure still triggers on an unknown bold phrase.
      _Criterion (no browser/e2e harness on this host — static-equivalent substitution):_ inspect built `dist/**/index.html` for unchanged rendered card rule text, and prove the closed-taxonomy failure by temporarily pointing `extractKeywords` at an unknown bold phrase and observing the `unknown keyword` build failure.
      **Met:** `dist/cards/ash-blossom-and-joyous-spring/index.html` still renders `<div class="rules-text"><em>(1 - Activated Flash Hard)</em> <strong>Discard</strong> Ash Blossom and <strong>Target</strong> ... <strong>Mill X</strong> ... <strong>Counter</strong> it.</div>` — bold keywords only, no ruling text injected (that is T19). `grep -rl '"definition"|"origin":' dist --include=*.html` returns 0 pages, so no registry-only field leaked into any rendered page. Closed taxonomy probe: `extractKeywords('<b>Wibble Flomp</b>', registry, 'probe-card')` -> `content: probe-card: unknown keyword "Wibble Flomp" - add it to content/keywords.json or fix the card text`, while `<b>Discard</b> and <b>Mill 3</b>` -> `[ 'Discard', 'Mill N' ]`.
- [ ] commit msg draft: `feat(website): give every keyword a ruling, an origin and an owning doc`
      _Criterion:_ commit created on `plan/website-feedback-pass` with that subject.
