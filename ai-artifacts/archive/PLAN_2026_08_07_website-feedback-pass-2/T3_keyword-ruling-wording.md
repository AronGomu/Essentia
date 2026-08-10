# T3: Keyword ruling wording

**Plan:** `./ai-artifacts/PLAN_2026_08_07_website-feedback-pass-2.md`
**Depends:** T2
**Commit outcome:** Twelve keyword rulings carry the author's new wording in the registry, the docs of record and every hover box.

## Context (self-contained)

- Goal: ship feedback batch 2 on the Astro site under `website/`.
- This slice: the feedback section *"Keyword new text rule update — Verify and update
  current text rule if does not match"*, plus *"Nekroz Recovery is Nekroz specific
  archetype keyword. Update it."*, plus the *"Card text effect to update — Burning Abyss
  - Draghig"* verification.
- Out of scope here: adding or removing keywords, renaming terms, changing `category` /
  `origin` / `archetype` / `doc` fields, and any layout work.
- Assumptions in force:
  - **A4** — `nekroz-recovery` is *already* `category: archetype`, `archetype: nekroz` in
    `website/content/keywords.json`. Only its `definition` changes.
  - **A8** — registry terms keep their existing spelling. The feedback's `Salvage 1`,
    `Bounce X`, `Release X`, `Ritual Summon X` map onto the registry terms `Salvage`,
    `Bounce`, `Release`, `Ritual Summon`; `Mill X` → `Mill N`; `Detach X` → `Detach N`;
    `Slow Blink X` → `Slow Blink N Any Creature`.

## What T2 (Depends) produced

`website/scripts/content/packages.mjs` now exposes two parsers — `parseFields` (corrected,
used for all content reads) and `legacyVisualFields` (frozen, feeds `visualSourceHash`
only). Every one of the 50 published cards therefore has non-empty `ruleText`, and
`website/tests/unit/card-text.test.ts` asserts that. Because of this, `extractKeywords`
now sees the **full** bold vocabulary of every card, so a ruling edited here is visible on
card pages and hover boxes for all 50 cards, not just 24.

## Registry facts you need

`website/content/keywords.json` — `schemaVersion: 2`, 73 entries. Loader
`website/scripts/content/keywords.mjs::loadKeywordRegistry` enforces per entry:

- `definition` is a **plain string, trimmed, 20–400 characters, containing no `<` or `>`**.
- `term` must equal `normalizeKeyword(term)` and contain no `<` or `>`.
- `doc` must resolve to an existing file under the repo root.

Curly quotes `“ ”` are already used inside definitions and are safe.

## New definitions (exact strings — copy verbatim)

| id                          | term                        | new `definition`                                                                                                                                                    |
| --------------------------- | --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `mill-n`                    | Mill N                      | `Send N cards from the top of your Deck to the Grave. The quantity is always printed.`                                                                               |
| `detach-n`                  | Detach N                    | `Send N materials from this card to the Grave. Before a colon or semicolon it is a cost; after an event and em dash it is a mandatory triggered action.`              |
| `salvage`                   | Salvage                     | `Return the indicated cards from your Grave to your Hand.`                                                                                                           |
| `bounce`                    | Bounce                      | `Return the indicated permanents to their owner's Hand.`                                                                                                             |
| `slow-blink-n-any-creature` | Slow Blink N Any Creature   | `Exile N permanents. At the next end step, Return them onto the Field under their owner's control.`                                                                  |
| `abyssal-curse`             | Abyssal Curse               | `If you control another creature not named “Burning Abyss”, this creature destroys itself.`                                                                          |
| `descent`                   | Descent                     | `Alternative Cast: at any time you could cast a sorcery, if you have not cast or summoned a “Burning Abyss” creature this turn, you may cast this card from your Hand without paying its mana cost.` |
| `ritual-summon`             | Ritual Summon               | `Put a Ritual creature onto the Field, paying the ritual cost stated by the Ritual Summon effect.`                                                                    |
| `nekroz-recovery`           | Nekroz Recovery             | `Activated Sorcery: if you control no creatures, Exile this card and 1 other “Nekroz” from the Grave; Search 1 non-Creature “Nekroz” Ritual Summon.`                  |
| `after-attack-or-block`     | After Attack or Block       | `Event: the next time you gain priority after combat damage resolves.`                                                                                               |
| `attach`                    | Attach                      | `Move the indicated card from the stated zone to become material of the named Xyz creature, without destroying it.`                                                   |
| `release`                   | Release                     | `Summon the indicated card from Exile onto the Field. Proper-summon rules apply.`                                                                                     |

## Docs of record to keep in sync

