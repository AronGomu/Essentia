# Project context

Yu-Gi-Oh! × Magic adapts Yu-Gi-Oh! identities into an English Magic: The Gathering cube.

## Sources of truth

- Card name, rules text, mana cost, type, rarity, statistics, artwork references, and frame live only in folder-form Magic Set Editor projects under [`cards_mse/`](../cards_mse/).
- Draft and pre-stage projects are mutable. ALPHA, BETA, and Release packages are immutable after commit.
- Documentation defines reusable design and rules. It must not reproduce card-by-card values.
- The website reads immutable packages and never writes MSE source.
- Stable IDs, release dates, deck membership, and content URLs may live in metadata when they do not duplicate MSE card fields.
- Official Yu-Gi-Oh! records and source illustrations remain under [`original_cards/`](../original_cards/) and [`original_images/`](../original_images/).

## Documentation map

- [Design](DESIGN.md)
  - [Conversion](design/CONVERSION.md)
  - [Balance](design/BALANCE.md)
  - [Frames](design/FRAMES.md)
- [Rules](RULES.md)
  - [Deck building](rules/DECK_BUILDING.md)
  - [Zones](rules/ZONES.md)
  - [Card types](rules/CARD_TYPES.md)
  - [Summoning](rules/SUMMONING.md)
  - [Templating](rules/TEMPLATING.md)
- [Keywords](KEYWORDS.md)
  - [Actions](keywords/ACTIONS.md)
  - [Events](keywords/EVENTS.md)
  - [Abilities](keywords/ABILITIES.md)
  - [Costs and procedures](keywords/COSTS_AND_PROCEDURES.md)
- [Release lifecycle](RELEASES.md)
- [MSE authoring](MSE.md)
- [Architecture decisions](ADR/README.md)

## Archetype documentation

| Archetype | Context | Design | Rules | Keywords |
| --- | --- | --- | --- | --- |
| Burning Abyss | [Context](10_burning_abyss/CONTEXT.md) | [Design](10_burning_abyss/DESIGN.md) | [Rules](10_burning_abyss/RULES.md) | [Keywords](10_burning_abyss/KEYWORDS.md) |
| Shaddoll | [Context](11_shaddoll/CONTEXT.md) | [Design](11_shaddoll/DESIGN.md) | [Rules](11_shaddoll/RULES.md) | [Keywords](11_shaddoll/KEYWORDS.md) |
| Nekroz | [Context](12_nekroz/CONTEXT.md) | [Design](12_nekroz/DESIGN.md) | [Rules](12_nekroz/RULES.md) | [Keywords](12_nekroz/KEYWORDS.md) |
| Spellbook | [Context](13_spellbook/CONTEXT.md) | [Design](13_spellbook/DESIGN.md) | [Rules](13_spellbook/RULES.md) | [Keywords](13_spellbook/KEYWORDS.md) |

Non-archetype groups are storage/type buckets. Shared Fusion, Synchro, Xyz, Link, Ritual, and Trap rules remain global.

## Language

Canonical content is English. Card names, types, subtypes, and archetype names remain English. Full official Yu-Gi-Oh! names stay in `original_cards/`; MSE `name:` stores the cube name. When documentation must show a mapping, use `[original name] => [cube name]`.

French archive content was intentionally removed. No French counterpart or archive maintenance policy applies.

## Change ownership

- Reusable project-wide rule → global owner above.
- Archetype identity, constraint, exception, or keyword → matching archetype module.
- Card-specific value → MSE only.
- Proposed decision → `docs/ADR/proposed/`.
- Accepted decision evidence → `docs/ADR/accepted/`.

Create an archetype `CHANGELOG.md` only after a released archetype changes. Do not create empty changelogs.
