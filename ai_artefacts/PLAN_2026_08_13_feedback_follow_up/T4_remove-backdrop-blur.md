# T4: Sharp archetype backdrops

**Plan:** `./ai_artefacts/PLAN_2026_08_13_feedback_follow_up.md`
**Depends:** T3
**Commit outcome:** Archetype photos render sharp inside `<main>` while dim/clip/scale remain; full repo verification passes.

## Context (self-contained)

- Goal: Remove blur on archetype backgrounds.
- This slice: One CSS leaf change + behavior-first browser regression + final whole-batch validation.
- Out of scope here: dim strength, image crop/position, `scale(1.01)`, content-column scope, body atmosphere, background art generation, header/home/blog/card data.
- Assumptions in force: computed no-filter value serializes `none`; 60% black gradient remains legibility layer; scale stays to avoid crop/layout drift.
- Worktree rule: planning docs are expected outputs; never edit/stage unrelated files.
- Repair input: isolated worktree lacks ignored vendored MSE fixtures. First pass copied sibling `/home/aron/projects/essentia/MSE/data` (406 files), then complete `MSE/resource` (4 dirs, 146 files); root failure narrowed to 9 ignored fixtures: `MSE/bin/magicseteditor` + 8 `MSE/fonts/*.ttf`. User explicitly approved final MSE fixture seed. Copy exact sibling files with metadata/links; never stage them. This is environment fixture seeding, not product change.

## Requirements

- Delete only `filter: blur(2px)` from `html[data-page='archetype'] main::before` in `website/src/styles/global.css`.
- Keep `linear-gradient(oklch(0.08 0 0 / 0.6), ...)`, `var(--page-photo, none)`, absolute inset, cover sizing, center position, `transform: scale(1.01)`, pointer-events none.
- Keep `html[data-page='archetype'] main { overflow: hidden; }`.
- Keep archetype body atmosphere/pattern suppression.
- E2E computed `filter === 'none'`; dim gradient still present; transform still non-none.
- Existing geometry/no-overflow/non-archetype absence tests stay green.
- Final commands validate all T1–T4 outputs + graph.

## Inputs

- `website/src/styles/global.css` selector `html[data-page='archetype'] main::before`.
- `website/tests/e2e/archetype-background.spec.ts::backdropStyles()` + current blur/dim test.
- `docs/ADR/proposed/0042-archetype-backdrop-in-content-column.md` — proposed sharp/dim target amended during planning; this ticket owns it in implementation diff.
- **From Depends:**
  - T1 commit `7aa29b171817dc7865d8417da953ea9bcacc0912`: Cards before Learn; compact link padding `0.5rem 0.25rem`; hero crop `center 0%`; baseline gates repaired; CI 780 pass.
  - T2 commit `e1c661af0d192e3244bfbb21b377723b53c4439d`: catalog schema 12; post heading metadata; `ChapterSummary` on both routes; post scroll margin; CI 783 pass.
  - T3 commit `35e4ac909416958caf08b1e75fc39c98e8fbc888`: four exact IDs null/staple with empty Same archetype relation; CI 785 pass; no MSE/asset/decklist changes.
  - All commits pushed to `origin/plan/feedback-follow-up`. `global.css` includes T1 + T2 edits. Preserve them while deleting blur.

## TDD

1. **Red** — modify browser test before CSS:
   - Rename `the photo is blurred and dimmed` → `the photo is unblurred and dimmed`.
   - Add `transform` to `backdropStyles()` return.
   - Assert `backdrop.filter === 'none'`.
   - Retain `backgroundImage` contains `linear-gradient`.
   - Assert `backdrop.transform !== 'none'`.
   - Run focused Chromium spec; confirm old `blur(2px)` fails exact no-filter assertion.
2. **Green** — delete one filter declaration. Rerun spec.
3. **Refactor** — none. Do not remove scale as “blur compensation.”

## Test plan

| Test | Input | Expect |
| --- | --- | --- |
| Sharp photo | `/archetypes/nekroz/` computed main::before | filter `none` |
| Dim veil | same | background image contains linear-gradient |
| Scale retained | same | transform != `none` |
| Main geometry | Nekroz @400 | absolute inset 0; size ≈ main; clipped; no horizontal overflow |
| Scope | Burning Abyss archetype vs Nekroz card route | photo only on archetype main |
| Full batch | all project gates | no regressions across T1–T4 |

## Impl steps

- [x] 1. Update `archetype-background.spec.ts` Red assertions/name/transform capture. Run Chromium spec; confirm failure quotes received blur value.
- [x] 2. Delete only `filter: blur(2px);` from `html[data-page='archetype'] main::before`.
- [x] 3. Rerun focused spec. Confirm filter none + dim/scale/geometry all green.
- [x] 4. Preserve planning amendment in ADR 0042: sharp filter, 60% veil, retained scale/geometry. No separate arch HTML change needed; `docs/feedback-follow-up-architecture.html` was owned by T1.
- [x] 5. Run local website CI + Chromium e2e. Full 3-browser matrix runs in GitHub `verify-website.yml`, which first installs browser system deps. If CI unavailable, stop at T1's `TODO(user)` before any local system-package install.
- [x] 6. Seed user-approved ignored `MSE/bin/magicseteditor` + 8 `MSE/fonts/*.ttf` fixtures from sibling; rerun root Python validation/linter/release gates. Criterion: root unittest, MSE lint, release validation all exit 0; `git status` shows no tracked `MSE/**` delta.
- [x] 7. Update knowledge graph through pinned interpreter.
- [x] 8. Inspect final diff: only planned source/tests/generated/plan/ADR/arch docs; unrelated dirty files untouched.

## Outputs

- Touched: `website/src/styles/global.css`, `website/tests/e2e/archetype-background.spec.ts`, `docs/ADR/proposed/0042-archetype-backdrop-in-content-column.md`.
- Public behavior: sharp dimmed archetype photos.
- API/config/migration: none.
- Verification: full repo + 3-browser matrix + graph update.

## Validation

- [x] `cd website && npx playwright test tests/e2e/archetype-background.spec.ts --project=chromium` → exit 0.
- [x] `cd website && npm run ci` → exit 0.
- [x] `cd website && npx playwright test --project=chromium` → exit 0 locally.
- [ ] GitHub Actions `verify-website.yml` → exit 0; its `npm run test:e2e` passes Chromium/Firefox/WebKit after `npx playwright install --with-deps chromium firefox webkit`.
- [x] `python -m unittest discover -s tests` → exit 0.
- [x] `python .script/lint_mse_card_style.py` → exit 0.
- [x] `python .script/release_package.py validate` → exit 0.
- [x] `"$(cat graphify-out/.graphify_python)" -m graphify update .` → exit 0; graph updated.
- [x] `git status --short` → only planned source/tests/generated/plan/ADR/arch-doc paths; no unrelated surprises.
- [ ] Manual: Burning Abyss + Nekroz backgrounds look sharp; cards/text remain legible under 60% veil.
- [x] App functional: home/header/blog/card/archetype routes satisfy T1–T4 behavior.
- [x] Commit msg draft: `fix(archetypes): remove backdrop blur`
