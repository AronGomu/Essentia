# T6: Flash-free fade transition

**Plan:** `./ai-artifacts/PLAN_2026_08_07_website-feedback-pass-2.md`
**Depends:** none
**Commit outcome:** Cross-page navigation is a single simultaneous cross-fade with no white frame at any point.

## Context (self-contained)

- Goal: ship feedback batch 2 on the Astro site under `website/`.
- This slice: the feedback line *"There are still Transition with white flash. Replace with
  fade animation."*
- Out of scope here: the hero `archive-enter` clip-path animation, hover/zoom motion,
  the catalog rail slide (T5), any layout change.
- Assumptions in force: none specific.

## Current implementation and why it flashes

`website/src/styles/global.css`, unlayered block at lines 1478-1506:

```css
html { background-color: var(--blackfoil); }
@view-transition { navigation: auto; }
::view-transition-group(root) { background-color: var(--blackfoil); }
::view-transition-old(root) { animation: fade-to-black 130ms ease-in both; }
::view-transition-new(root) { animation: fade-from-black 190ms ease-out 60ms both; }
@keyframes fade-to-black { to { opacity: 0; } }
@keyframes fade-from-black { from { opacity: 0; } }
main { animation: fade-from-black 220ms ease-out both; }
```

Two causes, both fixed here:

1. **Uncovered window.** The outgoing snapshot is fully transparent at 130 ms while the
   incoming snapshot is still at ~37 % opacity, and does not finish until 250 ms. For
   ~120 ms the compositor shows whatever is behind the view-transition tree — the page
   canvas. That is the flash.
2. **Canvas default is white.** `color-scheme: dark` is declared in CSS
   (`:root` in `@layer tokens`, line 5), which the browser can only honour once the
   stylesheet has parsed. Before that, and for the transition canvas, the default is white.
   The reliable fix is the `<meta name="color-scheme" content="dark">` document hint, which
   applies before any stylesheet loads.

`main { animation: fade-from-black … }` also re-fades the content a second time after the
view transition already faded it in — a visible double-dip. Remove it.

## Requirements

- `::view-transition-old(root)` and `::view-transition-new(root)` run the **same duration**
  with **zero delay**, so the pair always sums to full coverage.
- `::view-transition-image-pair(root) { isolation: auto; }` and
  `::view-transition-old(root), ::view-transition-new(root) { mix-blend-mode: normal; }`
  — the true cross-fade recipe; without it the default `isolation: isolate` blends the
  pair against transparency and dips.
- Every page carries `<meta name="color-scheme" content="dark">` before any stylesheet.
- The `main` entry animation is removed.
- The `prefers-reduced-motion` block still disables the transition.
- A build gate proves the meta tag is on every page; a unit test proves the CSS invariant.

## Inputs

- `website/src/styles/global.css` lines 894-937 (`@layer motion`, including the
  reduced-motion block that names `::view-transition-old(root)`,
  `::view-transition-new(root)` and `main`) and lines 1478-1506.
- `website/src/layouts/BaseLayout.astro` lines 66-77 (`<head>`: charset, viewport,
  `theme-color`, CSP meta, `<Seo …/>`).
- `website/scripts/check-chrome.mjs::chromeIssues(file, html, base)` — returns an array of
  problem strings; `website/tests/unit/chrome.test.ts` unit-tests it.
- **From Depends:** none.

## Check plan

| Test                                              | Input                     | Expect                                                                    |
| ------------------------------------------------- | ------------------------- | -------------------------------------------------------------------------- |
| `cross-fades with no delay`                       | `src/styles/global.css`   | the `::view-transition-new(root)` rule has no third `animation` time value  |
| `uses one duration for both halves`               | `src/styles/global.css`   | old and new declare the same `NNNms`                                        |
| `keeps the pair unisolated`                       | `src/styles/global.css`   | contains `::view-transition-image-pair(root)` with `isolation: auto`        |
| `drops the legacy black-dip keyframes`            | `src/styles/global.css`   | `fade-to-black` and `fade-from-black` occur 0 times                         |
| `stops re-animating main`                         | `src/styles/global.css`   | no `main {` rule declares `animation:`                                      |
| `flags a page without the colour-scheme hint`     | `chromeIssues('x.html', html, '/')` | includes `x.html: page is missing the dark colour-scheme hint`    |
| `accepts a page with the hint`                    | `chromeIssues` on good html | no colour-scheme problem                                                  |

## TDD

