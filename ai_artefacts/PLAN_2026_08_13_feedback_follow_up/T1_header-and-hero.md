# T1: Header Cards link + hero crop

**Plan:** `./ai_artefacts/PLAN_2026_08_13_feedback_follow_up.md`
**Depends:** none
**Commit outcome:** Shared header links Cards home immediately before Learn; home hero uses top-centred crop; 400 px header stays one row.

## Context (self-contained)

- Goal: Add Cards button left of Learn about Essentia. Fix homepage heart crop so Trishula head stays visible.
- This slice: Shared chrome + homepage visual correction. Both ship as one small user-visible shell/home commit.
- Out of scope here: blog chapters, identity metadata, related-card data, archetype backdrop blur, nav popovers, new deps.
- Assumptions in force: home href uses Astro `base`; 400 px remains narrowest supported width; compact utility links stay inline; exact compact padding = `0.5rem 0.25rem`.
- Accepted compact tradeoff: inner-page breadcrumb may shrink to ~23–29 px at 400 px and show mostly ellipsis. Destination buttons + one-row contract outrank crumb text at narrowest width.
- Measurement evidence: parent injected Cards into current built header, applied target compact padding, then measured 48.89 px Chromium + 48.90 px Firefox at 400 px. WebKit unavailable locally due missing `libgstreamer-1.0.so.0`; full CI matrix remains gate.
- Worktree rule: planning docs are expected outputs; never edit/stage unrelated files.
- Browser preflight: local Chromium + Firefox run. Local WebKit currently cannot launch (`libgstreamer-1.0.so.0` absent). GitHub `verify-website.yml` runs `npx playwright install --with-deps chromium firefox webkit` before full matrix and is authoritative. `TODO(user)`: approve/provide local system deps only if CI is unavailable; executor must not use sudo silently.
- Parent preflight evidence (2026-08-13): GitHub workflow ID `316268129` is active; `origin/main:.github/workflows/verify-website.yml:55-60` installs Chromium/Firefox/WebKit with `--with-deps` before matrix at lines 75-79; Actions API returned recent successful run `31384329787`. CI is available, so `TODO(user)` does not block.
- Repair input (2026-08-13): required batch-3 base fails current Prettier 3.8.1 on unchanged `website/tests/unit/docs-routes.test.ts`. Full-CI success is impossible without one mechanical Prettier-only baseline repair. This exact file is approved as narrow validation repair; no semantic edit.
- User-approved repair input (2026-08-13): after Prettier passed, full CI exposed unchanged `website/src/components/Navigation.svelte:60-61` ESLint `no-undef` errors for `Event` + `HTMLDetailsElement`. User explicitly approved narrow component-local ESLint repair. Preserve runtime behavior; do not broaden ESLint config.
- Owner approval (2026-08-13): user stated exactly `I approve current display and print render bytes; sync asset-rights inventory.` Sync generated 100-record inventory into owner approval. Preserve approval identity/policy/scope; refresh approval date only according to existing schema convention. Do not alter render bytes.

## Requirements

- `website/src/layouts/BaseLayout.astro` utility order = Cards, Learn about Essentia, Blog, Decks.
- Cards anchor uses `href={base}`. `aria-current="page"` only when `Astro.url.pathname === base`.
- Cards full + short labels both equal `Cards`.
- `website/scripts/check-chrome.mjs::UTILITY_LINKS` requires Cards at path `''` plus exact 4-link order.
- At ≤44rem, `.utility-menu a` padding = `0.5rem 0.25rem`.
- `website/shared/header-row.mjs` models measured compact widths: Cards 48.9, Learn 48.0, Blog 40.1, Decks 51.3 px. Controls total 294.1 px. With zero-width breadcrumb item + 7 conservative outer gaps: `294.1 + 7×7.2 = 344.5`; without crumb + 6 gaps: `294.1 + 6×7.2 = 337.3`; available = 368 px. `UTILITY_GAP` = 3×5.6 = 16.8 px, cross-checked but intentionally excluded from conservative budget.
- `.hero-art` resolves `object-position: center 0%` at desktop + phone widths.
- Base-path build keeps Cards href at configured site root.

## Inputs

