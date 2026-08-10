# T11: Frame HD spike

**Plan:** `./ai-artifacts/PLAN_2026_08_10_feedback_batch.md`
**Depends:** T1
**Commit outcome:** a repeatable probe answers, with a number, whether swapping 2×
frame art into a 375-space stylesheet actually sharpens a 1500×2092 print master —
and ADR 0030 records the verdict that T12 executes.

## Context (self-contained)

- Goal: `feedback.md` item 5 — every frame HD, at the Fusion frame's size. Four of the
  six stylesheets declare `card width: 375 / card height: 523`; Fusion (genevensis)
  declares 750×1046 and ships 750px art.
- This slice: measurement only. It decides whether T12 is "drop in 2× art" or
  "drop in 2× art **and** rewrite every coordinate to 750-space".
- Out of scope here: installing the user's real packs (T12), card art (T13), render sizes
  and print masters in the pipeline (T14), the website.
- Assumptions in force: the spike uses a Pillow-upscaled copy of the **existing** vendored
  art. Nothing it produces is committed as an asset.

## What T1 already produced (do not redo)

- `hd_inputs/frames/` exists, is git-ignored, holds one directory per pack when the user
  drops packs in: `magic-sevenhalf.mse-style/`, `magic-m15-spellbook.mse-style/`,
  `magic-m15-sketch.mse-style/`, `magic-m15-showcase-praetor.mse-style/`.
- `.script/verify_hd_inputs.py` reports which packs are present and how many of their
  images are exactly 2× the vendored file.

## Requirements

- New script `.script/frame_resolution_probe.py`:
  - `edge_energy(path: Path, box: tuple[int,int,int,int]) -> float` — mean value of
    `ImageFilter.FIND_EDGES` over the crop, on the greyscale image.
  - `probe(pack: str, card_name: str) -> dict` — exports one print master with the vendored
    SD pack, one with a 2×-upscaled copy of the same pack, and returns
    `{"sd": float, "hd": float, "ratio": float, "control": float}` where `control` is the
    same metric on a Fusion-frame (genevensis) print master.
  - CLI: `python .script/frame_resolution_probe.py --pack magic-sevenhalf.mse-style --card "Burning Abyss - Graff"`.
- The measured crop excludes the art window and the text boxes: use the card's outer
  border ring, `box = (0, 0, 1500, 120)` on the 1500×2092 master — frame art only.
- The probe never mutates `MSE/data/` permanently: it copies the pack to a temp dir,
  writes upscaled images there, and points MSE at the temp tree by running the export
  with `MSE_DATA_DIR` (see `launcher/setup_mse.py` for how the data root is wired); if no
  such override exists, it backs up the pack directory, restores it in a `finally`, and
  refuses to run when `git status --porcelain MSE/manifest.json` is dirty.
- **Verdict rule, written into ADR 0030:**
  - `ratio >= 1.30` → MSE resamples from the source file. T12 = art swap only.
  - `ratio < 1.30` → MSE rasterises in style space. T12 must also scale every coordinate
    in the `style` file by 2 and set `card width: 750` / `card height: 1046`.
- ADR `docs/ADR/proposed/0030-hd-frames-at-750.md` is created here and its
  `## Measurement` section is filled with the real numbers, the MSE build id from
  `MSE/manifest.json` (`source.mseVersion`, `source.commit`), and the date.

## Inputs

- `MSE/data/magic-sevenhalf.mse-style/` — `bcard.jpg` … `wcard.jpg` at 375×523,
  `*pt.png` at 81×42, `imagemask_standard.png` at 311×228, plus `style`.
- `MSE/data/magic-genevensis-00-main.mse-style/elements/card/*.png` at 750×1046 — the
  control, and the size everything else is heading to.
- `.script/export_mse_renders.py` — `--print-masters` exports 1500×2092 through
  `mse_packages/essentia-print.mse-export-template`; `PRINT_WIDTH = 1500`,
  `PRINT_HEIGHT = 2092`; the template calls `write_image_file(card, width:, height:)`.