1. **Red** — write `website/tests/unit/page-transition.test.ts` (rows 1-5, reading
   `src/styles/global.css` via `readFileSync`) and add rows 6-7 to
   `website/tests/unit/chrome.test.ts`. Run
   `cd website && npx vitest run tests/unit/page-transition.test.ts tests/unit/chrome.test.ts` — red.
2. **Green** — apply the CSS, the meta tag and the gate.
3. **Refactor** — none expected.

## Impl steps

- [x] 1. Write `website/tests/unit/page-transition.test.ts` with rows 1-5.
- [x] 2. Add rows 6-7 to `website/tests/unit/chrome.test.ts`; run both — red.
- [x] 3. In `website/src/layouts/BaseLayout.astro`, insert directly after
      `<meta charset="UTF-8" />`:
      `<meta name="color-scheme" content="dark" />`
- [x] 4. Replace lines 1481-1506 of `website/src/styles/global.css` with:
      ```css
      @view-transition {
        navigation: auto;
      }
      /* A true cross-fade: both halves run the same duration from t=0, and the
         pair is un-isolated so their opacities sum to full coverage. The old
         two-stage fade left ~120ms where neither snapshot was opaque and the
         page canvas showed through — the reported white flash. */
      ::view-transition-group(root) {
        background-color: var(--blackfoil);
      }
      ::view-transition-image-pair(root) {
        isolation: auto;
      }
      ::view-transition-old(root),
      ::view-transition-new(root) {
        mix-blend-mode: normal;
      }
      ::view-transition-old(root) {
        animation: page-fade-out 200ms linear both;
      }
      ::view-transition-new(root) {
        animation: page-fade-in 200ms linear both;
      }
      @keyframes page-fade-out {
        to {
          opacity: 0;
        }
      }
      @keyframes page-fade-in {
        from {
          opacity: 0;
        }
      }
      ```
      Keep `html { background-color: var(--blackfoil); }` at line 1478-1480. Delete the
      `main { animation: fade-from-black 220ms ease-out both; }` rule entirely.
- [x] 5. In the `@media (prefers-reduced-motion: reduce)` block (line 908-937), drop `main`
      from the `::view-transition-old(root), ::view-transition-new(root), main` selector list —
      `main` no longer animates.
- [x] 6. In `website/scripts/check-chrome.mjs::chromeIssues`, after the breadcrumb check, add:
      ```js
      if (!/<meta\s+name="color-scheme"\s+content="dark"\s*\/?>/.test(html))
        problems.push(`${file}: page is missing the dark colour-scheme hint`);
      ```
      Place it before the `if (file === '404.html') return []` early-out is reached — i.e.
      keep the existing early-out for `404.html` and add this check after it, so `404.html`
      is exempt like every other gate.
- [x] 7. Run `cd website && npx vitest run tests/unit/page-transition.test.ts tests/unit/chrome.test.ts` — green.
- [x] 8. Run `cd website && npm run format && npm run ci`.

## Outputs

- Touched: `website/src/styles/global.css`, `website/src/layouts/BaseLayout.astro`,
  `website/scripts/check-chrome.mjs`, `website/tests/unit/page-transition.test.ts` (new),
  `website/tests/unit/chrome.test.ts`.
- Behaviour: one 200 ms cross-fade per navigation; no black dip, no white frame.

## Validation

- [x] `cd website && npx vitest run tests/unit/page-transition.test.ts tests/unit/chrome.test.ts` — passed (65/65, run in main tree)
- [x] `cd website && npm run ci` — exit 0, `chrome: 151 pages carry the site header` (run in disposable detached worktree per shared-tree hazard; `npm run budgets:check` also passed: `9 JS, 151 HTML, 205 images, 50 print masters (16 MiB) within limits`)
- [ ] manual: `npm run build && npm run preview`, in Chrome navigate home → `/docs/` →
      `/archetypes/nekroz/` → back; record with DevTools **Performance → screenshots** and
      step frame by frame: no frame is white, no frame is fully black — UNCHECKED, no browser available in this environment; see residual risk in report
- [ ] manual: with **Emulate prefers-reduced-motion** on, navigation is instant — UNCHECKED, same reason
- [ ] app functional — `npm run test:e2e` passes — UNCHECKED, Playwright's bundled chromium is missing system libs in this environment (known pre-existing gap, not introduced by this ticket)
- [ ] commit msg draft: `fix(website): cross-fade page transitions without a white frame`
