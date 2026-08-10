# T14: Renders 750 + print masters on

**Plan:** `./ai-artifacts/PLAN_2026_08_10_feedback_batch.md`
**Depends:** T2, T12, T13
**Commit outcome:** the open package ships 750×1046 renders and 1500×2092 print
masters, the website `display` tier is really 750px wide, and `draftResolution` is
false for every card.

## Context (self-contained)

- Goal: `feedback.md` item 5, output half — HD frames are worth nothing until the
  renders and the website tiers actually carry the pixels.
- This slice: the render pipeline, the package artifacts, and the website's image tiers.
- Out of scope here: frames themselves (T12), card art (T13), locked packages (frozen at
  their committed SD renders by policy).
- Assumptions in force: renders take their size from the stylesheet, which T12 raised to
  750×1046; print masters stay 1500×2092.

## What T2, T12 and T13 already produced (do not redo)

- T2: `.script/export_mse_renders.py` prints one line per project by default and takes
  `--verbose`; `release_package.build_artifacts(package, aggregate, *, print_masters=False, verbose=False)`
  and `release_package.rebuild(package, *, identities_path=…, artifact_builder=…, verbose=False)`
  forward it; `.script/rebuild_open_packages.py` takes `--verbose`.
- T12: all six mapped styles declare and render 750×1046; `MSE/manifest.json` pins 560
  files; `launcher/setup_mse.py --verify` passes. User frame payload stays local/ignored.
- T13: `.script/refresh_mse_card_art.py` updated 177 card-art PNGs across six editable
  projects to 4×; all 50 open-alpha cards have HD-backed art. Four draft cards without
  any canonical source were skipped unchanged. Commit `b32fcc4`.

## Requirements

- `release_package.rebuild()` exports print masters: `build_artifacts(..., print_masters=True)`.
  Add a keyword `print_masters: bool = True` to `rebuild` so `lock()` and the CLI keep
  explicit control.
- `cards_mse/01_alpha/LOTA-0001-Alpha_0.1/renders/*.png` are 750×1046.
- `cards_mse/01_alpha/LOTA-0001-Alpha_0.1/renders_print/*.png` exist, 50 files, 1500×2092,
  hashes recorded in the provenance `print` block.
- The website catalog reports, for every card: `images.width === 750`,
  `images.display.width === 750`, `images.print.width === 1500`,
  `images.print.draftResolution === false`.
- `npm run content` no longer prints the `WARNING … no print master in renders_print/` line.
- `docs/MSE.md` is corrected: the print master is now 2× the stylesheet's native
  750×1046, not 4× of 375×523.
- Image budgets stay green: `npm run budgets:check` must pass, or its thresholds are
  raised in the same commit with the new measured numbers written into the file.

## Inputs

- `.script/release_package.py`: `build_artifacts` line 660 (`print_masters` already a
  keyword, appends `--print-masters`), `rebuild` line 685, `lock` line 703,
  `validate_package(package, require_artifacts=True)`.
- `.script/export_mse_renders.py`: `PRINT_WIDTH = 1500`, `PRINT_HEIGHT = 2092`,
  `PRINT_DIR_NAME = "renders_print"`, `export_print_masters()` which already fails when a
  master is not exactly 1500×2092, and the provenance `print` block (schema 3).
- `website/scripts/content/images.mjs`: `TIERS = [{thumb,240},{display,750}]`,
  `PRINT_MASTER = { width: 1500, height: 2092, dpi: 600 }`,
  `writeDerivative(..., { withoutEnlargement: true })`,
  `draftResolution = !printMaster`, `assertPrintMasterDimensions()`.
- `website/scripts/content/orchestrator.mjs` line ~247: the `draftResolutionCount`
  warning.
- `website/scripts/render-provenance.mjs`, `website/tests/unit/render-provenance.test.ts`.
- `mse_packages/essentia-print.mse-export-template` — the template whose script calls
  `write_image_file(card, file:, width:, height:)`.
- **From Depends:** T2 `b43a09d` added quiet/verbose render flow. T12 `0647c4f`
  installed/scaled local frame payload; six styles render 750×1046; MSE verify covers
  560 files. T13 `b32fcc4` rebuilt open-alpha art/renders from HD inputs; 177 updated,
  4 draft-only no-HD skips, 0 no-image. Open alpha is ready for 750px + print rebuild.

## TDD

1. **Red** — add the render-size and print-master tests below; they fail on today's
   375×523 renders and absent `renders_print/`.
