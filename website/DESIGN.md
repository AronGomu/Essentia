---
name: Essentia Showcase
description: A blackfoil archive for faithful Yu-Gi-Oh! identities rebuilt as playable Magic cards.
---

<!-- SEED: re-run $impeccable document once there's code to capture the actual tokens and components. -->

# Design System: Essentia Showcase

## Overview

**Creative North Star: “The Blackfoil Archive”**

Picture a collector opening a black-backed binder beneath controlled gallery light while recording at a desk: card art is vivid, the room is dark but readable, labels are exact, and reflective material appears only when the artifact moves. The website acts as that binder. A near-black neutral shell recedes; canonical card renders and iconic monster art provide most saturation; one archetype atmosphere takes ownership of each gallery.

The system combines Yu-Gi-Oh! scale and velocity with Magic's disciplined information hierarchy. Composition is cinematic around artwork and editorial around rules text. It rejects generic neon-gamer dashboards, literal duel HUDs, parchment deck builders, dark SaaS chrome, purple-gradient glassmorphism, and decorative fantasy clutter.

**Key Characteristics:**

- Neutral-black substrate with artwork-led color.
- Stable shell, distinct section atmospheres for non-archetype staples and defined archetypes.
- Serif display voice paired with a highly legible system sans.
- Large image fields, concise labels, and readable transcriptions.
- Choreographed entry moments; responsive interaction motion afterward.
- Square-to-gently-curved geometry rather than soft pill-shaped surfaces.

## Colors

Use a full palette with disciplined jurisdiction. Shell neutrals establish one dark gallery; a global relic-green interaction color anchors navigation and focus; each archetype receives one dominant accent family derived from its iconic art. Exact OKLCH values are **[to be resolved during implementation]** and must pass WCAG 2.2 AA before becoming tokens.

### Primary

- **Relic Green:** Global interactive anchor for focus rings, selected navigation, links, and rare primary actions. Hue stays near moss on weathered stone, matching the generated brand seed without turning the shell botanical. **[to be resolved during implementation]**

### Secondary

- **Burning Ember:** Burning Abyss atmosphere—smoldering red with restrained brass heat. Never becomes a permanent global warning color. **[to be resolved during implementation]**
- **Shadow Thread:** Shaddoll atmosphere—electric magenta-violet drawn from puppet strings and Construct artwork, confined to that archetype. **[to be resolved during implementation]**
- **Ritual Ice:** Nekroz atmosphere—cyan-blue crystal light with pale silver highlights. **[to be resolved during implementation]**
- **Prophecy Aether:** Spellbook atmosphere—luminous turquoise with quiet white-metal detail. **[to be resolved during implementation]**

### Tertiary

- **Archive Gold:** Rare marker for provenance, package history, and authored highlights. Never used as generic luxury decoration. **[to be resolved during implementation]**

### Neutral

- **Blackfoil:** True neutral near-black page background; no navy or purple tint. **[to be resolved during implementation]**
- **Sleeve:** Lifted neutral surface for navigation, dialogs, and text panels. **[to be resolved during implementation]**
- **Ruleline:** Quiet neutral divider visible without outlining every region. **[to be resolved during implementation]**
- **Cardstock:** Near-white primary text with enough softness for long reading on black. **[to be resolved during implementation]**
- **Silver Ink:** Secondary text that still passes body-text contrast requirements. **[to be resolved during implementation]**

**The Artifact Color Rule.** Card renders keep their original color. Never recolor, tint, crop, or place a strong overlay over canonical card faces.

**The One Atmosphere Rule.** One section accent family may dominate a page. Other section colors appear only as navigation signposts.

**The Catalog Order Rule.** Left navigation shows a collapsible **Non-Archetype** parent first, then its six child sections in fixed order: Creatures, Fusion, Synchro, Xyz, Link, Non-creature. Below that, defined archetypes list alphabetically. Cards belong to a defined-archetype gallery only when their owning MSE project is one of the registered archetype projects; every other published card lives under Non-Archetype.

