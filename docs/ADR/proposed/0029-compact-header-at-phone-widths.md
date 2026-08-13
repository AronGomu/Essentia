# ADR 0029 — Compact header keeps four utility links inline

- Date: 2026-08-09
- Amended: 2026-08-13
- Status: Proposed — amendment accepted for implementation by `ai_artefacts/PLAN_2026_08_13_feedback_follow_up.md` (T1)
- Scope: `website/src/layouts/BaseLayout.astro`, `website/src/styles/global.css`, `website/shared/header-row.mjs`, `website/scripts/check-{chrome,header-row}.mjs`

## Context

400 px is narrowest supported viewport. Header must hold brand, drawer trigger, optional breadcrumb, section links, Find. Earlier popover design is gone: links stay visible + inline at every width.

Feedback adds `Cards` immediately before `Learn about Essentia`. Existing compact model has 50.8 px slack but new link plus gap exceeds that without tighter link padding.

## Decision

1. Utility order is fixed: `Cards` → `Learn about Essentia` → `Blog` → `Decks`.
2. Cards uses base-aware home href (`base`), never literal `/`. It is current only when `Astro.url.pathname === base`.
3. `check-chrome.mjs` gates presence + exact order. Markup keeps full literals for build checks + accessibility.
4. Labels degrade in existing stages:
   - ≤64rem: full labels → short labels (`Learn about Essentia` → `Learn`; Cards/Blog/Decks unchanged).
   - ≤56rem: Find drops reserved width + shortcut hint.
   - ≤44rem: four links remain inline. No popover. Utility-link padding becomes `0.5rem 0.25rem`.
5. Explicit accessible names remain on controls whose visible label changes/hides.
6. Breadcrumb stays sole variable-width item: `flex: 1 1 0`, `min-width: 0`, last crumb ellipsises.
7. `header-row.mjs` models real 400 px widths:

   | control | px |
   | --- | ---: |
   | brand | 32.0 |
   | drawer | 34.0 |
   | Cards | 48.9 |
   | Learn | 48.0 |
   | Blog | 40.1 |
   | Decks | 51.3 |
   | Find | 39.8 |

   Conservative total = 344.5 px with breadcrumb, 337.3 px without, against 368 px available.
8. Build/runtime wrap checks remain warnings. Playwright one-row + no-overflow checks remain red gates.

## Consequences

- Four destinations stay one tap away at 400 px.
- Compact horizontal link padding tightens by 4.8 px per side; block padding + target height stay unchanged.
- Cards works under root + subpath deploys.
- Adding another utility link requires fresh browser measurement + model/test update.
- Header gets no `transform`, `filter`, `backdrop-filter`, `will-change`; fixed rail containing-block rule from ADR 0027 remains.
