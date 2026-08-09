# ADR 0029 — The compact header, and a wrapped row is a warning

- Date: 2026-08-09
- Status: Proposed
- Scope: site header at phone widths — `website/src/layouts/BaseLayout.astro`, `website/src/components/FindPalette.svelte`, `website/src/components/Navigation.svelte`, `website/src/styles/global.css`, `website/shared/header-row.mjs`, `website/scripts/check-header-row.mjs`

## Context

At 400px — the narrowest supported viewport — the header asked for more room than it had: a wordmark, a `☰ Catalog` button, a breadcrumb, three text links ("Learn about Essentia", "Blog", "Decks") and a `⌕ Find ⌘K` button. `.site-header` carried `flex-wrap: wrap` as the escape valve, so the row silently became two or three, and nothing reported it.

The three constraints that shape the fix:

- `website/scripts/check-chrome.mjs` fails the build for any page whose `<nav class="utility-nav">` block lacks the literal `>Learn about Essentia<`, `>Blog<` or `>Decks<`, or whose page lacks `>Find</span>`. Shortening the *markup* breaks the build.
- Hiding a label changes an element's accessible name unless a name is stated elsewhere.
- The page CSP is `script-src 'self' 'unsafe-inline'`, and every interactive control added so far cost a hydrated island.

## Decision

1. Compact width is the existing phone breakpoint `@media (max-width: 44rem)`. 400px is the narrowest supported viewport and the width the guard measures — it is not a new breakpoint.
2. Labels are hidden by CSS, never removed from the DOM. Each shortenable label ships as `<span class="label-full">` (plus `<span class="label-short">` where a shorter word exists, e.g. "Learn about Essentia" → "Learn"); `.label-full` is `display: none` at ≤44rem and `.label-short` above it. Exactly one is ever in the accessibility tree.
3. Every control whose text can be hidden carries an explicit `aria-label` — `Learn about Essentia`, `Find`, the drawer label — so its accessible name is viewport-independent.
4. The three section links move inside `<div class="utility-menu" id="utility-menu" popover>`, opened by `<button class="utility-more" popovertarget="utility-menu" aria-label="More sections">⋯</button>`. Native HTML `popover`: no island, no script, no CSP change. Above 44rem an author `display: flex` on `.utility-menu` beats the UA rule `[popover]:not(:popover-open) { display: none }`, so the links lay out inline exactly as before and the trigger is hidden.
5. The breadcrumb is the only variable-width item left. At ≤44rem it gets `flex: 1 1 auto; min-width: 0`, its list gets `flex-wrap: nowrap`, and its items ellipsise. It shrinks; it does not wrap the row.
6. **A wrapped header is a warning, not a failure.** `website/scripts/check-header-row.mjs` evaluates the width budget in `website/shared/header-row.mjs` and, when it does not fit, prints `[warn] site-header may wrap at 400px: …` and exits 0. An inline script in `BaseLayout.astro` measures the real header at `innerWidth <= 400` and emits `console.warn('[essentia] site-header wraps to N rows at …')`. Neither ever throws or fails a build.
7. The thing that actually goes red is a Playwright test asserting exactly one distinct row across the header's visible children at 400×800, on the home page and on a page with a breadcrumb.

## Evidence

Measured at 400px with the compact rules in force: horizontal padding 32px (the `clamp(1rem, 3vw, 3rem)` floor wins), gap 7.2px, and controls at 32 + 36 + 39.2 + 48 = 155.2px. With a 64px breadcrumb allowance and four gaps that is 248px of content against 368px available — 120px of slack.

The `astro-island` wrapper is `display: contents` and has no box, so the runtime guard measures elements by class (`.compact-brand, .drawer-trigger, .breadcrumb, .utility-nav, .search-trigger`) rather than `header.children`, which would return two boxless island wrappers.

## Consequences

- The compact header is brand + three icon controls, and the section links are one tap away.
- `check-chrome.mjs` keeps passing untouched: the literals it greps for still exist in the built HTML.
- The layout budget is a single source of truth, importable by both the build script and the unit tests; changing a control's compact width means changing one entry in `HEADER_CONTROLS`.
- The `⋯` menu depends on native `popover` support. In a browser without it the trigger does nothing and, at ≤44rem, the section links are unreachable from the header — the catalog drawer and the footer still navigate. Accepted: every browser the e2e matrix runs (Chromium, Firefox, WebKit) supports it.
- The warning is advisory by construction. If a future change makes the row wrap on a real page, `npm run build` says so and the browser console says so, but the red bar comes from the Playwright test, not from either warning.