**The Neutral Night Rule.** Dark substrate is chroma-zero. Mood comes from imagery and named accents, not a purple or navy wash.

## Reading Surfaces (Docs & Blog)

Long-form docs and blog prose gets its own lit reading room inside the dark
archive: a narrow, documented exception to the Neutral Night Rule (see
`docs/ADR/proposed/0020-reading-surfaces-for-docs-and-blog.md`), scoped
strictly to `.reading-*` selectors. The gallery shell, section atmospheres,
and every card surface stay chroma-zero.

- **`--reading-surface`** — `oklch(0.27 0.008 80)`. The reading panel
  substrate: a warm-hue, small-chroma lift well clear of `--blackfoil`, so
  prose reads as paper under a lamp rather than the gallery void turned up.
- **`--reading-surface-raised`** — `oklch(0.325 0.009 80)`. A slightly
  lifted step of the reading surface for nested or emphasized panels
  (callouts, code blocks) within reading pages only.
- **`--reading-ink`** — `oklch(0.94 0.012 80)`. Primary reading-surface body
  text. Kept below maximum lightness on purpose to avoid the halation of
  near-maximum contrast on long passages.
- **`--reading-ink-muted`** — `oklch(0.78 0.016 80)`. Metadata-only text on
  the reading surface (timestamps, breadcrumbs, captions) — never body prose.
- **`--reading-rule`** — `oklch(0.44 0.01 80)`. Quiet divider for reading
  pages, matching the warm reading-surface family instead of the neutral
  `--ruleline`.
- **`--reading-measure`** — `70ch`. Maximum prose line length on reading
  pages, for comfortable long-form reading.
- **`--reading-toc`** — `15rem`. Width of the reading-page table-of-contents
  column.

**The Reading Contrast Rule.** Long-form text uses `--reading-ink` on
`--reading-surface`; `--reading-ink-muted` is for metadata only.

**The Lit Room Rule.** Only the prose panel and its rails take the reading
surface tokens. The site header, the catalog rail, and the page gutter stay
on `--blackfoil` — a reading page is one lit room inside the same dark
archive, not a separate site.

## Logo

The Essentia identity ships as two raster marks, committed under `website/brand/`
and derived into public assets by `npm run brand:assets`
(`website/scripts/make-brand-assets.mjs`): a wordmark ("Essentia" in a rounded
plate) and a letter mark (the `E` in a rounded-square frame). Both are
brushed-silver emboss with a soft outer glow and a teal hairline down the stem
of the `E` — that hairline reads as the same family as `--relic` and `--ice`,
so the mark is already consistent with the shell's interaction colour without
being recoloured to match it exactly.

**The Two Marks Rule.** The wordmark identifies the site in chrome that has
room — header, footer, social card. The letter mark stands in wherever the
space is square or smaller than `160px` wide: favicon, app icon, narrow
header, in-page badge. They are never used together in one region.

**The Untouched Mark Rule.** The mark is never recoloured, tinted, outlined,
rotated, stretched, given a drop shadow, or placed on an archetype accent
surface. Its own glow is the only effect it carries. This extends _The
Artifact Color Rule_ from card renders to the identity.

**Clear space.** Minimum clear space on all four sides equals the height of
the `E` bowl — practically, `0.5 ×` the mark's rendered height. Nothing
crosses it.

**Substrate.** The mark is silver-on-dark by design and is placed only on
`--blackfoil`, `--blackfoil-raised`, or `--sleeve`. It is **not** placed on
`--reading-surface` (the lit warm panel from **Reading Surfaces** above):
silver emboss on warm vellum reads as a smudge. If a reading page needs the
mark, it goes in the chrome, which stays dark per the **Lit Room Rule**.

**Minimum size.** The emboss and the teal hairline are raster detail; under
roughly `28px` of height the wordmark turns to mush. The wordmark renders no
narrower than `160px` wide; below a `44rem` viewport, chrome swaps to the
letter mark, which survives small sizes because it is one glyph.

## Typography

**Display Font:** Serif display using a system stack **[exact stack to be chosen at implementation]**

**Body Font:** Humanist system sans **[exact stack to be chosen at implementation]**

