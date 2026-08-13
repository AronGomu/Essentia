/**
 * Width budget for the compact site header.
 *
 * 400px is the narrowest supported viewport. The header holds one row
 * there thanks to four inline links (`Cards`, `Learn`, `Blog`, `Decks`) in
 * `.utility-menu`, not a `⋯` popover trigger; a wrap is a warning, never a
 * build failure, so this module only ever reports arithmetic — see scripts/check-header-row.mjs (build) and
 * the inline guard in src/layouts/BaseLayout.astro (browser).
 *
 * ## Every number here is traceable, because hand-copied ones drifted
 *
 * The first cut of this file hand-copied control widths out of `global.css`
 * and nothing cross-checked them. They were already wrong when a reviewer
 * measured a real 400px render: `search-trigger` was declared 48 and measured
 * 39.8, `drawer-trigger` was declared 36 and measured 34, and
 * `BREADCRUMB_MIN_PX` was 64 against an authored `.breadcrumb { min-width: 0 }`.
 * Growing `.utility-more` to `6rem` overflowed the real header while the guard
 * happily computed 248 ≤ 368 and printed nothing.
 *
 * So every measurement below is a `{ px, cssPx, intrinsicPx }` record:
 *
 * - `cssPx` names the authored declarations the number is built from, as
 *   `[selector, property]` pairs. `tests/unit/header-row.test.ts` re-reads
 *   each one from `global.css` at `COMPACT_VIEWPORT_PX`, converts it to
 *   pixels, and fails when `px !== Σ cssPx + intrinsicPx`. Editing one of
 *   those declarations without editing this file turns that test red.
 * - `intrinsicPx` is the remainder CSS does not state: a glyph's own box, a
 *   `1px` border resolved through the `border` shorthand. It comes from a real
 *   400px render and every one carries its arithmetic in a comment.
 *
 * A record whose `cssPx` value stops being a static length — `min-width` going
 * back to `min(22rem, 45vw)`, say — makes the cross-check throw rather than
 * silently skip, which is the whole point.
 */
export const COMPACT_VIEWPORT_PX = 400;

/** `.site-header { padding: 0.7rem clamp(1rem, 3vw, 3rem) }` — the 1rem floor wins at 400px. */
export const HEADER_PADDING_INLINE = {
  px: 32,
  cssPx: [
    ['.site-header', 'padding-left'],
    ['.site-header', 'padding-right'],
  ],
  intrinsicPx: 0,
};

/** `.site-header { gap: 0.45rem }` inside `@media (max-width: 44rem)`. */
export const HEADER_GAP = {
  px: 7.2,
  cssPx: [['.site-header', 'gap']],
  intrinsicPx: 0,
};

