# Validated MSE frames

Frames follow card supertype, never archetype.

| Card supertype | MSE stylesheet | Render size |
| --- | --- | --- |
| Normal/other card | `sevenhalf` | 750 × 1046 |
| Fusion Creature | `genevensis-00-main` | 750 × 1046 |
| Xyz Creature | `m15-spellbook` | 750 × 1046 |
| Synchro Creature | `m15-sketch` | 750 × 1046 |
| Link Creature | `m15-showcase-capenna-art-deco` | 750 × 1046 |
| Ritual Creature | `m15-showcase-praetor` | 750 × 1046 |
| Non-creature Fusion Summon/Ritual Summon | `sevenhalf` | 750 × 1046 |

Card-specific frame fields belong immediately after `card:`:

```text
card:
	stylesheet: m15-spellbook
	stylesheet_version: 2024-09-01
	has_styling: false
```

An archetype project may contain several special card types. Each card uses its own effective supertype frame. Do not create a separate project merely to change frame.

Extra Deck material line appears first in italics without repeating summon type:

- Xyz: `*2 Creatures MV N*`
- Synchro: `*1 Tuner + 1+ non-Tuner*`
- Fusion: `*1 “Shaddoll” Creature + 1 white Creature*`
- Link: `*2+ Creatures*`

Decision evidence and rejected candidates remain in [ADR 0006](../ADR/accepted/0006-mse-frame-mapping.md).