**Character:** Display type should feel engraved and authoritative without becoming medieval. Body type should feel contemporary, compact, and dependable. Contrast between them carries Essentia's hybrid identity more credibly than ornamental lettering.

### Hierarchy

- **Display:** Medium weight, fluid scale, compact line height; reserved for homepage and archetype hero titles. Maximum size remains below 6rem and letter spacing never tighter than -0.04em.
- **Headline:** Semibold serif or strong sans, at least 1.25× larger than adjacent body text; used for card names, gallery groups, and presentation titles.
- **Title:** Semibold sans; used for navigation groups, filter regions, and related-card headings.
- **Body:** Regular sans with generous dark-mode line height; rules transcription and explanations stay within 65–75 characters per line.
- **Label:** Medium sans, sentence case by default; short metadata may use compact uppercase only when it behaves like card indexing, never as repeated section eyebrows.

**The Two Voices Rule.** Serif names the artifact; sans explains and operates it. Never use ornamental fantasy fonts or monospace as genre shorthand.

**The English MVP Rule.** Card names, interface copy, metadata, explanations, dates, status labels, and accessibility text are English only for MVP. Do not add language switches, translation placeholders, or locale-specific layout branches before localization becomes an approved post-MVP feature.

## Elevation

Flat by default. Depth comes from tonal separation, artwork scale, and overlap. Shadows appear only when an object changes state: a card lifts under pointer or keyboard focus, a dialog enters the top layer, or a presentation surface separates from its backdrop. Ambient page sections do not float.

### Shadow Vocabulary

- **Interactive Lift:** Tight, low-blur neutral shadow paired with archetype-colored reflected light; exact value **[to be resolved during implementation]**. Use only during card hover/focus or drag-like movement.
- **Stage Separation:** Broad but low-opacity neutral shadow for native dialogs and fullscreen presentation; exact value **[to be resolved during implementation]**.
- **Foil Reflection:** A moving highlight material, not a shadow. It follows pointer position and disappears under reduced motion or coarse pointers.

**The Flat Archive Rule.** Surfaces rest flat. If every region casts a shadow, hierarchy has failed.

**The No Ghost Card Rule.** Never pair a decorative 1px border with a wide soft shadow. Use tonal separation, a border, or state elevation—never all three.

## Do's and Don'ts

### Do:

- **Do** let canonical card renders and iconic artwork provide most page color.
- **Do** use one archetype atmosphere per page while preserving shared layout and behavior.
- **Do** keep paragraphs within 65–75 characters and increase line height for light text on dark surfaces.
- **Do** use large, decisive artwork crops for archetype menus and reserve exact card aspect ratios in galleries.
- **Do** make hover information equally available through keyboard focus without requiring motion.
- **Do** choreograph one meaningful homepage or hero entrance, then rely on direct interaction feedback.
- **Do** remove tilt, parallax, foil travel, ambient movement, and view transitions under `prefers-reduced-motion`.
- **Do** use native controls, visible focus, non-color status cues, and concise image alternatives paired with semantic card text.

### Don't:

- **Don't** imitate a generic neon-gamer dashboard, a Yu-Gi-Oh! duel HUD, or an MTG parchment deck builder.
- **Don't** use dark SaaS conventions, purple-gradient glassmorphism, ornamental fantasy clutter, or effects that compete with card art or transcription.
- **Don't** use gradient text, repeating stripe backgrounds, decorative grid backgrounds, sketchy SVG illustration, or colored side-stripe accents.
- **Don't** put tiny uppercase tracked eyebrows above every section or use decorative numbered section markers.
- **Don't** build endless identical icon-heading-text card grids or nest cards inside cards.
- **Don't** round cards, panels, inputs, or sections beyond 16px; full pills belong only to compact tags and controls.
- **Don't** crop, recolor, distort, or obscure canonical MSE card renders.
- **Don't** animate content from an invisible default state or let any automatic decorative loop run longer than five seconds.
- **Don't** use gray text on colored archetype surfaces; derive readable text from that surface's hue or use approved neutral ink.
