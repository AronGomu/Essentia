# T1: HD input hand-off + verifier

**Plan:** `./ai-artifacts/PLAN_2026_08_10_feedback_batch.md`
**Depends:** none
**Commit outcome:** `python .script/verify_hd_inputs.py` prints, in one line per
asset class, which HD frame packs and HD card arts are present and which are
missing — so phase B can start the moment the user drops files in.

## Context (self-contained)

- Goal: `feedback.md` items 1-13. Phase B raises every MSE frame and every card art
  to HD (renders 750×1046, print masters 1500×2092). Phase B needs assets only the
  user can supply.
- This slice: frontloads **every** user interaction of the whole plan. Nothing else
  in the plan asks the user for anything.
- Out of scope here: touching `MSE/data/`, `MSE/manifest.json`, `mse_images/`,
  renders, website code. This ticket only inspects and reports.
- Assumptions in force: user supplies 4 HD frame packs (sevenhalf, m15-spellbook,
  m15-sketch, m15-showcase-praetor) and, separately, upscaled art for the 173 cards
  with no `original_images_hd/` counterpart.

## Requirements

- New script `.script/verify_hd_inputs.py`, stdlib + Pillow only (Pillow is already a
  dependency — see `.script/generate_mse_imported_image.py`).
- Staging directory, created by this ticket, `git`-ignored: `hd_inputs/frames/`.
  One subdirectory per stylesheet, named exactly as the vendored pack:
  `magic-sevenhalf.mse-style/`, `magic-m15-spellbook.mse-style/`,
  `magic-m15-sketch.mse-style/`, `magic-m15-showcase-praetor.mse-style/`.
- Script reports, per frame pack: present/absent, file count, and how many images are
  exactly 2× the vendored counterpart (`MSE/data/<pack>/<same relative path>`).
- Script reports HD card art: count of `original_images_hd/**` files, count of
  `original_images/**` files with no HD counterpart, and lists the first 5 missing.
- Exit code 0 always. This is a report, never a gate.
- `hd_inputs/` added to `.gitignore` (assets are third-party frame art; the repo is
  CC0 and cannot redistribute them — same reason `MSE/*` is ignored).
- `TODO(user)` recorded in the ticket output: name of the tool that produced
  `original_images_hd/` (nothing in the repo records it; ADR 0018 only says "manual,
  outside the repository").

## Inputs

- `MSE/data/magic-sevenhalf.mse-style/`, `magic-m15-spellbook.mse-style/`,
  `magic-m15-sketch.mse-style/`, `magic-m15-showcase-praetor.mse-style/` — the SD
  packs to compare against. Present only after `python launcher/setup_mse.py`.
- `original_images/` (223 files, 624×624), `original_images_hd/` (50 files, 1920×1920).
- `.script/original_image_assets.py` — `ORIGINAL_IMAGES_ROOT`, `card_filename`.
- **From Depends:** none.

## TDD

1. **Red** — write `tests/test_verify_hd_inputs.py` first, against temp directories.
2. **Green** — implement `.script/verify_hd_inputs.py` until green.
3. **Refactor** — keep the two report functions pure; `main()` only prints.

## Test plan

| Test | Input | Expect |
| --- | --- | --- |
| `test_frame_report_counts_double_size_images` | tmp SD pack with `a.png` 10×20, tmp HD pack with `a.png` 20×40 | `frame_report(...)` → `{"pack": "…", "present": True, "files": 1, "double": 1, "wrong_size": []}` |
| `test_frame_report_flags_wrong_size` | HD `a.png` 15×30 against SD 10×20 | `wrong_size == ["a.png"]`, `double == 0` |
| `test_frame_report_absent_pack` | staging dir without the pack | `{"present": False, "files": 0, "double": 0, "wrong_size": []}` |
| `test_art_report_lists_missing` | 3 SD files, 1 HD file | `art_report(...)` → `{"sd": 3, "hd": 1, "missing": 2, "sample": [...2 names sorted...]}` |
| `test_main_prints_one_line_per_pack` | tmp roots, patched constants | stdout has exactly 5 lines (4 frame packs + 1 art line), each `\n`-free |

## Impl steps

- [x] 1. Create `hd_inputs/frames/.gitkeep` and append to `.gitignore`:
      `# HD frame packs staged by hand; third-party art, never committed` then
      `/hd_inputs/*` and `!/hd_inputs/frames/.gitkeep`.
- [x] 2. Create `.script/verify_hd_inputs.py` with module constants
      `REPO_ROOT`, `STAGING = REPO_ROOT / "hd_inputs" / "frames"`,
      `VENDORED = REPO_ROOT / "MSE" / "data"`,
      `PACKS = ("magic-sevenhalf.mse-style", "magic-m15-spellbook.mse-style", "magic-m15-sketch.mse-style", "magic-m15-showcase-praetor.mse-style")`.
- [x] 3. Add `def frame_report(pack: str, staging: Path, vendored: Path) -> dict` — walks
      the staged pack, opens each `.png`/`.jpg` with `PIL.Image`, compares to the same
      relative path under `vendored / pack`, counts exact 2× matches.
- [x] 4. Add `def art_report(sd_root: Path, hd_root: Path) -> dict` — relative-path sets,
      `missing = len(sd - hd)`, `sample = sorted(sd - hd)[:5]`.
- [x] 5. Add `def main() -> int` printing one line per pack:
      `hd.frames <pack>: present=<yes|no> files=<n> double=<n> wrong-size=<n>`
      then one art line:
      `hd.art: sd=<n> hd=<n> missing=<n> e.g. <first 5, comma separated>`.
      `return 0` unconditionally.
- [x] 6. Add `if __name__ == "__main__": raise SystemExit(main())`.
- [x] 7. Write `tests/test_verify_hd_inputs.py` per the test plan, loading the module
      the same way `tests/test_export_mse_renders.py` does
      (`importlib.util.spec_from_file_location`).
- [x] 8. Add a `## HD inputs` section to `MSE/README.md` naming `hd_inputs/frames/`,
      the four pack names, and the 2× rule.
- [x] 9. Record `TODO(user)` in `MSE/README.md`: which upscaler produced
      `original_images_hd/`, needed so T13 can process the remaining 173 files.

## Outputs

- `.script/verify_hd_inputs.py`, `tests/test_verify_hd_inputs.py`,
  `hd_inputs/frames/.gitkeep`, `.gitignore`, `MSE/README.md`.
- New behaviour: a report command. No existing behaviour changes.

## Validation

- [x] `python -m unittest tests.test_verify_hd_inputs -v` → OK
- [x] `python -m unittest discover -s tests` → OK
- [x] `python .script/verify_hd_inputs.py` → 5 lines, exit 0, before any asset lands
- [x] app functional — no import of this module anywhere else
- [x] commit msg draft: `chore(assets): report which HD frame and art inputs are staged`
