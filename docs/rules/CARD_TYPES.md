# Card types

Card names, types, and subtypes use English.

## Tuner

`Tuner` is a supertype, not subtype/race/class or rules-text ability. Use `Tuner Creature — Fiend` or `Fusion Tuner Creature — Zombie`; never add `(1 - Static) **Tuner**`.

## Extra Deck creatures

Place special type in `super_type` before `Creature`:

- `Fusion Creature`
- `Synchro Creature`
- `Xyz Creature`
- `Link Creature`

These cards begin in Sideboard/Extra Deck. Their first rules line contains italic materials without `Fusion —`, `Synchro —`, `Xyz —`, or `Link —` prefix.

For Xyz, baseline material line is `2 Creatures MV N`, where N equals card mana value, unless design explicitly needs `2+ Creatures` or named materials. Alternative materials belong on separate **Xyz Alternative Cost** line.

## Summon cards

A non-creature explicitly performing special summon places mechanic before Magic type:

- `Ritual Summon Sorcery`
- `Ritual Summon Instant`
- `Fusion Summon Sorcery`
- `Fusion Summon Instant`

Do not repeat mechanic as subtype.

## Trap

`Trap` is English supertype for noncreatures. Put it before Magic type: `Trap Instant`, `Trap Sorcery`, `Trap Enchantment`. It is not keyword, ability, or subtype.

Trap cannot be cast from Hand. Owner may **Set** it face down on Field. Setting does not use Stack, cast card, pay casting cost, or trigger **On Cast**.

Face-down Trap is nonland noncreature permanent with no name, color, mana cost, MV, type, subtype, supertype, ability, power, or toughness. It is not an Enchantment.

Starting next turn, controller may turn it face up and cast from Field any time they could cast Instant, paying costs. Explicit same-turn permission bypasses only wait. Trap Instant/Sorcery goes to Grave after resolution; permanent Trap enters Field face up.

## Face-down creatures

Creatures may be cast face down for normal cost. Face-down creature has no name, color, type, ability, power, or toughness. It cannot Flip during entry turn. Starting next turn, controller may Flip it at sorcery speed. It may be Fusion/Ritual material, not Synchro/Xyz material.
