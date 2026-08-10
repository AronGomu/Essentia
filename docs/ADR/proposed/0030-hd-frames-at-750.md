# ADR 0030 — Every frame renders at 750 × 1046

- Date: 2026-08-10
- Status: Proposed
- Scope: vendored MSE stylesheets — `MSE/data/magic-sevenhalf.mse-style`, `magic-m15-spellbook.mse-style`, `magic-m15-sketch.mse-style`, `magic-m15-showcase-praetor.mse-style`, `magic-m15-showcase-capenna-art-deco.mse-style`, `MSE/manifest.json`, `.script/export_mse_renders.py`, `website/scripts/content/images.mjs`

## Context

The cube renders with six stylesheets and they do not agree on resolution.

| Stylesheet | Supertype | `card width` × `card height` |
| --- | --- | --- |
| `genevensis-00-main` | Fusion | 750 × 1046 |
| `m15-showcase-capenna-art-deco` | Link | 744 × 1039 |
| `sevenhalf` | normal / other | 375 × 523 |
| `m15-spellbook` | Xyz | 375 × 523 |
| `m15-sketch` | Synchro | 375 × 523 |
| `m15-showcase-praetor` | Ritual | 375 × 523 |

Three consequences, all visible today.

1. Renders inherit the stylesheet size, so a Fusion card ships at 750 px and a Xyz card at 375 px.
2. The website's `display` tier asks for 750 px but `sharp` runs with `withoutEnlargement: true`, so a 375 px render stays 375 px. Half the catalog is served at half the intended size.
3. Print masters are exported at 1500 × 2092 through `mse_packages/essentia-print.mse-export-template`, which re-renders rather than upscaling the 1× bitmap. Text comes out crisp at any size because it is drawn, not scaled — but frame art is a bitmap, and a 375 px frame drawn into a 1500 px master is a 4× upscale.

The vendored tree is untracked and hash-pinned (`MSE/manifest.json`), because it is a GPL binary plus Wizards of the Coast frame art. HD frame art therefore cannot be produced in-repo; it is supplied by the owner and staged in `hd_inputs/frames/`.

## Decision

**1. The target is 750 × 1046 for every stylesheet — the Fusion frame's size.** It is the size the project already ships, it is exactly half the print master, and it makes `display` (750) a 1:1 tier instead of an upscale.

**2. `m15-showcase-capenna-art-deco` is normalised, not exempted.** 744 × 1039 is within 1% of the target, and leaving it out would keep "the frame sizes differ" true forever for no gain. Its art is resampled by 750/744 and every coordinate in its `style` scaled by the same factor.

**3. Which work the other four packs need is measured, not assumed.** MSE draws each frame image into an element rect at the output resolution. If it resamples from the source file, dropping 2× art into a 375-space stylesheet is enough and no coordinate changes. If it rasterises in style space first, the 2× art buys nothing and the stylesheet must be rewritten to 750-space.

`.script/frame_resolution_probe.py` decides it: export a 1500 × 2092 print master with the vendored pack, export another with a 2×-upscaled copy of the same pack, and compare `ImageFilter.FIND_EDGES` energy over the outer frame ring `(0, 0, 1500, 120)` — a crop that holds frame art and neither illustration nor text.

- `ratio ≥ 1.30` → art swap only.
- `ratio < 1.30` → art swap **and** `card width: 750`, `card height: 1046`, every geometric coordinate ×2 via `.script/scale_mse_style.py`.

**4. Locked packages are not re-rendered.** `cards_mse/02_beta` and `cards_mse/03_release` are immutable after commit (ADR 0008). They keep their SD renders. Only open packages gain HD output.

## Measurement

Measured 2026-08-10 with the repeatable Pillow-upscaled vendored-copy probe.

| Pack | Probe card | SD edge energy | HD edge energy | ratio | Fusion control |
| --- | --- | --- | --- | --- | --- |
| `magic-sevenhalf.mse-style` | Burning Abyss - Graff | 9.9169 | 9.6212 | 0.9702 | 8.8331 |
| `magic-m15-spellbook.mse-style` | Burning Abyss - Dante | 11.9125 | 11.5828 | 0.9723 | 8.8331 |

MSE build: `MSE/manifest.json` → `source.mseVersion` 2.1.2, `source.commit` 71b382d5da74efd533ae25a23ac324a80c3dfeb4.

Verdict: both ratios are below 1.30, so T12 must use `rescale-to-750-space`: swap in 2× art, set `card width: 750` / `card height: 1046`, and scale every geometric coordinate by 2.

## Rejected

**Rewrite every stylesheet to 750-space up front.** Guaranteed correct, but four `style` files of several hundred coordinates each, rewritten before knowing whether any of it is needed. The probe costs one afternoon and can make all of it unnecessary.

**Rely on the print export template alone.** Text is already crisp at 1500 px, so this is the cheapest option — but frame art stays a 4× upscale and the website's `display` tier stays at 375 px. It solves neither half of the request.

**Render at 1500 × 2092 natively.** Four times the pixels in every stylesheet, in the repository's image budgets, and in MSE's editing loop, to gain nothing the 2× master does not already provide.

## Consequences

- Every open-package render changes size, so every render hash and `package-sha256.json` changes. Expected, and covered by the rebuild.
- `docs/MSE.md` currently states the print master is "exactly 4× the stylesheet's native 375 × 523". After this it is 2× of 750 × 1046.
- `docs/design/FRAMES.md` gains a resolution column.
- The website stops flagging `draftResolution` once `renders_print/` exists.
