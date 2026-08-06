# Deck building

## Zones

Main Deck contains normal Main Deck cards, including Ritual Creatures. Sideboard represents Extra Deck for Fusion, Synchro, Xyz, and Link Creatures.

Exact Burning Abyss and Nekroz decklists for Legend of the Alpha Alpha_0.1 live in [`DECKLISTS_ALPHA_0.1.md`](DECKLISTS_ALPHA_0.1.md). Package `release.json` records their stable-card membership; gameplay quantities remain in the decklist.

## Copy limits

No rarity-based copy limits exist. A deck may contain at most 2 copies of a distinct card, counting Main Deck and Sideboard together. Basic lands are exempt and stay unlimited.

If a rarity system ships later, mythic starts at 1 copy per deck. See [ADR 0014](../ADR/accepted/0014-deck-copy-limits.md).

## Cube mulligan

Instead of a Magic mulligan, each player may perform this procedure once before game begins:

1. Choose any number of cards from opening hand, including zero.
2. Put chosen cards on bottom of Deck in any order.
3. Draw same number of cards.

Do not shuffle Deck during this procedure.

## Proxy quantities

Print 2 copies of each distinct package card. This count is uniform: gameplay quantity recorded in a decklist never changes it, and a card shared by several decks still gets 2 copies.

Per-card exceptions use `--copies-for "Card Name=N"`. `N` of 0 omits that card from the print run, and a name matching no card fails the run instead of being ignored.

Print command and its remaining flags live in [`docs/MSE.md`](../MSE.md#printing).
