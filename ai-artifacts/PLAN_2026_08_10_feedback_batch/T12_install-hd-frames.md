# T12: Install 4 HD packs + capenna rescale

**Plan:** `./ai-artifacts/PLAN_2026_08_10_feedback_batch.md`
**Depends:** T11
**Commit outcome:** every stylesheet the cube uses renders at 750×1046, the vendored
tree is re-pinned in `MSE/manifest.json`, and `launcher/setup_mse.py --verify` passes.

## Context (self-contained)

- Goal: `feedback.md` item 5 — every template HD, at the Fusion frame's resolution.
- This slice: the vendored MSE data tree only. Renders and print masters are switched on
  in T14; card art is T13.
- Out of scope here: `cards_mse/` card files, `renders/`, the website, print masters.
- Assumptions in force: the user supplies four HD packs; `magic-m15-showcase-capenna-art-deco`
  (744×1039 today) is rescaled to exactly 750×1046 so every frame matches Fusion.

## Verdict from T11 — read this first

> **B. Rescale to 750-space.** Graff ratio `0.9702`; Dante ratio `0.9723`; both below
> threshold `1.30`. Install staged 2× art, then run `.script/scale_mse_style.py` over each
> pack's `style` file with factor 2. Source: T11 SHA `4559015`, ADR 0030.

## What T1 and T11 already produced (do not redo)

- `hd_inputs/frames/<pack>/…` holds the user's HD art, git-ignored;
  `python .script/verify_hd_inputs.py` prints one line per pack with `double=<n>` and
  `wrong-size=<n>`.
- `.script/frame_resolution_probe.py` measures frame-edge energy on a print master and
  refuses to run on a dirty vendored tree.
- `docs/ADR/proposed/0030-hd-frames-at-750.md` carries the measurement and the verdict.

## Requirements

- The four packs `magic-sevenhalf.mse-style`, `magic-m15-spellbook.mse-style`,
  `magic-m15-sketch.mse-style`, `magic-m15-showcase-praetor.mse-style` receive the staged
  HD art; each replaced file keeps its exact filename and format.
- Under verdict B only: each of those four `style` files gets `card width: 750`,
  `card height: 1046`, and every numeric coordinate scaled by 2.
- `magic-m15-showcase-capenna-art-deco.mse-style` is rescaled from 744×1039 to 750×1046:
  every image resampled by 750/744 (LANCZOS), `card width` / `card height` set to
  750 / 1046, and every numeric coordinate in its `style` scaled by the same factor.
- New script `.script/scale_mse_style.py`:
  - `scale_style_text(text: str, factor: float) -> str` — scales `card width:`,
    `card height:`, and every numeric literal on lines whose key ends in
    `width`, `height`, `left`, `top`, `right`, `bottom`, `size`, `radius`, `offset`;
    integers stay integers (`round`), floats keep 2 decimals.
  - It must **not** touch `version:`, `depends on:`, `card dpi:`, script blocks, or any
    line inside an `init script:` / `script:` indented body.
  - CLI: `python .script/scale_mse_style.py MSE/data/<pack>/style --factor 2`.
- `MSE/manifest.json` is regenerated for every changed file (same sha256 shape, same key
  order) and `python launcher/setup_mse.py --verify` passes afterwards.
- `docs/design/FRAMES.md` gains a resolution column: every stylesheet 750×1046.

## Inputs

- `MSE/data/` packs and their `style` files. Current declared sizes: sevenhalf 375×523
  (line 17-18), m15-spellbook 375×523 (29-30), m15-sketch 375×523 (26-27),
  m15-showcase-praetor 375×523 (29-30), m15-showcase-capenna-art-deco 744×1039 (25-26),
  genevensis-00-main 750×1046 (31-32, the target, untouched).
- `MSE/manifest.json` — `files` maps repo-relative vendored paths to sha256.
- `launcher/setup_mse.py` — copies from a source tree, verifies hashes, `--verify` mode.
- `docs/design/FRAMES.md` — the supertype → stylesheet table.
- `docs/ADR/accepted/0006-mse-frame-mapping.md` — frame mapping evidence; add a line, do
  not rewrite it.
