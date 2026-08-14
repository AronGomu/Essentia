# T5: Responsive docs table + inline-code reflow

## Context

Docs tables and long inline code can force horizontal page overflow on 320px screens. Preformatted blocks already scroll horizontally and must stay unchanged.

## Requirements

- At phone width, `.reading-body table { table-layout: fixed; }`.
- At phone width, reading table cells use `overflow-wrap: anywhere`.
- At phone width, inline non-pre code uses `overflow-wrap: anywhere` and `word-break: break-word`.
- Preserve `pre` horizontal scrolling.
- Scope rules only to reading tables and inline code; no markup/content changes.

## Inputs

- `website/src/styles/global.css`
- `/docs/releases/` rendered from `docs/RELEASES.md`
- Existing docs Playwright conventions.

## From Depends

T4 makes `/docs/releases/` and docs landing routes part of complete sitemap; route remains publication-visible for responsive validation.

## TDD / Implementation

- [x] T5.1 red: add 320×800 e2e asserting table/inline code existence, no page overflow, bounded edges, and `pre` overflow-x auto — evidence: before CSS, document scrollWidth 545 vs clientWidth 320.
- [x] T5.2 green: add scoped rules under existing phone media query — evidence: focused Chromium responsive test passed.
- [x] T5.3 refactor: reuse existing reading/mobile blocks; leave pre rules unchanged — evidence: combined docs regression run 6/6 passed; pre still computes `overflow-x: auto`.
- [x] T5.4 update manual checklist for `/docs/releases/`, `/docs/mse/`, `/docs/context/` at 320px — evidence: 5 website-audit sections appended without overwriting prior entries.

## Outputs

- `website/tests/e2e/docs-responsive.spec.ts`
- Updated responsive CSS.
- Updated `ai-artifacts/manual_test_checklist.md`.

## Validation

- [x] `cd website && npx playwright test tests/e2e/docs-responsive.spec.ts --project=chromium` — 1 passed.
- [x] `cd website && npx playwright test tests/e2e/docs-image.spec.ts tests/e2e/docs-rail.spec.ts --project=chromium` — combined retry 5 related tests passed; first parallel run had one transient localStorage persistence failure, isolated rerun passed 4/4.
- [x] `cd website && npm run ci` — final run: 77 unit files/818 tests passed; format, lint, type/Astro check, 152-page build/scans passed. `npm run test:e2e` ran: Chromium + Firefox 163 passed/1 skipped; WebKit 82 launch failures because host lacks `libgstreamer-1.0.so.0` (environment blocker, no test bodies ran).
- [x] Manual 320px checks are recorded for `/docs/releases/`, `/docs/mse/`, `/docs/context/`.
