# ADR 0006 — MSE frame mapping

- Status: ACCEPTED

Parsed path: `MSE_DATA_DIR` from local `launcher/.env`, generated with `python launcher/setup_mse.py`.

This record preserves candidate evidence plus accepted MSE styles/frames used to distinguish special Yu-Gi-Oh! × Magic cube card types visually. Current rules live in [`../../design/FRAMES.md`](../../design/FRAMES.md).

## Current validated mapping

```text
Normal / other -> 7.5th Edition (`sevenhalf` / `magic-sevenhalf.mse-style`) — validated standard
Fusion Creature -> `gen main` hi-res (`genevensis-00-main` / `magic-genevensis-00-main.mse-style`) — validated standard
Xyz Creature -> M15 Spellbook (`m15-spellbook` / `magic-m15-spellbook.mse-style`) — validated standard
Synchro Creature -> M15 Sketch (`m15-sketch` / `magic-m15-sketch.mse-style`) — validated standard
Link Creature -> Art Deco / Capenna Showcase (`m15-showcase-capenna-art-deco`) — validated standard
Ritual Creature -> Praetor / Phyrexian Showcase (`m15-showcase-praetor` / `magic-m15-showcase-praetor.mse-style`) — validated standard
non-Creature Fusion Summon / Ritual Summon -> 7.5th Edition (`sevenhalf`) — validated standard
```

Synchro validation: **Sketch** style was selected for Synchro cards/projects and applied to `06_YGO_Staples_Synchro.mse-set`.

Note: `M15 big text` remains available for text-heavy cards.

---

## Interesting frames by type

### Fusion

- `m15 spellbook` — with flavor bar
- `gen main` — hi-res — **validated standard required for Fusion Creatures**
- `Eldrazi` — by kasu_mtg
- `Elemental` — Avatar Showcase
- `Woodland` — Bloomburrow Showcase
- `Fable` — Lorwyn Showcase
- `Mystical Archive` — Strixhaven Showcase

### Synchro

- `m15 spellbook` — with flavor bar
- `gen main` — hi-res
- `Eldrazi` — by katsu_mtg
- `M15 Sketch` — MH2 Sketch
- `Art Deco` — Capenna Showcase
- `Ninja` — Kamigawa Showcase
- `Ghostfire` — Tarkir Showcase
- `Vault` — Thunder Junction Showcase

### Ritual

- `m15 spellbook` — with flavor bar
- `Eldrazi` — by katsu_mtg
- `Art Deco` — Capenna Showcase
- `TARDIS` — Doctor Who Showcase
- `Fable` — Lorwyn Showcase
- `Scroll` — LotR Showcase
- `Praetor` — Phyrexian Showcase — **validated standard required for Ritual Creatures**
- `Mystical Archive` — Strixhaven Showcase

### Link

- `Art Deco` — Capenna Showcase — **validated standard required for Link Creatures**
- `gen main` — hi-res
- `Memory Corridor` — Assassin's Creed Showcase
- `Eternal Night` — Double Feature
- `Ninja` — Kamigawa Showcase

### Xyz

- `m15 spellbook` — with flavor bar — **validated standard required for Xyz Creatures**
- `Art Deco` — Capenna Showcase — non-standard historical option
- `M15 black promo` — M15 Sleek — non-standard historical option

---

## Frames classified as “other”

- `b1234 style` — Buttock 1234 style
- `sevenhalf` — 7.5th Edition frames
- `agClassic` — AgClassic Normal
- `old style` — pre-Eighth Edition
- `8th test` — Eighth Edition test prints
- `classic shifted` — classic timeshifted
- `future mirror` — mirrored futureshifted
- `future clear` — clear futureshifted
- `future` — futureshifted
- `planeshifted` — Planar Chaos timeshifted

---

## Old exploratory mapping

Previous exploration proposed these Magic Set Editor visual equivalents:

```text
Fusion -> magic-m15-split-fusable
Synchro -> magic-m15-future
Ritual -> magic-m15-invocation
Link -> magic-m15-showcase-spiderman-web-slinger
Xyz -> magic-m15-devoid
```

These remain historical references. Current validated choices appear above.

## Validated Xyz MSE configuration

```text
stylesheet: m15-spellbook
stylesheet_version: 2024-09-01
styling:
magic-m15-spellbook:
  overlay:
  text_box_mana_symbols: magic-mana-small.mse-symbol-font
```
