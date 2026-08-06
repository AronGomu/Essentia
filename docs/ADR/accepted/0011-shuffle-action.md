# 0011 — Shuffle action

- Date: 2026-08-02
- Status: Accepted
- Scope: Global compact **Shuffle** base action
- Review: `.tmp/update-rules/2026-08-02-shuffle-action-rule-proposals.html`

## Context

Nekroz - Brionac ability 2 requested `**Shuffle** it` instead of `shuffle it into its owner’s Deck`. The same long destination prose appears on Virgil, Daigusto Emeral, Spellbook Library of the Crescent, and Fiend Griefing. The closed action catalog had no **Shuffle** entry.

`normalize=false`, so this decision updates the action-keyword owner only; MSE cards and card-specific tests remain unchanged until a later normalization pass.

## Decisions

### R1 — Compact **Shuffle** action

- Outcome: **ACCEPT**
- Final rule: Add **Shuffle** to the closed base-action catalog. **Shuffle** puts indicated object(s) into their owner’s Deck, then shuffles that Deck. Omit `into Deck` / `owner’s Deck` / `your Deck`. Bold forms: `**Shuffle** it`, `**Shuffle** them`, `**Shuffle** [selector]`.
- Evidence: Brionac `card nekroz - brionac:20`; Virgil, Daigusto Emeral, Spellbook Library of the Crescent, Fiend Griefing long shuffle-into-Deck prose; `docs/keywords/ACTIONS.md` catalog lacked **Shuffle**; **Search** already embeds post-search Deck randomization separately.
- Rationale: Destination and owner are fixed by the action definition, so destination phrases are redundant. Bold catalog membership matches other base actions.
- Boundaries recorded in owner def: not a substitute for **Search** internal shuffle; plain “shuffle Deck” with no moving objects stays ordinary instruction; not Hand/Grave/Exile/Sideboard; Sideboard replacement still applies when Fusion/Synchro/Xyz/Link would move to Deck.
- Impact: `docs/keywords/ACTIONS.md`; Brionac, Virgil, Daigusto Emeral, Spellbook Library of the Crescent, Fiend Griefing, and related tests during future normalization.

## Changed rule owners

- `docs/keywords/ACTIONS.md`

## Normalization scope

None. Review used `normalize=false`. Nekroz - Brionac and other MSE cards, generated website data, renders, and card-specific tests were not changed.

## Validation

- `git diff --check`: passed
- Stale/duplicate rule search: passed; active owner catalogs **Shuffle** with compact destination defaults; long `shuffle … into … Deck` forms remain only in historical ADR evidence or deferred MSE/card tests
- `python -m unittest tests.test_update_rules_skill`: passed
- Changed-script compile: not applicable; no scripts changed
