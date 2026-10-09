# T3: Base-path link checker, srcset coverage, repo-base smoke

## Context

Static link audit scans only `href`/`src`; root-relative handling can incorrectly slice URLs outside configured repo base. Repo-base smoke checks home response only.

## Requirements

- Export `collectBrokenInternalLinks({ dist, base })`; sorted, deduped issue strings; preserve CLI.
- Validate base begins `/` and ends `/` unless `/`.
- Extract `href`, `src`, every `srcset` URL candidate.
- Strip query/fragment; skip `http:`, `https:`, `mailto:`, `data:`.
- Under non-root base, flag root-relative refs outside exact base prefix.
- Preserve nested relative resolution and directory `index.html` lookup.
- Resolve parent segments with browser root clamping; never inspect files outside `dist`.
- Avoid generic comma splitting that breaks data URIs.
- Repo smoke follows first section tile, observes same-origin failures/statuses, scrolls gallery card, verifies first `source[srcset]` candidate starts repo base and returns 200; retain archive/gallery assertions.
- No parser dependency, external crawling, fragments, or app URL rewrites.

## Inputs

- `website/scripts/check-links.mjs`
- `website/tests/e2e/smoke.spec.ts`
- `website/src/components/CardPicture.astro`
- `website/src/layouts/BaseLayout.astro`

## From Depends

T2 guarantees content images fail early for invalid print masters; generated publication remains safe for link checks.

## TDD / Implementation

- [x] T3.1 red: add 4 temp-dist unit tests for valid attrs/srcset, outside-base root URL, missing srcset, nested relative resolution — evidence: all 4 failed because export did not exist; import also proved old CLI side effect.
- [x] T3.2 green: implement base-aware scanner and CLI wrapper — evidence: focused Vitest 13/13 passed after URL, containment, and tag-parser review cases.
- [x] T3.3 refactor: share normalization and sort/dedupe once — evidence: helper pipeline + Set sort; focused suite remains green.
- [x] T3.4 extend repo-base browser smoke with nested route + srcset request proof — evidence: repo-base Chromium smoke 1/1 passed at 400px.
- [x] T3.5 mutation check for root-escaped missing srcset — evidence: unit fixtures report outside-base and missing candidate exact issues.
- [x] T3.6 regression: a sibling file outside `dist` cannot satisfy `deep/index.html` → `../../outside.txt` — evidence: test failed with `[]` before fix, then passed after browser-equivalent root clamping.

## Outputs

- `website/tests/unit/link-checker.test.ts`
- Updated checker and smoke test.

## Validation

- [x] `cd website && npx vitest run tests/unit/link-checker.test.ts` — 1 file, 13 tests passed.
- [x] `cd website && BASE_PATH=/YGO-x-MTG/ OUT_DIR=dist-pages SITE_URL=https://example.invalid npm run build` — 152 pages built; scans passed.
- [x] `cd website && BASE_PATH=/YGO-x-MTG/ OUT_DIR=dist-pages npm run links:check` — 152 pages clean.
- [x] `cd website && BASE_PATH=/YGO-x-MTG/ E2E_BASE_PATH=/YGO-x-MTG/ OUT_DIR=dist-pages npx playwright test tests/e2e/smoke.spec.ts --project=chromium` — 1 passed.
