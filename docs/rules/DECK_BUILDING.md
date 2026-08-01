# Deck building

## Zones

Main Deck contains normal Main Deck cards, including Ritual Creatures. Sideboard represents Extra Deck for Fusion, Synchro, Xyz, and Link Creatures.

Exact Burning Abyss and Nekroz decklists for Legend of the Alpha Alpha_0.1 live in [`DECKLISTS_ALPHA_0.1.md`](DECKLISTS_ALPHA_0.1.md). Package `release.json` records their stable-card membership; gameplay quantities remain in the decklist.

No project-wide rarity copy limits beyond approved deck metadata are currently defined. Mythic copy limits remain undecided.

## Cube mulligan

Instead of a Magic mulligan, each player may perform this procedure once before game begins:

1. Choose any number of cards from opening hand, including zero.
2. Put chosen cards on bottom of Deck in any order.
3. Draw same number of cards.

Do not shuffle Deck during this procedure.

## Proxy quantities

When release decklists exist, print 3 copies of each distinct card per deck. A card shared by 2 decks receives 6 copies. Ignore gameplay quantity recorded in decklist. Before decklists exist, package print manifest uses 3 copies per distinct package card.
