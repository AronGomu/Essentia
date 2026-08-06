# Yu-Gi-Oh! → Magic conversion

Conversion preserves role and gameplay feel, then balances output for this cube.

## Mana value

| Yu-Gi-Oh! Level | Magic mana value |
| --- | ---: |
| 1–4 | 1 |
| 5–6 | 2 |
| 7+ | 3 |

Baseline applies to Main Deck monsters plus Fusion, Synchro, and Xyz creatures. Ritual monsters remain Main Deck cards. Final mana costs may deviate for cube balance.

## Statistics

Life-total ratio (script: `.script/apply_stat_conversion.py`):

- Power = `floor(ATK * 20 / 8000)` (truncate toward 0).
- Toughness = `max(1, floor(DEF * 20 / 8000))` (truncate toward 0; never 0 toughness).
- Same as ATK/8000 of YGO starting life, scaled to 20 MTG life.
- Examples: 2000 ATK → 5 power; 1900 ATK → 4.75 → 4 power; Cir 1600/1200 → 4/3; 0 DEF → 1 toughness.
- Non-numeric ATK/DEF (`?`, `—` on Links) → leave that MSE field unchanged.
- Re-apply with `python .script/apply_stat_conversion.py --write` after original_cards updates.

## Colors

| Yu-Gi-Oh! Attribute | Magic color |
| --- | --- |
| DARK | Black |
| LIGHT | White |
| WATER | Blue |
| EARTH | Green |
| FIRE | Red |
| WIND | Red, blue, or green according to role |

Color identity also follows mechanical role; attribute mapping is baseline, not permission to violate Magic's color pie without deliberate cube reason.

## Structure

- Recurring long operations become documented keywords.
- Extra Deck cards become Fusion, Synchro, Xyz, or Link Creatures.
- Ritual monsters remain Main Deck Ritual Creatures.
- Explicit summon/material requirements replace Yu-Gi-Oh! engine assumptions.
- Card names, types, and subtypes remain English.
