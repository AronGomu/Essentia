# ADR 0018 — Section hero art is committed, never build-generated

- Date: 2026-08-07
- Status: Proposed — accepted for implementation by `ai_artefacts/PLAN_2026_08_07_website-feedback-pass.md` (T11)
- Scope: website assets, image pipeline, asset provenance

## Context

The home hero and the section tiles currently use `section.image`, which the build sets to the iconic card's **240 px thumb** render. Blown up to a full-bleed tile that is visibly soft. Feedback asks for a better image of the original illustration on the home hero, on every archetype tile, and on the archetype page — the same image in all three places.

Two sources were considered.

**Generative upscale.** `grok-imagine` can invent detail, but it needs an API key and network access. Neither belongs in `npm run build`, which must stay deterministic, offline, and reproducible in CI. It also makes the site's art depend on a paid third-party service whose output is not reproducible.

**The committed originals.** `original_images/<type>/<Card Name>.jpg` holds a 624×624 illustration crop for every card, no card frame. That is 2.6× the pixels of the thumb tier the tiles use today, available offline, already in the repository, and reproducible by anyone who clones it.

## Decision

1. Hero art is converted once, by hand, from `original_images/<type>/<Card Name>.jpg` with `sharp` at `webp({quality: 90})`, **without resizing**, and committed at `website/public/art/<section-slug>-hero.webp`.
2. The build never calls a generative service, and no plan ticket calls one. No API key is a prerequisite of any build or any ticket.
3. `website/content/sections.json` gains a required `heroImage` per section; the catalog exposes it as `section.heroImage`.
4. Provenance is authored in `website/content/art-provenance.json`: source illustration path, tool, and generation date per image. The build fails when a `heroImage` has no provenance entry or no file on disk.
5. The build validates path shape, file presence, and provenance — **never dimensions**. A higher-resolution replacement dropped at the same path must pass unchanged.
6. `section.image` keeps its current meaning — the thumb-tier render used for social cards — and is unchanged.

## Consequences

- Five binaries enter the repository (well under the 3 MiB per-image budget each).
- CI stays offline, deterministic, and free. Cloning the repo is enough to build the site.
- A true HD upscale remains an open, purely manual follow-up: overwrite the `.webp`, update the `tool` and `generatedOn` line in `art-provenance.json`. Because item 5 forbids a dimension check, that swap touches no code and breaks no gate.
- Regenerating art is a deliberate human act with a recorded provenance line, not a silent build side effect.
- The hero images are derivatives of Konami illustrations. `art-provenance.json` records that; the site footer already states that Yu-Gi-Oh! remains the property of its owners.
- `scripts/scan-dist.mjs` still enforces that no EXIF, ICC, IPTC, or XMP metadata reaches `dist/`.
