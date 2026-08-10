# ADR 0027 — The header owns the top row

- Date: 2026-08-09
- Status: Proposed
- Scope: website shell layout — `website/src/layouts/BaseLayout.astro`, `website/src/styles/global.css`, `website/src/components/Navigation.svelte`

## Context

The shell put the catalog rail first. `.desktop-catalog` ran `inset: 0 auto 0 0` — the full viewport height, starting at y = 0 — and `.site-header` was pushed aside with `margin-left: var(--sidebar)`. Both carried `z-index: var(--z-sticky)`.

Two consequences. The header was not a menubar, it was a panel to the right of the rail, so the brand never sat in the page's top-left corner above 64rem. Below 64rem the rail was replaced by a hamburger that was `position: fixed; top: 0.8rem; left: 1rem`, floating over the corner instead, with the header reserving `padding-left: 8.8rem` (7.8rem below 44rem) to clear it. So on every viewport, something other than the brand held the top-left.

`DESIGN.md` already states the One Home Rule — the mark lives in the site header and nowhere else in the shell. The layout contradicted it.

## Decision

1. `.site-header` spans the full viewport width at every width. No `margin-left`, no `padding-left` reservation.
2. `.site-header` gets `z-index: calc(var(--z-sticky) + 2)` and paints above the rail.
3. `.desktop-catalog` starts at the header's bottom border: `inset: var(--header) auto 0 0`.
4. `main` and `.site-footer` keep `margin-left: var(--sidebar)` — the content column, not the header, is what clears the rail.
5. The `<Navigation client:load>` island renders **inside** `<header class="site-header">`, directly after `<a class="compact-brand">`. The hamburger becomes an ordinary in-flow flex item and stops floating.
6. `.site-header` may never declare `transform`, `filter`, `backdrop-filter` or `will-change`. Any of those makes it the containing block for the `position: fixed` rail nested inside it, and the rail would be positioned against the header instead of the viewport. A unit test enforces this at every measured width.

## Evidence

`website/dist/index.html` ships `astro-island,astro-slot,astro-static-slot{display:contents}` in Astro's inlined stylesheet, and `<FindPalette client:load>` already renders inside `.site-header` as a flex item. Nesting a second island in the same row is therefore layout-neutral; the island wrapper generates no box.

`--header: 4.5rem` bounds the header: its content is a 2.75rem control row plus `0.7rem` block padding ≈ 4.15rem. The rail is `display: none` below 64rem, where the header may wrap, so `top: var(--header)` is only ever read at widths where the header is a single row.

## Consequences

- The brand holds the true top-left corner on every page and at every width, with no floating control over it.
- The rail is visually subordinate to the header: a panel under a menubar rather than a peer column.
- `header-brand.test.ts` must count `.drawer-trigger` among the header's children when it checks that the brand holds the left edge.
- Any future backdrop blur on the header requires moving the rail back out of it first — the ban in point 6 is load-bearing, not stylistic.