| Keyword                    | File                                    | Anchor                              |
| -------------------------- | --------------------------------------- | ----------------------------------- |
| Mill N                     | `docs/keywords/ACTIONS.md`              | `### Mill N`                        |
| Salvage / Release          | `docs/keywords/ACTIONS.md`              | `### Salvage / Reclaim / Release`   |
| Attach / Detach N          | `docs/keywords/ACTIONS.md`              | `### Attach / Detach N`             |
| Bounce                     | `docs/keywords/ACTIONS.md`              | `### Bounce`                        |
| Slow Blink N Any Creature  | `docs/keywords/ACTIONS.md`              | `### Slow Blink N Any Creature`     |
| After Attack or Block      | `docs/keywords/EVENTS.md`               | line 16 bullet `- **After Attack or Block** —` |
| Ritual Summon              | `docs/keywords/COSTS_AND_PROCEDURES.md` | `## Ritual Summon`                  |
| Descent, Abyssal Curse     | `docs/01_burning_abyss/KEYWORDS.md`     | `## Descent`, `## Abyssal Curse`    |
| Nekroz Recovery            | `docs/03_nekroz/KEYWORDS.md`            | `## Nekroz Recovery`                |

Docs are written in the repo's clipped caveman register; rewrite each section so its
meaning matches the new definition without importing the definition's full sentence
verbatim where the doc style differs.

## Burning Abyss - Draghig verification

`cards_mse/01_alpha/LOTA-0001-Alpha_0.1/01_YGO_Legend_of_the_Alpha.mse-set/card burning abyss - draghig`
already reads:

```
	rule_text:
		<i-auto>(1 - Static)</i-auto> <b>Abyssal Curse</b>
		<i-auto>(2 - Activated Hard Linked)</i-auto> <b>Descent</b>
		<i-auto>(3 - Triggered Hard Linked)</i-auto> <b>On Send Grave</b> — <b>Discard</b> <sym-auto>1</sym-auto>, then <b>Draw</b> 1.
```

That already matches the feedback's target; the parenthetical reminder text in the
feedback is supplied by the `abyssal-curse` / `descent` rulings above. **Do not edit the
MSE file.** Add a regression assertion instead (step 6). If the assertion fails, stop and
report — editing `cards_mse/` invalidates render provenance (see ADR 0021) and is out of
scope for this ticket.

## Inputs

- `website/content/keywords.json`, `website/scripts/content/keywords.mjs`.
- `website/src/lib/catalog.ts` — `keywordsByTerm`, `essentiaKeywordsByTerm`, `essentiaKeywordsFor`.
- `website/src/layouts/BaseLayout.astro` lines 50-63 — serialises `origin === 'essentia'`
  rulings into `<script type="application/json" id="keyword-rulings">`.
- `tests/test_burning_abyss_cards.py`, `tests/test_necroz_cards.py` — existing Python
  suites that read `docs/**/KEYWORDS.md`; they must stay green.
- **From Depends (T2):** `website/scripts/content/packages.mjs` exports `parseFields` and
  `legacyVisualFields`; all 50 cards have rule text; `website/tests/unit/card-text.test.ts` exists.

## Check plan

| Test                                        | Input                                | Expect                                                               |
| ------------------------------------------- | ------------------------------------ | -------------------------------------------------------------------- |
| `matches the authored ruling wording`       | `keywordsByTerm`                     | each of the 12 terms' `definition` equals the exact string above      |
| `keeps Nekroz Recovery archetype-scoped`    | `keywordsByTerm.get('Nekroz Recovery')` | `category === 'archetype'` and `archetype === 'nekroz'`             |
| `keeps every ruling within the schema`      | `catalog.keywords`                   | every `definition` length 20-400 and matches `/^[^<>]+$/`             |
| `serialises the updated Bounce ruling`      | `catalog.keywords`                   | `essentiaKeywordsFor({keywords:['Bounce']})[0].definition` = new text |
| `Draghig prints the three authored lines`   | the MSE card file                    | `rule_text` block equals the 3 lines quoted above                     |

## TDD

1. **Red** — add `website/tests/unit/keyword-rulings.test.ts` (rows 1-4) and a
   `test_draghig_rule_text_matches_spec` case in `tests/test_burning_abyss_cards.py` (row 5).
   Run both; the 4 vitest rows fail, the Python row should already pass.
2. **Green** — edit `website/content/keywords.json`, rebuild content, rerun.
3. **Refactor** — sync the docs of record; rerun the whole Python suite.

## Impl steps

- [x] 1. Create `website/tests/unit/keyword-rulings.test.ts`. Import
      `{ catalog, keywordsByTerm, essentiaKeywordsFor } from '../../src/lib/catalog'`.
      Define `const EXPECTED: Record<string, string>` keyed by term with the 12 strings.
- [x] 2. Add `test_draghig_rule_text_matches_spec` to `tests/test_burning_abyss_cards.py`,
      reading the card file with `encoding="utf-8-sig"` and asserting the three
      `\t\t`-indented lines are present in order.
