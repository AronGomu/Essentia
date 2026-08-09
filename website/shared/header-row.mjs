/**
 * Width budget for the compact site header.
 *
 * 400px is the narrowest supported viewport. The header must hold one row
 * there; a wrap is a warning, never a build failure, so this module only
 * ever reports arithmetic — see scripts/check-header-row.mjs (build) and
 * the inline guard in src/layouts/BaseLayout.astro (browser).
 */
export const COMPACT_VIEWPORT_PX = 400;
/** `.site-header { padding: 0.7rem clamp(1rem, 3vw, 3rem) }` — the 1rem floor wins at 400px. */
export const HEADER_PADDING_INLINE_PX = 32;
/** `.site-header { gap: 0.45rem }` inside `@media (max-width: 44rem)`. */
export const HEADER_GAP_PX = 7.2;
/** Every control the compact header renders, at its ≤44rem width. */
export const HEADER_CONTROLS = [
  { name: 'compact-brand', widthPx: 32 },
  { name: 'drawer-trigger', widthPx: 36 },
  { name: 'utility-more', widthPx: 39.2 },
  { name: 'search-trigger', widthPx: 48 },
];
/** Inner pages add a breadcrumb; below 44rem only its last crumb shows. */
export const BREADCRUMB_MIN_PX = 64;

export function headerRowBudget(
  viewportPx = COMPACT_VIEWPORT_PX,
  { withBreadcrumb = true } = {},
) {
  const items = withBreadcrumb
    ? [...HEADER_CONTROLS, { name: 'breadcrumb', widthPx: BREADCRUMB_MIN_PX }]
    : [...HEADER_CONTROLS];
  const contentPx =
    items.reduce((total, item) => total + item.widthPx, 0) +
    HEADER_GAP_PX * (items.length - 1);
  const availablePx = viewportPx - HEADER_PADDING_INLINE_PX;
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