2. **Green** — flip `print_masters` on in `rebuild`, re-render, regenerate content.
3. **Refactor** — remove any now-dead "draft resolution" phrasing that no longer applies
   to the open package (keep the code path: a future package may still lack masters).

## Test plan

| Test | Input | Expect |
| --- | --- | --- |
| `tests/test_release_package.py` › `test_rebuild_requests_print_masters` | fake `artifact_builder` capturing kwargs | called with `print_masters=True` |
| `tests/test_export_mse_renders.py` › `test_print_master_dimension_guard` (existing) | 1500×2092 vs 1499×2092 | unchanged behaviour, still green |
| `website/tests/unit/card-images.test.ts` (new) › `display tier is 750 wide` | generated catalog | every card `images.display.width === 750` |
| `website/tests/unit/card-images.test.ts` › `no card is draft resolution` | generated catalog | every card `images.print.draftResolution === false` |
| `website/tests/unit/card-images.test.ts` › `render size matches the stylesheet` | generated catalog | every card `images.width === 750 && images.height === 1046` |
| shell check | `python -c "from PIL import Image, pathlib; …"` over `renders/` | 50 files, all 750×1046 |
| shell check | same over `renders_print/` | 50 files, all 1500×2092 |

## Impl steps

- [x] 1. In `.script/release_package.py`, add `print_masters: bool = True` to `rebuild`'s
      keyword-only parameters and pass it into `artifact_builder(package, aggregate, print_masters=print_masters, verbose=verbose)`.
- [x] 2. Keep `lock()` explicit: pass `print_masters=True` there too, so a locked package
      freezes with its masters.
- [x] 3. Add `test_rebuild_requests_print_masters` to `tests/test_release_package.py`,
      following the existing fake-`artifact_builder` idiom in that file.
- [x] 4. `cd website && npm run cards:rebuild` — expect one `mse.render …` line reporting
      `50 rendered, 50 print masters`, then `rebuild: 1 package rebuilt`.
- [x] 5. Verify sizes:
      `python -c "import pathlib; from PIL import Image; print({Image.open(p).size for p in pathlib.Path('cards_mse/01_alpha/LOTA-0001-Alpha_0.1/renders').glob('*.png')})"`
      → `{(750, 1046)}`; same over `renders_print` → `{(1500, 2092)}`.
- [x] 6. `cd website && npm run content` → no `WARNING` line about draft resolution.
- [x] 7. Create `website/tests/unit/card-images.test.ts` with the three catalog assertions.
- [x] 8. `cd website && npm run budgets:check`. If it fails, raise the specific budget in
      `website/scripts/check-budgets.mjs` and write the measured value in the comment.
- [x] 9. Update `docs/MSE.md`: print masters are 2× the 750×1046 native size; correct the
      "exactly 4× the stylesheet's native 375 × 523" sentence.
- [x] 10. Update `docs/RELEASES.md` if it states a render size.
- [x] 11. `python .script/check_immutable_stages.py` → locked stages untouched.

## Outputs

- `.script/release_package.py`, `tests/test_release_package.py`,
  `cards_mse/01_alpha/LOTA-0001-Alpha_0.1/{renders,renders_print,render-provenance.json,package-sha256.json}`,
  `website/tests/unit/card-images.test.ts`, `docs/MSE.md`, `docs/RELEASES.md`,
  possibly `website/scripts/check-budgets.mjs`.
- Behaviour change: `rebuild` always writes print masters; the website serves real 750px
  card images and stops flagging draft resolution.

## Validation

- [x] `python -m unittest discover -s tests` → OK
- [x] `python .script/release_package.py validate cards_mse/01_alpha/LOTA-0001-Alpha_0.1` → `lifecycle valid:`
- [x] `python .script/check_immutable_stages.py` → OK
- [x] `cd website && npx vitest run tests/unit/card-images.test.ts` → pass
- [x] `cd website && npm run ci` → pass
- [ ] `cd website && npm run test:e2e` → pass — npm-cache browsers fail to launch on NixOS (`libatk-1.0.so.0` missing); prescribed `npx playwright test --config=playwright.config.local.ts` passed 107 tests on Chromium + WebKit with 1 expected skip.
- [ ] manual check: a card page render is visibly sharper at 100% zoom on a 1920 screen
- [x] commit msg draft: `feat(cards): ship 750×1046 renders and 1500×2092 print masters`
