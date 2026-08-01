# Zones

Canonical card-text zones are `Hand`, `Field`, `Deck`, `Grave`, `Exile`, `Sideboard`, and `Stack`.

## Scope

- Unqualified `Hand`, `Deck`, `Grave`, and `Exile` mean effect controller's corresponding personal zone.
- Specify opponent, any player, or another owner when scope differs.
- Field is shared; it has no controller-default zone shortcut.
- Sideboard is compact card-text name for MSE zone representing Extra Deck.

## Style

Use initial uppercase. Keep standalone zone terms plain. Bold only when term belongs to larger atomic keyword such as **Exile from Grave** or **On Send Grave**.

Always use `Deck`, never `library`. Always use `Grave`, never `graveyard`, `GY`, `GYD`, or `G.Y.`.

## Stack

Spell/ability targets may exist on Stack. Trap activation from Field moves card to Stack and counts as casting from Field.

## Zone movement

- **Search** means Deck → Hand using search/reveal/shuffle shortcut.
- Use **Send** for Deck → Grave.
- Use `Put ... onto Field from Deck` for Deck → Field unless defined **Summon** applies.
- **Salvage** means Grave → Hand.
- **Reanimate** means Grave → Field.
- **Reclaim** means Exile → Hand.
- **Release** means Exile → Field.
- **Bounce** means permanent → owner's Hand.

## Sideboard replacement

If a Fusion, Synchro, Xyz, or Link Creature would move to Hand or Deck, its owner may return it to Sideboard instead. The owner chooses before the card enters the hidden zone. If declined, it moves to the original destination.

Ritual Creatures are unaffected. Movement to other destinations is unaffected.
