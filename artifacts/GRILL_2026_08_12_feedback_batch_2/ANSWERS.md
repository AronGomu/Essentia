# Grill: feedback batch 2

## Facts (scout)

- `python .script/lint_mse_card_style.py` = 25.6s wall, 99 findings — source: timed run
- cProfile: 1,166,598 `re` compiles, 83s of 87s under profiler, all inside `lint_name_style` (`.script/lint_mse_card_style.py:567`) — per-line × per-alias f-string patterns blow the 512-entry `re` cache
- `sorted(required_exact, key=len, reverse=True)` sorts a `set` → finding order depends on `PYTHONHASHSEED`
- `python .script/rebuild_open_packages.py` = 41.3s, prints exactly 2 lines — source: timed run
- `mse.render ...: 0 checked, 50 rendered` always: `inspect_project` compares against `<project>/render`, but rebuild renders the regenerated aggregate `LOTA-0001-Alpha_0.1_all_cards.mse-set`, which has no `render/` dir (`.script/export_mse_renders.py:320-370`)
- MSE renders in one batch subprocess with captured stdout → per-card progress only possible from the post-export per-card loops
- `package_hashes()` hashes every package file except `package-sha256.json` → an in-package rebuild stamp would dirty git each run
- `MSE/manifest.json` (140 KB) pins every vendored frame, stylesheet, and the print export template by sha256 → usable as one stamp input
- Hover preview: `src/components/CardHoverPreview.astro` + `src/lib/hover-placement.ts` (`CARD_WIDTH=320`, `PREVIEW_HEIGHT=448`), styles `src/styles/global.css:1446-1500`
- Card page: `src/pages/cards/[id].astro`; render clamp `width: min(100%, 25rem)` at `global.css:981`; related sections live inside `.card-transcription`; `.render-column` already `position: sticky`
- Pixel budget: canonical render 750×1046, display tier 750px webp (151 KB), print master 1500×2092 PNG (1.17 MB) at `card.images.print.url`. No 1920px source exists
- "New" badge comes from `CardGallery.astro` (`isLatestRelease`), shared by every gallery → needs a per-usage flag
- Related graph `website/scripts/content/related.mjs`: `archetype` and `interaction` computed independently, no dedupe
- `src/lib/markdown.ts` has no `![...]()` rule; its link regex would match the inner `[alt](/x)` of an image, so an image rule must run first
- CSP: `harden-csp.mjs` throws on `'unsafe-inline' | 'unsafe-hashes' | 'unsafe-eval'`; `dist/` has **0** `style="` attributes → inline per-image style is not available
- Backgrounds present: `~/Downloads/burning-abyss-bg.png` (2.3 MB), `~/Downloads/nekroz-bg.png` (3.1 MB)
- `content/art-provenance.json` note claims "No generative service is used"; `check-rights.mjs` covers only `release:*` card-render keys
- Baseline red state on `plan/feedback-batch`: 200 tests, 21 failures (MSE self-name italics + `error-spelling` drift)

## Round 1 — whole frontier

| #   | Question                                        | Answer                                                                                                              | Precision                                        |
| --- | ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| 1   | Linter speed: Python fix vs Rust                | Python fix only: precompile patterns + one alternation scan, target under 2s                                          | —                                                |
| 2   | Rebuild progress output format                  | Phase + per-card counter lines (`mse.render 12/50 <card>`), plus existing summary                                     | —                                                |
| 3   | Skip-if-unchanged granularity                   | Package-level short-circuit: hash card files + style, compare to a stamp, skip whole rebuild                          | only fine because of faster CI                   |
| 4   | Hover overlay placement + rulings               | Overlay centred on the tile, clamped into the viewport; rulings float on whichever side has room, dropped when neither fits | —                                          |
| 5   | Card render max width                           | Fill the column, cap at 40rem                                                                                        | asked whether the card is bigger than 750px      |
| 6   | Scroll choreography for related sections        | Sticky-until-end group, related full width below, **plus** a full-width band background                              | —                                                |
| 7   | Archetype background application + rights       | Copy into `public/backgrounds/`, layer as a fixed dimmed image under `--page-atmosphere`, archetype pages only        | AI-generated; keep opacity dim so it never overpowers the page |
| 8   | Markdown image syntax + % scale                 | `![alt](/path)` plus optional pipe scale `![alt\|60%](/path)`                                                        | —                                                |

### Answer to Q5's question — is the card bigger than 750?

No 1920px card exists anywhere in the pipeline. The real ceiling is the print master at
**1500 × 2092** (600 DPI at 63.5 × 88.9 mm); the website's `display` tier is 750px wide,
derived from it. 40rem = 640 CSS px, so the render stays near 1:1 at DPR 1 and is upscaled
from 750px only on DPR-2 screens. That is why item 4's `Show full size` link points at the
1500px print master — it is the largest real image, and no new tier had to be generated.

## Shared understanding

- **Goal:** ship all 11 feedback items as 9 commit-sized tickets: pipeline speed (lint under 2s, rebuild progress, rebuild skip) then website surfaces (hover overlay, bigger render + full-size link, related dedupe + band, archetype backgrounds, markdown images).
- **Settled:**
  - lint fix is Python-only, with a 2s budget and byte-identical output enforced by diff
  - rebuild prints 5 phase lines + per-card lines; no TTY animation
  - skip granularity is the whole package, keyed on a content hash stamp stored in `.cache/mse-rebuild/`
  - hover preview overlays the tile at ≤75vh with the render's exact 1046/750 ratio; rulings float outside it
  - card render fills its column capped at 40rem; `Show full size` opens the print master
  - `interaction` excludes `archetype`; related galleries drop the `New` badge
  - related sections move out of `.card-transcription` into a full-bleed tinted band, which is also what produces the requested scroll bind
  - two AI-generated backdrops, converted to webp once by a manual script, dimmed, archetype pages only, provenance note corrected
  - markdown images use `![alt|N%](/path)` with a 5%-step class ladder, because CSP forbids inline styles
- **Assumptions:** repo baseline is red (21 pre-existing test failures, 99 lint findings) and every ticket validates "no new failures" rather than "all green"; markdown image paths are site-absolute and therefore do not resolve when the same `.md` is read on GitHub.
- **Out of scope:** Rust lint engine, per-card partial rendering, new image tiers, card text redesign, backgrounds for other archetypes, `<figure>`/caption markdown syntax, fixing the 21 pre-existing failures.
