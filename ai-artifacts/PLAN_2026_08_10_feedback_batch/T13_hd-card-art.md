# T13: Card art 4× into `mse_images/`

**Plan:** `./ai-artifacts/PLAN_2026_08_10_feedback_batch.md`
**Depends:** T1
**Commit outcome:** every MSE card whose illustration has an HD source carries art
regenerated at 4× its current pixel size, from `original_images_hd/`, and the script
reports every card it had to skip.

## Context (self-contained)

- Goal: `feedback.md` item 6 — replace the art used by the Magic Set Editor cards with
  the upscaled version of the original art.
- This slice: `mse_images/*.png` inside the editable MSE projects.
- Out of scope here: frames (T11, T12), render/print sizes (T14), the website, locked
  packages (immutable — `cards_mse/02_beta`, `cards_mse/03_release`, any package whose
  `release.json` says `locked`).
- Assumptions in force: 4× current art dimensions. Result is 177 updated. AronGomu
  accepted four permanent batch skips left untouched: `Absolute King Back Jack`,
  `Crane Crane`, `Fiend Griefing`, `Fiendish Rhino Warrior`.

## What T1 already produced (do not redo)

- `python .script/verify_hd_inputs.py` prints an `hd.art:` line with
  `sd=<n> hd=<n> missing=<n>` and the first five missing relative paths.
- `MSE/README.md` carries `TODO(user)` for unknown upscaler tool/settings. The 173
  local/untracked source inputs now exist but remain ignored; generated MSE art is tracked.

## Requirements

- New script `.script/refresh_mse_card_art.py`:
  - `target_size(path: Path, factor: int = 4) -> tuple[int, int]` — current PNG size × factor.
  - `source_for(card_name: str) -> Path | None` — the HD path if it exists, else `None`.
    It resolves through the same name mapping the repo already uses: the cube name →
    official name map in `.script/ensure_original_images.py` (`NAME_MAP`), then
    `.script/original_image_assets.py` `card_filename()` / `card_type_folder()`, with the
    root swapped from `original_images/` to `original_images_hd/`.
  - `refresh_project(project: Path, factor: int = 4, dry_run: bool = False) -> dict` —
    walks every `card *` file, reads its `image:` field, regenerates that PNG from the HD
    source at 4× using cover-crop LANCZOS, returns
    `{"updated": [...], "skipped_no_hd": [...], "skipped_no_image": [...]}`.
  - CLI: `python .script/refresh_mse_card_art.py <project> [--factor 4] [--dry-run]`,
    printing one line: `mse.art <project stem>: <n> updated, <n> no-HD, <n> no-image`.
- Cover-crop must reuse the existing geometry rule, not invent one:
  `scale = max(width / src_w, height / src_h)`, resize, centre-crop — copied from
  `.script/fix_mse_project_images.py::resize_cover`.
- The card file's `image:` field is **not** rewritten: same filename, new pixels.
- Projects to process, in this order:
  1. `cards_mse/00_drafts/00_non_archetype/*.mse-set` … `04_spellbook/*.mse-set`
  2. `cards_mse/01_alpha/LOTA-0001-Alpha_0.1/01_YGO_Legend_of_the_Alpha.mse-set`
  The generated aggregate (`*_all_cards.mse-set`) is **never** edited by hand — T14's
  rebuild regenerates it.
- A locked package must abort the script: reuse `release_package.package_is_locked`.

## Inputs

- Card file shape: `image: mse_images/burning-abyss-graff-image.png` inside
  `cards_mse/01_alpha/LOTA-0001-Alpha_0.1/01_YGO_Legend_of_the_Alpha.mse-set/card burning abyss - graff`.
- Current art sizes: most cards ~316×231; `book-of-moon-image.png` is 745×1040 (full-art
  frame). 4× therefore means 1264×924 and 2980×4160 respectively — the rule is relative,
  never absolute.
- `original_images_hd/` — 50 files at 1920×1920, mirroring `original_images/`'s
  `<Card type folder>/<Official name>.jpg` layout. `Fusion/` and `Link/` are absent.
