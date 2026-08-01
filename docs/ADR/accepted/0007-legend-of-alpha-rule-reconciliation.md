# ADR 0007 — Legend of Alpha rule reconciliation

- Date: 2026-08-01
- Status: Accepted
- Scope: General templating, events, zones, summoning, plus Nekroz keyword invocation
- Source review: `2026-08-01-01-ygo-legend-of-alpha-rule-proposals`

## Context

Legend of Alpha cards exposed five reusable conflicts between live MSE text and documented rules:

- Alich and Clausolas set ability-less creatures to 0/1, while old templating fixed every reset at 0/0.
- Scarm nests `On End Step` inside an `On Send Grave` resolution.
- Downerd Magician uses undocumented `After Attack or Block` timing.
- Brionac, Calcab, and Virgil can move Extra Deck card types toward Hand or Deck.
- Nekroz Cycle, Kaleidoscope, and Mirror invoke `Nekroz Recovery` as their complete numbered ability body.

Two HTML decision rounds resolved exact semantics. No MSE normalization was requested.

## Decisions

### D1 — Independent ability loss and power/toughness setting

- Outcome: **REVISE**
- Rule owner: `docs/rules/TEMPLATING.md`
- Evidence:
  - `cards_mse/01_pre_alpha/01_legend_of_alpha/01_YGO_Legend_of_Alpha.mse-set/card burning abyss - alich:21`
  - `cards_mse/01_pre_alpha/01_legend_of_alpha/01_YGO_Legend_of_Alpha.mse-set/card nekroz - clausolas:20`
- Final rule:
  - Ability loss and power/toughness setting are independent instructions.
  - Ability loss alone does not change power or toughness.
  - When both apply, use `The target Creature loses all its abilities and becomes P/T until the end of the turn.`
  - Choose P/T per effect. A temporary-negation effect not intended as removal uses toughness 1 or greater, so its P/T instruction does not cause death solely through 0 toughness.
- Rationale: Temporary negation is not implicit removal. Alich and Clausolas intentionally use 0/1 because 0 toughness would cause death under Magic rules.
- Impact: Future effects may negate abilities without changing stats, set stats without removing abilities, or state both actions.

### D4 — Same-turn nested delayed events

- Outcome: **REVISE**
- Rule owners: `docs/rules/TEMPLATING.md`, `docs/keywords/EVENTS.md`
- Evidence:
  - `cards_mse/01_pre_alpha/01_legend_of_alpha/01_YGO_Legend_of_Alpha.mse-set/card burning abyss - scarm:21`
  - Previous recurring and delayed forms in `docs/keywords/EVENTS.md`
- Final rule: A defined event nested in an effect's resolution creates a one-shot delayed instruction at the next matching event this turn, then expires. If no match occurs, it expires at turn end. Recurrence or a future turn must be explicit. A standalone event ability remains recurring.
- Canonical form: `**Primary Event** — **Secondary Event**, instruction.`
- Rationale: Resolution instructions are non-recurring unless text explicitly grants recurrence or future-turn duration.
- Impact: Scarm's nested end-step instruction occurs once this turn. Generic standalone `On End Step` remains recurring.

### D5 — After Attack or Block timing

- Outcome: **REVISE**
- Rule owner: `docs/keywords/EVENTS.md`
- Evidence: `cards_mse/01_pre_alpha/01_legend_of_alpha/01_YGO_Legend_of_Alpha.mse-set/card downerd magician:23`
- Final rules:
  - `After [action]` is a one-shot event at the first legal trigger window after that action fully resolves.
  - `After Attack or Block` occurs at the first legal trigger window after combat damage involving this Creature resolves.
  - It does not occur if this Creature leaves combat before dealing or receiving combat damage.
- Rationale: `After` marks post-resolution timing, distinct from declaration-time `On Attack or Block`.
- Impact: Downerd Magician detaches after combat damage, not when attack/block is declared.

### D8 — Optional owner Sideboard replacement

- Outcome: **REVISE**
- Rule owner: `docs/rules/ZONES.md`; `docs/rules/SUMMONING.md` links to owner
- Evidence:
  - `cards_mse/01_pre_alpha/01_legend_of_alpha/01_YGO_Legend_of_Alpha.mse-set/card nekroz - brionac:20`
  - `cards_mse/01_pre_alpha/01_legend_of_alpha/01_YGO_Legend_of_Alpha.mse-set/card burning abyss - calcab:21`
  - `cards_mse/01_pre_alpha/01_legend_of_alpha/01_YGO_Legend_of_Alpha.mse-set/card burning abyss - virgil:20`
- Final rule: If a Fusion, Synchro, Xyz, or Link Creature would move to Hand or Deck, its owner may return it to Sideboard instead. The owner chooses before the card enters the hidden zone. If declined, it moves to the original destination.
- Boundaries: Ritual Creatures and other destination zones are unaffected.
- Rationale: This uses a Commander-style optional replacement rather than Yu-Gi-Oh!'s mandatory Extra Deck return.
- Impact: Bounce and Deck movement retain normal destinations unless owner chooses Sideboard replacement.

### D9 — Complete custom keyword as numbered ability body

- Outcome: **ACCEPT**
- Rule owners: `docs/rules/TEMPLATING.md`, `docs/03_nekroz/KEYWORDS.md`
- Evidence:
  - `cards_mse/01_pre_alpha/01_legend_of_alpha/01_YGO_Legend_of_Alpha.mse-set/card nekroz - cycle:20`
  - `cards_mse/01_pre_alpha/01_legend_of_alpha/01_YGO_Legend_of_Alpha.mse-set/card nekroz - kaleidoscope:20`
  - `cards_mse/01_pre_alpha/01_legend_of_alpha/01_YGO_Legend_of_Alpha.mse-set/card nekroz - mirror:20`
  - Complete `Nekroz Recovery` definition in `docs/03_nekroz/KEYWORDS.md`
- Final rule: A numbered ability may consist solely of a documented archetype custom keyword when that keyword defines the complete effect. Bodyless base actions and event keywords remain invalid. Cards outside the owning archetype print the full effect.
- Rationale: Burning Abyss, Spellbook, and Nekroz already use rules-bearing archetype keywords to keep cards concise.
- Impact: Existing bodyless `Nekroz Recovery` invocations remain valid; its existing archetype definition is authoritative.

## Rejected alternatives

- D1: mandatory 0/0 resets; combined-only ability-loss/stat-setting rule.
- D4: delayed event waiting across future turns by default.
- D5: declaration-time trigger; generic combat-end trigger without combat damage; specific event with no reusable `After [action]` rule.
- D8: mandatory Sideboard return; controller-selected replacement.
- D9: requiring every owning-archetype card to print full custom-keyword body text.

## Changed rule owners

- `docs/rules/TEMPLATING.md`
- `docs/keywords/EVENTS.md`
- `docs/rules/ZONES.md`
- `docs/rules/SUMMONING.md`

`docs/03_nekroz/KEYWORDS.md` already contained complete `Nekroz Recovery`; no wording change was needed.

## Normalization

- Requested: `false`
- MSE cards changed by this decision application: none

## Validation

- `python -m unittest tests.test_update_rules_skill` — 9 passed.
- `python -m unittest tests.test_necroz_cards tests.test_burning_abyss_cards` — 14 passed.
- `git diff --check` on changed rule, ADR, and test files — passed.
- Stale mandatory-0/0, future-turn nested-event, and mandatory Sideboard-return rule search — no matches.