- `website/src/layouts/BaseLayout.astro` — `.utility-menu` markup, `base`, `Astro.url.pathname`.
- `website/src/styles/global.css` — `.hero-art`; ≤44rem `.utility-menu a` override.
- `website/shared/header-row.mjs` — `HEADER_CONTROLS`, `UTILITY_GAP`, `headerRowBudget()`.
- `website/scripts/check-chrome.mjs` — `UTILITY_LINKS`, `hrefsIn()`, `chromeIssues()`.
- `website/tests/unit/{compact-header,header-row,chrome,hero-art}.test.ts`.
- `website/tests/e2e/{header-row,showcase}.spec.ts`.
- `website/tests/unit/docs-routes.test.ts` — repair-only input; format mechanically with project Prettier, no semantic edit.
- `website/src/components/Navigation.svelte` — user-approved repair-only input; remove exact DOM-global ESLint failures through minimal component-local typing without runtime behavior change.
- `website/content/asset-rights.json` + generated `website/src/generated/rights-inventory.json` — owner-approved repair inputs; replace approval `assets` with exact generated inventory, preserve policy/scope/identity, update approval date per schema; never alter renders.
- `website/scripts/rights.mjs`, `website/scripts/check-rights.mjs`, `website/tests/unit/asset-rights.test.ts` — read-only validation contract for approved inventory sync.
- `docs/ADR/proposed/0029-compact-header-at-phone-widths.md` + `docs/feedback-follow-up-architecture.html` — proposed target docs created during planning; this ticket owns them in implementation diff. Do not weaken code to dodge target.
- **From Depends:** none.

## TDD

1. **Red** — add/modify tests first:
   - `compact header utility links > Cards links home immediately before Learn about Essentia`: isolate `.utility-menu`; assert `href={base}` Cards anchor occurs directly before docs anchor; literal labels survive.
   - `check-chrome > flags Cards after Learn about Essentia`: swap first two fixture hrefs; assert exact order issue.
   - Update every `website/tests/unit/chrome.test.ts` compliant utility-nav fixture to 4 links; add missing-Cards regression.
   - `header-row constants track global.css > budget covers exactly the rendered controls`: expect `utility-cards` before `utility-learn`.
   - Rename existing `the compact header fits 400px with a breadcrumb` to `the compact header fits 400px with four utility links and a breadcrumb`; expect `contentPx === 344.5`, `availablePx === 368`, `fits === true`.
   - Keep existing `fits at 400px with a breadcrumb` as boolean-only duplicate guard.
   - Rename existing `the compact header fits 400px without one` to `the compact header fits 400px with four utility links and no breadcrumb`; expect `contentPx === 337.3`, `fits === true`.
   - `hero art > keeps the home crop at the image top`: use `resolve()` against `.hero-art`; expect `center 0%` at 1440 + 400.
   - Rename e2e tests to `the four section links are inline at every width` + `header keeps its four section links inline at 400px`; assert Cards visible, first, home-bound, same header row, zero overflow. At 400 px, assert Cards rendered width is within ±5 px of 48.9 so intrinsic-width model cannot become tautological while allowing WebKit font-metric variance.
2. **Green** — min markup/CSS/gate/model edits. No component or runtime JS.
3. **Refactor** — update stale 3-link comments/counts only. Keep tests green.

## Test plan

| Test | Input | Expect |
| --- | --- | --- |
| Header source order | `.utility-menu` source | Cards anchor immediately precedes Learn anchor |
| Chrome gate order | built-fixture links swapped | `chromeIssues()` reports invalid utility order |
| Base path | `BASE_PATH=/YGO-x-MTG/` build | Cards href = `/YGO-x-MTG/` |
| Compact model | 400 px + breadcrumb | 344.5 ≤ 368; no modeled overflow |
| Browser geometry | 400×800 home + inner route | one row; `scrollWidth === clientWidth` |
| Hero crop | 1440 + 400 CSS resolution | `center 0%` both widths |
| A11y | homepage header Axe scan | no violations; Cards accessible as `Cards` |

## Impl steps

