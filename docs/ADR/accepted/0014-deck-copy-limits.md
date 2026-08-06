# ADR 0014 — Deck copy limits

- Date: 2026-08-06
- Status: Accepted
- Scope: deck legality, deck building rules, future rarity system

## Context

`docs/rules/DECK_BUILDING.md` stated that no project-wide rarity copy limits were defined and that "Mythic copy limits remain undecided". No rarity system exists in the project: no card carries a rarity field, and no rule module defines rarity tiers. Leaving the limit undecided blocked deck validation while providing no design benefit, because the shipped Alpha_0.1 decklists already encode the constraint.

## Decision

1. No rarity-based copy limits exist. Rarity is not a deck-building input.
2. A deck may contain at most **2 copies of a distinct card**. The limit applies per deck and counts Main Deck plus Sideboard together.
3. Basic lands are exempt, per Magic's unlimited-basics rule. They are not cube cards: they carry no stable ID and no package membership.
4. If a rarity system ships later, mythic starts at **1 copy per deck**. That starting value is not in force today and takes effect only with the rarity system.
5. Any change to these limits requires a future ADR.

## Evidence

`docs/rules/DECKLISTS_ALPHA_0.1.md` never lists more than 2 copies of any cube card. Both Alpha_0.1 decks are built entirely on 2-of and 1-of lines; the only larger counts are the basic-land mana bases (`14 Swamp`, `14 Island`), which have no entry in `cards_mse/01_alpha/LOTA-0001-Alpha_0.1/release.json` `decks[]` and no MSE card.

## Consequences

- Deck validation can enforce a fixed limit of 2 without waiting on a rarity design.
- `docs/rules/DECK_BUILDING.md` states the decided rule and links here instead of recording an open question.
- Introducing rarity is a separate decision; it inherits the mythic-at-1 starting point recorded here and must be ratified by its own ADR.