- [x] 3. Run `cd website && npx vitest run tests/unit/keyword-rulings.test.ts` — confirm red.
- [x] 4. Edit the 12 `definition` values in `website/content/keywords.json`. Change nothing else.
- [x] 5. Run `cd website && node scripts/build-content.mjs` — expect `73 keywords`, no failure.
- [x] 6. Run `cd website && npx vitest run tests/unit/keyword-rulings.test.ts` — green.
- [x] 7. Rewrite `### Mill N` in `docs/keywords/ACTIONS.md` to `Send N cards from top of Deck to Grave.`
      keeping the existing mandatory-quantity paragraph.
- [x] 8. In `docs/keywords/ACTIONS.md`, under `### Salvage / Reclaim / Release`, change the
      `**Release**` bullet to `**Release**: Summon from Exile onto Field; proper-summon rules apply.`
- [x] 9. In `docs/keywords/ACTIONS.md`, under `### Attach / Detach N`, change the **Attach**
      paragraph to `**Attach** moves indicated card from stated zone to become material of named Xyz Creature, without destroying it.`
      and the **Detach N** first sentence to `**Detach N** sends N materials from this card to Grave.`
- [x] 10. In `docs/keywords/ACTIONS.md`, under `### Bounce`, change the body to
      `Return indicated permanent(s) to owner's Hand.`
- [x] 11. In `docs/keywords/ACTIONS.md`, under `### Slow Blink N Any Creature`, change the
      body to `` `**Exile** N permanents; at next end step **Return** them onto Field under owner's control.` ``
- [x] 12. In `docs/keywords/EVENTS.md` line 16, change the bullet to
      `- **After Attack or Block** — next time you gain priority after combat damage resolves.`
- [x] 13. In `docs/keywords/COSTS_AND_PROCEDURES.md` under `## Ritual Summon`, change the
      first sentence to `Named procedure puts Ritual Creature onto Field, paying ritual cost stated by the Ritual Summon effect.`
      Keep the remaining sentences.
- [x] 14. In `docs/01_burning_abyss/KEYWORDS.md`, set `## Descent` body to
      `Alternative Cast: at any time you could cast a sorcery, if you have not cast or summoned a *“Burning Abyss”* creature this turn, **Cast** this card from Hand without paying its mana cost.`
      and `## Abyssal Curse` body to
      `“If you control another creature not named *“Burning Abyss”*, this creature **Destroy**s itself.”`
- [x] 15. In `docs/03_nekroz/KEYWORDS.md`, set `## Nekroz Recovery` body to
      `**Nekroz Recovery** means: “Activated Sorcery: if you control no creatures, **Exile** this card and 1 other *“Nekroz”* from Grave; **Search** 1 non-Creature **Ritual Summon** *“Nekroz”*.”`
- [x] 16. Run `python -m unittest discover -s tests`. If `test_necroz_cards.py` or
      `test_burning_abyss_cards.py` assert on the old doc wording, update those assertions
      to the new wording (they are documentation mirrors, not behaviour).
- [x] 17. Run `python .script/lint_mse_card_style.py`.
- [x] 18. Run `cd website && npm run format && npm run ci`.

## Outputs

- Touched: `website/content/keywords.json`, `docs/keywords/ACTIONS.md`,
  `docs/keywords/EVENTS.md`, `docs/keywords/COSTS_AND_PROCEDURES.md`,
  `docs/01_burning_abyss/KEYWORDS.md`, `docs/03_nekroz/KEYWORDS.md`,
  `website/tests/unit/keyword-rulings.test.ts` (new), `tests/test_burning_abyss_cards.py`.
- Behaviour: hover ruling boxes, `/cards/<id>/` reminder tooltips and the docs corpus all
  carry the new wording. `cards_mse/` unchanged.

## Validation

- [x] `cd website && npx vitest run tests/unit/keyword-rulings.test.ts` — 4 passed
- [x] `python -m unittest discover -s tests` — no NEW failures vs baseline (baseline: 50 failures/5 errors on 120 tests; after: 50 failures/5 errors on 121 tests, the extra test being the new passing `test_draghig_rule_text_matches_spec`)
- [x] `python .script/lint_mse_card_style.py` — no NEW findings vs baseline (249 findings before and after this ticket's edits; exit code 1 both times, pre-existing per parent instructions, cards_mse/ untouched)
- [x] `cd website && npm run ci` — exit 0
- [x] manual (automated equivalent — asserted on built `dist/` output instead of live browser
      hover): `grep -o 'id="keyword-rulings">.*Descent.*' website/dist/cards/burning-abyss-draghig/index.html`
      shows `Abyssal Curse` and `Descent` new sentences serialized into the hover-ruling JSON;
      `grep -o 'Send N cards from top of Deck to Grave' website/dist/docs/keywords/actions/index.html`
      confirms the docs route renders the new Mill N text
- [x] app functional — content build still reports `73 keywords`
      (`node scripts/build-content.mjs` output: `content: 1 releases, 3 sections, 50 current cards, 50 versions, 73 keywords, 38 docs, 1 posts`)
- [x] commit msg draft: `docs(keywords): restate twelve rulings in the authored wording`
      (used verbatim in commit `194906a`)
