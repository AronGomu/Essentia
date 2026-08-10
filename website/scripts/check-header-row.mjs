import { COMPACT_VIEWPORT_PX, headerRowBudget } from '../shared/header-row.mjs';

// A wrapped header is a layout smell, not a broken build: this warns and
// always exits 0, per the feedback that asked for a warning here.
//
// The viewport is overridable so tests/unit/header-row.test.ts can *run* the
// warning branch instead of grepping this file for `console.warn`. Grepping
// proved nothing: with the real constants the header fits at 400px, so the
// branch never executed, and `process.exitCode = 1` would have satisfied every
// one of those greps while still failing the build.
const viewportPx = Number(
  process.env.HEADER_ROW_VIEWPORT_PX ?? COMPACT_VIEWPORT_PX,
);

for (const withBreadcrumb of [true, false]) {
  const budget = headerRowBudget(viewportPx, { withBreadcrumb });
  if (budget.fits) continue;
  console.warn(
    `[warn] site-header may wrap at ${viewportPx}px` +
      `${withBreadcrumb ? ' with a breadcrumb' : ''}: ` +
      `needs ${budget.contentPx}px, has ${budget.availablePx}px ` +
      `(over by ${budget.overflowPx}px)`,
  );
}
