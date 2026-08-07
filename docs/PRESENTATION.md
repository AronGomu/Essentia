# Essentia

**YGO × MTG: Essentia** adapts Yu-Gi-Oh! cards into English Magic: The Gathering cards. The name says the goal: keep the essence of Yu-Gi-Oh! — the archetypes, the lines of play, the feel of a turn — inside Magic's card-game rules.

## The idea

A Yu-Gi-Oh! card and a Magic card answer different rules questions. Essentia rewrites each card so that a Magic player can resolve it with no extra rulebook, while a Yu-Gi-Oh! player still recognises what the card does and why the archetype wants it.

- ATK and DEF convert to power and toughness; level converts to mana cost; attribute converts to colour.
- Effects are rewritten in Magic templating, using a closed keyword vocabulary so nothing depends on a private ruling.
- The Extra Deck becomes the sideboard. Fusion, Synchro, Xyz, Link, and Ritual keep their summoning identity as named procedures.

## What is published here

Cards are authored in Magic Set Editor and released in packages. This site publishes only Alpha, Beta, and Release packages, never drafts, and shows the current version of each card together with its release history.

- [Archetypes](/) — the published card gallery, grouped by archetype.
- [Rules](/rules/) — how the cube plays.
- [Card updates](/updates/) — everything that changed, newest first.

## How to play

Essentia is a cube. Build 40 cards plus a 10-card Extra Deck, two copies maximum of any card, and proxy the renders on this site. Deck-building rules live in [Deck building](rules/DECK_BUILDING.md); the starter decklists shipped with the first package live in [Legend of the Alpha decklists](rules/DECKLISTS_ALPHA_0.1.md).

## Reading the documentation

- [Project context](CONTEXT.md) — sources of truth and change ownership.
- [Design](DESIGN.md) and [Conversion](design/CONVERSION.md) — how a Yu-Gi-Oh! card becomes a Magic card.
- [Rules](RULES.md) — zones, card types, summoning, templating.
- [Keywords](KEYWORDS.md) — the closed vocabulary printed in bold on cards.
- [Release lifecycle](RELEASES.md) — how a card moves from draft to release.

Everything created for this project is free to use, modify, and redistribute, including commercially. Yu-Gi-Oh! and Magic: The Gathering remain property of their respective owners.
