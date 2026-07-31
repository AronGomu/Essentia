# Design

## Goal

Create original Yu-Gi-Oh!-inspired cards playable under Magic: The Gathering rules. Adapt role, pace, and gameplay identity rather than translating literally.

## Principles

- Keep familiar archetype identity inside Magic's rules engine.
- Balance against this closed cube, not normal Limited.
- Support several actions per turn, rapid development, Extra Deck play, and strong interaction.
- Prevent infinite loops and non-interactive endings.
- Convert repeated long effects into documented cube keywords.
- Give Extra Deck cards explicit summon requirements.
- Keep card-by-card design values in MSE only.

## Modules

- [Yu-Gi-Oh! → Magic conversion](design/CONVERSION.md)
- [Power level and balance](design/BALANCE.md)
- [Validated MSE frames](design/FRAMES.md)

Archetype-specific identities and constraints live in each archetype's `DESIGN.md`; see [project context](CONTEXT.md#archetype-documentation).
