# T10: Close the review findings

**Plan:** `./ai-artifacts/PLAN_2026_08_12_feedback_batch_2.md`
**Depends:** T1–T9 (all shipped)
**Commit outcome:** the two review blockers are fixed, no absolute home path ships in tracked content, the "byte-identical" claim is replaced by the true one, and the vacuous tests either pin behavior or are gone.

## Context (self-contained)

- Four deep read-only reviewers (correctness, security, scope-fidelity, tests) audited `f65783b..HEAD` after T1–T9 shipped. This ticket applies the accepted subset. Everything else they raised is logged as residual risk by the parent and is **out of scope here**.
- Explicitly OUT of scope (do not touch): the 5-phase rebuild output (`[3/5] print masters` wrapping no work is ADR 0034's shape), `RELATED_CAP` sharing between `related.mjs` and the card page, hover preview upscaling past the 1046 px native render, markdown images inside code spans, `sizes` over-declaration, `scan-dist.mjs` coverage of `content/`, and every pre-existing card-text/lint/rights failure.
- Baseline right now: `python -m unittest discover -s tests` → 215 tests, 3 failures (card drift, pre-existing). `python .script/lint_mse_card_style.py` → 248 findings, ~0.2s. `npx vitest run` → 774 pass + 1 known-red (`asset-rights.test.ts`, `92 missing/changed` rights records from the user's uncommitted MSE resave — never touch `content/art-provenance.json` card-render records, never approve rights). `npm run content` green.

## Requirements

- Archetype backdrops paint with `background-size: cover` on **both** `/archetypes/nekroz/` and `/archetypes/burning-abyss/`, regardless of how many layers the theme's `--page-atmosphere` contributes, and a test reads `backgroundSize` (not just the URL).
- `tests/e2e/docs-image.spec.ts` cannot flake on decode timing.
- No `/home/<user>/…` path in any tracked file this batch added.
- Every claim of "byte-identical lint output" is replaced by what is actually true.
- `ai-artifacts/manual_test_checklist.md` tells a human the truth about the post-dedupe related lists, with no self-contradiction.
- The rebuild stamp covers `website/content/identities.json`; a skipped rebuild cannot leave an empty render directory in place.
- The lint casefold prefilter cannot drop a match the reference regex would find.
- Markdown image URLs reject protocol-relative `//host/x.png`.
- Tests that cannot fail on revert are repaired or deleted — no test is left asserting nothing.

## Inputs

- `website/src/styles/global.css` — the T8 backdrop block (`background-position/repeat/size` 3-value lists layered under `--page-atmosphere`).
- `website/tests/unit/archetype-background.test.ts`, `website/tests/e2e/archetype-background.spec.ts`.
- `website/tests/e2e/docs-image.spec.ts` — `naturalWidth` read at line ~13; the `<img>` is `loading="lazy" decoding="async"`.
- `website/scripts/make-archetype-backgrounds.mjs` (~line 49 writes `entry.source`) and `website/content/art-provenance.json` (the two background entries, ~lines 37 and 43). Sibling convention to match: `website/scripts/make-hero-art.mjs:76` records a repo-relative source.
- `docs/ADR/proposed/0033-lint-precompiled-boundary-patterns.md` (Consequences), `ai-artifacts/PLAN_2026_08_12_feedback_batch_2/T1_lint-perf.md` (lines ~112 and ~125), `ai-artifacts/manual_test_checklist.md` (the T1 line asking a human to verify byte-identity).
- `ai-artifacts/manual_test_checklist.md` — stale prior-batch entries about the related lists, plus this batch's T7 entry contradicting its T6 entry about `/cards/burning-abyss-graff/`.
- `.script/release_package.py` — `rebuild_input_hash`, `STAMP_SCHEMA`, `rebuild_outputs_present`, `rebuild()` (which passes `identities_path` to `generate_aggregate`).
- `.script/lint_mse_card_style.py` — `boundary_finditer` and its `lowered` prefilter contract.
- `website/src/lib/markdown.ts` — the image branch's `url.startsWith('/')` guard.
- `tests/test_lint_performance.py` — `test_lint_compiles_a_bounded_number_of_patterns` (proven no-op: `re.finditer` goes through `re._compile`, so the `re.compile` spy counts 1 either way) and `test_findings_are_hash_seed_stable` (passes on two crashed runs).
- `tests/test_rebuild_progress.py` — nothing pins that `export()` / `export_print_masters()` in `.script/export_mse_renders.py` actually call `report_progress` per card, nor that `main()` forwards `quiet`.
- `website/tests/e2e/related-cards.spec.ts` — `bothCategoriesCard` + two `test.skip` guards; today exactly one card (`tour-guide-from-the-underworld`) qualifies.
- `website/tests/unit/card-related-band.test.ts:22-27` — `source.indexOf('</div>', transcriptionOpen)` finds `.card-facts`'s close, not the transcription's.

## TDD

1. **Red** — for each behavior fix, write or repair the test first and watch it fail (backdrop `backgroundSize`, stamp vs `identities.json`, empty render dir, casefold prefilter, protocol-relative URL, per-card progress call sites).
2. **Green** — apply the fix.
3. **Refactor** — none.

## Test plan

| Test | Input | Expect |
| --- | --- | --- |
| e2e `backdrop covers the viewport` | `/archetypes/nekroz/` and `/archetypes/burning-abyss/` | computed `backgroundSize` for the photo layer is `cover` on both |
| e2e `docs image renders` | `docs/PRESENTATION.md` page | passes under `--repeat-each=4` and in a full parallel run; waits for decode instead of reading `naturalWidth` once |
| unit provenance source | `website/content/art-provenance.json` | no entry `source` matches `/home/` |
| python `stamp covers identities` | rebuild, then edit `website/content/identities.json` | `rebuild_is_current()` is False / a second rebuild does not skip |
| python `empty render dir is not "present"` | package with `renders/` present but empty | `rebuild_outputs_present()` False → rebuild runs |
| python `prefilter keeps unicode matches` | `boundary_finditer("Discard", "DİSCARD", lowered=…)` vs `re.finditer(rf"(?<![\w])Discard(?![\w])", …, re.I)` | same match count |
| python `per-card progress is emitted` | `export()` with a stubbed renderer, 3 cards | 3 `mse.render i/3 …` lines; `quiet=True` prints none |
| unit markdown `rejects protocol-relative image` | `![a](//evil.example/x.png)` | throws, same style as the existing unsupported-scale error |
| e2e related both-categories | catalog | `expect(bothCategoriesCard).toBeDefined()` before any `test.skip`, so an empty match is red, not silently skipped |
| unit related band structure | `cards/[id].astro` source | assertion fails if the related sections are nested back inside `.card-transcription` after `card-facts` |

## Impl steps

- [x] 1. `website/src/styles/global.css`: replace the 3-value `background-position` / `background-repeat` / `background-size` lists in the backdrop block with single values (`50% 50%`, `no-repeat`, `cover`) so layer-count cycling cannot leave the photo at `auto`. Gradients have no intrinsic size, so single values are a no-op for them — validate: the new e2e assertion below reads `cover` on both archetype pages.
- [x] 2. Extend `website/tests/e2e/archetype-background.spec.ts` to assert the computed `backgroundSize` contains `cover` on `/archetypes/nekroz/` **and** `/archetypes/burning-abyss/` — validate: spec red before step 1 on nekroz, green after.
- [x] 3. `website/tests/e2e/docs-image.spec.ts`: await decode before measuring (e.g. `expect.poll(() => img.evaluate(el => el.naturalWidth))` or `img.evaluate(el => el.complete ? null : new Promise(r => el.addEventListener('load', r, {once:true})))`), keeping the same assertion intent — validate: `steam-run npx playwright test tests/e2e/docs-image.spec.ts --repeat-each=4` green **and** a full 6-spec parallel run green.
- [x] 4. `website/scripts/make-archetype-backgrounds.mjs`: record `path.basename(sourcePath)` (or `owner-supplied (outside repo)`) as `entry.source`; hand-edit the two existing entries in `website/content/art-provenance.json` to match. Touch only those two entries — validate: `grep -r '/home/' website/content/art-provenance.json` returns nothing.
- [x] 5. Replace the false byte-identical claim in all three places (ADR 0033 Consequences, `T1_lint-perf.md` lines ~112/~125, the T1 line in `ai-artifacts/manual_test_checklist.md`) with the measured truth: same 248 findings, same files, lines and rule codes; one MSE008 message changes (`'Shurit'` → `'Nekroz'` on `card nekroz - shurit:19`) because equal-length alias ties used to depend on set iteration order and are now deterministic; the new output is stable across `PYTHONHASHSEED` — validate: the checklist no longer asks a human to verify byte-identity.
- [x] 6. `ai-artifacts/manual_test_checklist.md`: fix the stale related-list entries so they describe post-dedupe reality — Tour Guide's Burning Abyss fetch targets now live under `Same archetype`, and `/cards/burning-abyss-graff/` renders only the `Same archetype` block. Remove the contradiction between this batch's T7 and T6 entries. Do not delete unrelated sections — validate: no two lines in the file state opposite expectations for the same URL.
- [x] 7. `.script/release_package.py`: fold `sha256_file(identities_path)` into `rebuild_input_hash`, bump `STAMP_SCHEMA`, and make `rebuild_outputs_present` require the render directories to be non-empty — validate: the two new python tests below.
- [x] 8. Add those two tests to `tests/test_rebuild_stamp.py` — validate: `python -m unittest tests.test_rebuild_stamp -v` green, and each fails against the pre-step-7 code.
- [x] 9. `.script/lint_mse_card_style.py`: guard the casefold prefilter against non-length-preserving folds (e.g. skip the prefilter when `len(lowered) != len(text)`), and add the unicode test to `tests/test_lint_performance.py` — validate: `boundary_finditer` matches the reference regex on `"DİSCARD"`; full lint still 248 findings and under 2s.
- [x] 10. `website/src/lib/markdown.ts`: reject protocol-relative URLs in the image branch, with a test — validate: `![a](//evil.example/x.png)` throws; `![a|60%](/x.webp)` still renders.
- [x] 11. Repair the vacuous tests in `tests/test_lint_performance.py` — validate: each fails against reverted code, or is deleted.
  - [x] 11a. `test_lint_compiles_a_bounded_number_of_patterns`: assert something a revert breaks (e.g. `_boundary_pattern.cache_info()` misses stay bounded while `lint()` runs the fixture) or delete the test outright rather than keep a no-op.
  - [x] 11b. `test_findings_are_hash_seed_stable`: assert both runs exited as expected and produced non-empty stdout before comparing.
- [x] 12. Pin the per-card progress call sites: add a test that `export()` / `export_print_masters()` in `.script/export_mse_renders.py` emit one `mse.render i/N` / `mse.print i/N` line per card and print nothing under `quiet=True` — validate: deleting a `report_progress(...)` call turns it red.
- [x] 13. `website/tests/e2e/related-cards.spec.ts`: assert `bothCategoriesCard` exists before the `test.skip` guards, so an empty match fails instead of silently skipping — validate: spec still green today; red if the fixture disappears.
- [x] 14. `website/tests/unit/card-related-band.test.ts`: make the "not inside the transcription" assertion actually locate the transcription's closing tag (or assert against the parsed structure) so re-nesting after `card-facts` turns it red — validate: red when the related sections are moved back inside `.card-transcription` in a scratch copy.

## Outputs

- Files touched: `website/src/styles/global.css`, `website/tests/e2e/archetype-background.spec.ts`, `website/tests/e2e/docs-image.spec.ts`, `website/scripts/make-archetype-backgrounds.mjs`, `website/content/art-provenance.json`, `docs/ADR/proposed/0033-lint-precompiled-boundary-patterns.md`, `ai-artifacts/PLAN_2026_08_12_feedback_batch_2/T1_lint-perf.md`, `ai-artifacts/manual_test_checklist.md`, `.script/release_package.py`, `.script/lint_mse_card_style.py`, `tests/test_rebuild_stamp.py`, `tests/test_lint_performance.py`, `tests/test_rebuild_progress.py`, `website/src/lib/markdown.ts`, `website/tests/unit/markdown.test.ts`, `website/tests/e2e/related-cards.spec.ts`, `website/tests/unit/card-related-band.test.ts`.
- Public API change: none. `STAMP_SCHEMA` bump invalidates existing stamps once (next rebuild runs in full).

## Validation

- [x] `python -m unittest discover -s tests` — 3 failures, no new ones. Evidence: `Ran 223 tests` / `FAILED (failures=3)`, same three names as the baseline (`test_checked_in_canonical_cards_pass`, `test_key_mechanics_present`, `test_every_card_uses_english_rule_contract`).
- [x] `python .script/lint_mse_card_style.py` — 248 findings, under 2s. Evidence: `248 card-style violation(s).`, `real 0m0.238s`; output byte-identical to the pre-prefilter-fix capture.
- [ ] `python .script/rebuild_open_packages.py` then again — first run rebuilds (stamp schema bumped), second prints `unchanged, skipped` under 1s. **Skipped deliberately:** the working tree carries ~425 uncommitted card/render changes from the owner's MSE resave, and a live rebuild would rewrite those renders and provenance. Verified read-only instead: the existing stamp for `LOTA-0001-Alpha_0.1` reports `schemaVersion 1` against `STAMP_SCHEMA 2`, so `rebuild_is_current()` is `False` and the next rebuild runs in full. Skip/rebuild behaviour itself is covered by `tests/test_rebuild_stamp.py`.
- [x] `cd website && npx vitest run` — only `asset-rights.test.ts` red. Evidence: `Test Files 1 failed | 70 passed (71)`, `Tests 1 failed | 776 passed (777)`, failure is `Public artifact blocked: 92 missing/changed and 0 stale rights records` (pre-existing, owner's resave).
- [x] `cd website && npm run check && npm run lint && npm run format:check && npm run build`. Evidence: `0 errors, 0 warnings, 5 hints`; eslint silent; `All matched files use Prettier code style!`; build `dist scan: clean`.
- [x] `cd website && steam-run npx playwright test` (full e2e, with the shim) — green, and `--repeat-each=4` on `docs-image.spec.ts` green. Evidence: `205 passed (1.1m)`, 2 skipped (no-relations and truncated-interaction fixtures absent); repeat-each run `12 passed`.
- [x] `grep -rn '/home/' website/content/art-provenance.json` — no match. Evidence: grep exit 1, no output.
- [x] commit msg draft: `fix(review): close feedback batch 2 review findings`
