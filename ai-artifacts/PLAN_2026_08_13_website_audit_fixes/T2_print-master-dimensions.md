# T2: Validate print-master dimensions before publication

## Context

`assertPrintMasterDimensions()` exists but `findPrintMaster()` does not call it. Any safe PNG can be published while catalog dimensions claim 1500×2092.

## Requirements

- Preserve `findPrintMaster(packageRoot, cardName)` API.
- Read selected master metadata with Sharp and `limitInputPixels: 80_000_000`.
- Enforce exact 1500×2092 before return.
- Preserve current absent/non-directory/missing-or-unsafe filename → `null` behavior.
- Never catch dimension assertion; exact failure identifies card and actual/expected dimensions.
- Keep draft fallback unchanged. Never alter tracked card assets.

## Inputs

- `website/scripts/content/images.mjs`
- `website/tests/unit/image-cache.test.ts`

## From Depends

T1 leaves website unit runner and package install-script policy green; no code API consumed here.

## TDD / Implementation

- [x] T2.1 red: add wrong-sized temp master rejection and valid metadata validator tests; retain missing-master test — evidence: wrong-size test resolved path instead of rejecting before impl.
- [x] T2.2 green: inspect selected safe file metadata and assert dimensions — evidence: focused image suites 25/25 passed.
- [x] T2.3 refactor: keep direct implementation/no new abstraction — evidence: impl changes only selected-file metadata/assertion flow.
- [x] T2.4 mutation check: bypass assertion call — evidence: pre-impl red run proves bypass resolves instead of rejecting.

## Outputs

- Updated print-master discovery enforcement.
- Focused regression tests in image cache suite.

## Validation

- [x] `cd website && npx vitest run tests/unit/image-cache.test.ts tests/unit/card-images.test.ts` — 2 files, 25 tests passed.
- [x] `cd website && npm run content:check` — 1 release, 3 sections, 50 cards, 50 versions, 82 keywords, 38 docs, 2 posts.
- [x] `cd website && npm run check` — 185 files checked, 0 errors; 5 pre-existing hints.
