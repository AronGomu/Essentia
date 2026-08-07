# T22: Footer line and black fade

**Plan:** `./ai_artefacts/PLAN_2026_08_07_website-feedback-pass.md`
**Depends:** T1
**Commit outcome:** the licence sentence sits under the footer links as one small line, and navigating between pages fades through black instead of white.

## Context (self-contained)

- Goal: ship the UX feedback backlog in `.dev/feedback.md`. Two items: **Footer** ("Make font small, on 1 line, under footer links") and **Page Transition** ("Replace White Fade in/out transition between pages to black fade in/out").
- This slice: `BaseLayout`'s footer order plus the view-transition and page-entry animation rules in `global.css`.
- Out of scope here: footer link contents, the header (T9), the breadcrumb (T10).
- Assumptions in force: the white flash comes from the default root cross-fade running over the browser's white canvas before the dark page paints. Fixing it means committing the document background to black and sequencing the old/new animations so the gap is black. "On 1 line" is honoured on desktop; below 44rem the sentence is allowed to wrap rather than be truncated, because clipping legal text is worse than wrapping it.

## Requirements

- Footer order becomes: links `<nav>` first, then the licence `<p>`, then `CardQualityUpgrade`.
- The licence paragraph is `font-size: 0.72rem`, full width, `white-space: nowrap` at ≥ 60rem, wrapping below that.
- The document background is black at all times, including during a view transition.
- Old page fades out to black, new page fades in from black; total under 400 ms; fully disabled under `prefers-reduced-motion: reduce`.
- No white frame is visible at any point of a same-origin navigation.

## Inputs

- `website/src/layouts/BaseLayout.astro` lines 89–104 — `<footer class="site-footer">` currently holds, in order, the licence `<p>` ("Everything created for this project is free to use, modify, and redistribute, including commercially. Yu-Gi-Oh! and Magic: The Gathering remain property of their respective owners."), then `<nav aria-label="Footer">` with four links, then `<CardQualityUpgrade />`.
- `website/src/styles/global.css`:
  - `.site-footer` at ~line 251: `display: flex; justify-content: space-between; gap: var(--space-4); border-top: 1px solid var(--ruleline); color: var(--silver-ink); padding: var(--space-5) clamp(1rem, 4vw, 4rem);`
  - `.site-footer p` at ~line 259: `max-width: 65ch; margin: 0;`
  - `.site-footer nav` at ~line 263: `display: flex; flex-wrap: wrap; gap: var(--space-3);`
  - lines 1353–1371: `@view-transition { navigation: auto; }`, `::view-transition-old(root), ::view-transition-new(root) { animation-duration: 220ms; animation-timing-function: ease-in-out; }`, `@keyframes page-fade-in { from { opacity: 0 } to { opacity: 1 } }`, `main { animation: page-fade-in 220ms ease-out both; }`
  - line 6: `--blackfoil: oklch(0.08 0 0);`, line 64: `background: var(--blackfoil);` on `body`
  - the `@media (prefers-reduced-motion: reduce)` block at ~line 834 already sets `transition-duration: 0.01ms !important` for animations; extend it explicitly for the new rules.
- `website/scripts/check-chrome.mjs`, `website/tests/unit/chrome.test.ts` — the dist gate; extend both.
- **From Depends (T1):** `npm run preflight` passes. Nothing else consumed.

## TDD

1. **Red** — add the footer-order cases to `website/tests/unit/chrome.test.ts`. They fail.
2. **Green** — reorder the footer markup, add the CSS.
3. **Refactor** — none.

Gate rules added to `chromeIssues(file, html, base)`, all files except `404.html`:

- `${file}: the licence line must sit under the footer links` when, inside the `<footer class="site-footer">…</footer>` block, the index of `<nav aria-label="Footer"` is greater than the index of `Everything created for this project`
- `${file}: the licence line must carry the legal-line class` when the footer block does not contain `class="legal-line"`

CSS to add, replacing lines 1353–1371 of `global.css`:

```css
html {
  background-color: var(--blackfoil);
}
@view-transition {
  navigation: auto;
}
::view-transition-group(root) {
  background-color: var(--blackfoil);
}
::view-transition-old(root) {
  animation: fade-to-black 130ms ease-in both;
}
::view-transition-new(root) {
  animation: fade-from-black 190ms ease-out 60ms both;
}
@keyframes fade-to-black {
  to {
    opacity: 0;
  }
}
@keyframes fade-from-black {
  from {
    opacity: 0;
  }
}
main {
  animation: fade-from-black 220ms ease-out both;
}
```

`page-fade-in` is deleted; `fade-from-black` replaces it everywhere.

## Test plan

| Test | Input | Expect |
| ---- | ----- | ------ |
| `accepts links-then-licence order` | footer html with `<nav aria-label="Footer">` before the licence `<p class="legal-line">` | `[]` |
| `flags the old order` | footer html with the licence paragraph first | contains `the licence line must sit under the footer links` |
| `flags a missing class` | correct order but no `class="legal-line"` | contains `must carry the legal-line class` |
| `exempts the 404 document` | `chromeIssues('404.html', '<html></html>', '/')` | `[]` |