- `cards_mse/01_alpha/LOTA-0001-Alpha_0.1/01_YGO_Legend_of_the_Alpha.mse-set/card burning abyss - graff`
  — `stylesheet: sevenhalf`, a plain creature, good probe subject.
- `launcher/setup_mse.py` — owns `~/.magicseteditor/{data,resource}` symlinks and
  `--verify`.
- `MSE/manifest.json` — pins every vendored file by sha256.
- **From Depends:** T1, as listed above.

## TDD

1. **Red** — write `tests/test_frame_resolution_probe.py` first: `edge_energy` on
   synthetic images, and the guard that refuses to run on a dirty manifest.
2. **Green** — implement the probe.
3. **Refactor** — keep `edge_energy` pure; keep every MSE invocation inside `probe()`.

## Test plan

| Test | Input | Expect |
| --- | --- | --- |
| `test_edge_energy_ranks_sharp_above_blurred` | 200×200 checkerboard vs the same image through `GaussianBlur(3)` | `edge_energy(sharp) > edge_energy(blurred) * 1.5` |
| `test_edge_energy_is_crop_scoped` | image sharp only in its top strip | energy of `(0,0,200,20)` > energy of `(0,180,200,200)` |
| `test_probe_refuses_a_dirty_vendored_tree` | patched `subprocess.run` returning a non-empty `git status --porcelain` | raises `RuntimeError` with `MSE/manifest.json` in the message |
| `test_upscale_pack_doubles_every_image` | temp pack with 10×20 and 81×42 images | copies are 20×40 and 162×84, same filenames, same formats |

## Impl steps

- [x] 1. `python launcher/setup_mse.py --verify` → must pass before anything else.
- [x] 2. Create `.script/frame_resolution_probe.py` with `edge_energy`, `upscale_pack`,
      `probe`, `main`, and the dirty-tree guard.
- [x] 3. Write `tests/test_frame_resolution_probe.py` per the test plan.
- [x] 4. Run `python .script/frame_resolution_probe.py --pack magic-sevenhalf.mse-style --card "Burning Abyss - Graff"`.
      Record `sd`, `hd`, `ratio`, `control`.
- [x] 5. Repeat once for `magic-m15-spellbook.mse-style` with an Xyz card
      (`Burning Abyss - Dante`) — two packs, so a single odd result cannot decide the plan.
- [x] 6. Create `docs/ADR/proposed/0030-hd-frames-at-750.md`: context (six stylesheets, two
      sizes), the two candidate strategies, the measurement table, the verdict rule above,
      and the decision the numbers select.
- [x] 7. Link the ADR from `docs/ADR/README.md` under `## Proposed`.
- [ ] 8. Write the verdict into this plan's T12 file — one line at the top of its
      `## Requirements`, so the T12 worker does not have to re-read the ADR.
      Parent-owned dependency wiring: worker read scope forbids reading or editing T12.
- [x] 9. `python launcher/setup_mse.py --verify` again → the vendored tree must be
      byte-identical to before the spike.

## Outputs

- `.script/frame_resolution_probe.py`, `tests/test_frame_resolution_probe.py`,
  `docs/ADR/proposed/0030-hd-frames-at-750.md`, `docs/ADR/README.md`,
  and an edit to `ai-artifacts/PLAN_2026_08_10_feedback_batch/T12_install-hd-frames.md`.
- No asset, no vendored file, no render changes.

## Validation

- [x] `python -m unittest tests.test_frame_resolution_probe -v` → OK
- [x] `python -m unittest discover -s tests` → OK
- [x] `python launcher/setup_mse.py --verify` → clean, after the probe has run
- [x] `git status --porcelain MSE/` → empty
- [x] ADR 0030 `## Measurement` holds real numbers for two packs
- [x] commit msg draft: `docs(adr): measure whether 2× frame art sharpens a print master`