- `.script/fix_mse_project_images.py` — `IMAGE_FIELDS`, `resize_cover(source, output, width, height)`.
- `.script/original_image_assets.py` — `card_filename`, `card_type_folder`,
  `ORIGINAL_IMAGES_ROOT`.
- `.script/ensure_original_images.py` — `NAME_MAP` from cube name to official name.
- `.script/release_package.py` — `package_is_locked(package)`.
- `.script/mse_content.py` — existing helpers for reading MSE card files; prefer them over
  a new parser.
- **From Depends:** T1, as listed above.

## TDD

1. **Red** — write `tests/test_refresh_mse_card_art.py` first, over a temp project.
2. **Green** — implement the script.
3. **Refactor** — import `resize_cover` rather than copying it; if it must move, move it to
   `.script/original_image_assets.py` and update both callers.

## Test plan

| Test | Input | Expect |
| --- | --- | --- |
| `test_target_size_multiplies_current_dimensions` | temp PNG 316×231, factor 4 | `(1264, 924)` |
| `test_refresh_replaces_pixels_and_keeps_the_path` | temp project, 1 card, HD source present | file at the same path, size `(1264, 924)`, card file byte-identical |
| `test_refresh_skips_cards_without_hd_source` | temp project, no HD file | `skipped_no_hd == ['<card>']`, PNG unchanged (same sha256) |
| `test_refresh_skips_empty_image_fields` | card with `image:` empty | counted in `skipped_no_image`, no exception |
| `test_refresh_refuses_a_locked_package` | temp locked `release.json` | raises, message contains `locked` |
| `test_cli_prints_one_line` | `--dry-run` on the temp project | stdout is exactly one line matching `^mse\.art ` |

## Impl steps

- [x] 1. `python .script/verify_hd_inputs.py` → note the `hd.art:` numbers before the run.
- [x] 2. Create `.script/refresh_mse_card_art.py` with the four functions and the CLI.
- [x] 3. Write `tests/test_refresh_mse_card_art.py` per the test plan.
- [x] 4. Dry-run every project:
      `for p in cards_mse/00_drafts/*/*.mse-set cards_mse/01_alpha/LOTA-0001-Alpha_0.1/01_YGO_Legend_of_the_Alpha.mse-set; do python .script/refresh_mse_card_art.py "$p" --dry-run; done`
      Record the totals.
- [x] 5. Run for real on the same list.
- [x] 6. Spot-check three regenerated PNGs: dimensions are 4× and the crop framing matches
      the old file (open both, compare the centre 20% visually).
- [x] 7. `python .script/lint_mse_card_style.py` → no new findings.
- [x] 8. Rebuild the open package so the aggregate and hashes follow the new art:
      `cd website && npm run cards:rebuild`.
- [x] 9. Record 177 updated + four named user-accepted permanent skips in
      `MSE/README.md`. Do not fetch, fabricate, or upscale those four.
- [x] 10. Ignore future/untracked `original_images_hd/**`; existing tracked 50 remain
      tracked. Future publication requires force-add plus rights review.

## Outputs

- `.script/refresh_mse_card_art.py`, `tests/test_refresh_mse_card_art.py`,
  `cards_mse/00_drafts/**/mse_images/*.png`,
  `cards_mse/01_alpha/LOTA-0001-Alpha_0.1/**` (art, aggregate, `package-sha256.json`,
  `render-provenance.json`, `renders/`), `MSE/README.md`.
- Behaviour change: MSE cards carry 4× art. Renders change because the art changed.

## Validation

- [x] `python -m unittest tests.test_refresh_mse_card_art -v` → OK
- [x] `python -m unittest discover -s tests` → OK
- [x] `python .script/release_package.py validate cards_mse/01_alpha/LOTA-0001-Alpha_0.1` → `lifecycle valid:`
- [x] `python .script/check_immutable_stages.py` → no locked package touched
- [x] `cd website && npm run ci` → pass
- [ ] manual check: open one updated card in MSE, illustration visibly sharper
- [x] scope exception: four named cards retain prior MSE art by explicit user approval
- [x] commit msg draft: `feat(cards): regenerate MSE card art from the HD originals at 4×`