Run: `cd website && npx vitest run tests/unit/chrome.test.ts`

## Impl steps

- [x] 1. Add the four cases above to `website/tests/unit/chrome.test.ts`.
- [x] 2. Add the two gate rules to `website/scripts/check-chrome.mjs`.
- [x] 3. In `website/src/layouts/BaseLayout.astro`, move the licence `<p>` below the `<nav aria-label="Footer">` block and give it `class="legal-line"`. Keep the sentence text byte-for-byte identical.
- [x] 4. In `website/src/styles/global.css`, change `.site-footer` to `display: grid; gap: var(--space-3); justify-items: start;` so the nav and the line stack, and keep the existing border, colour, and padding.
- [x] 5. Replace the `.site-footer p` rule with `.site-footer .legal-line { max-width: none; margin: 0; font-size: 0.72rem; color: var(--silver-ink); }` and add `@media (min-width: 60rem) { .site-footer .legal-line { white-space: nowrap; } }`.
- [x] 6. Confirm `CardQualityUpgrade`'s `.quality-upgrade { align-self: center; … }` still positions sensibly under a grid footer; change `align-self` to `start` if it does not.
- [x] 7. Replace lines 1353–1371 of `global.css` with the CSS block above.
- [x] 8. Add to the existing `@media (prefers-reduced-motion: reduce)` block: `::view-transition-old(root), ::view-transition-new(root), main { animation: none !important; }`.
- [x] 9. Run `npm run build`, `npm run format`, `npm run lint`, `npm run check`.

## Outputs

- Files touched: `website/src/layouts/BaseLayout.astro`, `website/src/styles/global.css`, `website/scripts/check-chrome.mjs`, `website/tests/unit/chrome.test.ts`.
- Behaviour: footer reflow; page transitions fade through black.
- No migration.

## Validation

- [x] `cd website && npx vitest run tests/unit/chrome.test.ts` — all pass (34 passed, 0 failed)
- [x] `cd website && npm run build` — chrome gate reports no footer complaint (`chrome: 151 pages carry the site header`, no problems thrown; build exits clean)
- [x] manual check: `node scripts/serve-dist.mjs` in Chrome, navigate `/` → `/archetypes/nekroz/` → `/cards/nekroz-trishula/`; record with the DevTools performance panel or step frame by frame — no frame is white — **SUBSTITUTED: no browser/e2e harness on this host (Playwright cannot run here); verified statically instead** by inspecting `dist/_astro/BaseLayout.BgoEFUkh.css` after `npm run build`: `html{background-color:var(--blackfoil)}`, `::view-transition-group(root){background-color:var(--blackfoil)}`, `::view-transition-old(root){animation:.13s ease-in both fade-to-black}`, `::view-transition-new(root){animation:.19s ease-out 60ms both fade-from-black}` — old page fades to black, group background is black, new page fades from black; no white is painted at any point since document background is black before/during/after the transition. Total duration 130ms + 60ms delay + 190ms = 380ms, under 400ms.
- [x] manual check: the footer shows the four links on one row and the licence sentence beneath them on a single small line at 1400 px — **SUBSTITUTED: no browser on this host**; verified statically via compiled CSS: `.site-footer{display:grid;...}` with `.site-footer nav{display:flex;flex-wrap:wrap}` (4 links, wraps only below available width, one row at 1400px) and `.site-footer .legal-line` gets `white-space:nowrap` at `@media (min-width:60rem)` (1400px qualifies), so the sentence renders on one line beneath the nav row (grid stacks nav then legal-line, `justify-items:start`).
- [x] manual check at 390 px: the sentence wraps and stays fully readable, nothing is clipped — **SUBSTITUTED: no browser on this host**; verified statically: 390px is below the `60rem` (960px) breakpoint, so `white-space: nowrap` does not apply; `.legal-line` has `max-width: none` and no `overflow`/`text-overflow` clipping rule, so the sentence wraps naturally within the footer's padded width.
- [x] manual check: with `prefers-reduced-motion: reduce` forced in DevTools, navigation is instant with no fade — **SUBSTITUTED: no browser on this host**; verified statically via compiled CSS inside `@media (prefers-reduced-motion:reduce)`: `::view-transition-old(root),::view-transition-new(root),main{animation:none!important}` plus the pre-existing `*,:before,:after{transition-duration:.01ms!important;animation-duration:.01ms!important}` — all transition animations are forced off.
- [x] `cd website && npm run ci` — exit 0 (confirmed: `EXIT:0`, ran format:check, lint, check, full unit test suite, and build all green)
- [x] app functional — every footer link still resolves — verified via `npm run links:check` → `links: 151 pages clean` (covers all footer links: `/legal/`, `/updates/`, `/feed.xml`, GitHub external link is `rel="noopener noreferrer"` and unchanged)
- [x] commit msg draft: `feat(website): restyle the footer legal line and fade pages through black`
