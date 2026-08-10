# Grill: feedback batch (13 items)

Goal: turn `feedback.md` items 1-13 into an executable plan. Round 1 covered the
whole frontier. Frontier empty after round 1.

## Round 1 — whole frontier

| #   | Question | Answer |
| --- | -------- | ------ |
| 1   | Item 1 — panel surface | `/archetypes/{slug}` hero only (h1 + intro + stats) |
| 2   | Item 2 — dev render output | one line per project + full JSON behind `--verbose` |
| 3   | Item 3 — `⋯` popover | delete at all widths; labels stay Learn / Blog / Decks |
| 4   | Item 4 — one card per row | new-cards grid 1 col below 30rem, 2 cols 30-40rem |
| 5   | Item 5 — HD frame strategy | spike first (2× art into 375-space style), rewrite coordinates only if the spike proves it necessary |
| 6   | Item 5 — frame supply | user supplies 4 HD packs; capenna rescaled to exactly 750×1046 |
| 7   | Item 5 — output sizes | renders 750×1046, print masters 1500×2092 on, `draftResolution` false |
| 8   | Item 6 — art resolution | 4× art box where HD exists; upscale the remaining 173 from 624 px with the same external tool |
| 9   | Item 7 — Rules block | `preview: true` keywords only, byte-identical to the hover box |
| 10  | Item 7 — inline reminders | removed from the card page rule text only |
| 11  | Item 8 — category 2 | derived at build time from closed characteristic vocabularies; unresolved token fails the build |
| 12  | Item 8 — cache | computed in the content build, embedded in `catalog.ts`, no separate file |
| 13  | Item 8 — presentation | two headed subsections, gallery-style thumbnails, cap 12 |
| 14  | Items 9-13 | as read; item 10 = homepage `Archetypes` heading → tile row gap |
| 15  | Delivery | one plan, phase A = 11 site/tooling items, phase B = HD assets, gated |

## Facts (resolved by repo read, never asked)

- Noisy `npm run dev` JSON — `mse.render.plan`, `json.dumps(..., indent=2)`, one row
  per card — source: `.script/export_mse_renders.py:498`.
- Header at 400px uses 173.8px of 368px; three inline links cost ≈ +167px → ≈341px,
  ~27px slack — source: `website/shared/header-row.mjs`.
- Third header link is labelled `Decks`; `⋯` exists only below 44rem — source:
  `website/src/layouts/BaseLayout.astro:163-197`, `global.css:288, 1748`.
- `.card-grid` is already one card per row at 400px; `.new-card-grid` is 2 columns
  below 40rem — source: `global.css:805-809, 908-916`.
- Homepage has no per-archetype card list; the Archetypes block is image tiles —
  source: `website/src/pages/index.astro:95-127`.
- Frame sizes: genevensis (Fusion) 750×1046, capenna (Link) 744×1039, sevenhalf /
  m15-spellbook / m15-sketch / m15-showcase-praetor 375×523 — source: `MSE/data/*/style`.
- Renders 375×523; print masters 1500×2092 supported but none on disk →
  `draftResolution: true`; website `display` tier wants 750, capped by
  `withoutEnlargement` — source: `website/scripts/content/images.mjs`.
- Card art `mse_images/*.png` ≈316×231; `original_images/` 223 files @624²;
  `original_images_hd/` 50 files @1920²; `Fusion/` + `Link/` absent from HD tree.
- HD upscaling is manual and external to the repo — source:
  `docs/ADR/proposed/0018-committed-hd-hero-art.md`. The tool is not recorded.
- MSE tree untracked, hash-pinned by `MSE/manifest.json`; `launcher/setup_mse.py --verify`
  fails on any byte change.
- `card.keywords` already includes ability-metadata and super-type terms — source:
  `website/scripts/content/keywords.mjs:241`.
- Rulings live only in `docs/keywords/{id}.md`; 84 keywords, 20 `preview: false`.
- Archetype printed names live in `website/content/sections.json` as `namePattern`.
- `CardHoverPreview` is mounted once in `BaseLayout`; `CardGallery` is reusable and
  carries no aside of its own.
- One open package: `cards_mse/01_alpha/LOTA-0001-Alpha_0.1`, 50 cards.

## Shared understanding

- **Goal.** Execute `feedback.md` items 1-13 as one plan, two phases. Phase A ships
  the 11 site + tooling items. Phase B raises every frame and every card art to HD
  and turns on real print masters; it is gated on user-supplied assets.
- **Settled.** All 15 answers above.
- **Assumptions (planner decisions, not asked).**
  - Item 11's two sentences describe one paragraph — `Latest cards from
    alpha/beta/release packages.` — deleted.
  - "Dex" = the existing `Decks` link; label unchanged.
  - "HD screen" = 1920×1080 viewport, default zoom.
  - Capenna rescale 744→750 scales art *and* every style coordinate by 750/744;
    acceptance is a pixel diff against the pre-rescale render at equal output size.
  - Category 2 build failure fires on two deterministic tokens only: a quoted
    archetype name matching no `namePattern`, and an `MV` token not followed by an
    integer or `X`. A reference resolving to zero cards is legal.
  - Rules block sits after the card facts of the transcription column, before
    `Design notes`.
  - Interaction category has no listing page, so a truncated list shows a count,
    not a link. The archetype category links to its section page.
- **TODO(user).** The upscaler that produced `original_images_hd/` is not recorded
  anywhere in the repo. T1 asks for the tool name and the 173 upscaled files.
- **Out of scope.** Locked packages stay frozen at their committed SD renders;
  non-archetype section pages keep their current hero; no new homepage layout.
