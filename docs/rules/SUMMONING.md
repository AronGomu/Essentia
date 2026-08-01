# Summoning

## Proper summon requirement

Fusion, Synchro, Xyz, Ritual, and Link Creatures cannot be cast or put onto Field until first put onto Field by method specific to type.

Proper summon means:

- Fusion Creature via Fusion Summon;
- Synchro Creature via Synchro Summon;
- Xyz Creature via Xyz Summon;
- Ritual Creature via Ritual Summon;
- Link Creature via Link Summon.

A direct effect does not bypass requirement unless it performs matching summon or says `ignoring the restrictions of summon`. That permission makes movement legal but does not count as proper summon. After proper summon, card may return by other means subject to card/rule restrictions.

## Generic movement

**Summon**, **Hand Summon**, **Reanimate**, and **Release** do not bypass proper-summon requirement. Never infer `ignoring the restrictions of summon`; explicit card design decision required.

Fusion, Synchro, Xyz, and Link Creature movement to Hand or Deck follows optional owner replacement in [`ZONES.md`](ZONES.md).

## Ritual

**Ritual Summon** puts one or more Ritual Creatures onto Field using stated materials/conditions. Material mana value equals Ritual Creature mana value by default; card may explicitly allow greater/equal payment. Multiple creatures use plural agreement.

## Fusion

**Fusion Summon** puts Fusion Creature onto Field from Sideboard using stated materials/zones. First line lists italic materials without `Fusion —`.

## Synchro

Summon from Sideboard using 1 Tuner plus one or more non-Tuners whose total MV matches Synchro MV. Material line places Tuner first: `*1 Tuner + 1+ non-Tuner*`.

## Xyz

Summon from Sideboard with indicated number of creatures of same MV. Place materials under Xyz Creature. Baseline line: `*2 Creatures MV N*`. **Xyz Alternative Cost** fully replaces normal materials, uses stated creature as material, performs proper Xyz Summon, and states material transfer when required.

## Link

Summon from Sideboard using indicated number/properties. Link level belongs in type (`Link Lvl 4 Creature`); first line lists only materials.

## Material rules

- Sideboard creature material line never repeats summon type.
- `different` means material names must differ.
- Face-down creatures may be Fusion/Ritual material, not Synchro/Xyz material.