- **From Depends:** T11 measured Graff ratio `0.9702`, Dante ratio `0.9723`; both are
  below threshold `1.30`. Execute verdict B: install staged 2× art and rescale all four
  styles to 750×1046 coordinate space. T11 commit: `4559015`.

## TDD

1. **Red** — write `tests/test_scale_mse_style.py` first, over inline style fixtures.
2. **Green** — implement `.script/scale_mse_style.py`, then install the packs.
3. **Refactor** — none; the script is single-purpose.

## Test plan

| Test | Input | Expect |
| --- | --- | --- |
| `test_card_dimensions_scale` | `"card width: 375\ncard height: 523\n"`, factor 2 | `"card width: 750\ncard height: 1046\n"` |
| `test_positional_keys_scale` | `"\tleft: 30\n\ttop: 12.5\n"`, factor 2 | `"\tleft: 60\n\ttop: 25.00\n"` |
| `test_non_geometric_keys_untouched` | `"version: 2024-05-30\ncard dpi: 150\n"`, factor 2 | unchanged |
| `test_script_bodies_untouched` | an `init script:` block containing `width: 375` | unchanged |
| `test_fractional_factor_rounds_integers` | `"\tleft: 100\n"`, factor `750/744` | `"\tleft: 101\n"` |
| `test_manifest_covers_every_vendored_file` | `MSE/manifest.json` + `MSE/` on disk | every non-ignored file under `MSE/` appears in `files`, and every entry exists |

## Impl steps

- [x] 1. `python .script/verify_hd_inputs.py` → all four packs `present=yes`, `wrong-size=0`.
      Stop and report if not; this ticket cannot proceed without the assets.
- [x] 2. Create `.script/scale_mse_style.py` with `scale_style_text` and a CLI; write
      `tests/test_scale_mse_style.py` per the test plan.
- [x] 3. Copy each staged pack's images over the vendored pack, file by file, keeping
      names and formats. Do not delete vendored files the staging tree lacks.
- [x] 4. Under verdict B only: run
      `python .script/scale_mse_style.py MSE/data/<pack>/style --factor 2` for the four packs.
- [x] 5. Rescale capenna: for every image under
      `MSE/data/magic-m15-showcase-capenna-art-deco.mse-style/`, resample by 750/744 with
      LANCZOS (round to nearest integer pixel), then
      `python .script/scale_mse_style.py MSE/data/magic-m15-showcase-capenna-art-deco.mse-style/style --factor 1.008064516`.
- [x] 6. Regenerate `MSE/manifest.json`: re-hash every file listed under `files`, keeping
      the JSON key order stable so the diff shows only changed hashes.
- [x] 7. `python launcher/setup_mse.py --verify` → clean.
- [x] 8. Render one card per changed stylesheet into a scratch directory
      (`python .script/export_mse_renders.py <aggregate> --output /tmp/frame-check`) and
      confirm each PNG is 750×1046 with `python -c "from PIL import Image; …"`.
- [x] 9. Visually compare each scratch render against the committed
      `cards_mse/01_alpha/LOTA-0001-Alpha_0.1/renders/<name>.png` at equal display size:
      no element may have moved. A shifted title bar means the coordinate scale is wrong.
- [x] 10. Update `docs/design/FRAMES.md` with a `Render size` column, all `750 × 1046`.
- [x] 11. Append one line to `docs/ADR/accepted/0006-mse-frame-mapping.md` noting the
      resolution change and pointing at ADR 0030.

## Outputs

- `MSE/data/**` (untracked payload), `MSE/manifest.json`, `.script/scale_mse_style.py`,
  `tests/test_scale_mse_style.py`, `docs/design/FRAMES.md`,
  `docs/ADR/accepted/0006-mse-frame-mapping.md`.
- Behaviour change: every stylesheet renders 750×1046. Committed renders are still the old
  375×523 files until T14 re-renders them — that is intentional, the package stays valid.

## Validation

- [x] `python -m unittest tests.test_scale_mse_style -v` → OK
- [x] `python -m unittest discover -s tests` → OK
- [x] `python launcher/setup_mse.py --verify` → clean
- [x] scratch renders are exactly 750×1046 for all six stylesheets
- [x] side-by-side check: no element moved
- [x] commit msg draft: `feat(mse): raise every vendored frame to the 750×1046 fusion size`
