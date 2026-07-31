# Rules

## Core invariants

- Magic rules are the base rules engine unless this documentation defines a cube override.
- Card text follows adapted Yu-Gi-Oh! PSCT ordering.
- Card-specific text and values live only in MSE.
- Personal zones default to the effect controller; Field is shared.
- Extra Deck and Ritual cards require a proper summon before generic movement effects can put them onto Field.
- `Trap` is a supertype, not a keyword or subtype.
- Sideboard is the compact card-text name for the MSE zone representing the Extra Deck.

## Modules

- [Deck building and mulligan](rules/DECK_BUILDING.md)
- [Zones](rules/ZONES.md)
- [Card types](rules/CARD_TYPES.md)
- [Summoning](rules/SUMMONING.md)
- [Templating and PSCT](rules/TEMPLATING.md)

Keyword definitions live in [KEYWORDS.md](KEYWORDS.md). Archetype exceptions live in archetype `RULES.md` modules linked from [CONTEXT.md](CONTEXT.md).