/** Every control the compact header renders, at its ≤44rem width. */
export const HEADER_CONTROLS = [
  {
    name: 'compact-brand',
    // `@media (max-width: 44rem) { .compact-brand img { width: 2rem } }` —
    // the square letter mark, stated outright.
    px: 32,
    cssPx: [['.compact-brand img', 'width']],
    intrinsicPx: 0,
  },
  {
    name: 'drawer-trigger',
    // 8 + 8 padding, + 16 for the `☰` glyph and the 2×1px `button` border.
    // `.label-full` is `display: none` from 64rem down, so the glyph is the
    // whole content box. Measured 34px in a 400px render.
    px: 34,
    cssPx: [
      ['.drawer-trigger', 'padding-left'],
      ['.drawer-trigger', 'padding-right'],
    ],
    intrinsicPx: 18,
  },
  {
    name: 'utility-cards',
    // 8px compact padding + 40.9px for the `Cards` glyph run and border.
    // Measured 48.9px at 400px.
    px: 48.9,
    cssPx: [
      ['.utility-menu a', 'padding-left'],
      ['.utility-menu a', 'padding-right'],
    ],
    intrinsicPx: 40.9,
  },
  {
    name: 'utility-learn',
    // 8px compact padding + 40px for the `Learn` glyph run and border.
    // Measured 48px at 400px.
    px: 48,
    cssPx: [
      ['.utility-menu a', 'padding-left'],
      ['.utility-menu a', 'padding-right'],
    ],
    intrinsicPx: 40,
  },
  {
    name: 'utility-blog',
    // 8px compact padding + 32.1px for the `Blog` glyph run and border.
    // Measured 40.1px at 400px.
    px: 40.1,
    cssPx: [
      ['.utility-menu a', 'padding-left'],
      ['.utility-menu a', 'padding-right'],
    ],
    intrinsicPx: 32.1,
  },
  {
    name: 'utility-decks',
    // 8px compact padding + 43.3px for the `Decks` glyph run and border.
    // Measured 51.3px at 400px.
    px: 51.3,
    cssPx: [
      ['.utility-menu a', 'padding-left'],
      ['.utility-menu a', 'padding-right'],
    ],
    intrinsicPx: 43.3,
  },
  {
    name: 'search-trigger',
    // 0 + 14.4 + 14.4, + 11 for the `⌕` glyph and the 2×1px `button` border.
    // The `min-width` term is the one that matters: it is `min(22rem, 45vw)`
    // until stage 2 drops it to `0` at 56rem. Measured 39.8px at 400px.
    px: 39.8,
    cssPx: [
      ['.search-trigger', 'min-width'],
      ['button', 'padding-left'],
      ['button', 'padding-right'],
    ],
    intrinsicPx: 11,
  },
];

/**
 * Inner pages add a breadcrumb. Below 44rem it is authored
 * `.breadcrumb { flex: 1 1 auto; min-width: 0 }` — every crumb but the last is
 * hidden and the last one ellipsises — so it reserves nothing and yields the
 * whole row rather than pushing it to two. This was `64`, which was fiction.
 */
export const BREADCRUMB = {
  name: 'breadcrumb',
  px: 0,
  cssPx: [['.breadcrumb', 'min-width']],
  intrinsicPx: 0,
};

/**
 * `.utility-menu { gap: 0.35rem }` — the three gaps between the four inline
 * links. This is not one of `HEADER_CONTROLS`: those items sit in the outer
 * `.site-header` row, spaced by `HEADER_GAP` (7.2px), while the four links
 * share one `.utility-nav` flex item there and are spaced by this smaller
 * inner gap instead. It exists so the cross-check in
 * `tests/unit/header-row.test.ts` still walks every authored length; it does
 * not feed `headerRowBudget()`, which keeps treating the outer row's 7.2px
 * gap as the (over-)conservative distance between every item.
 */
export const UTILITY_GAP = {
  px: 16.8,
  cssPx: [
    ['.utility-menu', 'gap'],
    ['.utility-menu', 'gap'],
    ['.utility-menu', 'gap'],
  ],
  intrinsicPx: 0,
};

/** Every measurement in this module, for the cross-check to walk. */
export const HEADER_MEASUREMENTS = [
  { name: 'header padding-inline', ...HEADER_PADDING_INLINE },
  { name: 'header gap', ...HEADER_GAP },
  ...HEADER_CONTROLS,
  BREADCRUMB,
  { name: 'utility-menu gap', ...UTILITY_GAP },
];

export function headerRowBudget(
  viewportPx = COMPACT_VIEWPORT_PX,
  { withBreadcrumb = true } = {},
) {
  const items = withBreadcrumb
    ? [...HEADER_CONTROLS, BREADCRUMB]
    : [...HEADER_CONTROLS];
  const contentPx =
    items.reduce((total, item) => total + item.px, 0) +
    HEADER_GAP.px * (items.length - 1);
  const availablePx = viewportPx - HEADER_PADDING_INLINE.px;
  const overflowPx = Math.max(0, contentPx - availablePx);
  return {
    viewportPx,
    items,
    contentPx: Math.round(contentPx * 10) / 10,
    availablePx,
    overflowPx: Math.round(overflowPx * 10) / 10,
    fits: overflowPx === 0,
  };
}