- [x] 1. Confirm GitHub `verify-website.yml` full browser matrix is available for T4. If unavailable, stop at `TODO(user)` for local WebKit system deps; never run sudo/package install silently. Criterion: latest workflow query reports active/recent successful availability.
- [x] 2. Add Red unit/e2e assertions above. Run focused Vitest; confirm failure from missing Cards + old crop/budget. Criterion: focused Vitest exits nonzero with failures tied to new Cards/crop/budget assertions before production edits.
- [x] 3. In `BaseLayout.astro`, insert Cards anchor before docs anchor: `href={base}`, current only on `Astro.url.pathname === base`, full/short `Cards` spans. Criterion: source assertion proves exact anchor order, href, current-page condition, and labels.
- [x] 4. In `check-chrome.mjs`, prepend `{ label: 'Cards', path: '' }` to `UTILITY_LINKS`; set `expectedUtilityHrefs = UTILITY_LINKS.map(({ path }) => base + path)`; when `JSON.stringify(hrefsIn(navBlock).slice(0, expectedUtilityHrefs.length)) !== JSON.stringify(expectedUtilityHrefs)`, push `file + ': header utility links are out of order'`. Criterion: focused `chrome.test.ts` passes exact four-link order regressions.
- [x] 5. In `chrome.test.ts`, add `<a href="${base}">Cards</a>` before docs in every compliant fixture; add missing + reordered Cards tests. Criterion: focused `chrome.test.ts` exits 0 and both new regressions detect order errors.
- [x] 6. In ≤44rem `global.css`, change `.utility-menu a` from `padding: 0.5rem 0.55rem` to `padding: 0.5rem 0.25rem`. Criterion: compact-header unit assertion resolves exact `0.5rem 0.25rem` padding at 400 px.
- [x] 7. In `header-row.mjs`, add `utility-cards` `{ px: 48.9, intrinsicPx: 40.9 }`; set Learn/Blog/Decks `px` to 48/40.1/51.3 with existing intrinsic widths; make `UTILITY_GAP` 16.8 from 3 gap refs; rewrite 3-link comments to 4-link comments. Criterion: header-row unit assertions pass exact constants/order/totals.
- [x] 8. Update `header-row.test.ts` exact control order + 344.5/337.3 totals. Criterion: focused `header-row.test.ts` exits 0 with exact totals.
- [x] 9. Extend `header-row.spec.ts` + `showcase.spec.ts` with Cards order/href/visibility; keep existing no-wrap/no-console assertions. Criterion: focused Chromium Playwright exits 0 with Cards first/home-bound/inline and zero overflow.
- [x] 10. Change `.hero-art` `object-position` from `center 24%` to `center 0%`. In `hero-art.test.ts`, import `readFileSync` from `node:fs` + `resolve` from `../support/css`; read `../../src/styles/global.css` through `new URL(..., import.meta.url)`; assert `resolve(css, '.hero-art', 'object-position', 1440)` + width 400 both equal `center 0%`. Criterion: focused `hero-art.test.ts` exits 0 at both widths.
- [x] 11. Preserve planning amendment in ADR 0029. Update `docs/website-shell-chrome.html` + `docs/website-information-architecture.html`: 4-link order, Cards base-aware root, 344.5 px budget, no popover. Preserve `docs/feedback-follow-up-architecture.html` target summary. Criterion: diff review shows all four owned docs retain target facts without unrelated edits.
- [x] 12. Repair required-base Prettier failure in `website/tests/unit/docs-routes.test.ts` through project formatter only; verify semantic token/content intent unchanged. Criterion: diff is formatting-only and `npx prettier --check tests/unit/docs-routes.test.ts` exits 0.
- [x] 13. Repair exact `Navigation.svelte:60-61` `no-undef` failures through minimal component-local typing; preserve toggle behavior and avoid ESLint-config changes. Criterion: `npm run lint` exits 0 and focused navigation tests remain green.
- [x] 14. Sync owner-approved current display + print inventory into `website/content/asset-rights.json`; preserve schema/scope/policy/approval identity, refresh approval date per schema, never change render bytes. Criterion: generated + approved asset records match exactly and `npm run rights:check` exits 0.
- [x] 15. Run focused unit/e2e tests, base-path build, then `npm run ci`. No generated catalog change expected. Criterion: all four exact validation commands exit 0 and built root anchor href is `/YGO-x-MTG/`.

## Outputs

- Touched: `website/src/layouts/BaseLayout.astro`, `website/src/styles/global.css`, `website/shared/header-row.mjs`, `website/scripts/check-chrome.mjs`, listed unit/e2e tests, `docs/ADR/proposed/0029-compact-header-at-phone-widths.md`, `docs/website-shell-chrome.html`, `docs/website-information-architecture.html`, `docs/feedback-follow-up-architecture.html`.
- Public behavior: Cards home link on every header; top-centred homepage hero crop.
- API/config: no new API/deps. Header budget constants updated.
- Migration: none.

## Validation

- [x] `cd website && npx vitest run tests/unit/compact-header.test.ts tests/unit/header-row.test.ts tests/unit/chrome.test.ts tests/unit/hero-art.test.ts` → exit 0. Criterion: all focused unit files pass.
- [x] `cd website && npx playwright test tests/e2e/header-row.spec.ts tests/e2e/showcase.spec.ts --project=chromium` → exit 0; no wrap/overflow/Axe failure. Criterion: both focused Chromium specs pass.
- [x] `cd website && BASE_PATH=/YGO-x-MTG/ npm run build` → exit 0; built Cards href uses `/YGO-x-MTG/`. Criterion: build passes and built home header contains `href="/YGO-x-MTG/"` for Cards.
- [x] `cd website && npm run ci` → exit 0. Criterion: lint, checks, unit suite, build all pass.
- [x] Manual: 400 px home + inner route show Cards directly left of Learn; Trishula head visible in hero heart. Criterion: manual checklist records both viewport observations or current automated proxies when no interactive browser is available.
- [x] App functional: `/`, `/docs/`, `/blog/`, `/decks/`, card/archetype routes remain reachable. Criterion: build succeeds for all generated routes and focused browser route checks pass.
- [x] Commit msg draft: `fix(header): add Cards home link and correct hero crop`. Criterion: published commit subject matches exactly.
